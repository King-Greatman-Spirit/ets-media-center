// ============================================================
// End Time Soldiers - Complete Platform Configuration
// v2.0: AI/ML, Agentic, Autonomous, DA/BI Enhanced
// ============================================================

export type PlatformId =
  | 'youtube'
  | 'youtube_shorts'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'x'
  | 'telegram'
  | 'substack';

export type AgentType = 'repurpose' | 'schedule' | 'publish' | 'analyze' | 'scout';
export type AgentAutonomy = 'assisted' | 'semi_autonomous' | 'autonomous';
export type InsightType = 'trend' | 'pattern' | 'anomaly' | 'opportunity' | 'warning';

export interface Platform {
  id: PlatformId;
  name: string;
  short: string;
  color: string;
  charLimit: number;
  format: string;
  docsUrl: string;
  fields: CredentialField[];
  bestTime: string;
}

export interface CredentialField {
  key: string;
  label: string;
  secret?: boolean;
  hint?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  systemPrompt: string;
  configuration: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'error';
  autonomyLevel: AgentAutonomy;
  executionCount: number;
  lastExecutedAt?: string;
  nextScheduledAt?: string;
  scheduleCron?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  triggerType: string;
  triggerData: Record<string, any>;
  plan: Record<string, any>[];
  actions: Record<string, any>[];
  results: Record<string, any>[];
  status: string;
  stepsCompleted: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
  relatedContent: any[];
  generatedAt: string;
}

export interface KPI {
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  unit: string;
  recordedAt: string;
}

export interface DA_Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: any[];
  filters: Record<string, any>;
  isShared: boolean;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actions: any[];
  isActive: boolean;
  executionCount: number;
  scheduleCron?: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: 'youtube', name: 'YouTube', short: 'YT',
    color: '#ff0000', charLimit: 5000,
    format: 'Full title ≤100 chars, description with chapters/timestamps, 3-15 hashtags, 16:9 landscape',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    fields: [
      { key: 'api_key', label: 'YouTube Data API Key', secret: true, hint: 'From Google Cloud Console' },
      { key: 'oauth_client_id', label: 'OAuth Client ID', secret: true },
      { key: 'oauth_client_secret', label: 'OAuth Client Secret', secret: true },
      { key: 'channel_id', label: 'Channel ID' },
    ],
    bestTime: '6:00 PM'
  },
  {
    id: 'youtube_shorts', name: 'YouTube Shorts', short: 'YTS',
    color: '#ff0000', charLimit: 150,
    format: 'Title ≤100 chars, vertical 9:16 ≤60s, subtitles required, 3-5 hashtags',
    docsUrl: 'https://developers.google.com/youtube/shorts',
    fields: [
      { key: 'api_key', label: 'YouTube Data API Key', secret: true },
      { key: 'channel_id', label: 'Channel ID' },
    ],
    bestTime: '6:00 PM'
  },
  {
    id: 'tiktok', name: 'TikTok', short: 'TT',
    color: '#00f2ea', charLimit: 2200,
    format: 'Hook in first line, 3-8 trending hashtags, punchy, vertical 9:16, 15-60s',
    docsUrl: 'https://developers.tiktok.com/',
    fields: [
      { key: 'client_key', label: 'Client Key' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'access_token', label: 'Access Token', secret: true },
    ],
    bestTime: '6:00 PM'
  },
  {
    id: 'instagram', name: 'Instagram', short: 'IG',
    color: '#e4405f', charLimit: 2200,
    format: 'Caption with line breaks, CTA, 5-15 hashtags, vertical 9:16, subtitles required',
    docsUrl: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'app_id', label: 'Meta App ID' },
      { key: 'app_secret', label: 'Meta App Secret', secret: true },
      { key: 'access_token', label: 'Long-lived Access Token', secret: true },
      { key: 'ig_user_id', label: 'Instagram Business Account ID' },
    ],
    bestTime: '6:00 PM'
  },
  {
    id: 'facebook', name: 'Facebook', short: 'FB',
    color: '#1877f2', charLimit: 63206,
    format: 'Conversational, 1-3 paragraphs, 1-3 hashtags, community-focused',
    docsUrl: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'page_id', label: 'Page ID' },
      { key: 'page_access_token', label: 'Page Access Token', secret: true },
    ],
    bestTime: '12:00 PM'
  },
  {
    id: 'threads', name: 'Threads', short: 'TH',
    color: '#ffffff', charLimit: 500,
    format: '≤500 chars, casual, one idea per post, reflective tone',
    docsUrl: 'https://developers.facebook.com/docs/threads',
    fields: [
      { key: 'user_id', label: 'Threads User ID' },
      { key: 'access_token', label: 'Access Token', secret: true },
    ],
    bestTime: '12:00 PM'
  },
  {
    id: 'linkedin', name: 'LinkedIn', short: 'LI',
    color: '#0a66c2', charLimit: 3000,
    format: 'Professional hook, short paragraphs, insight + takeaway, 3-7 hashtags',
    docsUrl: 'https://www.linkedin.com/developers/apps',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'access_token', label: 'Access Token', secret: true },
      { key: 'organization_urn', label: 'Organization URN' },
    ],
    bestTime: '12:00 PM'
  },
  {
    id: 'x', name: 'X/Twitter', short: 'X',
    color: '#000000', charLimit: 280,
    format: '≤280 chars, sharp hook, 1-3 hashtags max, thread continuation possible',
    docsUrl: 'https://developer.x.com/en/portal/dashboard',
    fields: [
      { key: 'api_key', label: 'API Key' },
      { key: 'api_secret', label: 'API Secret', secret: true },
      { key: 'access_token', label: 'Access Token', secret: true },
      { key: 'access_secret', label: 'Access Token Secret', secret: true },
    ],
    bestTime: '6:00 AM'
  },
  {
    id: 'telegram', name: 'Telegram', short: 'TG',
    color: '#0088cc', charLimit: 4096,
    format: 'Broadcast style, bold headline, direct link, no hashtags needed',
    docsUrl: 'https://core.telegram.org/bots#botfather',
    fields: [
      { key: 'bot_token', label: 'Bot Token', secret: true, hint: 'From @BotFather' },
      { key: 'chat_id', label: 'Channel/Chat ID' },
    ],
    bestTime: '6:00 PM'
  },
  {
    id: 'substack', name: 'Substack', short: 'SS',
    color: '#f2315f', charLimit: 20000,
    format: 'Newsletter: subject line, preview text, long-form body with headers, closing CTA',
    docsUrl: 'https://substack.com/',
    fields: [
      { key: 'publication_url', label: 'Publication URL' },
      { key: 'session_cookie', label: 'Session Cookie / API Token', secret: true },
    ],
    bestTime: '6:00 AM'
  },
];

