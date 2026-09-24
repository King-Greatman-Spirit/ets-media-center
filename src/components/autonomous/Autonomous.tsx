// ============================================================
// Autonomous Operations Component
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { useContentStore } from '@/store'
import { agentsQuery, agentExecutionsQuery, automationsQuery } from '@/lib/data'
import { PageHeader } from '@/components/app/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Robot, Play, Pause, Settings, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'

export function Autonomous() {
  const agents = useQuery(agentsQuery)
  const executions = useQuery(agentExecutionsQuery)
  const automations = useQuery(automationsQuery)

  const activeAgents = (agents.data ?? []).filter((a: any) => a.status === 'running').length
  const totalExecutions = executions.data?.length ?? 0

  return (
    <div>
      <PageHeader eyebrow="Autonomous Operations" title="AI Agent Control Center" description="Manage autonomous agents that plan, decide, and execute content operations without human intervention." />

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="card"><CardContent className="pt-6"><div className="text-center"><div className="font-display text-4xl font-bold text-gold-gradient">{activeAgents}</div><p className="text-sm text-muted-foreground mt-1">Agents Running</p></div></CardContent></Card>
        <Card className="card"><CardContent className="pt-6"><div className="text-center"><div className="font-display text-4xl font-bold text-gold-gradient">{totalExecutions}</div><p className="text-sm text-muted-foreground mt-1">Total Executions</p></div></CardContent></Card>
        <Card className="card"><CardContent className="pt-6"><div className="text-center"><div className="font-display text-4xl font-bold text-gold-gradient">{(automations.data ?? []).filter((a: any) => a.isActive).length}</div><p className="text-sm text-muted-foreground mt-1">Active Automations</p></div></CardContent></Card>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(agents.data ?? []).map((agent: any) => (
          <Card key={agent.id} className="card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{agent.name}</CardTitle>
                <div className={`h-2 w-2 rounded-full ${agent.status === 'running' ? 'bg-green-500 animate-pulse' : agent.status === 'error' ? 'bg-red-500' : 'bg-muted-foreground'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{agent.description}</p>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{agent.agentType}</Badge>
                <Badge variant="secondary">{agent.autonomyLevel}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent.executionCount} executions</span>
                {agent.lastExecutedAt && <span>Last: {new Date(agent.lastExecutedAt).toLocaleString()}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Play className="h-3 w-3 mr-1" /> {agent.status === 'running' ? 'Stop' : 'Run'}
                </Button>
                <Button size="sm" variant="ghost">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Executions */}
      <Card className="card mt-6">
        <CardHeader><CardTitle>Recent Agent Executions</CardTitle></CardHeader>
        <CardContent>
          {(executions.data ?? []).slice(0, 10).map((exec: any, i: number) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className={`h-8 w-8 flex items-center justify-center rounded-full ${exec.status === 'completed' ? 'bg-green-500/10 text-green-500' : exec.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {exec.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : exec.status === 'error' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Agent: {exec.agent_id?.slice(0, 8) ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{exec.trigger_type} · {exec.status}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(exec.started_at).toLocaleString()}</span>
              {exec.durationMs && <span className="text-xs text-muted-foreground">{Math.round(exec.durationMs / 1000)}s</span>}
            </div>
          ))}
          {(executions.data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No executions yet. Start an agent to see results.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
