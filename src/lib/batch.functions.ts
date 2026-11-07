import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serverEnv } from "@/lib/server-env";
import { detectVideoMoments, clampMoment, type Moment } from "@/lib/moments.server";
import { cutUploadRegisterClip, stageLogo } from "@/lib/cutting.server";
import { createJob, updateJob, readJob } from "@/lib/jobs.server";
import { repurposeCore } from "@/lib/ai.functions";
import type { PlatformId } from "@/lib/platforms";

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
      .max(12)
      .default([]),
    targetSeconds: z.number().min(20).max(120).default(60),
    focusStart: z.number().min(0).optional(),
    focusEnd: z.number().min(1).optional(),
  })
  .refine((d) => (d.assetId ? 1 : 0) + (d.filename ? 1 : 0) === 1, {
    message: "Provide a library asset or an inbox file.",
  });

/** Pull evenly spaced JPEG stills from a local file with ffmpeg. */
async function extractFramesFromFile(
  fullPath: string,
  fullDuration: number,
  count: number,
  fromRaw?: number,
  toRaw?: number,
): Promise<{ at: number; image: string }[]> {
  const from = Math.max(0, Math.min(fromRaw ?? 0, Math.max(fullDuration - 1, 0)));
  const to = Math.max(from + 1, Math.min(toRaw ?? fullDuration, fullDuration));
  const { mkdtemp, rm, readFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { ffmpegBinary } = await import("@/lib/cutting.server");
  const execFileAsync = promisify(execFile);
  const workdir = await mkdtemp(join(tmpdir(), "ets-frames-"));
  try {
    const frames: { at: number; image: string }[] = [];
    for (let k = 1; k <= count; k++) {
      const at = from + ((to - from) * k) / (count + 1);
      const out = join(workdir, `f${k}.jpg`);
      try {
        await execFileAsync(
          ffmpegBinary(),
          ["-y", "-ss", String(Math.round(at * 10) / 10), "-i", fullPath, "-frames:v", "1", "-q:v", "5", "-vf", "scale=560:-2", out],
          { timeout: 30_000 },
        );
        const bytes = await readFile(out);
        frames.push({ at, image: `data:image/jpeg;base64,${bytes.toString("base64")}` });
      } catch {
        // Skip unreadable positions.
      }
    }
    return frames;
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Find highlights in a library or inbox video. Frames are extracted on the
 * server with ffmpeg — extracting them in the browser with <video> seeking
 * over a signed URL was the slowest part of detection by far. */
export const detectMoments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DetectInput.parse(input))
  .handler(async ({ data, context }) => {
    let displayName: string;
    let duration = data.duration ?? 0;
    let frames = data.frames;
    if (data.assetId) {
      const { data: asset, error } = await context.supabase
        .from("media_assets")
        .select("name, kind, duration_seconds, storage_path, size_bytes")
        .eq("id", data.assetId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!asset) throw new Error("Video not found.");
      if (asset.kind !== "video") throw new Error("Only videos can be split.");
      displayName = asset.name;
      if (!duration) duration = Number(asset.duration_seconds) || 0;
      if (!duration) throw new Error("Could not determine this video's length.");
      // Server-side: reuse the cached download, then grab stills with ffmpeg.
      // Browser seeking a multi-hundred-MB file over the network, segment by
      // segment, is what made detection crawl.
      const inputPath = await cachedSource({
        supabase: context.supabase,
        storagePath: asset.storage_path,
        expectedSize: Number(asset.size_bytes) || null,
        name: asset.name,
      });
      frames = await extractFramesFromFile(inputPath, duration, 8, data.focusStart, data.focusEnd);
      if (frames.length < 2) throw new Error("Could not read frames from this video to split it.");
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
    if (frames.length < 2) throw new Error("Could not read frames from this video to split it.");
    const moments = await detectVideoMoments({
      assetName: displayName,
      duration,
      targetSeconds: data.targetSeconds,
      frames,
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
  watermarkText: z.string().max(100).optional(),
  watermarkPosition: z.string().default("middle-center"),
  watermarkSize: z.enum(["small", "medium", "large"]).default("medium"),
  logoDataUrl: z.string().max(500000).optional(),
  logoPosition: z.enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right", "none"]).default("none"),
});

/** Cut one approved moment from an inbox file (optionally vertical 9:16). */
export const cutInboxClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CutInboxInput.parse(input))
  .handler(async ({ data, context }) => {
    const dir = await inboxDir();
    const full = safeJoin(dir, data.filename);
    const st = await stat(full).catch(() => null);
    if (!st?.isFile()) throw new Error("File not found in the inbox folder.");
    const moment = clampMoment(data.moment, 3 * 3600);
    if (!moment) throw new Error("Invalid clip range.");
    const baseName = basename(data.filename).replace(/\.[a-z0-9]+$/i, "");
    return cutWithBranding(context, {
      inputPath: full,
      baseName,
      index: data.index,
      moment,
      vertical: data.vertical,
      quality: data.quality,
      watermarkText: data.watermarkText ?? undefined,
      watermarkPosition: data.watermarkPosition ?? "middle-center",
      watermarkSize: data.watermarkSize ?? "medium",
      logoDataUrl: data.logoDataUrl ?? undefined,
      logoPosition: data.logoPosition ?? "none",
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
  watermarkText: z.string().max(100).optional(),
  watermarkPosition: z.string().default("middle-center"),
  watermarkSize: z.enum(["small", "medium", "large"]).default("medium"),
  logoDataUrl: z.string().max(500000).optional(),
  logoPosition: z.enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right", "none"]).default("none"),
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
    const moment = clampMoment(data.moment, 3 * 3600);
    if (!moment) throw new Error("Invalid clip range.");

    const inputPath = await cachedSource({
      supabase: context.supabase,
      storagePath: asset.storage_path,
      expectedSize: Number(asset.size_bytes) || null,
      name: asset.name,
    });
    return await cutWithBranding(context, {
      inputPath,
      baseName: asset.name.replace(/\.[a-z0-9]+$/i, ""),
      index: data.index,
      moment,
      vertical: data.vertical,
      quality: data.quality,
      watermarkText: data.watermarkText ?? undefined,
      watermarkPosition: data.watermarkPosition ?? "middle-center",
      watermarkSize: data.watermarkSize ?? "medium",
      logoDataUrl: data.logoDataUrl ?? undefined,
      logoPosition: data.logoPosition ?? "none",
    });
  });

// Downloaded sources are cached on disk: cutting five clips from one 200 MB
// recording used to download that recording five separate times, which was the
// biggest part of the wait. Reused when the file is the same size as the row.
const SOURCE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let prunedCacheOnce = false;

async function cachedSource(opts: {
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>;
  storagePath: string;
  expectedSize: number | null;
  name: string;
}): Promise<string> {
  const dir = join(tmpdir(), "ets-source-cache");
  await mkdir(dir, { recursive: true });

  if (!prunedCacheOnce) {
    prunedCacheOnce = true;
    try {
      const now = Date.now();
      for (const entry of await readdir(dir)) {
        const full = join(dir, entry);
        const st = await stat(full).catch(() => null);
        if (st?.isFile() && now - st.mtimeMs > SOURCE_CACHE_TTL_MS) {
          await rm(full, { force: true }).catch(() => {});
        }
      }
    } catch {
      // Pruning is best-effort.
    }
  }

  const key = createHash("sha1").update(opts.storagePath).digest("hex");
  const ext = (/\.[a-z0-9]+$/i.exec(opts.name)?.[0] ?? ".mp4").toLowerCase();
  const target = join(dir, key + ext);

  const existing = await stat(target).catch(() => null);
  const reusable =
    existing?.isFile() &&
    existing.size > 1024 &&
    (!opts.expectedSize || existing.size === opts.expectedSize);
  if (reusable) return target;

  const { data: blob, error: dlError } = await opts.supabase.storage
    .from("media")
    .download(opts.storagePath);
  if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
  if (blob.size < 1024) {
    throw new Error(
      `"${opts.name}" downloaded empty — its file is missing from storage. Delete that row and re-upload the video.`,
    );
  }
  await writeFile(target, Buffer.from(await blob.arrayBuffer()));
  return target;
}

/** Shared cut + brand + upload + register. Handles logo staging and cleanup. */
async function cutWithBranding(
  context: { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string },
  opts: {
    inputPath: string;
    baseName: string;
    index: number;
    moment: import("@/lib/moments.server").Moment;
    vertical: boolean;
    quality: "fast" | "best";
    watermarkText?: string | undefined;
    watermarkPosition?: string | undefined;
    watermarkSize?: "small" | "medium" | "large" | undefined;
    logoDataUrl?: string | undefined;
    logoPosition?: "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right" | "none" | undefined;
    coverAt?: number | undefined;
    coverHeadline?: string | undefined;
    coverSubline?: string | undefined;
    format?: "vertical" | "landscape" | "original" | undefined;
  },
) {
  let logoPath: string | null = null;
  let logoCleanup: (() => Promise<void>) | null = null;
  try {
    if (opts.logoDataUrl && opts.logoPosition && opts.logoPosition !== "none") {
      const staged = await stageLogo(opts.logoDataUrl);
      logoPath = staged.path;
      logoCleanup = staged.cleanup;
    }
    return await cutUploadRegisterClip({
      supabase: context.supabase,
      userId: context.userId,
      inputPath: opts.inputPath,
      baseName: opts.baseName,
      index: opts.index,
      moment: opts.moment,
      vertical: opts.vertical,
      quality: opts.quality,
      watermarkText: opts.watermarkText ?? null,
      watermarkPosition: opts.watermarkPosition ?? "middle-center",
      watermarkSize: opts.watermarkSize ?? "medium",
      logoPath,
      logoPosition: opts.logoPosition ?? "none",
      coverAt: opts.coverAt,
      coverHeadline: opts.coverHeadline,
      coverSubline: opts.coverSubline,
      format: opts.format,
    });
  } finally {
    if (logoCleanup) await logoCleanup();
  }
}

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
    const { probeDurationSeconds } = await import("@/lib/cutting.server");
    const fullDuration = await probeDurationSeconds(full);
    if (!fullDuration) throw new Error("Could not read this video's length.");
    const frames = await extractFramesFromFile(full, fullDuration, data.count, data.from, data.to);
    if (frames.length < 2) throw new Error("Could not read frames from this file.");
    return { duration: fullDuration, frames };
  });

// --- Background jobs -------------------------------------------------------
// Detection and cutting run here, on the server, decoupled from the browser
// tab. The page starts a job and polls getJob; closing or refreshing the tab
// no longer stops the work.

type SupabaseCtx = {
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>;
  userId: string;
};

async function runDetectJob(
  jobId: string,
  ctx: SupabaseCtx,
  data: { assetId?: string | undefined; filename?: string | undefined; targetSeconds: number },
): Promise<void> {
  try {
    await updateJob(jobId, { progress: "Preparing video — downloading once, then cached…" });
    let displayName = "";
    let duration = 0;
    let inputPath = "";

    if (data.assetId) {
      const { data: asset, error } = await ctx.supabase
        .from("media_assets")
        .select("name, kind, duration_seconds, storage_path, size_bytes")
        .eq("id", data.assetId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!asset) throw new Error("Video not found.");
      if (asset.kind !== "video") throw new Error("Only videos can be split.");
      displayName = asset.name;
      inputPath = await cachedSource({
        supabase: ctx.supabase,
        storagePath: asset.storage_path,
        expectedSize: Number(asset.size_bytes) || null,
        name: asset.name,
      });
      duration = Number(asset.duration_seconds) || 0;
      if (!duration) {
        const { probeDurationSeconds } = await import("@/lib/cutting.server");
        duration = await probeDurationSeconds(inputPath);
      }
    } else {
      const dir = await inboxDir();
      inputPath = safeJoin(dir, data.filename!);
      const st = await stat(inputPath).catch(() => null);
      if (!st?.isFile()) throw new Error("File not found in the inbox folder.");
      displayName = basename(data.filename!);
      const { probeDurationSeconds } = await import("@/lib/cutting.server");
      duration = await probeDurationSeconds(inputPath);
    }
    if (!duration) throw new Error("Could not determine this video's length.");

    const SEGMENT = 10 * 60;
    const MAX_SEGMENTS = 8;
    const segments: { from: number; to: number }[] = [];
    for (let s = 0; s < duration && segments.length < MAX_SEGMENTS; s += SEGMENT) {
      segments.push({ from: s, to: Math.min(s + SEGMENT, duration) });
    }

    const merged: Moment[] = [];
    let failures = 0;
    let done = 0;
    async function scanSegment(seg: { from: number; to: number }) {
      try {
        const frames = await extractFramesFromFile(inputPath, duration, 8, seg.from, seg.to);
        if (frames.length < 2) throw new Error("Could not read frames from this section.");
        const found = await detectVideoMoments({
          assetName: displayName,
          duration,
          targetSeconds: data.targetSeconds,
          frames,
          focusStart: seg.from,
          focusEnd: seg.to,
        });
        merged.push(...found);
      } catch (e) {
        failures++;
        console.warn("[detect-job] section skipped:", e instanceof Error ? e.message : e);
      } finally {
        done++;
        await updateJob(jobId, {
          progress: segments.length > 1 ? `Watching… ${done} of ${segments.length} sections done` : "Watching for the best moments…",
        }).catch(() => {});
      }
    }
    const CONCURRENCY = 2;
    for (let i = 0; i < segments.length; i += CONCURRENCY) {
      await Promise.all(segments.slice(i, i + CONCURRENCY).map((seg) => scanSegment(seg)));
    }

    merged.sort((a, b) => a.start - b.start);
    const capped = merged.slice(0, 24);
    if (capped.length === 0) {
      throw new Error(
        failures > 0
          ? "The AI is busy right now — wait a minute and press Detect again."
          : "The AI found no clear highlights. Try a video with more varied scenes.",
      );
    }
    await updateJob(jobId, { status: "done", progress: `${capped.length} highlights found`, moments: capped });
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      progress: "Detection failed",
      error: e instanceof Error ? e.message : "Detection failed",
    }).catch(() => {});
  }
}

const StartDetectInput = z
  .object({
    assetId: z.string().uuid().optional(),
    filename: z.string().min(1).max(200).optional(),
    targetSeconds: z.number().min(20).max(120).default(60),
  })
  .refine((d) => (d.assetId ? 1 : 0) + (d.filename ? 1 : 0) === 1, {
    message: "Provide a library asset or an inbox file.",
  });

export const startDetectJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartDetectInput.parse(input))
  .handler(async ({ data, context }) => {
    const job = await createJob(context.userId, "detect");
    void runDetectJob(job.id, { supabase: context.supabase, userId: context.userId }, data);
    return { jobId: job.id };
  });

const MomentInput = z.object({
  start: z.number().min(0),
  end: z.number().min(1),
  title: z.string().max(120),
  hook: z.string().max(200),
  summary: z.string().max(600),
});

const StartCutInput = z.object({
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("library"), assetId: z.string().uuid() }),
    z.object({ kind: z.literal("inbox"), filename: z.string().min(1).max(200) }),
  ]),
  moments: z.array(MomentInput).min(1).max(24),
  format: z.enum(["vertical", "landscape", "original"]).default("vertical"),
  quality: z.enum(["fast", "best"]).default("fast"),
  watermarkText: z.string().max(100).optional(),
  watermarkPosition: z.string().default("middle-center"),
  watermarkSize: z.enum(["small", "medium", "large"]).default("medium"),
  logoDataUrl: z.string().max(500000).optional(),
  logoPosition: z
    .enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right", "none"])
    .default("none"),
  tone: z.string().max(80).default("Bold & prophetic"),
  platforms: z.array(z.string()).min(1),
});

async function runCutJob(
  jobId: string,
  ctx: SupabaseCtx,
  data: z.infer<typeof StartCutInput>,
): Promise<void> {
  try {
    await updateJob(jobId, { progress: "Preparing video…" });
    let inputPath = "";
    let baseName = "";
    if (data.source.kind === "library") {
      const { data: asset, error } = await ctx.supabase
        .from("media_assets")
        .select("name, kind, storage_path, size_bytes")
        .eq("id", data.source.assetId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!asset) throw new Error("Video not found.");
      if (asset.kind !== "video") throw new Error("Only videos can be split.");
      inputPath = await cachedSource({
        supabase: ctx.supabase,
        storagePath: asset.storage_path,
        expectedSize: Number(asset.size_bytes) || null,
        name: asset.name,
      });
      baseName = asset.name.replace(/\.[a-z0-9]+$/i, "");
    } else {
      const dir = await inboxDir();
      inputPath = safeJoin(dir, data.source.filename);
      const st = await stat(inputPath).catch(() => null);
      if (!st?.isFile()) throw new Error("File not found in the inbox folder.");
      baseName = basename(data.source.filename).replace(/\.[a-z0-9]+$/i, "");
    }

    const wanted = data.moments
      .map((m) => clampMoment(m, 3 * 3600))
      .filter((m): m is Moment => m !== null);
    if (wanted.length === 0) throw new Error("No valid clip ranges.");

    const made: { id: string; name: string; title: string; thumbnailPath: string | null }[] = [];
    for (let i = 0; i < wanted.length; i++) {
      const m = wanted[i]!;
      await updateJob(jobId, { progress: `Cutting clip ${i + 1} of ${wanted.length}…` });
      const kept = await cutWithBranding(ctx, {
        inputPath,
        baseName,
        index: i,
        moment: m,
        vertical: data.format === "vertical",
        format: data.format,
        quality: data.quality,
        watermarkText: data.watermarkText ?? undefined,
        watermarkPosition: data.watermarkPosition ?? "middle-center",
        watermarkSize: data.watermarkSize ?? "medium",
        logoDataUrl: data.logoDataUrl ?? undefined,
        logoPosition: data.logoPosition ?? "none",
      });
      made.push({ id: kept.id, name: kept.name, title: kept.title, thumbnailPath: kept.thumbnailPath });
    }

    const written: { clipId: string; clipName: string; outputs: import("@/lib/ai.functions").RepurposeOutput[] }[] = [];
    let created = 0;
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(18, 0, 0, 0);
    for (let i = 0; i < made.length; i++) {
      const clip = made[i]!;
      const w = wanted[i]!;
      await updateJob(jobId, { progress: `Writing captions ${i + 1} of ${made.length}…` });
      try {
        const idea = `Clip: ${clip.title}. Hook: ${w.hook} ${w.summary}`.slice(0, 2000);
        const result = await repurposeCore({
          idea,
          tone: data.tone,
          platforms: data.platforms as PlatformId[],
          mediaName: clip.name,
          mediaKind: "video",
        });
        written.push({ clipId: clip.id, clipName: clip.name, outputs: result.outputs });
        const day = new Date(base);
        day.setDate(day.getDate() + i);
        for (const o of result.outputs) {
          const { error } = await ctx.supabase.from("scheduled_posts").insert({
            user_id: ctx.userId,
            title: o.title,
            content: `${o.body}\n\n${o.hashtags.join(" ")}`.trim(),
            platform: o.platform,
            status: "draft",
            scheduled_at: day.toISOString(),
            hashtags: o.hashtags,
            media_asset_id: clip.id,
          });
          if (!error) created++;
        }
      } catch (e) {
        console.warn(`[cut-job] captions failed for ${clip.name}:`, e instanceof Error ? e.message : e);
      }
    }

    await updateJob(jobId, {
      status: "done",
      progress: `${made.length} clips cut${created > 0 ? `, ${created} drafts queued` : ""}`,
      clips: made,
      captions: written,
      drafts: created,
    });
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      progress: "Cutting failed",
      error: e instanceof Error ? e.message : "Cutting failed",
    }).catch(() => {});
  }
}

export const startCutJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartCutInput.parse(input))
  .handler(async ({ data, context }) => {
    const job = await createJob(context.userId, "cut");
    void runCutJob(job.id, { supabase: context.supabase, userId: context.userId }, data);
    return { jobId: job.id };
  });

// --- Brand whole video (no cut) -------------------------------------------
// "Post it like that": keep the full video, burn in thumbnail + logo +
// watermark, write captions. Reuses the same cutWithBranding path with one
// moment spanning 0 → duration, so branding matches the cut pipeline exactly.

const StartBrandInput = z.object({
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("library"), assetId: z.string().uuid() }),
    z.object({ kind: z.literal("inbox"), filename: z.string().min(1).max(200) }),
  ]),
  title: z.string().max(120).optional(),
  summary: z.string().max(600).optional(),
  format: z.enum(["vertical", "landscape", "original"]).default("original"),
  quality: z.enum(["fast", "best"]).default("fast"),
  watermarkText: z.string().max(100).optional(),
  watermarkPosition: z.string().default("middle-center"),
  watermarkSize: z.enum(["small", "medium", "large"]).default("medium"),
  logoDataUrl: z.string().max(500000).optional(),
  logoPosition: z
    .enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right", "none"])
    .default("none"),
  tone: z.string().max(80).default("Bold & prophetic"),
  platforms: z.array(z.string()).min(1),
});

async function runBrandJob(
  jobId: string,
  ctx: SupabaseCtx,
  data: z.infer<typeof StartBrandInput>,
): Promise<void> {
  try {
    await updateJob(jobId, { progress: "Preparing video…" });
    let inputPath = "";
    let baseName = "";
    if (data.source.kind === "library") {
      const { data: asset, error } = await ctx.supabase
        .from("media_assets")
        .select("name, kind, storage_path, size_bytes")
        .eq("id", data.source.assetId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!asset) throw new Error("Video not found.");
      if (asset.kind !== "video") throw new Error("Only videos can be branded.");
      inputPath = await cachedSource({
        supabase: ctx.supabase,
        storagePath: asset.storage_path,
        expectedSize: Number(asset.size_bytes) || null,
        name: asset.name,
      });
      baseName = asset.name.replace(/\.[a-z0-9]+$/i, "");
    } else {
      const dir = await inboxDir();
      inputPath = safeJoin(dir, data.source.filename);
      const st = await stat(inputPath).catch(() => null);
      if (!st?.isFile()) throw new Error("File not found in the inbox folder.");
      baseName = basename(data.source.filename).replace(/\.[a-z0-9]+$/i, "");
    }

    const { probeDurationSeconds } = await import("@/lib/cutting.server");
    const duration = await probeDurationSeconds(inputPath);
    if (!duration) throw new Error("Could not determine this video's length.");

    // Look at the video so the cover shows what actually happens in it and
    // captions can name the real moment — not just the file name. If the AI is
    // busy, branding still proceeds with the user's own title/summary.
    let hero: Moment | null = null;
    try {
      await updateJob(jobId, { progress: "Looking for the best moment for your cover…" });
      const frames = await extractFramesFromFile(inputPath, duration, 12);
      if (frames.length >= 2) {
        const found = await detectVideoMoments({
          assetName: baseName,
          duration,
          targetSeconds: Math.min(120, Math.max(20, Math.round(duration / 6))),
          frames,
        });
        hero = found[0] ?? null;
      }
    } catch (e) {
      console.warn("[brand-job] hero detection skipped:", e instanceof Error ? e.message : e);
    }

    const userTitle = data.title?.trim() || "";
    const userSummary = data.summary?.trim() || "";
    const moment: Moment = {
      start: 0,
      end: duration,
      title: userTitle || hero?.title || baseName,
      hook: hero?.hook ?? "",
      summary: userSummary || hero?.summary || "",
    };

    await updateJob(jobId, { progress: "Branding video — logo, watermark, thumbnail…" });
    const kept = await cutWithBranding(ctx, {
      inputPath,
      baseName,
      index: 0,
      moment,
      vertical: data.format === "vertical",
      format: data.format,
      quality: data.quality,
      watermarkText: data.watermarkText ?? undefined,
      watermarkPosition: data.watermarkPosition ?? "middle-center",
      watermarkSize: data.watermarkSize ?? "medium",
      logoDataUrl: data.logoDataUrl ?? undefined,
      logoPosition: data.logoPosition ?? "none",
      // Cover from inside the best moment (a real, expressive frame + real words)
      coverAt: hero ? Math.round((hero.start + 1) * 10) / 10 : undefined,
      coverHeadline: hero?.title,
      coverSubline: hero?.hook,
    });

    const written: { clipId: string; clipName: string; outputs: import("@/lib/ai.functions").RepurposeOutput[] }[] = [];
    let created = 0;
    await updateJob(jobId, { progress: "Writing captions…" });
    try {
      const idea = `Full video: ${kept.title}. What happens: ${moment.summary}${hero ? ` Best moment: ${hero.title} — ${hero.hook}` : ""}`.slice(0, 2000);
      const result = await repurposeCore({
        idea,
        tone: data.tone,
        platforms: data.platforms as PlatformId[],
        mediaName: kept.name,
        mediaKind: "video",
      });
      written.push({ clipId: kept.id, clipName: kept.name, outputs: result.outputs });
      const day = new Date();
      day.setDate(day.getDate() + 1);
      day.setHours(18, 0, 0, 0);
      for (const o of result.outputs) {
        const { error } = await ctx.supabase.from("scheduled_posts").insert({
          user_id: ctx.userId,
          title: o.title,
          content: `${o.body}\n\n${o.hashtags.join(" ")}`.trim(),
          platform: o.platform,
          status: "draft",
          scheduled_at: day.toISOString(),
          hashtags: o.hashtags,
          media_asset_id: kept.id,
        });
        if (!error) created++;
      }
    } catch (e) {
      console.warn(`[brand-job] captions failed for ${kept.name}:`, e instanceof Error ? e.message : e);
    }

    await updateJob(jobId, {
      status: "done",
      progress: `Video branded${created > 0 ? `, ${created} drafts queued` : ""}`,
      clips: [{ id: kept.id, name: kept.name, title: kept.title, thumbnailPath: kept.thumbnailPath }],
      captions: written,
      drafts: created,
    });
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      progress: "Branding failed",
      error: e instanceof Error ? e.message : "Branding failed",
    }).catch(() => {});
  }
}

export const startBrandJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartBrandInput.parse(input))
  .handler(async ({ data, context }) => {
    const job = await createJob(context.userId, "cut");
    void runBrandJob(job.id, { supabase: context.supabase, userId: context.userId }, data);
    return { jobId: job.id };
  });

const GetJobInput = z.object({ jobId: z.string().uuid() });

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetJobInput.parse(input))
  .handler(async ({ data, context }) => {
    const job = await readJob(data.jobId);
    if (!job || job.userId !== context.userId) throw new Error("Job not found.");
    return job;
  });
