import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useContentStore } from '@/store'
import { mediaQuery, connectionsQuery, postsQuery, insightsQuery, kpisQuery, agentsQuery, agentExecutionsQuery } from '@/lib/data'
import { PLATFORMS } from '@/lib/platforms'
import { PageHeader } from '@/components/app/AppShell'
import { EtsCover } from '@/components/brand/Brand'
import { PlatformDot } from '@/components/app/PlatformBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, FolderOpen, CalendarDays, Plug, ArrowUpRight, Film, BarChart3, Robot, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({
    meta: [
      { title: 'Overview | ETS Command Center' },
      { name: 'description', content: 'Your ETS media command center overview.' },
    ],
  }),
  component: Dashboard,
})

function Dashboard() {
  const media = useQuery(mediaQuery)
  const posts = useQuery(postsQuery)
  const connections = useQuery(connectionsQuery)
  const insights = useQuery(insightsQuery)
  const kpis = useQuery(kpisQuery)
  const agents = useQuery(agentsQuery)
  const agentExecs = useQuery(agentExecutionsQuery)

  const now = new Date()
  const upcoming = (posts.data ?? []).filter((p: any) => p.status === 'scheduled' && new Date(p.scheduled_at) > now)
  const thisWeek = upcoming.filter((p: any) => new Date(p.scheduled_at) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))

  const connected = new Set((connections.data ?? []).map((c: any) => c.platform))
  const activeAgents = (agents.data ?? []).filter((a: any) => a.status === 'running').length
  const totalExecutions = agentExecs.data?.length ?? 0

  return (
    <div>
      <div className="panel relative mb-8 overflow-hidden">
        <EtsCover className="absolute inset-0 opacity-70" />
        <div className="relative z-10 flex flex-col gap-4 p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.3em] text-primary">End Time Soldiers</p>
            <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Command Center</h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/80">
              {thisWeek.length > 0
                ? `${thisWeek.length} post${thisWeek.length === 1 ? '' : 's'} go out this week across ${new Set(thisWeek.map((p: any) => p.platform)).size} platform${new Set(thisWeek.map((p: any) => p.platform)).size === 1 ? '' : 's'}.`
                : 'Drop media into the library and let the AI agents do the rest.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              <Link to="/studio"><Sparkles className="mr-2 h-4 w-4" /> Open AI Studio</Link>
            </Button>
            <Button asChild variant="outline"><Link to="/library"><FolderOpen className="mr-2 h-4 w-4" /> Upload</Link></Button>
            <Button asChild variant="outline"><Link to="/autonomous"><Robot className="mr-2 h-4 w-4" /> Agents</Link></Button>
          </div>
        </div>
      </div>

      {/* DA/BI KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat to="/library" icon={FolderOpen} label="Media Assets" value={media.data?.length ?? 0} sub="Total uploads" />
        <Stat to="/calendar" icon={CalendarDays} label="Scheduled" value={upcoming.length} sub={`${thisWeek.length} this week`} />
        <Stat to="/connections" icon={Plug} label="Connected" value={`${connected.size}/${PLATFORMS.length}`} sub={connected.size === PLATFORMS.length ? 'All armed' : `${PLATFORMS.length - connected.size} to connect`} />
        <Stat to="/da" icon={BarChart3} label="Engagement" value={kpis.data?.[0]?.currentValue ?? 0} sub="DA/BI Analytics" />
      </div>

      {/* Agent Status */}
      <div className="mt-8">
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Robot className="h-5 w-5 text-primary" /> AI Agents ({activeAgents} active)
            </h2>
            <Badge variant="outline" className="border-primary/40 text-primary">
              {totalExecutions} total executions
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {(agents.data ?? []).map((agent: any) => (
              <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <div className={`h-2 w-2 rounded-full ${agent.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.agentType} · {agent.autonomyLevel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8">
        <div className="panel p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" /> AI Insights
          </h2>
          {(insights.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights yet. Run the AI agents to generate insights.</p>
          ) : (
            <div className="space-y-2">
              {(insights.data ?? []).slice(0, 6).map((insight: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40">
                  <Badge variant="outline" className="border-primary/40 text-primary shrink-0">{insight.type}</Badge>
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description?.slice(0, 100)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Posts */}
      <section className="mt-8">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Up Next</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/calendar">Open calendar <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          {upcoming.length === 0 ? (
            <Empty text="No posts in the queue." />
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.slice(0, 8).map((p: any, i: number) => (
                <li key={i} className="flex items-center gap-4 py-3">
                  <div className="w-24 shrink-0 text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">{formatDate(p.scheduled_at)}</div>
                    {formatTime(p.scheduled_at)}
                  </div>
                  <PlatformDot id={p.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.platform}</p>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ to, icon: Icon, label, value, sub }: { to: string; icon: any; label: string; value: number | string; sub: string }) {
  return (
    <Link to={to} className="panel group p-5 transition hover:gold-ring">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-gold-gradient">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Link>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
