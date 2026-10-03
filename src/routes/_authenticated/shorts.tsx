import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Clapperboard, HardDrive, Loader2, Scissors, ArrowRight, CalendarCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, signedUrl, type MediaAsset } from "@/lib/data";
import { PLATFORMS } from "@/lib/platforms";
import { PlatformChip } from "@/components/app/PlatformBadge";
import { repurposeContent } from "@/lib/ai.functions";
import { listInbox, detectMoments, cutInboxClip, cutLibraryClip, extractFrames } from "@/lib/batch.functions";
import { captureTimestampedFrames, probeVideoMeta } from "@/lib/video-frames";
import { formatBytes } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const TONES = ["Bold & prophetic", "Warm & pastoral", "Teaching & scriptural", "Urgent call to action", "Conversational", "Testimony driven"];

type Moment = { start: number; end: number; title: string; hook: string; summary: string; checked: boolean };
type ClipRef = { id: string; name: string; title: string };
type Source =
  | { kind: "library"; asset: MediaAsset }
  | { kind: "inbox"; filename: string; sizeBytes: number };

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Shorts() {
  const qc = useQueryClient();
  const media = useQuery(mediaQuery);
  const runList = useServerFn(listInbox);
  const runDetect = useServerFn(detectMoments);
  const runFrames = useServerFn(extractFrames);
  const runCutInbox = useServerFn(cutInboxClip);
  const runCutLibrary = useServerFn(cutLibraryClip);
  const runRepurpose = useServerFn(repurposeContent);

  const [source, setSource] = useState<Source | null>(null);
  const [localName, setLocalName] = useState("");
  const [inbox, setInbox] = useState<{ dir: string; videos: { name: string; sizeBytes: number; mtime: number }[] } | null>(null);
  const [targetLen, setTargetLen] = useState("60");
  const [vertical, setVertical] = useState(true);
  const [tone, setTone] = useState(TONES[0]!);
  const [platforms, setPlatforms] = useState<string[]>(["youtube_shorts", "tiktok", "instagram_reels", "x"]);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "detecting" | "cutting" | "captioning" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [clips, setClips] = useState<ClipRef[]>([]);
  const [drafts, setDrafts] = useState(0);

  const libraryVideos = (media.data ?? []).filter((m) => m.kind === "video");

  function resetAfterSource(next: Source | null) {
    setSource(next);
    setMoments(null);
    setClips([]);
    setDrafts(0);
    setPhase("idle");
    setProgress("");
  }

  async function refreshInbox() {
    try {
      setInbox(await runList({ data: {} }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the inbox folder");
    }
  }

  async function detect() {
    if (!source) {
      toast.error("Pick a library video or an inbox file first.");
      return;
    }
    const targetSeconds = Number(targetLen);
    setPhase("detecting");
    setProgress("Watching for the best moments…");
    setMoments(null);
    setClips([]);
    setDrafts(0);
    try {
      if (source.kind === "library") {
        const url = await signedUrl(source.asset.storage_path);
        let duration = Number(source.asset.duration_seconds) || 0;
        if (!duration) duration = (await probeVideoMeta(url)).duration;
        if (!duration) throw new Error("Could not determine this video's length.");
        const frames = await captureTimestampedFrames(url, 10);
        const { moments: found } = await runDetect({
          data: { assetId: source.asset.id, duration, frames, targetSeconds },
        });
        setMoments(found.map((m) => ({ ...m, checked: true })));
      } else {
        setProgress("Reading frames from disk…");
        const { duration, frames } = await runFrames({ data: { filename: source.filename, count: 10 } });
        setProgress("Watching for the best moments…");
        const { moments: found } = await runDetect({
          data: { filename: source.filename, duration, frames, targetSeconds },
        });
        setMoments(found.map((m) => ({ ...m, checked: true })));
      }
      setPhase("idle");
      setProgress("");
      toast.success("Highlights found — uncheck any moment to skip it.");
    } catch (err) {
      setPhase("idle");
      setProgress("");
      toast.error(err instanceof Error ? err.message : "Detection failed");
    }
  }

  async function cutAndCaption() {
    const wanted = (moments ?? []).filter((m) => m.checked);
    if (!source || wanted.length === 0 || platforms.length === 0) {
      toast.error("Pick a source, keep at least one moment, and tick a platform.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Please sign in again.");
      return;
    }
    const userId = auth.user.id;

    setPhase("cutting");
    const made: ClipRef[] = [];
    for (let i = 0; i < wanted.length; i++) {
      const m = wanted[i]!;
      setProgress(`Cutting clip ${i + 1} of ${wanted.length}…`);
      try {
        if (source.kind === "inbox") {
          const kept = await runCutInbox({
            data: {
              filename: source.filename,
              index: i,
              moment: { start: m.start, end: m.end, title: m.title, hook: m.hook, summary: m.summary },
              vertical,
            },
          });
          made.push({ id: kept.id, name: kept.name, title: kept.title });
        } else {
          const dims = { w: Number(source.asset.width) || 0, h: Number(source.asset.height) || 0 };
          const kept = await runCutLibrary({
            data: {
              assetId: source.asset.id,
              index: i,
              moment: { start: m.start, end: m.end, title: m.title, hook: m.hook, summary: m.summary },
              vertical: vertical && dims.w > dims.h,
            },
          });
          made.push({ id: kept.id, name: kept.name, title: kept.title });
        }
      } catch (e) {
        toast.error(`Clip ${i + 1} failed: ${e instanceof Error ? e.message : "cut failed"}`);
      }
    }
    setClips(made);
    await qc.invalidateQueries({ queryKey: ["media"] });
    if (made.length === 0) {
      setPhase("idle");
      setProgress("");
      return;
    }

    setPhase("captioning");
    let created = 0;
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(18, 0, 0, 0);
    for (let i = 0; i < made.length; i++) {
      const clip = made[i]!;
      const w = wanted[i]!;
      setProgress(`Writing captions ${i + 1} of ${made.length}…`);
      try {
        const idea = `Clip: ${clip.title}. Hook: ${w.hook} ${w.summary}`.slice(0, 2000);
        const result = await runRepurpose({
          data: { idea, tone, platforms: platforms as never, mediaName: clip.name, mediaKind: "video" },
        });
        const day = new Date(base);
        day.setDate(day.getDate() + i);
        for (const o of result.outputs) {
          const { error } = await supabase.from("scheduled_posts").insert({
            user_id: userId,
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
        toast.error(`Captions failed for ${clip.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    await qc.invalidateQueries({ queryKey: ["posts"] });
    setDrafts(created);
    setPhase("done");
    setProgress("");
    toast.success(created > 0 ? `${made.length} clips cut, ${created} drafts queued.` : `${made.length} clips cut.`);
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
                placeholder="sermon-may-2026.mp4"
              />
              <Button type="button" variant="outline" onClick={refreshInbox} aria-label="Refresh inbox list">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Drop the file into the <code>media-inbox</code> folder, type its exact name, then Detect.
              {inbox ? ` Inbox now: ${inbox.videos.length} video(s).` : ""}
            </p>
            {inbox && inbox.videos.length > 0 && (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {inbox.videos.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => {
                      setLocalName(v.name);
                      resetAfterSource({ kind: "inbox", filename: v.name, sizeBytes: v.sizeBytes });
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  >
                    <span className="truncate">{v.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatBytes(v.sizeBytes)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!localName.trim()}
                onClick={() => resetAfterSource({ kind: "inbox", filename: localName.trim(), sizeBytes: 0 })}
              >
                <HardDrive className="mr-1.5 h-3.5 w-3.5" /> Use this file
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-2">
              <Label>Clip length</Label>
              <Select value={targetLen} onValueChange={setTargetLen}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">~30 sec</SelectItem>
                  <SelectItem value="60">~1 min</SelectItem>
                  <SelectItem value="90">~90 sec</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={vertical} onChange={(e) => setVertical(e.target.checked)} />
              Vertical 9:16
            </label>
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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

          <Button onClick={detect} disabled={phase !== "idle" || !source} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90">
            {phase === "detecting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}
            {phase === "detecting" ? "Watching…" : "1 · Detect highlights"}
          </Button>
        </div>

        <div className="space-y-4">
          {!moments && phase === "idle" && (
            <div className="panel grain flex flex-col items-center gap-3 p-16 text-center">
              <Clapperboard className="h-9 w-9 text-primary/60" />
              <p className="font-display text-lg font-semibold">Pick a source, then detect</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Library videos cut from cloud storage; inbox files are read straight off your disk —
                ideal for hour-long recordings.
              </p>
            </div>
          )}

          {moments && (
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
                disabled={phase === "cutting" || phase === "captioning" || !moments.some((m) => m.checked)}
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
            <div className="panel space-y-2 p-5">
              <p className="font-display font-semibold">{clips.length} clips ready{drafts > 0 ? `, ${drafts} drafts queued` : ""}</p>
              {clips.map((c) => (
                <p key={c.id} className="truncate text-sm text-muted-foreground">✂ {c.name}</p>
              ))}
              <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Review drafts in the calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
