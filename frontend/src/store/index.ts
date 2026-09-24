import { create } from 'zustand'

interface AuthState {
  user: any | null
  token: string | null
  setUser: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}))

interface ContentState {
  videos: any[]
  clips: any[]
  content: any[]
  calendar: any[]
  platforms: any[]
  analytics: any
  setVideos: (videos: any[]) => void
  setClips: (clips: any[]) => void
  setContent: (content: any[]) => void
  setCalendar: (calendar: any[]) => void
  setPlatforms: (platforms: any[]) => void
  setAnalytics: (analytics: any) => void
}

export const useContentStore = create<ContentState>((set) => ({
  videos: [],
  clips: [],
  content: [],
  calendar: [],
  platforms: [],
  analytics: null,
  setVideos: (videos) => set({ videos }),
  setClips: (clips) => set({ clips }),
  setContent: (content) => set({ content }),
  setCalendar: (calendar) => set({ calendar }),
  setPlatforms: (platforms) => set({ platforms }),
  setAnalytics: (analytics) => set({ analytics }),
}))