export const PLATFORM_MAP: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p])
);

export const POST_TIMES = ['6:00 AM', '12:00 PM', '6:00 PM'];

export const PILLARS = [
  { id: 'scripture_prayer', name: 'Scripture & Prayer', slot: '6:00 AM', emoji: '📖' },
  { id: 'teaching_sermon', name: 'Teaching & Sermon', slot: '12:00 PM', emoji: '🎓' },
  { id: 'gospel_worship', name: 'Gospel & Worship', slot: '6:00 PM', emoji: '🎵' },
  { id: 'encouragement', name: 'Encouragement', slot: '6:00 AM', emoji: '💪' },
  { id: 'evangelism', name: 'Evangelism', slot: '6:00 PM', emoji: '🌍' },
  { id: 'discipleship', name: 'Discipleship', slot: '12:00 PM', emoji: '🧭' },
  { id: 'community', name: 'Community', slot: '6:00 PM', emoji: '👥' },
];

export const AGENTS: Agent[] = [
  {
    id: 'repurpose-agent',
    name: 'Content Repurpose Agent',
    description: 'Autonomously analyzes videos and creates platform-specific content',
    agentType: 'repurpose',
    systemPrompt: 'You are an AI agent that autonomously analyzes video content, identifies key moments, and generates platform-optimized posts.',
    configuration: { maxClipsPerVideo: 10, minDuration: 30, maxDuration: 90 },
    status: 'idle',
    autonomyLevel: 'autonomous',
    executionCount: 0,
  },
  {
    id: 'schedule-agent',
    name: 'Schedule Optimizer Agent',
    description: 'Optimizes posting schedule based on engagement analytics',
    agentType: 'schedule',
    systemPrompt: 'You analyze engagement patterns and optimize content scheduling across all platforms.',
    configuration: { timeSlots: ['06:00', '12:00', '18:00'], optimizationWindowDays: 7 },
    status: 'idle',
    autonomyLevel: 'autonomous',
    executionCount: 0,
  },
  {
    id: 'publish-agent',
    name: 'Publish Dispatch Agent',
    description: 'Automatically publishes approved content at scheduled times',
    agentType: 'publish',
    systemPrompt: 'You publish approved content to connected platforms at scheduled times.',
    configuration: { retryLimit: 3, retryDelaySeconds: 30 },
    status: 'idle',
    autonomyLevel: 'autonomous',
    executionCount: 0,
  },
  {
    id: 'analytics-agent',
    name: 'Analytics Scout Agent',
    description: 'Continuously scouts analytics for insights and trends',
    agentType: 'analyze',
    systemPrompt: 'You continuously analyze content performance, identify trends, and generate actionable insights.',
    configuration: { analysisFrequencyHours: 6 },
    status: 'idle',
    autonomyLevel: 'autonomous',
    executionCount: 0,
  },
  {
    id: 'scout-agent',
    name: 'Content Scout Agent',
    description: 'Discovers new content opportunities from existing media',
    agentType: 'scout',
    systemPrompt: 'You scan existing media library for unprocessed content and recommend new opportunities.',
    configuration: { scanIntervalHours: 24, minConfidence: 0.5 },
    status: 'idle',
    autonomyLevel: 'autonomous',
    executionCount: 0,
  },
];

export function platformById(id: string): Platform | undefined {
  return PLATFORM_MAP[id];
}

export function getBestTime(platformId: string): string {
  const platform = PLATFORM_MAP[platformId];
  return platform?.bestTime || '12:00 PM';
}
