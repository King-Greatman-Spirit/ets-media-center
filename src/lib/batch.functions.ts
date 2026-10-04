import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mkdir, readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serverEnv } from "@/lib/server-env";
import { detectVideoMoments, clampMoment } from "@/lib/moments.server";
import { cutUploadRegisterClip } from "@/lib/cutting.server";

// Batch pipeline for big local videos: the drop folder lives on the same
// machine as the server, so gigabyte files never travel through the browser.
// Only the small finished clips are uploaded to Supabase. Server-only.

const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"]);
const MAX_LOCAL_BYTES = 2_000_000_000;

async function inboxDir(): Promise<string> {
  const configured = serverEnv("ETS_MEDIA_DIR");
  const dir = configured ? resolve(configured) : join(process.cwd(), "media-inbox");
  await mkdir(dir, { recursive: true });
  return dir;
}

function safeJoin(dir: string, filename: string): string {
  const base = basename(filename);
  if (!base || base === "." || base === ".." || base.includes("\0")) {
    throw new Error("Invalid file name.");
  }
  const full = join(dir, base);
  if (full !== join(dir, base) || !full.startsWith(dir)) throw new Error("Invalid file name.");
  return full;
}

/** List playable videos sitting in the local inbox folder. */
export const listInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input))
  .handler(async () => {
    const dir = await inboxDir();
    const entries = await readdir(dir);
    const videos: { name: string; sizeBytes: number; mtime: number }[] = [];
    for (const name of entries) {
      const dot = name.lastIndexOf(".");
      if (dot < 0 || !VIDEO_EXTS.has(name.slice(dot).toLowerCase())) continue;
      try {
        const st = await stat(join(dir, name));
        if (st.isFile()) videos.push({ name, sizeBytes: st.size, mtime: st.mtimeMs });
      } catch {
        // Skip unreadable entries.
      }
    }
    videos.sort((a, b) => b.mtime - a.mtime);
    return { dir, videos };
  });

const DetectInput = z
  .object({
    assetId: z.string().uuid().optional(),
    filename: z.string().min(1).max(200).optional(),
    duration: z.number().min(1).max(3 * 3600).optional(),
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
    focusStart: z.number().min(0).optional(),
    focusEnd: z.number().min(1).optional(),
  })
  .refine((d) => (d.assetId ? 1 : 0) + (d.filename ? 1 : 0) === 1, {
    message: "Provide a library asset or an inbox file.",
  });

/** Find highlight moments in a library video or inbox file from client-captured frames. */
export const detectMoments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DetectInput.parse(input))
  .handler(async ({ data, context }) => {
    let displayName: string;
    let duration = data.duration ?? 0;
    if (data.assetId) {
      const { data: asset, error } = await context.supabase
        .from("media_assets")
        .select("name, kind, duration_seconds")
        .eq("id", data.assetId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!asset) throw new Error("Video not found.");
      if (asset.kind !== "video") throw new Error("Only videos can be split.");
      displayName = asset.name;
      if (!duration) duration = Number(asset.duration_seconds) || 0;
      if (!duration) throw new Error("Could not determine this video's length.");
    } else {
      const dir = await inboxDir();
      const full = safeJoin(dir, data.filename!);
      const st = await stat(full).catch(() => null);
      if (!st?.isFile()) throw new Error("File not found in the inbox folder. Drop it in and retry.");
      if (st.size > MAX_LOCAL_BYTES) throw new Error("This file is too large (2 GB max).");
      displayName = basename(data.filename!);
      if (!duration) {
        const { probeDurationSeconds } = await import("@/lib/cutting.server");
        duration = await probeDurationSeconds(full);
      }
      if (!duration) throw new Error("Could not determine this video's length.");
    }
    const moments = await detectVideoMoments({
      assetName: displayName,
      duration,
      targetSeconds: data.targetSeconds,
      frames: data.frames,
      focusStart: data.focusStart,
      focusEnd: data.focusEnd,
    });
    return { moments };
  });

const CutInboxInput = z.object({
  filename: z.string().min(1).max(200),
  index: z.number().int().min(0).max(24),
  moment: z.object({
    start: z.number().min(0),
    end: z.number().min(1),
    title: z.string().max(120),
    hook: z.string().max(200),
    summary: z.string().max(600),
  }),
  vertical: z.boolean().default(true),
  quality: z.enum(["fast", "best"]).default("fast"),
});

