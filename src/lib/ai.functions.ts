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

    const system = `You are the senior content strategist for End Time Soldiers (ETS), a Christian ministry media network with the motto "Raising a Kingdom Army for Such a Time as This". You repurpose one core idea into platform-native posts. Voice: bold, faith-filled, urgent yet hopeful, never preachy filler. Keep scripture references accurate. Never exceed platform character limits. Hashtags must not include the # symbol and must be lowercase without spaces. Never put hashtags inside "body" — return them only in the hashtags array, because the app appends them. Produce exactly one output object per requested platform, in the order requested. Keep "title" under 90 characters. Keep "formatNotes" under 200 characters and "bestTime" under 60 characters.`;

    const prompt = `Core idea / source material:
"""
${data.idea}
"""
${data.mediaName ? `Attached media: ${data.mediaName} (${data.mediaKind ?? "file"}).` : ""}
${data.tone ? `Desired tone: ${data.tone}.` : ""}

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
