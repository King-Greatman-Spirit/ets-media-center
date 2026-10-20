import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import type { Database } from "@/integrations/supabase/types";
import type { Moment } from "@/lib/moments.server";

// Shared video cutting used by the Library splitter and the Shorts batch flow.
// Server-only. Each clip is cut with ffmpeg, thumbnailed, uploaded to the
// `media` bucket, and registered as its own media_assets row.

export const execFileAsync = promisify(execFile);
export { ffmpegPath };

/** Run ffmpeg: full output goes to the server log, callers get a short message. */
export async function runFfmpeg(args: string[], timeoutMs: number, label: string): Promise<void> {
  try {
    await execFileAsync(ffmpegBinary(), args, { timeout: timeoutMs });
  } catch (e) {
    const stderr = String((e as { stderr?: unknown })?.stderr ?? (e instanceof Error ? e.message : e));
    console.error(`[ffmpeg:${label}]`, stderr.slice(-2000));
    const meaningful = stderr
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("ffmpeg version") && !l.startsWith("  ") && !/^Fontconfig error/i.test(l));
    const first = meaningful.slice(-1)[0];
    const meaningfulText = meaningful.join("\n");
    const hint = /No such file/i.test(meaningfulText)
      ? "a source file went missing"
      : /Invalid data found|could not find codec|invalid/i.test(meaningfulText)
        ? "the video data could not be read"
        : "video processing failed";
    throw new Error(`Clip ${label} failed: ${hint}${first ? ` (${first.slice(0, 160)})` : ""}.`);
  }
}

export type CutResult = {
  id: string;
  name: string;
  title: string;
  start: number;
  end: number;
};

/** 9:16 for Shorts/Reels/TikTok: fill-crop to WxH. */
export function verticalFilter(height: 720 | 1080): string {
  const w = height === 1080 ? 1080 : 720;
  const h = height;
  return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;
}

/** 9:16 for Shorts/Reels/TikTok: fill-crop to 1080x1920. */
export const VERTICAL_FILTER = verticalFilter(1080);

/** Resolve the bundled ffmpeg binary or throw a plain-language error. */
export function ffmpegBinary(): string {
  if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");
  return ffmpegPath as string;
}

/** Read duration/dimensions via `ffmpeg -i` stderr (no ffprobe binary shipped). */
export async function probeMediaInfo(
  inputPath: string,
): Promise<{ duration: number; width: number; height: number }> {
  try {
    await execFileAsync(ffmpegBinary(), ["-i", inputPath], { timeout: 30_000 });
  } catch (e) {
    const stderr = String((e as { stderr?: unknown })?.stderr ?? "");
    const dur = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(stderr);
    const videoLine = stderr.split("\n").find((l) => l.includes("Video:")) ?? "";
    const dim = /(\d{2,5})x(\d{2,5})/.exec(videoLine);
    return {
      duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]!) : 0,
      width: dim ? Number(dim[1]) : 0,
      height: dim ? Number(dim[2]) : 0,
    };
  }
  return { duration: 0, width: 0, height: 0 };
}

/** Read duration via `ffmpeg -i` stderr (no ffprobe binary shipped). 0 when unknown. */
export async function probeDurationSeconds(inputPath: string): Promise<number> {
  return (await probeMediaInfo(inputPath)).duration;
}

/** Stage a logo from a base64 data URL to a temp PNG for ffmpeg overlay. */
export async function stageLogo(dataUrl: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Logo must be a PNG or JPG image.");
  const workdir = await mkdtemp(join(tmpdir(), "ets-logo-"));
  const ext = match[1] === "png" ? "png" : "jpg";
  const path = join(workdir, `logo.${ext}`);
  await writeFile(path, Buffer.from(match[2]!, "base64"));
  return { path, cleanup: () => rm(workdir, { recursive: true, force: true }).catch(() => {}) };
}

