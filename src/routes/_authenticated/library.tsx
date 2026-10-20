import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UploadCloud, Film, Image as ImageIcon, Music, Trash2, Search, Loader2, Eye, ScanSearch, Scissors, ImagePlus, Stamp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, kindFromMime, formatBytes, signedUrl, type MediaAsset } from "@/lib/data";
import { analyzeMedia } from "@/lib/media.functions";
import { brandClip, regenerateThumbnail, setThumbnailImage } from "@/lib/clips.functions";
import { makeThumbnail } from "@/lib/thumb.functions";
import { loadWatermarkSettings } from "@/components/app/WatermarkDialog";
import { splitVideo } from "@/lib/clips.functions";
import { captureVideoFrames, captureTimestampedFrames, probeVideoMeta } from "@/lib/video-frames";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Media Library | ETS Command Center" },
      { name: "description", content: "Bulk upload and organise reels, images and audio for the ETS media studio." },
      { property: "og:title", content: "Media Library | ETS" },
      { property: "og:description", content: "Bulk upload and organise reels, images and audio." },
    ],
  }),
  component: Library,
});

type Upload = { name: string; progress: number; error?: string };

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music } as const;

/** Card cover: the image itself, a captured video frame, or a kind icon fallback. */
function AssetCover({ asset }: { asset: MediaAsset }) {
  const [url, setUrl] = useState<string | null>(null);
  const coverPath = asset.kind === "image" ? asset.storage_path : asset.thumbnail_path;
  useEffect(() => {
    if (!coverPath) {
      setUrl(null);
      return;
    }
    let live = true;
    signedUrl(coverPath)
      .then((u) => {
        if (live) setUrl(u);
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
    };
  }, [coverPath]);
  if (url) {
    return <img src={url} alt={asset.name} loading="lazy" className="h-32 w-full object-cover" />;
  }
  const Icon = KIND_ICON[asset.kind];
  return (
    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-accent/40 to-card">
      <Icon className="h-10 w-10 text-primary/70" />
    </div>
  );
}

// supabase-js has no upload progress callbacks and a hung request never
// settles, so race every upload against a timeout and always surface the
// outcome per file — the list must never freeze silently at 35%.
const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `Upload timed out after ${Math.round(ms / 60000)} minutes. Try a smaller file or a faster connection.`,
          ),
        ),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function friendlyUploadError(message: string): string {
  if (/bucket not found/i.test(message)) {
    return "Storage is not set up yet (missing 'media' bucket). Apply the database migrations in Supabase, then retry.";
  }
  if (/row-level security|policy|permission|unauthorized|invalid.*token|jwt/i.test(message)) {
    return "Upload blocked by storage permissions. Sign in again; if it persists, check the storage policies in Supabase.";
  }
  if (/exceed|too large|maximum|file size/i.test(message)) {
    return "File is too large for your Supabase plan. Try a smaller file.";
  }
  if (/relation .* does not exist|does not exist|schema cache/i.test(message)) {
    return "Database tables are missing. Apply the database migrations in Supabase, then retry.";
  }
  return message;
}

function Library() {
  const qc = useQueryClient();
  const media = useQuery(mediaQuery);
  const analyze = useServerFn(analyzeMedia);
  const makeCover = useServerFn(makeThumbnail);
  const brand = useServerFn(brandClip);
  const setThumbImg = useServerFn(setThumbnailImage);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const split = useServerFn(splitVideo);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "audio">("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ asset: MediaAsset; url: string; thumbUrl?: string | undefined } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [splittingId, setSplittingId] = useState<string | null>(null);
  const [regenThumbId, setRegenThumbId] = useState<string | null>(null);
  const [covering, setCovering] = useState(false);
  const [cover, setCover] = useState<{ asset: MediaAsset; headline: string; subline: string; style: "gold" | "white"; image?: string } | null>(null);
  const [thumbImgBusy, setThumbImgBusy] = useState(false);

  function coverDefaults(asset: MediaAsset): { headline: string; subline: string } {
    const m = /^Clip:\s*(.+?)\.\s*Hook:\s*(.+)$/s.exec(asset.analysis_text ?? "");
    if (m) return { headline: m[1]!.slice(0, 80), subline: m[2]!.slice(0, 80) };
    return { headline: asset.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 80), subline: "" };
  }

  async function generateCover() {
    if (!cover) return;
    setCovering(true);
    try {
      await makeCover({
        data: {
          assetId: cover.asset.id,
          headline: cover.headline.trim() || cover.asset.name,
          subline: cover.subline.trim() || undefined,
          style: cover.style,
        },
      });
      await qc.invalidateQueries({ queryKey: ["media"] });
      setCover(null);
      toast.success("Catchy cover saved to this clip.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover render failed");
    } finally {
      setCovering(false);
    }
  }

  function pickCoverImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && cover) setCover({ ...cover, image: reader.result });
    };
    reader.readAsDataURL(file);
  }

  async function applyCoverImage() {
    if (!cover?.image) return;
    setThumbImgBusy(true);
    try {
      await setThumbImg({ data: { assetId: cover.asset.id, imageDataUrl: cover.image } });
      await qc.invalidateQueries({ queryKey: ["media"] });
      setCover(null);
      toast.success("Custom image saved as this clip's thumbnail.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save image");
    } finally {
      setThumbImgBusy(false);
    }
  }
  const [analysis, setAnalysis] = useState<{ name: string; summary: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Please sign in again.");
        return;
      }

      setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
      let ok = 0;

      for (const [i, file] of list.entries()) {
        try {
          const kind = kindFromMime(file.type);
          if (!kind) {
            setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: "Unsupported file type" } : x)));
            continue;
          }
          const path = `${auth.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 35 } : x)));

          const { error: upErr } = await withTimeout(
            supabase.storage.from("media").upload(path, file, {
              contentType: file.type,
              upsert: false,
            }),
            UPLOAD_TIMEOUT_MS,
          );
          if (upErr) {
            setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: friendlyUploadError(upErr.message) } : x)));
            continue;
          }
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 80 } : x)));

          // Best-effort video extras: thumbnail frame plus dimensions. Never
          // allowed to fail the upload itself.
          let thumbnail_path: string | null = null;
          let duration_seconds: number | null = null;
          let width: number | null = null;
          let height: number | null = null;
          if (kind === "video") {
            try {
              const objectUrl = URL.createObjectURL(file);
              try {
                const meta = await probeVideoMeta(objectUrl);
                if (meta.duration > 0) duration_seconds = meta.duration;
                if (meta.width > 0) {
                  width = meta.width;
                  height = meta.height;
                }
                const [frame] = await captureVideoFrames(objectUrl, 1, 640);
                if (frame) {
                  const blob = await (await fetch(frame)).blob();
                  const thumbPath = `${auth.user.id}/thumbs/${crypto.randomUUID()}.jpg`;
                  const { error: thumbErr } = await supabase.storage.from("media").upload(thumbPath, blob, {
                    contentType: "image/jpeg",
                    upsert: true,
                  });
                  if (!thumbErr) thumbnail_path = thumbPath;
                }
              } finally {
                URL.revokeObjectURL(objectUrl);
              }
            } catch {
              // Thumbnails are decorative; the upload already succeeded.
            }
          }

          const { error: dbErr } = await supabase.from("media_assets").insert({
            user_id: auth.user.id,
            name: file.name,
            kind,
            storage_path: path,
            mime_type: file.type,
            size_bytes: file.size,
            thumbnail_path,
            duration_seconds,
            width,
            height,
          });
          if (dbErr) {
            // Don't orphan the file in storage when the row insert fails.
            await supabase.storage.from("media").remove([path]).catch(() => {});
            setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: friendlyUploadError(dbErr.message) } : x)));
            continue;
          }
          ok++;
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 100 } : x)));
        } catch (e) {
          setUploads((u) =>
            u.map((x, idx) =>
              idx === i
                ? { ...x, error: friendlyUploadError(e instanceof Error ? e.message : "Upload failed") }
                : x,
            ),
          );
        }
      }

      await qc.invalidateQueries({ queryKey: ["media"] });
      if (ok) toast.success(`${ok} file${ok === 1 ? "" : "s"} added to the library.`);
      setTimeout(() => setUploads([]), 2500);
    },
    [qc],
  );

  async function brandAsset(asset: MediaAsset) {
    const wm = loadWatermarkSettings();
    if (!wm.text.trim() && (!wm.logoDataUrl || wm.logoPosition === "none")) {
      toast.error("Set your watermark text or logo first (sidebar → Watermark).");
      return;
    }
    setBrandingId(asset.id);
    try {
      toast.message("Branding your clip — re-rendering with watermark…");
      await brand({
        data: {
          assetId: asset.id,
          watermarkText: wm.text.trim() || undefined,
          watermarkPosition: wm.position,
          logoDataUrl: wm.logoDataUrl || undefined,
          logoPosition: wm.logoPosition,
        },
      });
      await qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Watermark burned in. Preview the clip to see it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Branding failed");
    } finally {
      setBrandingId(null);
    }
  }

  async function regenThumb(asset: MediaAsset) {
    setRegenThumbId(asset.id);
    try {
      await regenerateThumbnail({ data: { assetId: asset.id } });
      await qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Thumbnail regenerated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate thumbnail");
    } finally {
      setRegenThumbId(null);
    }
  }

  async function remove(asset: MediaAsset) {
    await supabase.storage.from("media").remove([asset.storage_path]);
    const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed from library.");
    qc.invalidateQueries({ queryKey: ["media"] });
  }

  async function open(asset: MediaAsset) {
    try {
      const [url, thumbUrl] = await Promise.all([
        signedUrl(asset.storage_path),
        asset.thumbnail_path ? signedUrl(asset.thumbnail_path) : Promise.resolve(undefined),
      ]);
      setPreview({ asset, url, thumbUrl: thumbUrl ?? undefined });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  async function analyzeAsset(asset: MediaAsset) {
    setAnalyzingId(asset.id);
    try {
      let frames: string[] | undefined;
      if (asset.kind === "video") {
        toast.message("Reading video frames…");
        frames = await captureVideoFrames(await signedUrl(asset.storage_path));
      }
      const { summary, saved } = await analyze({ data: { assetId: asset.id, frames } });
      setAnalysis({ name: asset.name, summary });
      if (saved) qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Media analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function splitAsset(asset: MediaAsset) {
    if (asset.kind !== "video") return;
    setSplittingId(asset.id);
    try {
      const url = await signedUrl(asset.storage_path);
      let duration = Number(asset.duration_seconds) || 0;
      if (!duration) {
        const meta = await probeVideoMeta(url);
        duration = meta.duration;
      }
      if (!duration || duration < 45) {
        toast.error("This video is too short to split — clips work best past 45 seconds.");
        return;
      }
      toast.message("Watching for the best moments…");
      const frames = await captureTimestampedFrames(url, 8);
      toast.message("Cutting clips — this can take a minute…");
      const { clips } = await split({
        data: { assetId: asset.id, duration, frames, targetSeconds: 60 },
      });
      await qc.invalidateQueries({ queryKey: ["media"] });
      toast.success(
        clips.length === 1
          ? `1 clip cut: ${clips[0]!.title}`
          : `${clips.length} clips cut from ${asset.name}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Splitting failed");
    } finally {
      setSplittingId(null);
    }
  }

  const items = (media.data ?? []).filter(
    (m) => (filter === "all" || m.kind === filter) && m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Assets"
        title="Media Library"
        description="Drop in reels, images and audio in bulk. Everything here feeds the AI studio and your calendar."
        actions={
          <Button onClick={() => inputRef.current?.click()} className="bg-gold-gradient text-primary-foreground hover:opacity-90">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload files
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "panel grain flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-all",
          dragging ? "border-primary bg-accent/40 gold-ring" : "border-border hover:border-primary/50",
        )}
      >
        <UploadCloud className={cn("h-10 w-10 transition-transform", dragging ? "scale-110 text-primary" : "text-muted-foreground")} />
        <p className="font-display text-lg font-semibold">Drop your media here</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Short-form video (MP4, MOV), images (JPG, PNG, WEBP) and audio (MP3, WAV). Select as many as you like.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="panel mt-4 space-y-3 p-4">
          {uploads.map((u) => (
            <div key={u.name} className="flex items-center gap-3">
              <span className="w-56 truncate text-sm">{u.name}</span>
              {u.error ? (
                <span className="text-xs text-destructive">{u.error}</span>
              ) : (
                <>
                  <Progress value={u.progress} className="h-1.5 flex-1" />
                  <span className="w-10 text-right text-xs text-muted-foreground">{u.progress}%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "video", "image", "audio"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition",
                filter === f ? "border-primary/50 bg-accent text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets" className="pl-9" />
        </div>
      </div>

      <div className="mt-5">
        {media.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nothing here yet. Drop files above to build your library.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => {
              return (
                <div key={m.id} className="panel group overflow-hidden transition hover:gold-ring">
                  <AssetCover asset={m} />
                  <div className="p-4">
                      <p className="truncate text-sm font-semibold" title={m.name}>{m.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="border-primary/30 text-primary capitalize">{m.kind}</Badge>
                        {formatBytes(Number(m.size_bytes))} · {format(new Date(m.created_at), "d MMM")}
                      </div>
                      {m.analysis_text && (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{m.analysis_text}</p>
                      )}
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => open(m)}>
                          <Eye className="mr-1 h-3 w-3" /> Preview
                        </Button>
                        {m.kind === "video" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => splitAsset(m)}
                            disabled={splittingId === m.id || analyzingId === m.id}
                            aria-label={`Split ${m.name} into clips`}
                            title="Split into ~1 minute highlight clips"
                          >
                            {splittingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scissors className="h-3 w-3" />}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeAsset(m)}
                          disabled={analyzingId === m.id}
                          aria-label={`Analyze ${m.name}`}
                          title="Let the AI watch or read this file"
                        >
                          {analyzingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
                        </Button>
                        {m.kind === "video" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCover({ asset: m, ...coverDefaults(m), style: "gold" })}
                            aria-label={`Make catchy cover for ${m.name}`}
                            title="Make a catchy cover with bold hook text"
                          >
                            <ImagePlus className="h-3 w-3" />
                          </Button>
                        )}
                        {m.kind === "video" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => brandAsset(m)}
                            disabled={brandingId === m.id}
                            aria-label={`Burn watermark onto ${m.name}`}
                            title="Burn your watermark + logo onto this clip"
                          >
                            {brandingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stamp className="h-3 w-3" />}
                          </Button>
                        )}
                        {m.kind === "video" && !m.thumbnail_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenThumb(m)}
                            disabled={regenThumbId === m.id}
                            aria-label={`Regenerate thumbnail for ${m.name}`}
                            title="Regenerate thumbnail"
                          >
                            {regenThumbId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(m)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="font-display">{preview?.asset.name}</DialogTitle></DialogHeader>
          {preview && preview.asset.kind === "video" && (
            <div className="space-y-3">
              {preview.asset.thumbnail_path && <img src={preview.thumbUrl} alt={preview.asset.name} className="max-h-[40vh] w-full rounded-lg object-cover" />}
              <video src={preview.url} controls className="max-h-[50vh] w-full rounded-lg" />
            </div>
          )}
          {preview && preview.asset.kind === "image" && <img src={preview.url} alt={preview.asset.name} className="max-h-[70vh] w-full rounded-lg object-contain" />}
          {preview && preview.asset.kind === "audio" && <audio src={preview.url} controls className="w-full" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!analysis} onOpenChange={(o) => !o && setAnalysis(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">What the AI saw — {analysis?.name}</DialogTitle></DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{analysis?.summary}</p>
          <p className="text-xs text-muted-foreground">Saved to this file. Attach it in the AI Studio and the posts will come from this content.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cover} onOpenChange={(o) => !o && setCover(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Catchy cover — {cover?.asset.name}</DialogTitle></DialogHeader>
          {cover && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Big bold hook text over a punched-up frame — built to earn the click.
              </p>
              <div className="space-y-2">
                <Label htmlFor="cover-headline">Headline</Label>
                <Input
                  id="cover-headline"
                  value={cover.headline}
                  maxLength={80}
                  onChange={(e) => setCover({ ...cover, headline: e.target.value })}
                  placeholder="HEAVEN ANSWERED DAY ONE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover-subline">Subline (optional)</Label>
                <Input
                  id="cover-subline"
                  value={cover.subline}
                  maxLength={80}
                  onChange={(e) => setCover({ ...cover, subline: e.target.value })}
                  placeholder="The delay is a battlefield"
                />
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={cover.style} onValueChange={(v) => setCover({ ...cover, style: v as "gold" | "white" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold on dark (CTR classic)</SelectItem>
                    <SelectItem value="white">Bold white</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateCover} disabled={covering} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90">
                {covering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {covering ? "Painting cover…" : "Make cover"}
              </Button>
              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="cover-image">Or use your own image as the thumbnail</Label>
                <Input
                  id="cover-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => pickCoverImage(e.target.files?.[0])}
                />
                {cover.image && (
                  <img src={cover.image} alt="Custom thumbnail" className="h-40 w-full rounded-lg object-cover" />
                )}
                <Button variant="outline" className="w-full" onClick={applyCoverImage} disabled={!cover.image || thumbImgBusy}>
                  {thumbImgBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  Use this image as thumbnail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
