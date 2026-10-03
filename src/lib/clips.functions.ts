import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectVideoMoments } from "@/lib/moments.server";
import { cutUploadRegisterClip } from "@/lib/cutting.server";

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
