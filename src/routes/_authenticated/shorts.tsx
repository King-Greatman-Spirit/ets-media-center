import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clapperboard, HardDrive, Loader2, Scissors, ArrowRight, CalendarCheck, RefreshCw, Copy, Check, ExternalLink, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, signedUrl, type MediaAsset } from "@/lib/data";
import { PLATFORMS } from "@/lib/platforms";
import { PlatformChip } from "@/components/app/PlatformBadge";
import { listInbox, startDetectJob, startCutJob, startBrandJob, getJob } from "@/lib/batch.functions";
import { loadWatermarkSettings } from "@/components/app/WatermarkDialog";
import { formatBytes } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shorts")({
  head: () => ({
    meta: [
      { title: "Shorts Pipeline | ETS Command Center" },
      { name: "description", content: "Turn long videos into captioned vertical highlight clips, batched to the calendar." },
      { property: "og:title", content: "Shorts Pipeline | ETS" },
    ],
  }),
  component: Shorts,
});

const TONES = ["Storytelling", "Bold Takes", "Breaking / Urgent", "Deep Dive / Educational", "Inspirational"];

type Moment = { start: number; end: number; title: string; hook: string; summary: string; checked: boolean };
type ClipRef = { id: string; name: string; title: string; thumbnailPath: string | null };
type CaptionOutput = {
  platform: string;
  title: string;
  body: string;
  hashtags: string[];
  formatNotes: string;
  bestTime: string;
};
type CaptionSet = { clipId: string; clipName: string; outputs: CaptionOutput[] };
type Source =
  | { kind: "library"; asset: MediaAsset }
  | { kind: "inbox"; filename: string; sizeBytes: number };

