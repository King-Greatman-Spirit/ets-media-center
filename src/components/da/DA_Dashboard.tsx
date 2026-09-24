// ============================================================
// DA/BI Analytics Component
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { useDAStore } from '@/store'
import { analyticsSummaryQuery, kpisQuery, contentPerformanceQuery, insightsQuery } from '@/lib/data'
import { PageHeader } from '@/components/app/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function DA_Dashboard() {
  const summary = useQuery(analyticsSummaryQuery)
  const kpis = useQuery(kpisQuery)
  const performance = useQuery(contentPerformanceQuery)
  const insights = useQuery(insightsQuery)
  const { dateRange } = useDAStore()

  const engagementData = summary.data ?? []
  const kpiCards = kpis.data ?? []

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="DA/BI Command Center" description="Data analytics and business intelligence for End Time Soldiers content performance." />

      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <Card className="card">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Total Views</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold text-gold-gradient">{(kpiCards.find((k) => k.name === 'Total Views')?.currentValue ?? 0).toLocaleString()}</div><TrendingUp className="h-4 w-4 text-green-500 mt-1" /></CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Engagement Rate</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold text-gold-gradient">{(kpiCards.find((k) => k.name === 'Engagement Rate')?.currentValue ?? 0).toFixed(1)}%</div><Activity className="h-4 w-4 text-primary mt-1" /></CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Posts Published</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold text-gold-gradient">{kpiCards.filter((k) => k.category === 'output').length}</div><Badge variant="outline">This period</Badge></CardContent>
        </Card>
        <Card className="card">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">AI Insights</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold text-gold-gradient">{insights.data?.length ?? 0}</div><Lightbulb className="h-4 w-4 text-yellow-500 mt-1" /></CardContent>
        </Card>
      </div>

      {/* Charts & Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card">
          <CardHeader><CardTitle>Engagement by Platform</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {engagementData.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.platform}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gold-gradient rounded-full" style={{ width: `${Math.min(item.avg_engagement * 100, 100)}%` }} /></div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{item.avg_engagement.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
          <CardContent>
            {(insights.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Run the Analytics Agent to generate insights.</p>
            ) : (
              <div className="space-y-3">
                {(insights.data ?? []).map((insight: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40">
                    <Badge variant="outline" className="border-primary/40 text-primary shrink-0">{insight.type}</Badge>
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description?.slice(0, 80)}</p>
                      <Badge variant="secondary" className="mt-1">Confidence: {Math.round(insight.confidence * 100)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Performance Table */}
      <Card className="card mt-6">
        <CardHeader><CardTitle>Top Performing Content</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Title</th><th className="text-left py-2">Platform</th><th className="text-right py-2">Views</th><th className="text-right py-2">Engagement</th></tr></thead>
            <tbody>
              {(performance.data ?? []).slice(0, 10).map((item: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 font-medium">{item.title}</td>
                  <td className="py-2 text-muted-foreground">{item.platform}</td>
                  <td className="py-2 text-right">{item.views?.toLocaleString()}</td>
                  <td className="py-2 text-right text-gold-gradient">{item.engagement_rate?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
