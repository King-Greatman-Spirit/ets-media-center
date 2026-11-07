import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { createAIModels } from "@/lib/ai-gateway.server";

const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]];

const RepurposeInput = z.object({
  idea: z.string().min(3).max(6000),
  tone: z.string().max(80).nullable(),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1),
  mediaName: z.string().max(200).nullable(),
  mediaKind: z.enum(["video", "image", "audio"]).nullable(),
});

const OutputSchema = z.object({
  outputs: z.array(
    z.object({
      platform: z.enum(PLATFORM_IDS),
      title: z.string(),
      body: z.string(),
      hashtags: z.array(z.string()),
      formatNotes: z.string(),
      bestTime: z.string(),
    }),
  ),
});

export type RepurposeOutput = z.infer<typeof OutputSchema>["outputs"][number];

/**
 * Models often repeat the hashtags inside `body`. The app appends the hashtags
 * array afterwards, so leaving them in would post every tag twice.
 */
function stripTrailingHashtags(body: string): string {
  return body.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, "").trim();
}

function normaliseOutputs(outputs: RepurposeOutput[]): RepurposeOutput[] {
  return outputs.map((o) => ({ ...o, body: stripTrailingHashtags(o.body) }));
}

/**
 * The five trending content kinds ETS writes in — sector-neutral, so each
 * gives a genuinely different perspective on any video (faith, tech, film,
 * finance, sport, education…). Each directive is an instruction the model
 * must obey — a polite "Desired tone:" line gets ignored, so tone lives here
 * as a command block, not a label.
 */
const TONE_DIRECTIVES: Record<string, string> = {
  "Storytelling":
    "Story structure: hook the tension in the first line, then struggle → turning point → resolution → the lesson for the viewer. Name the real people, teams or places from the material. Every beat earns the next.",
  "Bold Takes":
    "Strong opinion, stated plainly: 'Here's what everyone gets wrong…' / 'This is the move…' / 'Mark my words…'. Pick a side, defend it with the evidence in the material, end with a one-line prediction or challenge. No hedging, no 'some people say'.",
  "Breaking / Urgent":
    "News-desk voice: lead with what changed and why it matters NOW — 'Just in:' / 'This changes everything for…' / 'If you're watching this, you're late if you wait.' End with the single action the viewer should take today.",
  "Deep Dive / Educational":
    "Explainer clarity: state the concept, break it into 2–3 points, anchor each to the verse, stat, or scene the material gives, then land ONE memorable takeaway. Sound like the smartest friend in the room — no jargon without a plain-English translation.",
  "Inspirational":
    "Human and uplifting: find the person in this story who needed this exact message — 'If you feel behind…' / 'This is your comeback chapter.' Warmth with weight: hope that never sounds like a greeting card.",
};

export async function repurposeCore(data: {
  idea: string;
  tone: string | null;
  platforms: PlatformId[];
  mediaName: string | null;
  mediaKind: "video" | "image" | "audio" | null;
}): Promise<{ outputs: RepurposeOutput[] }> {
    const models = createAIModels();
    if (models.length === 0) {
      throw new Error(
        "AI is not configured yet. Add GOOGLE_GENERATIVE_AI_API_KEY (free, no card) or OPENAI_API_KEY (paid) to your .env file.",
      );
    }

    const targets = PLATFORMS.filter((p) => data.platforms.includes(p.id));
    const platformGuide = targets
      .map((p) => `- ${p.id} (${p.name}): limit ${p.charLimit} chars. Format: ${p.format}`)
      .join("\n");

    const system = `You are the senior content strategist for End Time Soldiers (ETS), a media network covering faith, tech, film, finance, sport and more — motto "Raising a Kingdom Army for Such a Time as This". You repurpose one core idea into platform-native posts, matching the sector of each video (ministry, tech, movies, money, football, education…). Voice: bold, human, specific — never generic filler. When the material cites scripture, data or stats, keep them accurate. Never exceed platform character limits. Hashtags must not include the # symbol and must be lowercase without spaces. Never put hashtags inside "body" — return them only in the hashtags array, because the app appends them. Ground every caption in the source material: name the people, the moment and the verse, stat or scene it names — never swap them for generic filler like "God is good". The source material is the truth: never invent scenes, verses, stats or people it does not name. Produce exactly one output object per requested platform, in the order requested. Keep "title" under 90 characters. Keep "formatNotes" under 200 characters and "bestTime" under 60 characters.`;

    const toneBlock = data.tone
      ? `WRITE IN THIS VOICE — ${data.tone.toUpperCase()} (non-negotiable): ${TONE_DIRECTIVES[data.tone] ?? "Follow the tone exactly in every platform output; do not fall back to a generic ministry voice."}\n`
      : "";

    const prompt = `Core idea / source material:
"""
${data.idea}
"""
${data.mediaName ? `Attached media: ${data.mediaName} (${data.mediaKind ?? "file"}).` : ""}
${toneBlock}
Requested platforms and rules:
${platformGuide}

For each platform return: title (headline / subject / hook), body (the full caption or post text formatted for that platform, with line breaks where appropriate), hashtags (array, count appropriate for the platform, none for telegram), formatNotes (short guidance on media format, length, or thread structure), bestTime (suggested posting window).`;

    // Try each configured model in order; free-tier models can be
    // temporarily out of capacity, so fail over instead of giving up.
    // maxRetries 0 keeps failover fast (one attempt per model).
    let lastError: unknown = null;
    for (const model of models) {
      try {
        const result = streamText({
          model,
          system,
          prompt,
          output: Output.object({ schema: OutputSchema }),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(60_000),
        });
        const output = await result.output;
        return { outputs: normaliseOutputs(output.outputs) };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
          try {
            const parsed = OutputSchema.safeParse(JSON.parse(error.text ?? ""));
            if (parsed.success) return { outputs: normaliseOutputs(parsed.data.outputs) };
          } catch {
            /* fall through to next model */
          }
        }
        lastError = error;
      }
    }

    const error = lastError;
    {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("402")) throw new Error("AI credits are exhausted. Please add credits in your workspace to continue.");
      if (message.includes("429")) throw new Error("AI is rate limited right now. Please wait a moment and try again.");
      if (message.includes("503") || message.toLowerCase().includes("high demand") || message.toLowerCase().includes("overloaded")) {
        throw new Error("The AI model is busy right now. Please wait a minute and try again.");
      }
      throw new Error(`AI generation failed: ${message}`);
    }
}

export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RepurposeInput.parse(input))
  .handler(async ({ data }) => repurposeCore(data));
