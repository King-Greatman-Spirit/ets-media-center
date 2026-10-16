import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ffmpegBinary, probeMediaInfo } from "@/lib/cutting.server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// YouTube-style catchy covers: punched-up frame + big bold hook text.
// Server-only.

const ThumbInput = z.object({
  assetId: z.string().uuid(),
  headline: z.string().min(2).max(80),
  subline: z.string().max(80).optional(),
  style: z.enum(["gold", "white"]).default("gold"),
});

/** Keep letters, numbers, spaces and safe punctuation; kill drawtext specials. */
function safeText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function wrapLines(text: string, maxChars = 16, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

export const makeThumbnail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ThumbInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: asset, error: assetError } = await context.supabase
      .from("media_assets")
      .select("id, user_id, kind, storage_path")
      .eq("id", data.assetId)
      .maybeSingle();
    if (assetError) throw new Error(assetError.message);
    if (!asset) throw new Error("Video not found.");
    if (asset.kind !== "video") throw new Error("Catchy covers are made for videos.");

    const workdir = await mkdtemp(join(tmpdir(), "ets-thumb-"));
    try {
      const { data: blob, error: dlError } = await context.supabase.storage
        .from("media")
        .download(asset.storage_path);
      if (dlError || !blob) throw new Error(dlError?.message ?? "Could not download this video.");
      const inputPath = join(workdir, "input.mp4");
      await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));

      const info = await probeMediaInfo(inputPath);
      const at = info.duration > 0 ? Math.min(info.duration * 0.3, Math.max(info.duration - 1, 0.5)) : 2;

      const color = data.style === "gold" ? "0xFFC93C" : "white";
      const lines = wrapLines(data.headline);
      if (lines.length === 0) throw new Error("Write a headline first.");
      const baseY = 640;
      const draws = lines.map((line, i) => {
        const y = baseY + i * 96;
        return `drawtext=text='${safeText(line)}':fontsize=76:fontcolor=${color}:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${y}`;
      });
      if (data.subline?.trim()) {
        const sub = wrapLines(data.subline.trim(), 28, 2);
        sub.forEach((line, i) => {
          const y = baseY + lines.length * 96 + 12 + i * 52;
          draws.push(
            `drawtext=text='${safeText(line)}':fontsize=36:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${y}`,
          );
        });
      }

      const outFile = join(workdir, "cover.jpg");
      const filter = [
        "scale=720:1280:force_original_aspect_ratio=increase",
        "crop=720:1280",
        "eq=contrast=1.15:saturation=1.4",
        ...draws,
      ].join(",");
      try {
        await execFileAsync(
          ffmpegBinary(),
          ["-y", "-ss", String(Math.round(at * 10) / 10), "-i", inputPath, "-frames:v", "1", "-q:v", "3", "-vf", filter, outFile],
          { timeout: 120_000 },
        );
      } catch (e) {
        const stderr = String((e as { stderr?: unknown })?.stderr ?? "");
        console.error("[ffmpeg:cover]", stderr.slice(-1500));
        throw new Error("Cover render failed. Try a shorter headline.");
      }

      const thumbBytes = await readFile(outFile);
      const thumbPath = `${asset.user_id}/thumbs/${crypto.randomUUID()}.jpg`;
      const { error: upError } = await context.supabase.storage
        .from("media")
        .upload(thumbPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
      if (upError) throw new Error(upError.message);

      const { error: rowError } = await context.supabase
        .from("media_assets")
        .update({ thumbnail_path: thumbPath })
        .eq("id", asset.id);
      if (rowError) throw new Error(rowError.message);
      return { thumbnailPath: thumbPath };
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  });
