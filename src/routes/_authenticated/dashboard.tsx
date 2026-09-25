import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { FolderOpen, Sparkles, CalendarDays, Plug, ArrowUpRight, Film, Image as ImageIcon, Music } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { EtsCover } from "@/components/brand/Brand";
import { connectionsQuery, mediaQuery, postsQuery } from "@/lib/data";
import { PLATFORMS, platformById } from "@/lib/platforms";
import { PlatformDot } from "@/components/app/PlatformBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview | ETS Command Center" },
      { name: "description", content: "Your ETS media command center at a glance: library, queue, and connections." },
      { property: "og:title", content: "Overview | ETS Command Center" },
      { property: "og:description", content: "Your ETS media command center at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const media = useQuery(mediaQuery);
  const posts = useQuery(postsQuery);
  const connections = useQuery(connectionsQuery);

  const now = new Date();
  const upcoming = (posts.data ?? []).filter((p) => p.status === "scheduled" && isAfter(new Date(p.scheduled_at), now));
  const thisWeek = upcoming.filter((p) => isBefore(new Date(p.scheduled_at), addDays(now, 7)));
  const counts = { video: 0, image: 0, audio: 0 };
  for (const m of media.data ?? []) counts[m.kind]++;
  const connected = new Set((connections.data ?? []).map((c) => c.platform));

  return (
    <div>
      <div className="panel relative mb-8 overflow-hidden grain">
        <EtsCover className="absolute inset-0 opacity-70" />
        <div className="relative z-10 flex flex-col gap-4 p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.3em] text-primary">End Time Soldiers</p>
            <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Command Center</h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/80">
              {thisWeek.length > 0
                ? `${thisWeek.length} post${thisWeek.length === 1 ? "" : "s"} go out this week across ${new Set(thisWeek.map((p) => p.platform)).size} platform${new Set(thisWeek.map((p) => p.platform)).size === 1 ? "" : "s"}.`
                : "Nothing scheduled this week yet. Drop media into the library and let the studio do the rest."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              <Link to="/studio"><Sparkles className="mr-2 h-4 w-4" /> Open AI Studio</Link>
            </Button>
            <Button asChild variant="outline"><Link to="/library">Upload media</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat to="/library" icon={FolderOpen} label="Media assets" value={media.data?.length ?? 0} sub={`${counts.video} video · ${counts.image} image · ${counts.audio} audio`} />
        <Stat to="/calendar" icon={CalendarDays} label="Scheduled" value={upcoming.length} sub={`${thisWeek.length} in the next 7 days`} />
        <Stat to="/connections" icon={Plug} label="Connected platforms" value={`${connected.size}/${PLATFORMS.length}`} sub={connected.size === PLATFORMS.length ? "All channels armed" : `${PLATFORMS.length - connected.size} to connect`} />
        <Stat to="/studio" icon={Sparkles} label="Published" value={(posts.data ?? []).filter((p) => p.status === "published").length} sub="All-time" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Up next</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/calendar">Open calendar <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          {upcoming.length === 0 ? (
            <Empty text="No posts in the queue." />
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <div className="w-24 shrink-0 text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">{format(new Date(p.scheduled_at), "EEE d MMM")}</div>
                    {format(new Date(p.scheduled_at), "h:mm a")}
                  </div>
                  <PlatformDot id={p.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{platformById(p.platform)?.name}</p>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Recent uploads</h2>
          {(media.data ?? []).length === 0 ? (
            <Empty text="Your library is empty." />
          ) : (
            <ul className="space-y-2">
              {(media.data ?? []).slice(0, 6).map((m) => {
                const Icon = m.kind === "video" ? Film : m.kind === "image" ? ImageIcon : Music;
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "d MMM")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <PageHeader eyebrow="Channels" title="Platform status" />
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-9">
          {PLATFORMS.map((p) => {
            const on = connected.has(p.id);
            return (
              <Link key={p.id} to="/connections" className="panel flex flex-col items-center gap-2 p-4 text-center transition hover:gold-ring">
                <span className="flex h-10 w-10 items-center justify-center rounded-full font-black text-background" style={{ backgroundColor: p.color, opacity: on ? 1 : 0.35 }}>{p.short}</span>
                <span className="text-xs font-medium leading-tight">{p.name}</span>
                <span className={on ? "text-[10px] uppercase tracking-wider text-success" : "text-[10px] uppercase tracking-wider text-muted-foreground"}>{on ? "Connected" : "Not linked"}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ to, icon: Icon, label, value, sub }: { to: "/library" | "/calendar" | "/connections" | "/studio"; icon: typeof FolderOpen; label: string; value: number | string; sub: string }) {
  return (
    <Link to={to} className="panel group p-5 transition hover:gold-ring">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-gold-gradient">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
