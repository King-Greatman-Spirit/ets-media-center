import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// AUTH STORE
// ============================================================
interface AuthState {
  user: any | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'ets-auth' }
  )
)

// ============================================================
// CONTENT STORE
// ============================================================
interface ContentState {
  videos: any[]
  clips: any[]
  content: any[]
  calendar: any[]
  platforms: any[]
  agents: any[]
  agentExecutions: any[]
  insights: any[]
  kpis: any[]
  dashboards: any[]
  automations: any[]
  analytics: any
  
  // Actions
  setVideos: (videos: any[]) => void
  setClips: (clips: any[]) => void
  setContent: (content: any[]) => void
  setCalendar: (calendar: any[]) => void
  setPlatforms: (platforms: any[]) => void
  setAgents: (agents: any[]) => void
  setAgentExecutions: (executions: any[]) => void
  setInsights: (insights: any[]) => void
  setKPIs: (kpis: any[]) => void
  setDashboards: (dashboards: any[]) => void
  setAutomations: (automations: any[]) => void
  setAnalytics: (analytics: any) => void
  addVideo: (video: any) => void
  addClip: (clip: any) => void
  addContent: (content: any) => void
  addAgentExecution: (execution: any) => void
  addInsight: (insight: any) => void
}

export const useContentStore = create<ContentState>((set) => ({
  videos: [],
  clips: [],
  content: [],
  calendar: [],
  platforms: [],
  agents: [],
  agentExecutions: [],
  insights: [],
  kpis: [],
  dashboards: [],
  automations: [],
  analytics: null,

  setVideos: (videos) => set({ videos }),
  setClips: (clips) => set({ clips }),
  setContent: (content) => set({ content }),
  setCalendar: (calendar) => set({ calendar }),
  setPlatforms: (platforms) => set({ platforms }),
  setAgents: (agents) => set({ agents }),
  setAgentExecutions: (executions) => set({ agentExecutions: executions }),
  setInsights: (insights) => set({ insights }),
  setKPIs: (kpis) => set({ kpis }),
  setDashboards: (dashboards) => set({ dashboards }),
  setAutomations: (automations) => set({ automations }),
  setAnalytics: (analytics) => set({ analytics }),
  addVideo: (video) => set((state) => ({ videos: [video, ...state.videos] })),
  addClip: (clip) => set((state) => ({ clips: [clip, ...state.clips] })),
  addContent: (content) => set((state) => ({ content: [content, ...state.content] })),
  addAgentExecution: (execution) => set((state) => ({ agentExecutions: [execution, ...state.agentExecutions] })),
  addInsight: (insight) => set((state) => ({ insights: [insight, ...state.insights] })),
}))

// ============================================================
// AI STORE
// ============================================================
interface AIState {
  isProcessing: boolean
  isGenerating: boolean
  currentTask: string | null
  generationProgress: number
  activeAgent: string | null
  agentStatuses: Record<string, string>
  
  setProcessing: (v: boolean) => void
  setGenerating: (v: boolean) => void
  setCurrentTask: (task: string | null) => void
  setGenerationProgress: (v: number) => void
  setActiveAgent: (agentId: string | null) => void
  updateAgentStatus: (agentId: string, status: string) => void
}

export const useAIStore = create<AIState>((set) => ({
  isProcessing: false,
  isGenerating: false,
  currentTask: null,
  generationProgress: 0,
  activeAgent: null,
  agentStatuses: {},

  setProcessing: (v) => set({ isProcessing: v }),
  setGenerating: (v) => set({ isGenerating: v }),
  setCurrentTask: (task) => set({ currentTask: task }),
  setGenerationProgress: (v) => set({ generationProgress: v }),
  setActiveAgent: (agentId) => set({ activeAgent: agentId }),
  updateAgentStatus: (agentId, status) => set((state) => ({
    agentStatuses: { ...state.agentStatuses, [agentId]: status }
  })),
}))

// ============================================================
// DA/BI STORE
// ============================================================
interface DAState {
  selectedDashboard: string | null
  widgetViews: Record<string, boolean>
  dateRange: { start: string; end: string }
  filters: Record<string, any>
  
  setSelectedDashboard: (id: string | null) => void
  toggleWidgetView: (widgetId: string) => void
  setDateRange: (start: string, end: string) => void
  setFilter: (key: string, value: any) => void
}

export const useDAStore = create<DAState>((set) => ({
  selectedDashboard: null,
  widgetViews: {},
  dateRange: { start: '', end: '' },
  filters: {},

  setSelectedDashboard: (id) => set({ selectedDashboard: id }),
  toggleWidgetView: (widgetId) => set((state) => ({
    widgetViews: { ...state.widgetViews, [widgetId]: !state.widgetViews[widgetId] }
  })),
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
}))