/** A finished clip: its auto-generated cover plus the caption cards. */
function ClipResult({ clip, captions }: { clip: ClipRef; captions: CaptionSet | undefined }) {
  const thumb = useQuery({
    queryKey: ["clip-thumb", clip.thumbnailPath],
    enabled: Boolean(clip.thumbnailPath),
    staleTime: 30 * 60 * 1000,
    queryFn: () => signedUrl(clip.thumbnailPath as string),
  });

  async function copyAll() {
    if (!captions) return;
    const text = captions.outputs
      .map((o) => {
        const name = PLATFORMS.find((p) => p.id === o.platform)?.name ?? o.platform;
        return `=== ${name} ===\n${o.title}\n\n${o.body}\n\n${o.hashtags.map((h) => `#${h}`).join(" ")}`.trim();
      })
      .join("\n\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("All captions copied.");
    } catch {
      toast.error("Could not copy — select the text manually.");
    }
  }

  return (
    <div className="panel space-y-3 p-5">
      <div className="flex items-start gap-4">
        {thumb.data ? (
          <img
            src={thumb.data}
            alt={clip.name}
            className="h-32 w-[72px] shrink-0 rounded border border-border/60 object-cover"
          />
        ) : (
          <div className="flex h-32 w-[72px] shrink-0 items-center justify-center rounded border border-border/60 bg-muted">
            <Clapperboard className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">{clip.title}</p>
          <p className="truncate text-xs text-muted-foreground">✂ {clip.name}</p>
          {captions && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void copyAll()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy all {captions.outputs.length} captions
            </Button>
          )}
        </div>
      </div>

      {captions ? (
        <div className="grid gap-2 md:grid-cols-2">
          {captions.outputs.map((o) => (
            <CaptionCard key={o.platform} output={o} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Captions are being written…</p>
      )}
    </div>
  );
}
function CaptionCard({ output }: { output: CaptionOutput }) {
  const [copied, setCopied] = useState(false);
  const platform = PLATFORMS.find((p) => p.id === output.platform);
  const full = `${output.title}\n\n${output.body}\n\n${output.hashtags.join(" ")}`.trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy — select the text manually.");
    }
  }

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: platform?.color }}>
          {platform?.name ?? output.platform}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void copy()}>
            {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {platform?.postUrl && (
            <a
              href={platform.postUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-primary hover:bg-accent"
              title={`Open ${platform.name} (you're already logged in there)`}
            >
              <ExternalLink className="h-3 w-3" /> Post
            </a>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold">{output.title}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{output.body}</p>
      {output.hashtags.length > 0 && (
        <p className="mt-1.5 text-xs text-primary">{output.hashtags.map((h) => `#${h}`).join(" ")}</p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground/70">
        {output.bestTime}
        {output.formatNotes ? ` · ${output.formatNotes}` : ""}
      </p>
    </div>
  );
}

const MOMENTS_KEY = "ets-shorts-moments-v1";

type SavedMoments = {
  source: { kind: "library"; assetId: string } | { kind: "inbox"; filename: string };
  moments: Moment[];
  targetLen: string;
  vertical: boolean;
  quality: string;
  tone: string;
  platforms: string[];
};

function readSavedMoments(): SavedMoments | null {
  try {
    const raw = localStorage.getItem(MOMENTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMoments;
    if (!parsed || !Array.isArray(parsed.moments)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Shorts() {
  const qc = useQueryClient();
  const media = useQuery(mediaQuery);
  const runList = useServerFn(listInbox);
  const runStartDetect = useServerFn(startDetectJob);
  const runStartCut = useServerFn(startCutJob);
  const runStartBrand = useServerFn(startBrandJob);
  const runGetJob = useServerFn(getJob);

  const [mode, setMode] = useState<"cut" | "brand">("cut");
  const [brandTitle, setBrandTitle] = useState("");
  const [brandSummary, setBrandSummary] = useState("");

  const [source, setSource] = useState<Source | null>(null);
  const [localName, setLocalName] = useState("");
  const [inbox, setInbox] = useState<{ dir: string; videos: { name: string; sizeBytes: number; mtime: number }[] } | null>(null);
  const [targetLen, setTargetLen] = useState("60");
  const [format, setFormat] = useState<"vertical" | "landscape" | "original">("vertical");
  const [quality, setQuality] = useState("fast");
  const [tone, setTone] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["youtube_shorts", "tiktok", "instagram_reels", "x"]);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "detecting" | "cutting" | "captioning" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [clips, setClips] = useState<ClipRef[]>([]);
  const [captions, setCaptions] = useState<CaptionSet[]>([]);
  const [drafts, setDrafts] = useState(0);
  const [restored, setRestored] = useState(false);
  const watermark = loadWatermarkSettings();

  const libraryVideos = (media.data ?? []).filter((m) => m.kind === "video");

  // Detection and cutting run as server-side jobs now, so leaving this page
  // no longer stops them. The active job id is remembered and re-attached on
  // return — close the tab, come back, and the results are here.
  const JOB_KEY = "ets-active-job-v1";
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    async function resume() {
      let saved: { jobId: string; kind: "detect" | "cut" } | null = null;
      try {
        const raw = localStorage.getItem(JOB_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch {
        saved = null;
      }
      if (!saved) return;
      setPhase(saved.kind === "detect" ? "detecting" : "cutting");
      setProgress("Re-attached to your background job…");
      while (!cancelled) {
        try {
          const job = await runGetJob({ data: { jobId: saved.jobId } });
          setProgress(job.progress);
          if (job.status === "done") {
            try {
              localStorage.removeItem(JOB_KEY);
            } catch {
              // Ignore.
            }
            if (saved.kind === "detect" && Array.isArray(job.moments)) {
              const ms = (job.moments as Moment[]).map((m) => ({ ...m, checked: true }));
              setMoments(ms);
              setPhase("idle");
              setProgress("");
              toast.success(
                ms.length === 1 ? "1 highlight found." : `${ms.length} highlights found — uncheck any to skip.`,
              );
            } else if (saved.kind === "cut") {
              const cls = (job.clips as ClipRef[]) ?? [];
              setClips(cls);
              setCaptions((job.captions as CaptionSet[]) ?? []);
              setDrafts(Number(job.drafts) || 0);
              setPhase("done");
              setProgress("");
              await qc.invalidateQueries({ queryKey: ["media"] });
              await qc.invalidateQueries({ queryKey: ["posts"] });
              toast.success("Your background job finished.");
            }
            return;
          }
          if (job.status === "failed") {
            try {
              localStorage.removeItem(JOB_KEY);
            } catch {
              // Ignore.
            }
            setPhase("idle");
            setProgress("");
            toast.error(job.error || "Background job failed.");
            return;
          }
        } catch {
          // Job may have been pruned — stop polling quietly.
          return;
        }
        await new Promise((r) => {
          timer = window.setTimeout(r, 2000);
        });
      }
    }
    void resume();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // …and auto-save moments so a reload resumes where you left off.
  useEffect(() => {
    if (!moments || moments.length === 0 || !source) return;
    try {
      const saved: SavedMoments = {
        source:
          source.kind === "library"
            ? { kind: "library", assetId: source.asset.id }
            : { kind: "inbox", filename: source.filename },
        moments,
        targetLen,
        vertical: format === "vertical",
        quality,
        tone,
        platforms,
      };
      localStorage.setItem(MOMENTS_KEY, JSON.stringify(saved));
    } catch {
      // Storage full or blocked — the run still works, just without resume.
    }
  }, [moments, source, targetLen, format, quality, tone, platforms]);

  // Restore a previous moments list once the library has loaded.
  useEffect(() => {
    if (restored || media.isLoading || moments) return;
    const saved = readSavedMoments();
    if (!saved) {
      setRestored(true);
      return;
    }
    const src = saved.source;
    if (src.kind === "library") {
      const asset = (media.data ?? []).find((m) => m.id === src.assetId) ?? null;
      if (!asset || asset.kind !== "video") {
        setRestored(true);
        return;
      }
      setSource({ kind: "library", asset });
    } else {
      setSource({ kind: "inbox", filename: src.filename, sizeBytes: 0 });
      setLocalName(src.filename);
    }
    setMoments(saved.moments);
    setTargetLen(saved.targetLen);
    setFormat(saved.vertical ? "vertical" : "original");
    setQuality(saved.quality);
    setTone(saved.tone);
    setPlatforms(saved.platforms);
    setRestored(true);
    toast.message("Restored your moments from before the reload.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, media.isLoading, media.data]);

  function resetAfterSource(next: Source | null) {
    setSource(next);
    setMoments(null);
    setClips([]);
    setCaptions([]);
    setDrafts(0);
    setPhase("idle");
    setProgress("");
    try {
      localStorage.removeItem(MOMENTS_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  async function refreshInbox() {
    try {
      setInbox(await runList({ data: {} }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the inbox folder");
    }
  }

  // Selecting must be forgiving: tapping a row always wins; typed text matches
  // fuzzily so long names never need to be retyped exactly.
  function useTypedInboxFile() {
    const typed = localName.trim().toLowerCase();
    if (!typed) {
      toast.error("Type part of the file name, or tap a file in the list.");
      return;
    }
    const hit = (inbox?.videos ?? []).find(
      (v) => v.name.toLowerCase().includes(typed) || typed.includes(v.name.toLowerCase()),
    );
    if (hit) {
      setLocalName(hit.name);
      resetAfterSource({ kind: "inbox", filename: hit.name, sizeBytes: hit.sizeBytes });
      return;
    }
    if (!inbox) {
      toast.error("Press the refresh button first so the app can see the folder.");
      return;
    }
    toast.error(`No inbox file matches "${localName.trim()}" — tap it in the list instead.`);
  }

  async function detect() {
    if (!source) {
      toast.error("Pick a library video or an inbox file first.");
      return;
    }
    const src = source;
    const rawTarget = Number(targetLen);
    const targetSeconds = Number.isFinite(rawTarget) ? Math.min(120, Math.max(20, rawTarget)) : 60;
    setPhase("detecting");
    setProgress("Preparing video — first run downloads it once, then it's cached…");
    setMoments(null);
    setClips([]);
    setCaptions([]);
    setDrafts(0);
    try {
      const { jobId } = await runStartDetect({
        data:
          src.kind === "library"
            ? { assetId: src.asset.id, targetSeconds }
            : { filename: src.filename, targetSeconds },
      });
      try {
        localStorage.setItem(JOB_KEY, JSON.stringify({ jobId, kind: "detect" }));
      } catch {
        // Ignore storage errors.
      }
      // Poll the server-side job. You can leave this page — it keeps running.
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const job = await runGetJob({ data: { jobId } });
        setProgress(job.progress);
        if (job.status === "done") {
          const ms = ((job.moments as Moment[]) ?? []).map((m) => ({ ...m, checked: true }));
          setMoments(ms);
          setPhase("idle");
          setProgress("");
          try {
            localStorage.removeItem(JOB_KEY);
          } catch {
            // Ignore.
          }
          toast.success(
            ms.length === 1 ? "1 highlight found." : `${ms.length} highlights found — uncheck any to skip.`,
          );
          return;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Detection failed");
        }
      }
    } catch (err) {
      setPhase("idle");
      setProgress("");
      try {
        localStorage.removeItem(JOB_KEY);
      } catch {
        // Ignore.
      }
      toast.error(err instanceof Error ? err.message : "Detection failed");
    }
  }

  async function cutAndCaption() {
    const wanted = (moments ?? []).filter((m) => m.checked);
    if (!source || wanted.length === 0 || platforms.length === 0) {
      toast.error("Pick a source, keep at least one moment, and tick a platform.");
      return;
    }
    if (!tone) {
      toast.error("Choose a content kind first (the Tone dropdown).");
      return;
    }
    const src = source;
    setPhase("cutting");
    setProgress("Starting background job…");
    setCaptions([]);
    try {
      const { jobId } = await runStartCut({
        data: {
          source:
            src.kind === "library"
              ? { kind: "library" as const, assetId: src.asset.id }
              : { kind: "inbox" as const, filename: src.filename },
          moments: wanted.map((m) => ({ start: m.start, end: m.end, title: m.title, hook: m.hook, summary: m.summary })),
          format,
          quality: quality as "fast" | "best",
          watermarkText: watermark.text || undefined,
          watermarkPosition: watermark.position,
          watermarkSize: watermark.size,
          logoDataUrl: watermark.logoDataUrl || undefined,
          logoPosition: watermark.logoPosition,
          tone,
          platforms,
        },
      });
      try {
        localStorage.setItem(JOB_KEY, JSON.stringify({ jobId, kind: "cut" }));
      } catch {
        // Ignore storage errors.
      }
      // Poll the server-side job. You can leave this page — it keeps running.
      for (;;) {
        await new Promise((r) => setTimeout(r, 3000));
        const job = await runGetJob({ data: { jobId } });
        setProgress(job.progress);
        if (job.status === "done") {
          const cls = (job.clips as ClipRef[]) ?? [];
          setClips(cls);
          setCaptions((job.captions as CaptionSet[]) ?? []);
          setDrafts(Number(job.drafts) || 0);
          setPhase("done");
          setProgress("");
          try {
            localStorage.removeItem(JOB_KEY);
          } catch {
            // Ignore.
          }
          await qc.invalidateQueries({ queryKey: ["media"] });
          await qc.invalidateQueries({ queryKey: ["posts"] });
          toast.success(
            cls.length > 0
              ? `${cls.length} clips cut${Number(job.drafts) > 0 ? `, ${job.drafts} drafts queued` : ""}.`
              : "Done.",
          );
          return;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Cutting failed");
        }
      }
    } catch (err) {
      setPhase("idle");
      setProgress("");
      try {
        localStorage.removeItem(JOB_KEY);
      } catch {
        // Ignore.
      }
      toast.error(err instanceof Error ? err.message : "Cutting failed");
    }
  }


  async function brandFullVideo() {
    if (!source || platforms.length === 0) {
      toast.error("Pick a source and tick at least one platform.");
      return;
    }
    if (!tone) {
      toast.error("Choose a content kind first (the Tone dropdown).");
      return;
    }
    if (brandSummary.trim().length < 20) {
      toast.error("Tell ETS what happens in the video (at least one sentence) so the cover and captions can describe it.");
      return;
    }
    const src = source;
    setPhase("cutting");
    setProgress("Starting branding job…");
    setCaptions([]);
    try {
      const { jobId } = await runStartBrand({
        data: {
          source:
            src.kind === "library"
              ? { kind: "library" as const, assetId: src.asset.id }
              : { kind: "inbox" as const, filename: src.filename },
          title: brandTitle.trim() || undefined,
          summary: brandSummary.trim() || undefined,
          format,
          quality: quality as "fast" | "best",
          watermarkText: watermark.text || undefined,
          watermarkPosition: watermark.position,
          watermarkSize: watermark.size,
          logoDataUrl: watermark.logoDataUrl || undefined,
          logoPosition: watermark.logoPosition,
          tone,
          platforms,
        },
      });
      try {
        localStorage.setItem(JOB_KEY, JSON.stringify({ jobId, kind: "cut" }));
      } catch {
        // Ignore storage errors.
      }
      for (;;) {
        await new Promise((r) => setTimeout(r, 3000));
        const job = await runGetJob({ data: { jobId } });
        setProgress(job.progress);
        if (job.status === "done") {
          const cls = (job.clips as ClipRef[]) ?? [];
          setClips(cls);
          setCaptions((job.captions as CaptionSet[]) ?? []);
          setDrafts(Number(job.drafts) || 0);
          setPhase("done");
          setProgress("");
          try {
            localStorage.removeItem(JOB_KEY);
          } catch {
            // Ignore.
          }
          await qc.invalidateQueries({ queryKey: ["media"] });
          await qc.invalidateQueries({ queryKey: ["posts"] });
          toast.success(`Video branded${Number(job.drafts) > 0 ? `, ${job.drafts} drafts queued` : ""}.`);
          return;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Branding failed");
        }
      }
    } catch (err) {
      setPhase("idle");
      setProgress("");
      try {
        localStorage.removeItem(JOB_KEY);
      } catch {
        // Ignore.
      }
      toast.error(err instanceof Error ? err.message : "Branding failed");
    }
  }


  return (
    <div>
      <PageHeader
        eyebrow="Batch"
        title="Shorts Pipeline"
        description="Long video in, vertical highlight clips out — each with thumbnail, captions, and calendar drafts."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="panel h-fit space-y-5 p-6">
          <div className="space-y-2">
            <Label>Source: library video</Label>
            <Select
              value={source?.kind === "library" ? source.asset.id : ""}
              onValueChange={(id) => {
                const asset = libraryVideos.find((m) => m.id === id) ?? null;
                resetAfterSource(asset ? { kind: "library", asset } : null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Pick from library" /></SelectTrigger>
              <SelectContent>
                {libraryVideos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source: inbox file (big videos stay on disk)</Label>
            <div className="flex gap-2">
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    useTypedInboxFile();
                  }
                }}
                placeholder="sermon-may-2026.mp4"
              />
              <Button type="button" variant="outline" onClick={refreshInbox} aria-label="Refresh inbox list">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Drop the file into the <code>media-inbox</code> folder, then tap it below (or type part of its name and press Enter).
              {inbox ? ` Inbox now: ${inbox.videos.length} video(s).` : ""}
            </p>
            {inbox && inbox.videos.length > 0 && (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {inbox.videos.map((v) => {
                  const selected = source?.kind === "inbox" && source.filename === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      title={v.name}
                      onClick={() => {
                        setLocalName(v.name);
                        resetAfterSource({ kind: "inbox", filename: v.name, sizeBytes: v.sizeBytes });
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition",
                        selected ? "bg-accent text-primary ring-1 ring-primary/50" : "hover:bg-accent",
                      )}
                    >
                      <span className="truncate">{selected ? `✓ ${v.name}` : v.name}</span>
                      <span className="shrink-0 text-muted-foreground">{formatBytes(v.sizeBytes)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!localName.trim()}
                onClick={useTypedInboxFile}
              >
                <HardDrive className="mr-1.5 h-3.5 w-3.5" /> Use this file
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>What do you want to do?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("cut");
                  setMoments(null);
                  setClips([]);
                  setCaptions([]);
                  setDrafts(0);
                }}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition",
                  mode === "cut" ? "border-primary/60 bg-accent/60 ring-1 ring-primary/40" : "border-border/60 hover:bg-accent/40",
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold"><Scissors className="h-4 w-4 text-primary" /> Cut into clips</span>
                <span className="mt-1 block text-xs text-muted-foreground">Find highlights, cut vertical shorts with thumbnail + captions.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("brand");
                  setFormat("original");
                  setMoments(null);
                  setClips([]);
                  setCaptions([]);
                  setDrafts(0);
                }}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition",
                  mode === "brand" ? "border-primary/60 bg-accent/60 ring-1 ring-primary/40" : "border-border/60 hover:bg-accent/40",
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold"><ImageIcon className="h-4 w-4 text-primary" /> Brand full video</span>
                <span className="mt-1 block text-xs text-muted-foreground">No cut — just thumbnail, logo + watermark, then post it.</span>
              </button>
            </div>
          </div>

          {mode === "cut" && (
            <div className="space-y-2">
              <Label>Clip length (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={20}
                  max={120}
                  value={targetLen}
                  onChange={(e) => setTargetLen(e.target.value)}
                  onBlur={() => {
                    const n = Number(targetLen);
                    if (!Number.isFinite(n)) setTargetLen("60");
                    else setTargetLen(String(Math.min(120, Math.max(20, Math.round(n)))));
                  }}
                  aria-label="Clip length in seconds"
                />
                <span className="shrink-0 text-xs text-muted-foreground">sec</span>
              </div>
              <div className="flex gap-1.5">
                {["30", "60", "90"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTargetLen(v)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition",
                      targetLen === v ? "border-primary/60 bg-accent text-primary" : "border-border/60 text-muted-foreground hover:bg-accent/40",
                    )}
                  >
                    {v === "30" ? "~30s" : v === "60" ? "~1min" : "~90s"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Type any length from 20–120 seconds — type 45 for 45-second clips.</p>
            </div>
          )}

          {mode === "brand" && (
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="space-y-2">
                <Label>Video title (optional)</Label>
                <Input
                  value={brandTitle}
                  onChange={(e) => setBrandTitle(e.target.value)}
                  placeholder="Leave blank to use the file name"
                />
              </div>
              <div className="space-y-2">
                <Label>What is this video about? (required — feeds captions + cover)</Label>
                <textarea
                  value={brandSummary}
                  onChange={(e) => setBrandSummary(e.target.value)}
                  rows={3}
                  placeholder="e.g. A worship session — God is faithful through hard seasons, with encouragement to keep trusting Him."
                  className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast 720p</SelectItem>
                  <SelectItem value="best">Full 1080p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "vertical" | "landscape" | "original")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical 9:16 — Shorts / Reels / TikTok</SelectItem>
                <SelectItem value="landscape">Landscape 16:9 — YouTube long-form</SelectItem>
                <SelectItem value="original">Original — keep as-is</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              9:16 crops to a phone screen; 16:9 fits YouTube long videos; Original keeps the source untouched. The re-encode is the slow part.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Content kind (tone)</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue placeholder="Choose a content kind…" /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <PlatformChip
                  key={p.id}
                  id={p.id}
                  active={platforms.includes(p.id)}
                  onClick={() => setPlatforms((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                />
              ))}
            </div>
          </div>

          {source && (
            <div className="rounded-lg border border-primary/40 bg-accent/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Selected: </span>
              <span className="font-semibold text-primary">
                {source.kind === "library" ? source.asset.name : source.filename}
              </span>
            </div>
          )}

          {mode === "cut" ? (
            <>
              <Button onClick={detect} disabled={phase !== "idle" || !source} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {phase === "detecting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}
                {phase === "detecting" ? "Watching…" : "1 · Detect highlights"}
              </Button>
              {phase === "detecting" && progress && (
                <p className="text-center text-xs text-muted-foreground">{progress}</p>
              )}
              {phase === "detecting" && (
                <p className="text-center text-[11px] text-muted-foreground/70">
                  Runs in the background on the server — you can leave this page and come back.
                </p>
              )}
            </>
          ) : (
            <>
              <Button onClick={brandFullVideo} disabled={phase !== "idle" || !source || !tone} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {phase === "cutting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                {phase === "cutting" ? "Branding…" : "Brand full video + write captions"}
              </Button>
              {phase === "cutting" && progress && (
                <p className="text-center text-xs text-muted-foreground">{progress}</p>
              )}
              {phase === "cutting" && (
                <p className="text-center text-[11px] text-muted-foreground/70">
                  Runs in the background on the server — you can leave this page and come back.
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          {!moments && phase === "idle" && (
            <div className="panel grain flex flex-col items-center gap-3 p-16 text-center">
              <Clapperboard className="h-9 w-9 text-primary/60" />
              <p className="font-display text-lg font-semibold">
                {mode === "brand"
                  ? source
                    ? "Ready — press Brand full video"
                    : "Pick a source, then brand it"
                  : source
                    ? "Ready — press 1 · Detect highlights"
                    : "Pick a source, then detect"}
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                {mode === "brand"
                  ? "The whole video is kept — thumbnail, logo + watermark are burned in and captions are written. Pick Dimensions (below): 9:16 for phone feed, 16:9 for YouTube long-form, or Original."
                  : "Library videos cut from cloud storage; inbox files are read straight off your disk — ideal for hour-long recordings."}
              </p>
            </div>
          )}

          {moments && mode === "cut" && (
            <div className="panel space-y-2 p-5">
              <p className="font-display font-semibold">Moments found — uncheck any to skip</p>
              {moments.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtClock(m.start)} → {fmtClock(m.end)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.hook}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setMoments((ms) => ms!.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}>
                    {m.checked ? "Skip" : "Keep"}
                  </Button>
                </div>
              ))}
              <Button
                className="mt-2 w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90"
                disabled={phase === "cutting" || phase === "captioning" || !tone || !moments.some((m) => m.checked)}
                onClick={() => void cutAndCaption()}
              >
                {(phase === "cutting" || phase === "captioning") ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                2 · Cut clips + write captions {progress ? `— ${progress}` : ""}
              </Button>
            </div>
          )}

          {clips.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-semibold">
                  {clips.length} clip{clips.length === 1 ? "" : "s"} ready
                  {drafts > 0 ? ` · ${drafts} calendar drafts queued` : ""}
                </p>
                <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Review in the calendar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {clips.map((c) => (
                <ClipResult key={c.id} clip={c} captions={captions.find((x) => x.clipId === c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
