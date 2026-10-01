import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAIModels } from "@/lib/ai-gateway.server";

// Byte cap for files the AI reads directly (images, audio). Videos travel as
// lightweight client-captured frames instead of full uploads.
const MAX_INLINE_BYTES = 18_000_000;

const AnalyzeInput = z.object({
  assetId: z.string().uuid(),
  // JPEG data URLs captured client-side, in time order (video only).
  frames: z.array(z.string().max(800_000)).max(6).optional(),
});

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid frame data.");
  return { buffer: Buffer.from(match[2]!, "base64"), mime: match[1] || "image/jpeg" };
}

export const analyzeMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, name, kind, mime_type, size_bytes, storage_path")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Media not found.");

    const models = createAIModels();
    if (models.length === 0) {
      throw new Error(
        "AI is not configured yet. Add GOOGLE_GENERATIVE_AI_API_KEY (free, no card) or OPENAI_API_KEY (paid) to your .env file.",
      );
    }

    type Part =
      | { type: "text"; text: string }
      | { type: "image"; image: Buffer; mediaType: string }
      | { type: "file"; data: Buffer; mediaType: string };

    let prompt: string;
    const parts: Part[] = [];

    if (asset.kind === "image") {
      if ((asset.size_bytes ?? 0) > MAX_INLINE_BYTES) {
        throw new Error("This image is too large to analyze. Try a smaller file.");
      }
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this image.");
      const buffer = Buffer.from(await blob.arrayBuffer());
      prompt = `Describe this image for a Christian ministry media team repurposing content: subjects, setting, any visible text, mood, and what message it could carry. Plain text, under 150 words. Title: "${asset.name}".`;
      parts.push({ type: "image", image: buffer, mediaType: asset.mime_type || "image/jpeg" });
    } else if (asset.kind === "audio") {
      if ((asset.size_bytes ?? 0) > MAX_INLINE_BYTES) {
        throw new Error("This audio file is too large to analyze. Try a shorter clip.");
      }
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this audio.");
      const buffer = Buffer.from(await blob.arrayBuffer());
      prompt = `Transcribe the key spoken content of this audio (titled "${asset.name}"), then give a 3-sentence summary of its message. If there is no speech, describe the audio instead. Plain text, under 200 words.`;
      parts.push({ type: "file", data: buffer, mediaType: asset.mime_type || "audio/mpeg" });
    } else {
      // Video: client-captured still frames in time order.
      const frames = data.frames ?? [];
      if (frames.length === 0) {
        throw new Error("No video frames were provided. Re-open the video and try analyzing again.");
      }
      prompt = `These ${frames.length} still frames are in time order from a video titled "${asset.name}" for a Christian ministry media team. Describe: 1) what visibly happens (scenes, people, on-screen text), 2) any readable text overlays word-for-word, 3) the apparent topic and message, 4) one strong hook line. Plain text, under 180 words.`;
      for (const frame of frames) {
        const { buffer, mime } = dataUrlToBuffer(frame);
        parts.push({ type: "image", image: buffer, mediaType: mime });
      }
    }

    parts.unshift({ type: "text", text: prompt });

    let lastError: unknown = null;
    for (const model of models) {
      try {
        const { text } = await generateText({
          model,
          messages: [{ role: "user", content: parts }],
          maxRetries: 0,
        });
        const summary = text.trim();
        if (!summary) {
          lastError = new Error("The AI returned an empty analysis.");
          continue;
        }
        // Persist when the column exists; never fail the call over it.
        let saved = false;
        try {
          const { error } = await context.supabase
            .from("media_assets")
            .update({ analysis_text: summary })
            .eq("id", asset.id);
          saved = !error;
        } catch {
          saved = false;
        }
        return { summary, saved };
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (message.includes("429")) throw new Error("AI is rate limited right now. Please wait a moment and try again.");
    if (message.includes("503") || message.toLowerCase().includes("high demand") || message.toLowerCase().includes("overloaded")) {
      throw new Error("The AI model is busy right now. Please wait a minute and try again.");
    }
    throw new Error(`Media analysis failed: ${message}`);
  });
