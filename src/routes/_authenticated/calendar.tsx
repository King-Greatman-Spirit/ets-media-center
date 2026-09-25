import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, postsQuery, useDeletePost, useUpsertPost, type ScheduledPost } from "@/lib/data";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Content Calendar | ETS Command Center" },
      { name: "description", content: "Plan and queue posts weeks or months ahead across every ETS channel." },
      { property: "og:title", content: "Content Calendar | ETS" },
      { property: "og:description", content: "Plan and queue posts weeks ahead across every channel." },
    ],
  }),
  component: CalendarPage,
});

const STATUSES = ["draft", "scheduled", "published", "failed"] as const;

function CalendarPage() {
  const posts = useQuery(postsQuery);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [editing, setEditing] = useState<Partial<ScheduledPost> | null>(null);
  const del = useDeletePost();

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts.data ?? []) {
      const key = format(new Date(p.scheduled_at), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [posts.data]);

  const queue = (posts.data ?? []).filter((p) => new Date(p.scheduled_at) >= new Date()).slice(0, 12);

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Content Calendar"
        description="Plan your release rhythm weeks or months in advance. Click any day to queue a post."
        actions={
          <Button
            className="bg-gold-gradient text-primary-foreground hover:opacity-90"
            onClick={() => setEditing({ scheduled_at: new Date().toISOString() })}
          >
            <Plus className="mr-2 h-4 w-4" /> New post
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="panel overflow-hidden">
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h2 className="font-display text-xl font-semibold">{format(month, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-7 border-b border-border/60 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const items = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
              const outside = !isSameMonth(day, month);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    const at = new Date(day);
                    at.setHours(10, 0, 0, 0);
                    setEditing({ scheduled_at: at.toISOString() });
                  }}
                  className={cn(
                    "min-h-[104px] border-b border-r border-border/40 p-2 text-left align-top transition hover:bg-accent/40",
                    outside && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday(day) ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground",
                      isSameDay(day, new Date()) || "",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((p) => {
                      const pl = platformById(p.platform);
                      return (
                        <span
                          key={p.id}
                          className="flex items-center gap-1 rounded border-l-2 bg-card/70 px-1.5 py-0.5 text-[10px]"
                          style={{ borderLeftColor: pl?.color ?? "var(--primary)" }}
                        >
                          <span className="truncate">{p.title}</span>
                        </span>
                      );
                    })}
                    {items.length > 3 && <span className="text-[10px] text-muted-foreground">+{items.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel h-fit p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Queue</h2>
          {posts.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : queue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing queued yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((p) => {
                const pl = platformById(p.platform);
                return (
                  <li key={p.id} className="group rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pl?.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                        onClick={() => del.mutate(p.id)}
                        aria-label="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {format(new Date(p.scheduled_at), "EEE d MMM, h:mm a")}
                      <Badge variant="outline" className="border-primary/30 text-primary capitalize">{p.status}</Badge>
                    </div>
                    <button className="mt-2 text-xs text-primary hover:underline" onClick={() => setEditing(p)}>Edit</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <PostDialog post={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function PostDialog({ post, onClose }: { post: Partial<ScheduledPost> | null; onClose: () => void }) {
  const upsert = useUpsertPost();
  const media = useQuery(mediaQuery);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await upsert.mutateAsync({
        ...(post?.id ? { id: post.id } : {}),
        title: String(form.get("title")),
        content: String(form.get("content")),
        platform: String(form.get("platform")),
        status: String(form.get("status")) as ScheduledPost["status"],
        scheduled_at: new Date(String(form.get("scheduled_at"))).toISOString(),
        media_asset_id: (form.get("media") as string) === "none" ? null : String(form.get("media")),
      });
      toast.success(post?.id ? "Post updated." : "Post scheduled.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save post");
    } finally {
      setBusy(false);
    }
  }

  const defaultDate = post?.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : "";

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">{post?.id ? "Edit post" : "Schedule a post"}</DialogTitle></DialogHeader>
        {post && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={post.title ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" name="content" rows={5} defaultValue={post.content ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="platform">Platform</Label>
                <Select name="platform" defaultValue={post.platform ?? PLATFORMS[0]!.id}>
                  <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={post.status ?? "scheduled"}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_at">When</Label>
              <Input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="media">Media</Label>
              <Select name="media" defaultValue={post.media_asset_id ?? "none"}>
                <SelectTrigger id="media"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No media</SelectItem>
                  {(media.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={busy} className="bg-gold-gradient text-primary-foreground">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