export async function cutUploadRegisterClip(opts: {
  supabase: SupabaseClient<Database>;
  userId: string;
  /** Local path of the full source video. */
  inputPath: string;
  baseName: string;
  index: number;
  moment: Moment;
  /** Re-encode to vertical 9:16 instead of fast stream copy. */
  vertical: boolean;
  /** Vertical output size. Fast 720p is ~3x quicker and still crisp on phones. */
  quality?: "fast" | "best";
  /** Watermark text filter (ffmpeg drawtext). null to skip. */
  watermarkText?: string | null;
  /** Watermark text position. */
  watermarkPosition?: string | null;
  /** Local path of logo image for overlay. null to skip. */
  logoPath?: string | null;
  /** Logo position on the clip (9-grid). */
  logoPosition?:
    | "top-left" | "top-center" | "top-right"
    | "middle-left" | "middle-center" | "middle-right"
    | "bottom-left" | "bottom-center" | "bottom-right"
    | "none";
  /** Watermark text position. */
  textPosition?: string;
}): Promise<CutResult> {
  if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");
  const { supabase, userId, inputPath, baseName, index, moment, vertical } = opts;
  const quality = opts.quality ?? "fast";
  const length = Math.round((moment.end - moment.start) * 10) / 10;
  if (!(length > 0)) throw new Error("Empty clip range.");

  // Already vertical? Skip the slow re-encode entirely — stream copy instead.
  // NOTE: any pixel filter (watermark text/logo) forces a re-encode; filters
  // and stream-copy are mutually exclusive in ffmpeg.
  let convert = vertical;
  if (vertical) {
    const info = await probeMediaInfo(inputPath);
    if (info.width > 0 && info.height > 0 && info.height / info.width >= 1.5) {
      convert = false;
    }
  }

  const start = moment.start;
  if (!Number.isFinite(start) || start < 0) throw new Error("Invalid clip start time.");

  const workdir = await mkdtemp(join(tmpdir(), "ets-cut-"));
  try {
    const clipFile = join(workdir, "clip.mp4");
    const filters: string[] = [];

    // Build watermark text filter
    if (opts.watermarkText?.trim()) {
      const fontSize = 32;
      const margin = 24;
      const pos = opts.textPosition ?? "bottom-right";
      const x = pos.includes("right") ? `w-text_w-${margin}` : pos.includes("left") ? `${margin}` : `(w-text_w)/2`;
      const y = pos.includes("bottom") ? `h-text_h-${margin}` : pos.includes("top") ? `${margin}` : `(h-text_h)/2`;
      const escaped = opts.watermarkText.replace(/'/g, "\\'").replace(/:/g, "\\:");
      filters.push(`drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=white@0.6:x=${x}:y=${y}:shadowcolor=black@0.5:shadowx=2:shadowy=2`);
    }

    // Pixel filters and stream-copy are mutually exclusive: burning a
    // watermark forces a re-encode even when the ratio is untouched.
    if (filters.length > 0) convert = true;

    // Fail fast with a precise message instead of ffmpeg's confusion.
    try {
      const st = await stat(inputPath);
      if (st.size < 1024) throw new Error("Source video file is empty.");
    } catch (e) {
      if (e instanceof Error && e.message === "Source video file is empty.") throw e;
      throw new Error("Source video file is missing.");
    }

    const cutArgs = convert
      ? [
          "-y", "-ss", String(start), "-i", inputPath, "-t", String(length),
          "-vf", [...filters, verticalFilter(quality === "best" ? 1080 : 720)].filter(Boolean).join(","),
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
          "-c:a", "aac", "-movflags", "+faststart", clipFile,
        ]
      : [
          "-y", "-ss", String(start), "-i", inputPath, "-t", String(length),
          "-c", "copy", "-avoid_negative_ts", "make_zero", clipFile,
        ];
    await runFfmpeg(cutArgs, convert ? 600_000 : 180_000, "cut");
    // Logo overlay (after cutting — it reads clipFile).
    if (opts.logoPath && opts.logoPosition && opts.logoPosition !== "none") {
      const [vAlign, hAlign] = opts.logoPosition.split("-") as ["top" | "middle" | "bottom", "left" | "center" | "right"];
      const x = hAlign === "left" ? "20" : hAlign === "right" ? "W-w-20" : "(W-w)/2";
      const y = vAlign === "top" ? "20" : vAlign === "bottom" ? "H-h-20" : "(H-h)/2";
      const overlayArgs = [
        "-y", "-i", clipFile, "-i", opts.logoPath,
        "-filter_complex", `[1:v]scale=160:-1[logo];[0:v][logo]overlay=${x}:${y}:shortest=1`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac",
        clipFile + ".tmp.mp4",
      ];
      await runFfmpeg(overlayArgs, 300_000, "logo");
      const { rename } = await import("node:fs/promises");
      await rename(clipFile + ".tmp.mp4", clipFile);
    }

    const clipStat = await stat(clipFile);
    if (clipStat.size < 1024) throw new Error("Cut produced an empty file.");

    const clipBytes = await readFile(clipFile);
    const clipPath = `${userId}/clips/${crypto.randomUUID()}.mp4`;
    const { error: clipUpError } = await supabase.storage
      .from("media")
      .upload(clipPath, clipBytes, { contentType: "video/mp4", upsert: false });
    if (clipUpError) throw new Error(clipUpError.message);

    let thumbnailPath: string | null = null;
    try {
      const thumbFile = join(workdir, "thumb.jpg");
      // Thumbnail from the finished clip so it matches the shipped orientation.
      const thumbSource = clipFile;
      const thumbAt = vertical ? 1 : Math.max(0.5, Math.min(length - 0.5, 2));
      await execFileAsync(
        ffmpegPath as string,
        ["-y", "-ss", String(thumbAt), "-i", thumbSource, "-frames:v", "1", "-q:v", "4", thumbFile],
        { timeout: 60_000 },
      );
      const thumbBytes = await readFile(thumbFile);
      thumbnailPath = `${userId}/thumbs/${crypto.randomUUID()}.jpg`;
      const { error: thumbUpError } = await supabase.storage
        .from("media")
        .upload(thumbnailPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
      if (thumbUpError) thumbnailPath = null;
    } catch {
      thumbnailPath = null;
    }

    const clipName = `${baseName} — Clip ${index + 1}`.slice(0, 160);
    const analysis = `Clip: ${moment.title}. Hook: ${moment.hook} ${moment.summary}`.slice(0, 1200);
    const { data: row, error: rowError } = await supabase
      .from("media_assets")
      .insert({
        user_id: userId,
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
    return { id: row.id, name: clipName, title: moment.title, start: moment.start, end: moment.end };
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Write raw bytes to a temp file for ffmpeg; returns path plus a cleanup fn. */
export async function stageTempFile(bytes: Buffer, name: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const workdir = await mkdtemp(join(tmpdir(), "ets-stage-"));
  const path = join(workdir, name);
  await writeFile(path, bytes);
  return { path, cleanup: () => rm(workdir, { recursive: true, force: true }).catch(() => {}) };
}
