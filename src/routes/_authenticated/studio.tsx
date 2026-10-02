import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, CalendarPlus, Check, ScanSearch, Send } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, useUpsertPost, signedUrl } from "@/lib/data";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { PlatformChip } from "@/components/app/PlatformBadge";
import { repurposeContent } from "@/lib/ai.functions";
import { analyzeMedia } from "@/lib/media.functions";
import { publishPost } from "@/lib/publish.functions";
import { captureVideoFrames } from "@/lib/video-frames";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "AI Studio | ETS Command Center" },
      { name: "description", content: "Turn one idea or clip into platform-tailored copy, hashtags and formatting for nine channels." },
      { property: "og:title", content: "AI Studio | ETS" },
      { property: "og:description", content: "Turn one idea into copy for nine platforms." },
    ],
  }),
  component: Studio,
});

const TONES = ["Bold & prophetic", "Warm & pastoral", "Teaching & scriptural", "Urgent call to action", "Conversational", "Testimony driven"];

type Output = { platform: string; title: string; body: string; hashtags: string[]; formatNotes: string; bestTime: string };

function Studio() {
  const qc = useQueryClient();
  const media = useQuery(mediaQuery);
  const run = useServerFn(repurposeContent);
  const analyze = useServerFn(analyzeMedia);
  const runPublish = useServerFn(publishPost);
  const upsertPost = useUpsertPost();

  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState(TONES[0]!);
  const [mediaId, setMediaId] = useState<string>("none");
  const [selected, setSelected] = useState<string[]>(["youtube_shorts", "instagram_reels", "tiktok", "x"]);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [attachUrl, setAttachUrl] = useState<string | null>(null);

  // Preview URL for the attached file, so the results visibly travel with it.
  useEffect(() => {
    const target = (media.data ?? []).find((m) => m.id === mediaId);
    if (!target) {
      setAttachUrl(null);
      return;
    }
    let live = true;
    signedUrl(target.storage_path)
      .then((u) => {
        if (live) setAttachUrl(u);
      })
      .catch(() => {
        if (live) setAttachUrl(null);
      });
    return () => {
      live = false;
    };
  }, [mediaId, media.data]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const asset = (media.data ?? []).find((m) => m.id === mediaId);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // Let the AI watch/read the attached media, then feed what it saw into the idea box.
  async function analyzeAttached() {
    const target = (media.data ?? []).find((m) => m.id === mediaId);
    if (!target) {
      toast.error("Attach a media file first.");
      return;
    }
    setAnalyzing(true);
    try {
      let frames: string[] | undefined;
      if (target.kind === "video") {
        toast.message("Reading video frames…");
        frames = await captureVideoFrames(await signedUrl(target.storage_path));
      }
      const { summary } = await analyze({ data: { assetId: target.id, frames } });
      const block = `Attached media shows: ${summary.trim()}`;
      setIdea((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
      toast.success("Media analyzed — summary added to your idea.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Media analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generate() {
    const baseIdea =
      idea.trim() ||
      (asset?.analysis_text ? `Create platform posts from this media: ${asset.analysis_text}` : "");
    if (!baseIdea) {
      toast.error("Describe the idea or message first, or attach analyzed media.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Pick at least one platform.");
      return;
    }
    setBusy(true);
    setOutputs([]);
    try {
      // The attached file always shapes the captions: its saved AI analysis
      // (or at minimum its name and kind) travels with the idea, whether or
      // not Analyze was clicked in this session.
      const attached = asset
        ? `Attached media (${asset.kind} "${asset.name}")${asset.analysis_text ? ` shows: ${asset.analysis_text}` : ""}.`
        : "";
      const fullIdea = (attached ? `${baseIdea}\n\n${attached}` : baseIdea).slice(0, 6000);
      const result = await run({
        data: {
          idea: fullIdea,
          tone,
          platforms: selected,
          mediaName: asset?.name ?? null,
          mediaKind: asset?.kind ?? null,
        },
      });
      setOutputs(result.outputs);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("repurpose_sessions").insert({
          user_id: auth.user.id,
          source_idea: baseIdea,
          tone,
          media_asset_id: asset?.id ?? null,
          outputs: result.outputs,
        });
      }
      toast.success(`Generated ${result.outputs.length} versions.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy(o: Output) {
    const text = `${o.title}\n\n${o.body}\n\n${o.hashtags.join(" ")}`.trim();
    await navigator.clipboard.writeText(text);
    setCopied(o.platform);
    setTimeout(() => setCopied(null), 1500);
  }

  async function schedule(o: Output) {
    const when = new Date();
    when.setDate(when.getDate() + 1);
    when.setHours(10, 0, 0, 0);
    try {
      await upsertPost.mutateAsync({
        title: o.title,
        content: `${o.body}\n\n${o.hashtags.join(" ")}`.trim(),
        platform: o.platform,
        status: "draft",
        scheduled_at: when.toISOString(),
        hashtags: o.hashtags,
        media_asset_id: asset?.id ?? null,
      });
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Added to the calendar as a draft for tomorrow 10:00.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule");
    }
  }

  async function postOutput(o: Output) {
    const platform = platformById(o.platform);
    if (!platform?.autoPublish) {
      toast.error(
        `${platform?.name ?? "This platform"} auto-posting is not live yet — use Copy, then paste in the app.`,
      );
      return;
    }
    setPosting(o.platform);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const { data: row, error } = await supabase
        .from("scheduled_posts")
        .insert({
          user_id: auth.user.id,
          title: o.title,
          content: `${o.body}\n\n${o.hashtags.join(" ")}`.trim(),
          platform: o.platform,
          status: "scheduled",
          scheduled_at: new Date().toISOString(),
          hashtags: o.hashtags,
          media_asset_id: asset?.id ?? null,
        })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message ?? "Could not save post");
      await runPublish({ data: { postId: row.id, platforms: [platform.id] } });
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success(`Posted to ${platform.name}.`);
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.error(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setPosting(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Repurpose"
        title="AI Studio"
        description="One message in, nine platform-ready versions out — copy, hashtags and format notes tuned to each channel."
      />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="panel h-fit space-y-5 p-6 lg:sticky lg:top-6">
          <div className="space-y-2">
            <Label htmlFor="idea">Core idea or message</Label>
            <Textarea
              id="idea"
              rows={6}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A 60-second clip on standing firm in prayer when the answer is delayed — from Daniel 10."
            />
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
            <Label>Attach media (optional)</Label>
            <Select value={mediaId} onValueChange={setMediaId}>
              <SelectTrigger><SelectValue placeholder="No media" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No media</SelectItem>
                {(media.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mediaId !== "none" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={analyzeAttached}
                disabled={analyzing || busy}
              >
                {analyzing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="mr-2 h-3.5 w-3.5" />}
                {analyzing ? "Watching your media…" : "Analyze attached media"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Analyze lets the AI watch or read the file first, so the posts come from its actual content.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <PlatformChip key={p.id} id={p.id} active={selected.includes(p.id)} onClick={() => toggle(p.id)} />
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={busy} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? "Forging copy..." : "Generate for all selected"}
          </Button>
        </div>

        <div className="space-y-4">
          {asset && (
            <div className="panel flex items-center gap-4 p-4">
              {asset.kind === "video" && attachUrl && (
                <video src={attachUrl} controls muted preload="metadata" className="h-20 w-32 shrink-0 rounded-lg object-cover" />
              )}
              {asset.kind === "image" && attachUrl && (
                <img src={attachUrl} alt={asset.name} className="h-20 w-32 shrink-0 rounded-lg object-cover" />
              )}
              {asset.kind === "audio" && attachUrl && (
                <audio src={attachUrl} controls preload="metadata" className="w-48 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{asset.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Attached — every post below is written for this file, and Schedule / Post carries it along.
                </p>
              </div>
            </div>
          )}
          {busy && outputs.length === 0 && (
            <div className="panel flex flex-col items-center gap-3 p-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Writing {selected.length} platform versions…</p>
            </div>
          )}
          {!busy && outputs.length === 0 && (
            <div className="panel grain flex flex-col items-center gap-3 p-16 text-center">
              <Sparkles className="h-9 w-9 text-primary/60" />
              <p className="font-display text-lg font-semibold">Your platform versions appear here</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Describe the message, choose your channels, and the studio writes hooks, captions, hashtags and format
                notes for each one.
              </p>
            </div>
          )}
          {outputs.map((o) => {
            const p = platformById(o.platform);
            return (
              <article key={o.platform} className="panel p-5">
                <header className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-background" style={{ backgroundColor: p?.color ?? "#888" }}>
                    {p?.short ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold">{p?.name ?? o.platform}</p>
                    <p className="text-xs text-muted-foreground">Best time: {o.bestTime}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(o)}>
                    {copied === o.platform ? <Check className="mr-1 h-3 w-3 text-success" /> : <Copy className="mr-1 h-3 w-3" />} Copy
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => schedule(o)}>
                    <CalendarPlus className="mr-1 h-3 w-3" /> Schedule
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => postOutput(o)} disabled={posting === o.platform}>
                    {posting === o.platform ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />} Post
                  </Button>
                </header>
                <h3 className="mt-4 font-display text-lg font-semibold">{o.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{o.body}</p>
                {o.hashtags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {o.hashtags.map((h) => (
                      <Badge key={h} variant="outline" className="border-primary/30 text-primary">{h}</Badge>
                    ))}
                  </div>
                )}
                <p className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground/80">Format:</strong> {o.formatNotes}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
