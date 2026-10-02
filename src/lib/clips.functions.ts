import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAIModels } from "@/lib/ai-gateway.server";

const execFileAsync = promisify(execFile);

// Clips are cut with stream copy (fast, no re-encode) and capped in count.
const MAX_MOMENTS = 6;
const MAX_VIDEO_BYTES = 500_000_000;
const MAX_VIDEO_SECONDS = 20 * 60;

const SplitInput = z.object({
  assetId: z.string().uuid(),
  // Client-probed duration in seconds.
  duration: z.number().min(1).max(MAX_VIDEO_SECONDS),
  // Stills in time order with their timestamps.
  frames: z
    .array(
      z.object({
        at: z.number().min(0),
        image: z.string().max(800_000),
      }),
    )
    .min(2)
    .max(12),
  targetSeconds: z.number().min(20).max(120).default(60),
});

const MomentsSchema = z.object({
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
    .max(MAX_MOMENTS),
});

type Moment = z.infer<typeof MomentsSchema>["moments"][number];

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid frame data.");
  return Buffer.from(match[2]!, "base64");
}

function sanitizeMoments(raw: Moment[], duration: number, target: number): Moment[] {
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
    if (picked.length >= MAX_MOMENTS) break;
    if (picked.some((p) => m.start < p.end - 2 && p.start < m.end - 2)) continue;
    picked.push(m);
  }
  return picked;
}

export const splitVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SplitInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");

    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, user_id, name, kind, storage_path, size_bytes")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Video not found.");
    if (asset.kind !== "video") throw new Error("Only videos can be split into clips.");
    if ((asset.size_bytes ?? 0) > MAX_VIDEO_BYTES) {
      throw new Error("This video is too large to split here. Try a shorter file.");
    }

    const models = createAIModels();
    if (models.length === 0) {
      throw new Error(
        "AI is not configured yet. Add GOOGLE_GENERATIVE_AI_API_KEY (free, no card) or OPENAI_API_KEY (paid) to your .env file.",
      );
    }

    const duration = Math.min(data.duration, MAX_VIDEO_SECONDS);
    const frameLines = data.frames
      .map((f) => `Frame at ${fmtTime(Math.min(f.at, duration))}:`)
      .join("\n");
    const prompt = [
      `You are cutting a ${fmtTime(duration)} video titled "${asset.name}" into its most exciting, self-contained moments for short-form platforms (YouTube Shorts, TikTok, Reels).`,
      `Stills from the video follow, in time order. Use them plus the title to find the highlights.`,
      `Return ${1} to ${MAX_MOMENTS} moments. Each moment must be ${Math.max(20, data.targetSeconds - 30)}-${data.targetSeconds + 30} seconds long and meaningful on its own (a complete thought, story beat, or punchline). No overlaps. If the video is shorter than ${data.targetSeconds} seconds, return a single moment covering the whole video.`,
      `For each moment: start/end in seconds, a punchy title under 12 words, a one-line hook, and a 2-sentence summary of what happens.`,
      frameLines,
    ].join("\n\n");

    type Part =
      | { type: "text"; text: string }
      | { type: "image"; image: Buffer; mediaType: string };
    const parts: Part[] = [{ type: "text", text: prompt }];
    for (const f of data.frames) {
      parts.push({ type: "text", text: `Frame at ${fmtTime(Math.min(f.at, duration))}:` });
      parts.push({ type: "image", image: dataUrlToBuffer(f.image), mediaType: "image/jpeg" });
    }

    let moments: Moment[] = [];
    let lastError: unknown = null;
    for (const model of models) {
      try {
        const { object } = await generateObject({
          model,
          schema: MomentsSchema,
          messages: [{ role: "user", content: parts }],
          maxRetries: 0,
        });
        moments = sanitizeMoments(object.moments, duration, data.targetSeconds);
        if (moments.length > 0) break;
        lastError = new Error("The AI found no clear highlights. Try a video with more varied scenes.");
      } catch (error) {
        lastError = error;
      }
    }
    if (moments.length === 0) {
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      if (message.includes("429")) throw new Error("AI is rate limited right now. Please wait a moment and try again.");
      if (message.includes("503") || message.toLowerCase().includes("high demand") || message.toLowerCase().includes("overloaded")) {
        throw new Error("The AI model is busy right now. Please wait a minute and try again.");
      }
      throw new Error(`Clip detection failed: ${message}`);
    }

    // Download once, cut with stream copy, upload each clip + thumbnail.
    const workdir = await mkdtemp(join(tmpdir(), "ets-clips-"));
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

      const baseName = asset.name.replace(/\.[a-z0-9]+$/i, "");
      const clips: { id: string; name: string; title: string; start: number; end: number }[] = [];

      for (let i = 0; i < moments.length; i++) {
        const m = moments[i]!;
        const length = Math.round((m.end - m.start) * 10) / 10;
        const clipFile = join(workdir, `clip-${i}.mp4`);
        const thumbFile = join(workdir, `thumb-${i}.jpg`);
        try {
          await execFileAsync(
            ffmpegPath as string,
            ["-y", "-ss", String(m.start), "-i", inputPath, "-t", String(length), "-c", "copy", "-avoid_negative_ts", "make_zero", clipFile],
            { timeout: 180_000 },
          );
          const clipStat = await stat(clipFile);
          if (clipStat.size < 1024) throw new Error("Cut produced an empty file.");

          const { readFile } = await import("node:fs/promises");
          const clipBytes = await readFile(clipFile);
          const clipPath = `${asset.user_id}/clips/${crypto.randomUUID()}.mp4`;
          const { error: clipUpError } = await context.supabase.storage
            .from("media")
            .upload(clipPath, clipBytes, { contentType: "video/mp4", upsert: false });
          if (clipUpError) throw new Error(clipUpError.message);

          // Thumbnail from inside the clip.
          let thumbnailPath: string | null = null;
          try {
            await execFileAsync(
              ffmpegPath as string,
              ["-y", "-ss", String(Math.min(m.start + 2, m.end - 0.5)), "-i", inputPath, "-frames:v", "1", "-q:v", "4", thumbFile],
              { timeout: 60_000 },
            );
            const thumbBytes = await readFile(thumbFile);
            thumbnailPath = `${asset.user_id}/thumbs/${crypto.randomUUID()}.jpg`;
            const { error: thumbUpError } = await context.supabase.storage
              .from("media")
              .upload(thumbnailPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
            if (thumbUpError) thumbnailPath = null;
          } catch {
            thumbnailPath = null;
          }

          const clipName = `${baseName} — Clip ${i + 1}`.slice(0, 160);
          const analysis = `Clip: ${m.title}. Hook: ${m.hook} ${m.summary}`.slice(0, 1200);
          const { data: row, error: rowError } = await context.supabase
            .from("media_assets")
            .insert({
              user_id: asset.user_id,
              name: clipName,
              kind: "video",
              storage_path: clipPath,
              mime_type: "video/mp4",
              size_bytes: clipStat.size,
              thumbnail_path: thumbnailPath,
              duration_seconds: length,
              analysis_text: analysis,
            })
            .select("id")
            .single();
          if (rowError || !row) throw new Error(rowError?.message ?? "Could not save clip.");
          clips.push({ id: row.id, name: clipName, title: m.title, start: m.start, end: m.end });
        } catch (e) {
          throw new Error(`Clip ${i + 1} failed: ${e instanceof Error ? e.message : "cut failed"}`);
        }
      }
      return { clips };
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });
