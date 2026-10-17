import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectVideoMoments } from "@/lib/moments.server";
import { cutUploadRegisterClip, runFfmpeg, stageLogo, execFileAsync, ffmpegPath } from "@/lib/cutting.server";

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
  // Re-encode to vertical 9:16 for Shorts/Reels/TikTok instead of keeping the original ratio.
  vertical: z.boolean().default(false),
  quality: z.enum(["fast", "best"]).default("fast"),
});

export const splitVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SplitInput.parse(input))
  .handler(async ({ data, context }) => {
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

    const duration = Math.min(data.duration, MAX_VIDEO_SECONDS);
    const moments = await detectVideoMoments({
      assetName: asset.name,
      duration,
      targetSeconds: data.targetSeconds,
      frames: data.frames,
    });

    // Download once, cut each moment, upload clip + thumbnail.
    const workdir = await mkdtemp(join(tmpdir(), "ets-clips-"));
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      if (blob.size < 1024) {
        throw new Error(
          `"${asset.name}" downloaded empty — its file is missing from storage. Delete that row and re-upload the video.`,
        );
      }
      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

      const baseName = asset.name.replace(/\.[a-z0-9]+$/i, "");
      const clips: { id: string; name: string; title: string; start: number; end: number }[] = [];

      for (let i = 0; i < moments.length; i++) {
        try {
          clips.push(
            await cutUploadRegisterClip({
              supabase: context.supabase,
              userId: asset.user_id,
              inputPath,
              baseName,
              index: i,
              moment: moments[i]!,
              vertical: data.vertical,
              quality: data.quality,
            }),
          );
        } catch (e) {
          throw new Error(`Clip ${i + 1} failed: ${e instanceof Error ? e.message : "cut failed"}`);
        }
      }
      return { clips };
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });

const BrandInput = z.object({
  assetId: z.string().uuid(),
  watermarkText: z.string().max(100).optional(),
  watermarkPosition: z.string().default("bottom-right"),
  logoDataUrl: z.string().max(500000).optional(),
  logoPosition: z
    .enum(["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right", "none"])
    .default("none"),
});

/**
 * Burn the current watermark + logo onto an EXISTING clip in place.
 * For clips cut before branding existed — re-encodes the file, same path.
 */
export const brandClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BrandInput.parse(input))
  .handler(async ({ data, context }) => {
    const hasText = !!data.watermarkText?.trim();
    const hasLogo = !!data.logoDataUrl && data.logoPosition !== "none";
    if (!hasText && !hasLogo) {
      throw new Error("Set your watermark text or logo first (sidebar → Watermark).");
    }
    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, user_id, name, kind, storage_path")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Video not found.");
    if (asset.kind !== "video") throw new Error("Only videos can be branded.");

    const { mkdtemp, rm, writeFile, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const workdir = await mkdtemp(join(tmpdir(), "ets-brand-"));
    let logoCleanup: (() => Promise<void>) | null = null;
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      if (blob.size < 1024) {
        throw new Error(
          `"${asset.name}" downloaded empty — its file is missing from storage. Delete that row and re-upload the video.`,
        );
      }
      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));
      const outFile = join(workdir, "branded.mp4");

      const filters: string[] = [];
      if (hasText) {
        const margin = 24;
        const pos = data.watermarkPosition;
        const x = pos.includes("right") ? `w-text_w-${margin}` : pos.includes("left") ? `${margin}` : `(w-text_w)/2`;
        const y = pos.includes("bottom") ? `h-text_h-${margin}` : pos.includes("top") ? `${margin}` : `(h-text_h)/2`;
        const escaped = data.watermarkText!.replace(/'/g, "\\'").replace(/:/g, "\\:");
        filters.push(`drawtext=text='${escaped}':fontsize=32:fontcolor=white@0.6:x=${x}:y=${y}:shadowcolor=black@0.5:shadowx=2:shadowy=2`);
      }

      if (hasLogo) {
        const staged = await stageLogo(data.logoDataUrl!);
        logoCleanup = staged.cleanup;
        const [vAlign, hAlign] = data.logoPosition.split("-") as ["top" | "middle" | "bottom", "left" | "center" | "right"];
        const x = hAlign === "left" ? "20" : hAlign === "right" ? "W-w-20" : "(W-w)/2";
        const y = vAlign === "top" ? "20" : vAlign === "bottom" ? "H-h-20" : "(H-h)/2";
        const vf = filters.length > 0 ? [...filters, "format=yuv420p"] : [];
        const fc = vf.length > 0
          ? `[0:v]${vf.join(",")},format=yuv420p[v];[1:v]scale=160:-1[logo];[v][logo]overlay=${x}:${y}:shortest=1`
          : `[0:v]format=yuv420p[v];[1:v]scale=160:-1[logo];[v][logo]overlay=${x}:${y}:shortest=1`;
        await runFfmpeg(
          ["-y", "-i", inputPath, "-i", staged.path, "-filter_complex", fc,
            "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", outFile],
          600_000,
          "brand",
        );
      } else {
        await runFfmpeg(
          ["-y", "-i", inputPath, "-vf", filters.join(","), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", outFile],
          600_000,
          "brand",
        );
      }

      const branded = await readFile(outFile);
      const { error: upError } = await context.supabase.storage
        .from("media")
        .upload(asset.storage_path, branded, { contentType: "video/mp4", upsert: true });
      if (upError) throw new Error(upError.message);

      try {
        const thumbFile = join(workdir, "thumb.jpg");
        await execFileAsync(
          ffmpegPath as string,
          ["-y", "-ss", "2", "-i", outFile, "-frames:v", "1", "-q:v", "4", thumbFile],
          { timeout: 60_000 },
        );
        const { readFile: readFs } = await import("node:fs/promises");
        const thumbBytes = await readFs(thumbFile);
        const thumbPath = `${asset.user_id}/thumbs/${crypto.randomUUID()}.jpg`;
        const { error: thumbUpError } = await context.supabase.storage
          .from("media")
          .upload(thumbPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
        if (!thumbUpError) {
          await context.supabase
            .from("media_assets")
            .update({ thumbnail_path: thumbPath })
            .eq("id", asset.id);
        }
      } catch {}

      return { ok: true };
    } finally {
      if (logoCleanup) await logoCleanup();
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });

const RegenThumbInput = z.object({ assetId: z.string().uuid() });

export const regenerateThumbnail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegenThumbInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, user_id, kind, storage_path")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Video not found.");
    if (asset.kind !== "video") throw new Error("Only videos can have thumbnails.");

    const { mkdtemp, rm, writeFile, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const workdir = await mkdtemp(join(tmpdir(), "ets-regen-"));
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      if (blob.size < 1024) throw new Error("Video file is empty or missing from storage.");

      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

      const thumbFile = join(workdir, "thumb.jpg");
      await execFileAsync(
        ffmpegPath as string,
        ["-y", "-ss", "2", "-i", inputPath, "-frames:v", "1", "-q:v", "4", thumbFile],
        { timeout: 60_000 },
      );
      const thumbBytes = await readFile(thumbFile);
      const thumbPath = `${asset.user_id}/thumbs/${crypto.randomUUID()}.jpg`;
      const { error: thumbUpError } = await context.supabase.storage
        .from("media")
        .upload(thumbPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
      if (thumbUpError) throw new Error(thumbUpError.message);

      const { error: updateError } = await context.supabase
        .from("media_assets")
        .update({ thumbnail_path: thumbPath })
        .eq("id", asset.id);
      if (updateError) throw new Error(updateError.message);

      return { ok: true };
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });
