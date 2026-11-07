import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  /** Storage path of the auto-generated cover, if the render succeeded. */
  thumbnailPath: string | null;
};

/** 9:16 for Shorts/Reels/TikTok: fill-crop to WxH. `height` is the short side. */
export function verticalFilter(height: 720 | 1080): string {
  const w = height;
  const h = Math.round((height * 16) / 9);
  return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;
}

/** 16:9 for YouTube long-form: fill-crop to WxH. `width` is the short side. */
export function landscapeFilter(width: 720 | 1080): string {
  const h = width;
  const w = Math.round((width * 16) / 9);
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

// --- Content-aware covers -------------------------------------------------
// The AI already names every moment, so that name becomes the thumbnail
// headline. Covers therefore match what actually happens in the clip instead
// of being a bare video frame.

/** First font that exists on this machine, or null to let ffmpeg choose. */
function pickFont(candidates: string[]): string | null {
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

const HOOK_FONTS = [
  "C:\\Windows\\Fonts\\impact.ttf",
  "C:\\Windows\\Fonts\\ariblk.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
];
const SUB_FONTS = [
  "C:\\Windows\\Fonts\\seguibl.ttf",
  "C:\\Windows\\Fonts\\segoeuib.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
];

/** Escape a string for ffmpeg's filter parser. */
function ffText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/[%\r\n]+/g, " ")
    .trim();
}

/** C:\Windows\Fonts\x.ttf -> C\:/Windows/Fonts/x.ttf */
function ffFontPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
}

/** Greedy word wrap for short, punchy cover lines. */
function wrapHeadline(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.toUpperCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Gold subline: the hook, complete. Up to 3 lines at 24 chars keeps a full
 * phrase ("MINISTER GODSWILL OYOR / OPENS WITH AN INSPIRING / SPIRITUAL
 * DECLARATION") instead of lopping it to a name, and stop-word trimming
 * stops "READING ABOUT" dangles.
 */
function coverSubline(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.]$/, "");
  if (!cleaned) return [];
  const firstClause = cleaned.split(/[;:!?—–]/)[0]?.trim() || cleaned;
  const fits = (s: string) => wrapHeadline(s, 24, 3).join(" ").length >= Math.min(s.length, 60);
  const candidate = fits(firstClause) ? firstClause : cleaned;
  const lines = wrapHeadline(candidate, 24, 3);
  if (lines.length === 0) return [];
  const STOP = new Set([
    "a", "an", "the", "and", "or", "but", "of", "with", "at", "in", "on", "to",
    "for", "from", "by", "as", "is", "was", "that", "this", "his", "her",
    "their", "our", "into", "over", "when", "while", "about", "after", "before",
    "during", "through", "under", "against", "without", "within", "upon", "per",
  ]);
  const lastParts = lines[lines.length - 1]!.split(" ");
  while (lastParts.length > 1 && STOP.has((lastParts[lastParts.length - 1] ?? "").toLowerCase())) {
    lastParts.pop();
  }
  lines[lines.length - 1] = lastParts.join(" ");
  return lines;
}

/**
 * Render a 1080x1920 cover built to get clicked: poster frame, big logo,
 * red MUST WATCH badge, STOP SCROLLING teaser, full title headline, gold
 * hook, duration badge and a gold WATCH NOW pill.
 * Uses the ORIGINAL frame, so the clip's burned-in logo/watermark is not doubled.
 */
async function renderAutoThumbnail(opts: {
  videoPath: string;
  at: number;
  headline: string;
  subline: string;
  logoPath: string | null;
  outPath: string;
  durationSeconds?: number;
}): Promise<void> {
  const W = 1080;
  const H = 1920;

  // Full title, up to 3 lines: capping at 2 lines cut words like "2025"
  // and left the cover reading unfinished.
  const hookLines = wrapHeadline(opts.headline, 16, 3);
  if (hookLines.length === 0) throw new Error("Nothing to write on the cover.");
  // Fit the type to the longest line instead of guessing from a threshold:
  // a 17-character line at 152px would run off the 1080px frame.
  const longest = Math.max(...hookLines.map((l) => l.length));
  const hookSize = Math.min(155, Math.max(78, Math.round(960 / (longest * 0.52))));
  const hookGap = 12;
  const hookH = hookLines.length * hookSize + (hookLines.length - 1) * hookGap;

  const subSize = 42;
  const subGap = 8;
  // Complete hook across up to 3 lines, in gold under the headline.
  const subLines = coverSubline(opts.subline);
  const subH = subLines.length ? subLines.length * subSize + (subLines.length - 1) * subGap : 0;

  // Click-me CTA pill under the subline.
  const ctaW = 540;
  const ctaH = 88;
  const ctaGap = 34;
  const ctaSize = 42;

  // Anchor the whole block (headline + subline + CTA) so the CTA ends at
  // ~86% height — clear of the Shorts/TikTok feed buttons and player controls.
  const gap = 40;
  const blockH = hookH + (subH ? gap + subH : 0) + ctaGap + ctaH;
  const blockTop = Math.max(620, 1660 - blockH);
  const ctaY = blockTop + hookH + (subH ? gap + subH : 0) + ctaGap;

  const hookFont = pickFont(HOOK_FONTS);
  const subFont = pickFont(SUB_FONTS);
  const fontArg = (p: string | null) => (p ? `fontfile='${ffFontPath(p)}':` : "");

  const filters: string[] = [];
  let last = "b0";
  let n = 1;
  const push = (template: string) => {
    filters.push(template.replace("%IN%", last).replace("%OUT%", `b${n}`));
    last = `b${n}`;
    n += 1;
  };

  filters.push(
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,` +
      `eq=brightness=-0.02:contrast=1.12:saturation=1.18[b0]`,
  );

  // Poster frame + gold top bar: instantly reads as a designed cover, not a frame grab.
  push(`[%IN%]drawbox=x=10:y=10:w=${W - 20}:h=${H - 20}:color=0xDEB23E:t=8[%OUT%]`);
  push(`[%IN%]drawbox=x=0:y=0:w=${W}:h=14:color=0xDEB23E:t=fill[%OUT%]`);

  // Smooth bottom scrim: a black source with a vertical alpha ramp, composited
  // over the frame. Stacked drawboxes left visible seams at this scale.
  const scrimTop = 700;
  const scrimPeak = 0.86;
  filters.push(
    `color=c=black:s=${W}x${H}:d=1,format=rgba,` +
      `geq=r=0:g=0:b=0:a='if(lt(Y,${scrimTop}),0,` +
      `${scrimPeak}*pow((Y-${scrimTop})/${H - scrimTop},1.35))'[scrim]`,
  );
  push(`[%IN%][scrim]overlay=0:0[%OUT%]`);

  // Red MUST WATCH badge, top-right: red is the highest-attention colour in
  // a feed, and a benefit promise beats a brand name for the click. The brand
  // is already on the logo plate top-left.
  push(`[%IN%]drawbox=x=700:y=36:w=344:h=84:color=0xDC2626:t=fill[%OUT%]`);
  push(`[%IN%]drawbox=x=700:y=36:w=344:h=84:color=white:t=3[%OUT%]`);
  push(
    `[%IN%]drawtext=${fontArg(subFont)}text='MUST WATCH':fontsize=36:` +
      `fontcolor=white:x=700+(344-text_w)/2:y=58[%OUT%]`,
  );

  const useLogo = Boolean(opts.logoPath && existsSync(opts.logoPath));
  if (useLogo) {
    // Dark backing plate so the gold shield pops on bright footage, logo big
    // enough to read as a brand mark (was 150px and looked lost).
    push(`[%IN%]drawbox=x=28:y=28:w=264:h=264:color=black@0.55:t=fill[%OUT%]`);
    push(`[%IN%]drawbox=x=28:y=28:w=264:h=264:color=0xDEB23E:t=4[%OUT%]`);
    filters.push(`[1:v]scale=216:-1[lg]`);
    filters.push(`[${last}][lg]overlay=52:52[b${n}]`);
    last = `b${n}`;
    n += 1;
  }

  // Engaging teaser line above the headline: the scroll-stopper.
  const teaserY = blockTop - 80;
  push(
    `[%IN%]drawtext=${fontArg(subFont)}text='STOP SCROLLING':fontsize=38:` +
      `fontcolor=0xDEB23E:borderw=4:bordercolor=black:x=(w-text_w)/2:y=${teaserY}[%OUT%]`,
  );

  hookLines.forEach((line, i) => {
    const y = blockTop + i * (hookSize + hookGap);
    push(
      `[%IN%]drawtext=${fontArg(hookFont)}text='${ffText(line)}':fontsize=${hookSize}:` +
        `fontcolor=white:borderw=12:bordercolor=black:shadowcolor=black@0.8:shadowx=4:shadowy=4:x=(w-text_w)/2:y=${y}[%OUT%]`,
    );
  });

  subLines.forEach((line, i) => {
    const y = blockTop + hookH + gap + i * (subSize + subGap);
    push(
      `[%IN%]drawtext=${fontArg(subFont)}text='${ffText(line)}':fontsize=${subSize}:` +
        `fontcolor=0xDEB23E:borderw=4:bordercolor=black:x=(w-text_w)/2:y=${y}[%OUT%]`,
    );
  });

  // Gold WATCH NOW pill: the one thing the eye is drawn to last.
  const ctaX = Math.round((W - ctaW) / 2);
  push(`[%IN%]drawbox=x=${ctaX}:y=${ctaY}:w=${ctaW}:h=${ctaH}:color=0xDEB23E:t=fill[%OUT%]`);
  push(
    `[%IN%]drawtext=${fontArg(subFont)}text='WATCH NOW':fontsize=${ctaSize}:` +
      `fontcolor=black:x=(w-text_w)/2:y=${ctaY + 20}[%OUT%]`,
  );

  // Duration badge, bottom-left on the CTA row: tells the viewer exactly what
  // they're committing to — a proven click booster.
  if (opts.durationSeconds && opts.durationSeconds > 0) {
    const durLabel =
      opts.durationSeconds >= 60
        ? `${Math.round(opts.durationSeconds / 60)} MIN`
        : `${Math.round(opts.durationSeconds)} SEC`;
    push(`[%IN%]drawbox=x=36:y=${ctaY + 12}:w=200:h=64:color=black@0.7:t=fill[%OUT%]`);
    push(`[%IN%]drawbox=x=36:y=${ctaY + 12}:w=200:h=64:color=0xDEB23E:t=3[%OUT%]`);
    push(
      `[%IN%]drawtext=${fontArg(subFont)}text='${ffText(durLabel)}':fontsize=34:` +
        `fontcolor=0xDEB23E:x=36+(200-text_w)/2:y=${ctaY + 26}[%OUT%]`,
    );
  }

  filters.push(`[${last}]null[out]`);

  const args = ["-y", "-ss", String(opts.at), "-i", opts.videoPath];
  if (useLogo) args.push("-i", opts.logoPath as string);
  args.push(
    "-frames:v", "1",
    "-q:v", "2",
    "-filter_complex", filters.join(";"),
    "-map", "[out]",
    opts.outPath,
  );
  await runFfmpeg(args, 180_000, "cover");
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
  /** Watermark text size; scaled to the output width. */
  watermarkSize?: "small" | "medium" | "large";
  /** Local path of logo image for overlay. null to skip. */
  logoPath?: string | null;
  /** Logo position on the clip (9-grid). */
  logoPosition?:
    | "top-left" | "top-center" | "top-right"
    | "middle-left" | "middle-center" | "middle-right"
    | "bottom-left" | "bottom-center" | "bottom-right"
    | "none";
  /** Cover frame time (seconds in the ORIGINAL video). Defaults to ~15% into the clip. */
  coverAt?: number | undefined;
  /** Cover headline / gold hook. Defaults to the moment's AI-written title/hook. */
  coverHeadline?: string | undefined;
  coverSubline?: string | undefined;
  /**
   * Output ratio: "vertical" (9:16 Shorts/Reels/TikTok), "landscape" (16:9
   * YouTube long-form) or "original" (keep the source ratio). Overrides the
   * legacy `vertical` boolean when present.
   */
  format?: "vertical" | "landscape" | "original" | undefined;
}): Promise<CutResult> {
  if (!ffmpegPath) throw new Error("Video tools are unavailable on the server.");
  const { supabase, userId, inputPath, baseName, index, moment, vertical } = opts;
  const format = opts.format ?? (vertical ? "vertical" : "original");
  const quality = opts.quality ?? "fast";
  const length = Math.round((moment.end - moment.start) * 10) / 10;
  if (!(length > 0)) throw new Error("Empty clip range.");

  // Already in the target ratio? Skip the slow re-encode for the ratio —
  // stream copy instead. NOTE: any pixel filter (watermark/logo) still
  // forces a re-encode; filters and stream-copy are mutually exclusive.
  let convert = format === "vertical" || format === "landscape";
  if (format === "vertical") {
    const info = await probeMediaInfo(inputPath);
    if (info.width > 0 && info.height > 0 && info.height / info.width >= 1.5) {
      convert = false;
    }
  } else if (format === "landscape") {
    const info = await probeMediaInfo(inputPath);
    if (info.width > 0 && info.height > 0 && Math.abs(info.width / info.height - 16 / 9) < 0.02) {
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
    const outWidth = quality === "best" ? 1080 : 720;
    if (opts.watermarkText?.trim()) {
      // Size scales with the frame so "Large" means the same thing at 720p and
      // 1080p. It used to be a hardcoded 32px, which made the setting a no-op.
      const sizeRatio = opts.watermarkSize === "large" ? 0.062 : opts.watermarkSize === "small" ? 0.035 : 0.046;
      const fontSize = Math.max(18, Math.round(outWidth * sizeRatio));
      const margin = Math.round(outWidth * 0.04);
      const pos = opts.watermarkPosition ?? "bottom-right";
      const x = pos.includes("right") ? `w-text_w-${margin}` : pos.includes("left") ? `${margin}` : `(w-text_w)/2`;
      const y = pos.includes("bottom") ? `h-text_h-${margin}` : pos.includes("top") ? `${margin}` : `(h-text_h)/2`;
      const escaped = opts.watermarkText.replace(/'/g, "\\'").replace(/:/g, "\\:");
      // Bold face so the watermark reads at feed size, not a thin default font.
      const wmFont = pickFont(SUB_FONTS);
      const fontArg = wmFont ? `fontfile='${ffFontPath(wmFont)}':` : "";
      filters.push(
        `drawtext=${fontArg}text='${escaped}':fontsize=${fontSize}:fontcolor=white@0.6:x=${x}:y=${y}:shadowcolor=black@0.5:shadowx=2:shadowy=2`,
      );
    }

    // Pixel filters and stream-copy are mutually exclusive: burning a
    // watermark or a logo forces a re-encode even when the ratio is untouched.
    const useLogo = Boolean(opts.logoPath && opts.logoPosition && opts.logoPosition !== "none");
    if (filters.length > 0 || useLogo) convert = true;

    // Fail fast with a precise message instead of ffmpeg's confusion.
    try {
      const st = await stat(inputPath);
      if (st.size < 1024) throw new Error("Source video file is empty.");
    } catch (e) {
      if (e instanceof Error && e.message === "Source video file is empty.") throw e;
      throw new Error("Source video file is missing.");
    }

    let cutArgs: string[];
    if (convert) {
      const [vAlign, hAlign] = (opts.logoPosition ?? "none").split("-") as [
        "top" | "middle" | "bottom",
        "left" | "center" | "right",
      ];
      // Size the logo against the output frame: a fixed pixel width looks huge
      // on 720p and tiny on 1080p. 24% reads as a proper brand mark at feed size.
      const logoWidth = Math.max(110, Math.round(outWidth * 0.24));
      const logoMargin = Math.max(16, Math.round(outWidth * 0.03));
      const logoX =
        hAlign === "left" ? String(logoMargin) : hAlign === "right" ? `W-w-${logoMargin}` : "(W-w)/2";
      const logoY =
        vAlign === "top" ? String(logoMargin) : vAlign === "bottom" ? `H-h-${logoMargin}` : "(H-h)/2";

      // Scale/crop FIRST: drawtext coordinates then refer to the final frame,
      // so the watermark keeps its size and sits inside the frame.
      // Logo, watermark and cut all happen in ONE encode — splitting the logo
      // into a second pass doubled the wait for no visual gain.
      const ratioFilter =
        format === "vertical" ? verticalFilter(outWidth)
        : format === "landscape" ? landscapeFilter(outWidth)
        : null;
      // Empty chain (original ratio + logo only, no watermark text) still
      // needs a node in the graph — "null" passes the video straight through.
      const chain = [ratioFilter, ...filters].filter(Boolean).join(",") || "null";
      cutArgs = [
        "-y", "-ss", String(start), "-i", inputPath,
        ...(useLogo ? ["-loop", "1", "-i", opts.logoPath as string] : []),
        "-filter_complex",
        useLogo
          ? `[0:v]${chain}[vbase];[1:v]scale=${logoWidth}:-1[logo];[vbase][logo]overlay=${logoX}:${logoY}[vout]`
          : `[0:v]${chain}[vout]`,
        "-map", "[vout]", "-map", "0:a?",
        // Output duration. It must sit AFTER every -i: placed before the logo
        // input it becomes an input option for the logo, and `-loop 1` then
        // encodes forever.
        "-t", String(length),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-movflags", "+faststart", clipFile,
      ];
    } else {
      cutArgs = [
        "-y", "-ss", String(start), "-i", inputPath, "-t", String(length),
        "-c", "copy", "-avoid_negative_ts", "make_zero", clipFile,
      ];
    }
    await runFfmpeg(cutArgs, convert ? 600_000 : 180_000, "cut");

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
      // Cover from the ORIGINAL source frame: the clip already carries the logo
      // and watermark, so reusing it would double the branding.
      const coverAt = opts.coverAt ?? Math.round((moment.start + Math.min(Math.max(length * 0.15, 1), 5)) * 10) / 10;
      try {
        await renderAutoThumbnail({
          videoPath: inputPath,
          at: coverAt,
          headline: opts.coverHeadline !== undefined ? opts.coverHeadline : moment.title || baseName,
          subline: opts.coverSubline !== undefined ? opts.coverSubline : moment.hook ?? "",
          logoPath: opts.logoPath ?? null,
          outPath: thumbFile,
          durationSeconds: length,
        });
      } catch (coverError) {
        // A cover must never block the cut — fall back to a plain frame.
        console.error("[cover] falling back to plain frame:", coverError);
        await execFileAsync(
          ffmpegPath as string,
          ["-y", "-ss", String(1), "-i", clipFile, "-frames:v", "1", "-q:v", "4", thumbFile],
          { timeout: 60_000 },
        );
      }
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
    return {
      id: row.id,
      name: clipName,
      title: moment.title,
      start: moment.start,
      end: moment.end,
      thumbnailPath,
    };
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
