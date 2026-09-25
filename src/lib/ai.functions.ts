import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

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

export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RepurposeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const targets = PLATFORMS.filter((p) => data.platforms.includes(p.id));
    const platformGuide = targets
      .map((p) => `- ${p.id} (${p.name}): limit ${p.charLimit} chars. Format: ${p.format}`)
      .join("\n");

    const system = `You are the senior content strategist for End Time Soldiers (ETS), a Christian ministry media network with the motto "Raising a Kingdom Army for Such a Time as This". You repurpose one core idea into platform-native posts. Voice: bold, faith-filled, urgent yet hopeful, never preachy filler. Keep scripture references accurate. Never exceed platform character limits. Hashtags must not include the # symbol and must be lowercase without spaces. Produce exactly one output object per requested platform, in the order requested. Keep "title" under 90 characters. Keep "formatNotes" under 200 characters and "bestTime" under 60 characters.`;

    const prompt = `Core idea / source material:
"""
${data.idea}
"""
${data.mediaName ? `Attached media: ${data.mediaName} (${data.mediaKind ?? "file"}).` : ""}
${data.tone ? `Desired tone: ${data.tone}.` : ""}

Requested platforms and rules:
${platformGuide}

For each platform return: title (headline / subject / hook), body (the full caption or post text formatted for that platform, with line breaks where appropriate), hashtags (array, count appropriate for the platform, none for telegram), formatNotes (short guidance on media format, length, or thread structure), bestTime (suggested posting window).`;

    try {
      const result = streamText({
        model: gateway("google/gemini-3.8-flash"),
        system,
        prompt,
        output: Output.object({ schema: OutputSchema }),
      });
      const output = await result.output;
      return { outputs: output.outputs };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = OutputSchema.safeParse(JSON.parse(error.text ?? ""));
          if (parsed.success) return { outputs: parsed.data.outputs };
        } catch {
          /* fall through */
        }
        throw new Error("The AI returned an unexpected format. Please try again.");
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("402")) throw new Error("AI credits are exhausted. Please add credits in your workspace to continue.");
      if (message.includes("429")) throw new Error("AI is rate limited right now. Please wait a moment and try again.");
      throw new Error(`AI generation failed: ${message}`);
    }
  });
