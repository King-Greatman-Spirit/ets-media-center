// ============================================================
// Studio Component - AI Content Repurposing
// v2.0: Agentic, Autonomous
// ============================================================

import { useState, useEffect } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { useContentStore } from '@/store'
import { repurposeContent } from '@/lib/ai.functions'
import { mediaQuery, connectionsQuery, agentsQuery, agentExecutionsQuery } from '@/lib/data'
import { PLATFORMS } from '@/lib/platforms'
import { PageHeader } from '@/components/app/AppShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Copy, CalendarPlus, Check, Brain, Zap, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const TONES = ['Bold & prophetic', 'Warm & pastoral', 'Teaching & scriptural', 'Urgent call to action', 'Conversational', 'Testimony driven']

export function Studio() {
  const qc = useQueryClient()
  const media = useQuery(mediaQuery)
  const connections = useQuery(connectionsQuery)
  const agents = useQuery(agentsQuery)
  const agentExecs = useQuery(agentExecutionsQuery)
  const run = useServerFn(repurposeContent)
  const upsertPost = useUpsertPost()

  const [idea, setIdea] = useState('')
  const [tone, setTone] = useState(TONES[0]!)
  const [mediaId, setMediaId] = useState('none')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube_shorts', 'tiktok', 'instagram', 'x'])
  const [autonomyLevel, setAutonomyLevel] = useState<'assisted' | 'semi_autonomous' | 'autonomous'>('autonomous')
  const [busy, setBusy] = useState(false)
  const [outputs, setOutputs] = useState<any[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [agentExecutionId, setAgentExecutionId] = useState<string | null>(null)

  const asset = (media.data ?? []).find((m: any) => m.id === mediaId)
  const connectedPlatforms = connections.data?.filter((c: any) => c.status === 'connected') ?? []

  async function generate() {
    if (!idea.trim()) { toast.error('Describe the idea first.') return }
    if (selectedPlatforms.length === 0) { toast.error('Pick at least one platform.') return }
    setBusy(true)
    setOutputs([])
    try {
      const result = await run({
        data: { idea: idea.trim(), tone, platforms: selectedPlatforms, mediaName: asset?.name ?? null, mediaKind: asset?.kind ?? null, autonomyLevel }
      })
      setOutputs(result.outputs)
      toast.success(`Generated ${result.outputs.length} platform versions (Autonomy: ${autonomyLevel})`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  async function runAgent(agentId: string) {
    setBusy(true)
    setAgentExecutionId(agentId)
    try {
      const result = await run({ data: { idea, tone, platforms: selectedPlatforms, autonomyLevel: 'autonomous' } })
      setOutputs(result.outputs)
      toast.success('Agent execution completed!')
    } catch (err) {
      toast.error('Agent execution failed')
    } finally {
      setBusy(false)
      setAgentExecutionId(null)
    }
  }

  async function copy(o: any) {
    const text = `${o.title}\n\n${o.body}\n\n${o.hashtags.join(' ')}`.trim()
    await navigator.clipboard.writeText(text)
    setCopied(o.platform)
    setTimeout(() => setCopied(null), 1500)
  }

  async function schedule(o: any) {
    try {
      await upsertPost.mutateAsync({ title: o.title, content: `${o.body}\n\n${o.hashtags.join(' ')}`.trim(), platform: o.platform, status: 'draft', scheduled_at: new Date(Date.now() + 86400000).toISOString(), hashtags: o.hashtags })
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Scheduled as draft for tomorrow.')
    } catch (err) { toast.error('Could not schedule') }
  }

  return (
    <div>
      <PageHeader eyebrow="Repurpose" title="AI Studio" description="One message in, platform-ready versions out. Choose your autonomy level: Assisted, Semi-Autonomous, or Full Autonomous." />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="panel h-fit space-y-5 p-6 lg:sticky lg:top-6">
          <div className="space-y-2">
            <Label htmlFor="idea">Core idea or message</Label>
            <Textarea id="idea" rows={6} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. A powerful teaching on standing firm in prayer when answers are delayed — from Daniel 10." />
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Autonomy Level</Label>
            <Select value={autonomyLevel} onValueChange={(v) => setAutonomyLevel(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assisted">Assisted (human approves each step)</SelectItem>
                <SelectItem value="semi_autonomous">Semi-Autonomous (AI proposes, human approves)</SelectItem>
                <SelectItem value="autonomous">Full Autonomous (AI executes end-to-end)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Attach media (optional)</Label>
            <Select value={mediaId} onValueChange={setMediaId}>
              <SelectTrigger><SelectValue placeholder="No media" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No media</SelectItem>
                {(media.data ?? []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <PlatformChip key={p.id} id={p.id} active={selectedPlatforms.includes(p.id)} onClick={() => setSelectedPlatforms(selectedPlatforms.includes(p.id) ? selectedPlatforms.filter((x) => x !== p.id) : [...selectedPlatforms, p.id])} connected={connectedPlatforms.some((c: any) => c.platform === p.id)} />
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={busy} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? 'Generating...' : `⚡ Generate (${autonomyLevel})`}
          </Button>

          {/* Agent Controls */}
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="font-display text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Autonomous Agents
            </h4>
            {(agents.data ?? []).map((agent: any) => (
              <button key={agent.id} className="w-full text-left rounded-lg border border-border/60 bg-background/40 p-3 hover:border-primary/40 transition" onClick={() => runAgent(agent.id)} disabled={busy}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${agent.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-sm font-medium">{agent.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{agent.autonomyLevel}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {busy && outputs.length === 0 && (
            <div className="panel flex flex-col items-center gap-3 p-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{autonomyLevel === 'autonomous' ? 'AI agents working autonomously...' : 'Generating platform versions...'}</p>
            </div>
          )}
          {!busy && outputs.length === 0 && (
            <div className="panel grain flex flex-col items-center gap-3 p-16 text-center">
              <Sparkles className="h-9 w-9 text-primary/60" />
              <p className="font-display text-lg font-semibold">Your platform versions appear here</p>
              <p className="max-w-md text-sm text-muted-foreground">Describe the message, choose autonomy level, and the AI generates platform-optimized content.</p>
            </div>
          )}
          {outputs.map((o: any, i: number) => (
            <article key={o.platform || i} className="panel p-5">
              <header className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-background" style={{ backgroundColor: PLATFORMS.find((p) => p.id === o.platform)?.color ?? '#888' }}>{PLATFORMS.find((p) => p.id === o.platform)?.short ?? '?'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{PLATFORMS.find((p) => p.id === o.platform)?.name ?? o.platform}</p>
                  <p className="text-xs text-muted-foreground">Best time: {o.bestTime}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copy(o)}>{copied === o.platform ? <Check className="mr-1 h-3 w-3 text-success" /> : <Copy className="mr-1 h-3 w-3" />} Copy</Button>
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => schedule(o)}><CalendarPlus className="mr-1 h-3 w-3" /> Schedule</Button>
              </header>
              <h3 className="mt-4 font-display text-lg font-semibold">{o.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{o.body}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{o.hashtags?.map((h: string, j: number) => <Badge key={j} variant="outline" className="border-primary/30 text-primary">{h}</Badge>)}</div>
              <p className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground"><strong className="text-foreground/80">Format:</strong> {o.formatNotes}</p>
              {o.hook && <p className="mt-2 text-sm text-primary"><strong>Hook:</strong> {o.hook}</p>}
              {o.cta && <p className="mt-1 text-sm text-muted-foreground"><strong>CTA:</strong> {o.cta}</p>}
              {o.confidence && <Badge variant="secondary" className="mt-2">Confidence: {Math.round(o.confidence * 100)}%</Badge>}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">{children}</label>
}

function PlatformChip({ id, active, onClick, connected }: { id: string; active: boolean; onClick: () => void; connected: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium border transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'} ${!connected ? 'opacity-50' : ''}`}>
      {PLATFORMS.find((p) => p.id === id)?.name ?? id} {!connected && '🔒'}
    </button>
  )
}
