import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  display_name?: string
  role: string
  user_metadata?: {
    display_name?: string
    full_name?: string
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
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

export interface ContentItem {
  id: string
  title: string
  platform: string
  status: string
}

interface ContentState {
  videos: ContentItem[]
  clips: ContentItem[]
  content: ContentItem[]
  calendar: ContentItem[]
  platforms: ContentItem[]
  agents: ContentItem[]
  insights: ContentItem[]
  kpis: ContentItem[]
  setVideos: (v: ContentItem[]) => void
  setClips: (v: ContentItem[]) => void
  setContent: (v: ContentItem[]) => void
  setCalendar: (v: ContentItem[]) => void
  setPlatforms: (v: ContentItem[]) => void
  setAgents: (v: ContentItem[]) => void
  setInsights: (v: ContentItem[]) => void
  setKPIs: (v: ContentItem[]) => void
}

export const useContentStore = create<ContentState>((set) => ({
  videos: [], clips: [], content: [], calendar: [],
  platforms: [], agents: [], insights: [], kpis: [],
  setVideos: (v) => set({ videos: v }),
  setClips: (v) => set({ clips: v }),
  setContent: (v) => set({ content: v }),
  setCalendar: (v) => set({ calendar: v }),
  setPlatforms: (v) => set({ platforms: v }),
  setAgents: (v) => set({ agents: v }),
  setInsights: (v) => set({ insights: v }),
  setKPIs: (v) => set({ kpis: v }),
}))