/** Cut one approved moment from an inbox file (optionally vertical 9:16). */

/** Cut one approved moment from an inbox file (optionally vertical 9:16). */
export const cutInboxClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CutInboxInput.parse(input))
  .handler(async ({ data, context }) => {
    const dir = await inboxDir();
    const full = safeJoin(dir, data.filename);
    const st = await stat(full).catch(() => null);
    if (!st?.isFile()) throw new Error("File not found in the inbox folder.");
    // Bounds-check only: detection already validated lengths.
    const moment = clampMoment(data.moment, 3 * 3600);
    if (!moment) throw new Error("Invalid clip range.");
    const baseName = basename(data.filename).replace(/\.[a-z0-9]+$/i, "");
    return cutUploadRegisterClip({
      supabase: context.supabase,
      userId: context.userId,
      inputPath: full,
      baseName,
      index: data.index,
      moment,
      vertical: data.vertical,
      quality: data.quality,
    });
  });

const CutLibraryInput = z.object({
  assetId: z.string().uuid(),
  index: z.number().int().min(0).max(24),
  moment: z.object({
    start: z.number().min(0),
    end: z.number().min(1),
    title: z.string().max(120),
    hook: z.string().max(200),
    summary: z.string().max(600),
  }),
  vertical: z.boolean().default(false),
  quality: z.enum(["fast", "best"]).default("fast"),
});

/** Cut one approved moment from a library video (optionally vertical 9:16). */
export const cutLibraryClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CutLibraryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, user_id, name, kind, storage_path, size_bytes")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Video not found.");
    if (asset.kind !== "video") throw new Error("Only videos can be split.");
    // Bounds-check only: detection already validated lengths.
    const moment = clampMoment(data.moment, 3 * 3600);
    if (!moment) throw new Error("Invalid clip range.");

    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const workdir = await mkdtemp(join(tmpdir(), "ets-dl-"));
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));
      return cutUploadRegisterClip({
        supabase: context.supabase,
        userId: asset.user_id,
        inputPath,
        baseName: asset.name.replace(/\.[a-z0-9]+$/i, ""),
        index: data.index,
        moment,
        vertical: data.vertical,
        quality: data.quality,
      });
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });

const FramesInput = z.object({
  filename: z.string().min(1).max(200),
  count: z.number().int().min(2).max(12).default(10),
  from: z.number().min(0).optional(),
  to: z.number().min(1).optional(),
});

/** Pull evenly spaced JPEG stills from an inbox file with ffmpeg. */
export const extractFrames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FramesInput.parse(input))
  .handler(async ({ data }) => {
    const dir = await inboxDir();
    const full = safeJoin(dir, data.filename);
    const st = await stat(full).catch(() => null);
    if (!st?.isFile()) throw new Error("File not found in the inbox folder. Drop it in and retry.");
    const { probeDurationSeconds, ffmpegBinary } = await import("@/lib/cutting.server");
    const fullDuration = await probeDurationSeconds(full);
    if (!fullDuration) throw new Error("Could not read this video's length.");
    const from = Math.max(0, Math.min(data.from ?? 0, fullDuration - 1));
    const to = Math.max(from + 1, Math.min(data.to ?? fullDuration, fullDuration));
    const { mkdtemp, rm, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const workdir = await mkdtemp(join(tmpdir(), "ets-frames-"));
    try {
      const frames: { at: number; image: string }[] = [];
      for (let k = 1; k <= data.count; k++) {
        const at = from + ((to - from) * k) / (data.count + 1);
        const out = join(workdir, `f${k}.jpg`);
        try {
          await execFileAsync(
            ffmpegBinary(),
            ["-y", "-ss", String(Math.round(at * 10) / 10), "-i", full, "-frames:v", "1", "-q:v", "5", "-vf", "scale=560:-2", out],
            { timeout: 90_000 },
          );
          const bytes = await readFile(out);
          frames.push({ at, image: `data:image/jpeg;base64,${bytes.toString("base64")}` });
        } catch {
          // Skip unreadable positions.
        }
      }
      if (frames.length < 2) throw new Error("Could not read frames from this file.");
      return { duration: fullDuration, frames };
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });
