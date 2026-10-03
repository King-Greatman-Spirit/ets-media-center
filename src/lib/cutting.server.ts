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

const execFileAsync = promisify(execFile);

export type CutResult = {
  id: string;
  name: string;
  title: string;
  start: number;
  end: number;
};

/** 9:16 for Shorts/Reels/TikTok: fill-crop to 1080x1920. */
export const VERTICAL_FILTER =
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1";

/** Resolve the bundled ffmpeg binary or throw a plain-language error. */
export function ffmpegBinary(): string {
  if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");
  return ffmpegPath as string;
}

/** Read duration via `ffmpeg -i` stderr (no ffprobe binary shipped). 0 when unknown. */
export async function probeDurationSeconds(inputPath: string): Promise<number> {
  try {
    await execFileAsync(ffmpegBinary(), ["-i", inputPath], { timeout: 30_000 });
  } catch (e) {
    const stderr = String((e as { stderr?: unknown })?.stderr ?? "");
    const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(stderr);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]!);
  }
  return 0;
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
}): Promise<CutResult> {
  if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");
  const { supabase, userId, inputPath, baseName, index, moment, vertical } = opts;
  const length = Math.round((moment.end - moment.start) * 10) / 10;
  if (!(length > 0)) throw new Error("Empty clip range.");

  const workdir = await mkdtemp(join(tmpdir(), "ets-cut-"));
  try {
    const clipFile = join(workdir, "clip.mp4");
    const cutArgs = vertical
      ? [
          "-y", "-ss", String(moment.start), "-i", inputPath, "-t", String(length),
          "-vf", VERTICAL_FILTER, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
          "-c:a", "aac", "-movflags", "+faststart", clipFile,
        ]
      : [
          "-y", "-ss", String(moment.start), "-i", inputPath, "-t", String(length),
          "-c", "copy", "-avoid_negative_ts", "make_zero", clipFile,
        ];
    await execFileAsync(ffmpegPath as string, cutArgs, { timeout: vertical ? 600_000 : 180_000 });
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
