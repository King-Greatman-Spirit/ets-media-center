// ============================================================
// Data Layer - Supabase Queries & Mutations
// v2.0: Enhanced with DA/BI, AI/ML, Agentic data
// ============================================================

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { useContentStore } from '@/store'

export type MediaAsset = Database['public']['Tables']['media_assets']['Row']
export type ScheduledPost = Database['public']['Tables']['scheduled_posts']['Row']
export type PlatformConnection = Database['public']['Tables']['platform_connections']['Row']
export type RepurposeSession = Database['public']['Tables']['repurpose_sessions']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Clip = Database['public']['Tables']['clips']['Row']
export type PlatformContent = Database['public']['Tables']['platform_content']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentExecution = Database['public']['Tables']['agent_executions']['Row']
export type Insight = Database['public']['Tables']['insights']['Row']
export type KPI = Database['public']['Tables']['kpis']['Row']
export type DADashboard = Database['public']['Tables']['da_dashboards']['Row']
export type Automation = Database['public']['Tables']['automations']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']

// ============================================================
// QUERIES
// ============================================================

export const mediaQuery = queryOptions({
  queryKey: ['media'],
  queryFn: async () => {
    const { data, error } = await supabase.from('media_assets').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
})

export const videosQuery = queryOptions({
  queryKey: ['videos'],
  queryFn: async () => {
    const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
})

export const clipsQuery = queryOptions({
  queryKey: ['clips'],
  queryFn: async () => {
    const { data, error } = await supabase.from('clips').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
})

export const contentQuery = queryOptions({
  queryKey: ['content'],
  queryFn: async () => {
    const { data, error } = await supabase.from('platform_content').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
})

export const postsQuery = queryOptions({
  queryKey: ['posts'],
  queryFn: async () => {
    const { data, error } = await supabase.from('scheduled_posts').select('*').order('scheduled_at', { ascending: true })
    if (error) throw error
    return data
  },
})

export const connectionsQuery = queryOptions({
  queryKey: ['connections'],
  queryFn: async () => {
    const { data, error } = await supabase.from('platform_connections').select('*')
    if (error) throw error
    return data
  },
})

export const agentsQuery = queryOptions({
  queryKey: ['agents'],
  queryFn: async () => {
    const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
})

export const agentExecutionsQuery = queryOptions({
  queryKey: ['agentExecutions'],
  queryFn: async () => {
    const { data, error } = await supabase.from('agent_executions').select('*').order('started_at', { ascending: false }).limit(50)
    if (error) throw error
    return data
  },
})

export const insightsQuery = queryOptions({
  queryKey: ['insights'],
  queryFn: async () => {
    const { data, error } = await supabase.from('insights').select('*').order('generated_at', { ascending: false }).limit(20)
    if (error) throw error
    return data
  },
})

export const kpisQuery = queryOptions({
  queryKey: ['kpis'],
  queryFn: async () => {
    const { data, error } = await supabase.from('kpis').select('*').order('recorded_at', { ascending: false }).limit(50)
    if (error) throw error
    return data
  },
})

export const dashboardsQuery = queryOptions({
  queryKey: ['dashboards'],
  queryFn: async () => {
    const { data, error } = await supabase.from('da_dashboards').select('*')
    if (error) throw error
    return data
  },
})

export const automationsQuery = queryOptions({
  queryKey: ['automations'],
  queryFn: async () => {
    const { data, error } = await supabase.from('automations').select('*')
    if (error) throw error
    return data
  },
})

export const analyticsSummaryQuery = queryOptions({
  queryKey: ['analyticsSummary'],
  queryFn: async () => {
    const { data, error } = await supabase.from('analytics_summary').select('*')
    if (error) throw error
    return data
  },
})

export const contentPerformanceQuery = queryOptions({
  queryKey: ['contentPerformance'],
  queryFn: async () => {
    const { data, error } = await supabase.from('content_performance').select('*')
    if (error) throw error
    return data
  },
})

// ============================================================
// MUTATIONS
// ============================================================

export function useUpsertMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (media: Omit<MediaAsset, 'id'>) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Not signed in')
      const { data, error } = await supabase.from('media_assets').insert({ ...media, user_id: auth.user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] })
      qc.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useUpsertPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (post: Omit<ScheduledPost, 'id' | 'user_id'>) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Not signed in')
      const { data, error } = await supabase.from('scheduled_posts').upsert({ ...post, user_id: auth.user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}

export function useUpsertVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (video: Omit<Video, 'id'>) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Not signed in')
      const { data, error } = await supabase.from('videos').insert({ ...video, user_id: auth.user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      qc.invalidateQueries({ queryKey: ['media'] })
    },
  })
}

export function useUpsertAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (agent: Omit<Agent, 'id'>) => {
      const { data, error } = await supabase.from('agents').insert(agent).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useUpsertInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (insight: Omit<Insight, 'id'>) => {
      const { data, error } = await supabase.from('insights').insert(insight).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  })
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idea: '#666', draft: '#555', needs_review: '#8B0000', approved: '#1a5c1a',
    scheduled: '#2a4a8a', published: '#D4AF37', failed: '#660000',
    uploaded: '#666', processing: '#2a4a8a', processed: '#1a5c1a',
    idle: '#888', running: '#2a4a8a', completed: '#1a5c1a', error: '#660000',
  }
  return colors[status] || '#555'
}
