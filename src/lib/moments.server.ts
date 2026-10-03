import { generateObject } from "ai";
import { z } from "zod";
import { createAIModels } from "@/lib/ai-gateway.server";

// Shared by the Library splitter and the Shorts batch flow: watch timestamped
// stills and return the most exciting, self-contained moments. Server-only.

export const MomentsSchema = z.object({
  moments: z
    .array(
      z.object({
        start: z.number().min(0),
        end: z.number().min(1),
        title: z.string().max(120),
        hook: z.string().max(200),
        summary: z.string().max(600),
      }),
    )
    .min(1)
    .max(6),
});

export type Moment = z.infer<typeof MomentsSchema>["moments"][number];

export type MomentFrame = { at: number; image: string };

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid frame data.");
  return Buffer.from(match[2]!, "base64");
}

export function sanitizeMoments(raw: Moment[], duration: number, target: number): Moment[] {
  const lo = Math.max(20, target - 30);
  const hi = target + 30;
  const sorted = [...raw]
    .filter((m) => Number.isFinite(m.start) && Number.isFinite(m.end) && m.end > m.start)
    .map((m) => ({
      ...m,
      start: Math.max(0, Math.min(m.start, duration - 1)),
      end: Math.max(1, Math.min(m.end, duration)),
    }))
    .filter((m) => m.end - m.start >= lo && m.end - m.start <= hi + 30)
    .sort((a, b) => a.start - b.start);
  const picked: Moment[] = [];
  for (const m of sorted) {
    if (picked.length >= 6) break;
    if (picked.some((p) => m.start < p.end - 2 && p.start < m.end - 2)) continue;
    picked.push(m);
  }
  return picked;
}

export async function detectVideoMoments(opts: {
  assetName: string;
  duration: number;
  targetSeconds: number;
  frames: MomentFrame[];
}): Promise<Moment[]> {
  const models = createAIModels();
  if (models.length === 0) {
    throw new Error(
      "AI is not configured yet. Add GOOGLE_GENERATIVE_AI_API_KEY (free, no card) or OPENAI_API_KEY (paid) to your .env file.",
    );
  }

  const duration = opts.duration;
  const frameLines = opts.frames
    .map((f) => `Frame at ${fmtTime(Math.min(f.at, duration))}:`)
    .join("\n");
  const prompt = [
    `You are cutting a ${fmtTime(duration)} video titled "${opts.assetName}" into its most exciting, self-contained moments for short-form platforms (YouTube Shorts, TikTok, Reels).`,
    `Stills from the video follow, in time order. Use them plus the title to find the highlights.`,
    `Return 1 to 6 moments. Each moment must be ${Math.max(20, opts.targetSeconds - 30)}-${opts.targetSeconds + 30} seconds long and meaningful on its own (a complete thought, story beat, or punchline). No overlaps. If the video is shorter than ${opts.targetSeconds} seconds, return a single moment covering the whole video.`,
    `For each moment: start/end in seconds, a punchy title under 12 words, a one-line hook, and a 2-sentence summary of what happens.`,
    frameLines,
  ].join("\n\n");

  type Part =
    | { type: "text"; text: string }
    | { type: "image"; image: Buffer; mediaType: string };
  const parts: Part[] = [{ type: "text", text: prompt }];
  for (const f of opts.frames) {
    parts.push({ type: "text", text: `Frame at ${fmtTime(Math.min(f.at, duration))}:` });
    parts.push({ type: "image", image: dataUrlToBuffer(f.image), mediaType: "image/jpeg" });
  }

  let lastError: unknown = null;
  for (const model of models) {
    try {
      const { object } = await generateObject({
        model,
        schema: MomentsSchema,
        messages: [{ role: "user", content: parts }],
        maxRetries: 0,
      });
      const moments = sanitizeMoments(object.moments, duration, opts.targetSeconds);
      if (moments.length > 0) return moments;
      lastError = new Error("The AI found no clear highlights. Try a video with more varied scenes.");
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  if (message.includes("429")) throw new Error("AI is rate limited right now. Please wait a moment and try again.");
  if (message.includes("503") || message.toLowerCase().includes("high demand") || message.toLowerCase().includes("overloaded")) {
    throw new Error("The AI model is busy right now. Please wait a minute and try again.");
  }
  throw new Error(`Highlight detection failed: ${message}`);
}
