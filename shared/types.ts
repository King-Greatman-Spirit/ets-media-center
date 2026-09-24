// Shared types and constants for the ETS Media Command Center

export interface Platform {
  id: string
  name: string
  display_name: string
  handle: string
  connection_status: string
  post_count: number
}

export interface Video {
  id: string
  title: string
  description?: string
  category?: string
  tags: string[]
  duration_sec?: number
  duration_formatted?: string
  status: string
  clips: Clip[]
}

export interface Clip {
  id: string
  title: string
  hook?: string
  description?: string
  start_time: number
  end_time: number
  duration_sec?: number
  topic?: string
  category?: string
  confidence_score?: number
  status: string
  transcript_excerpt?: string
  platform_contents: PlatformContent[]
}

export interface PlatformContent {
  id: string
  title?: string
  caption?: string
  hook?: string
  hashtags: string[]
  cta?: string
  on_screen_text?: string
  subtitle_instructions?: string
  thumbnail_concept?: string
  format_type?: string
  status: string
}

export interface CalendarPost {
  id: string
  date: string
  time: string
  platform_id: string
  pillar?: string
  status: string
}

export interface AnalyticsData {
  views: number
  reach: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
}

export type UserRole = 'admin' | 'editor' | 'viewer'
export type ContentStatus = 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed'
