import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, CalendarPlus, Check } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, useUpsertPost } from "@/lib/data";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { PlatformChip } from "@/components/app/PlatformBadge";
import { repurposeContent } from "@/lib/ai.functions";
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
  const upsertPost = useUpsertPost();

  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState(TONES[0]!);
  const [mediaId, setMediaId] = useState<string>("none");
  const [selected, setSelected] = useState<string[]>(["youtube_shorts", "instagram_reels", "tiktok", "x"]);
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const asset = (media.data ?? []).find((m) => m.id === mediaId);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function generate() {
    if (!idea.trim()) {
      toast.error("Describe the idea or message first.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Pick at least one platform.");
      return;
    }
    setBusy(true);
    setOutputs([]);
    try {
      const result = await run({
        data: {
          idea: idea.trim(),
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
          source_idea: idea.trim(),
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
