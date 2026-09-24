-- ============================================================
-- END TIME SOLDIERS MEDIA COMMAND CENTER
-- Supabase Database Schema v2.0
-- Advanced: AI/ML, Agentic, DA/BI, Autonomous
-- ============================================================

-- Enums
CREATE TYPE public.media_kind AS ENUM ('video', 'image', 'audio', 'document');
CREATE TYPE public.post_status AS ENUM ('idea', 'draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed');
CREATE TYPE public.platform_id AS ENUM ('youtube', 'youtube_shorts', 'tiktok', 'instagram', 'facebook', 'threads', 'linkedin', 'x', 'telegram', 'substack');
CREATE TYPE public.pillar AS ENUM ('scripture_prayer', 'teaching_sermon', 'gospel_worship', 'encouragement', 'evangelism', 'discipleship', 'community');
CREATE TYPE public.agent_status AS ENUM ('idle', 'running', 'completed', 'error');
CREATE TYPE public.agent_type AS ENUM ('repurpose', 'schedule', 'publish', 'analyze', 'scout');
CREATE TYPE public.ai_model AS ENUM ('gpt4o', 'claude35', 'gemini3', 'whisper', 'embedding');
CREATE TYPE public.insight_type AS ENUM ('trend', 'pattern', 'anomaly', 'opportunity', 'warning');

-- Update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  role text NOT NULL DEFAULT 'viewer',
  avatar_url text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  source_path text NOT NULL,
  storage_path text,
  thumbnail_url text,
  duration_seconds integer,
  duration_formatted text,
  category text,
  tags text[] DEFAULT '{}',
  transcript text,
  transcript_embedding vector(1536),
  status text NOT NULL DEFAULT 'uploaded',
  processing_progress real DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own videos" ON public.videos FOR ALL USING (auth.uid() = user_id);
CREATE INDEX videos_user_idx ON public.videos(user_id, created_at DESC);
CREATE INDEX videos_status_idx ON public.videos(status);
CREATE INDEX videos_transcript_idx ON public.videos USING gin(to_tsvector('english', coalesce(transcript, '')));
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  hook text,
  description text,
  start_time real NOT NULL,
  end_time real NOT NULL,
  duration_seconds integer,
  topic text,
  category text,
  pillar text,
  transcript_excerpt text,
  on_screen_text text,
  subtitle_instructions text,
  thumbnail_url text,
  confidence_score real,
  ai_analysis jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  gospel_score real DEFAULT 0,
  prayer_score real DEFAULT 0,
  worship_score real DEFAULT 0,
  teaching_score real DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clips" ON public.clips FOR ALL USING (auth.uid() = user_id);
CREATE INDEX clips_video_idx ON public.clips(video_id);
CREATE INDEX clips_status_idx ON public.clips(status);
CREATE INDEX clips_topic_idx ON public.clips(topic);
CREATE TRIGGER clips_updated_at BEFORE UPDATE ON public.clips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PLATFORM SYSTEM
-- ============================================================

CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_id NOT NULL UNIQUE,
  display_name text NOT NULL,
  handle text,
  connection_status text NOT NULL DEFAULT 'disconnected',
  credentials jsonb DEFAULT '{}',
  credentials_encrypted text,
  last_posted timestamptz,
  post_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own platforms" ON public.platforms FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER platforms_updated_at BEFORE UPDATE ON public.platforms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PLATFORM CONTENT (Generated Posts)
-- ============================================================

CREATE TABLE public.platform_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES public.clips(id),
  platform_id uuid REFERENCES public.platforms(id),
  platform platform_id NOT NULL,
  content_type text NOT NULL DEFAULT 'video',
  title text,
  hook text,
  caption text,
  hashtags text[] DEFAULT '{}',
  cta text,
  on_screen_text text,
  subtitle_instructions text,
  thumbnail_concept text,
  format_type text,
  ai_metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_id text,
  published_url text,
  error_message text,
  views integer DEFAULT 0,
  reach integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  engagement_rate real DEFAULT 0,
  watch_time integer DEFAULT 0,
  retention_rate real DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content" ON public.platform_content FOR ALL USING (auth.uid() = user_id);
CREATE INDEX pc_platform_idx ON public.platform_content(platform);
CREATE INDEX pc_status_idx ON public.platform_content(status);
CREATE INDEX pc_scheduled_idx ON public.platform_content(scheduled_at) WHERE status = 'scheduled';
CREATE TRIGGER pc_updated_at BEFORE UPDATE ON public.platform_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CALENDAR
-- ============================================================

CREATE TABLE public.calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.platform_content(id),
  date text NOT NULL,
  time text NOT NULL,
  platform_id uuid REFERENCES public.platforms(id),
  pillar text,
  format_type text,
  status text NOT NULL DEFAULT 'idea',
  scheduled_at timestamptz,
  published_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
CREATE INDEX calendar_date_idx ON public.calendar(date, time);
CREATE INDEX calendar_status_idx ON public.calendar(status);

-- ============================================================
-- AI/ML SYSTEM
-- ============================================================

CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  model ai_model NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input jsonb NOT NULL,
  output jsonb,
  error text,
  metadata jsonb DEFAULT '{}',
  user_id uuid REFERENCES public.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_tasks_status_idx ON public.ai_tasks(status);
CREATE INDEX ai_tasks_user_idx ON public.ai_tasks(user_id);

CREATE TABLE public.embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
CREATE INDEX embeddings_content_idx ON public.embeddings USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX embeddings_type_idx ON public.embeddings(content_type);

CREATE TABLE public.ai_models_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  model_type text NOT NULL,
  model_name text NOT NULL,
  capabilities jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AGENTIC SYSTEM (Autonomous AI Agents)
-- ============================================================

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  agent_type agent_type NOT NULL,
  system_prompt text,
  configuration jsonb DEFAULT '{}',
  status agent_status NOT NULL DEFAULT 'idle',
  memory jsonb DEFAULT '[]',
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  next_scheduled_at timestamptz,
  schedule_cron text,
  autonomy_level text NOT NULL DEFAULT 'assisted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE INDEX agents_type_idx ON public.agents(agent_type);
CREATE INDEX agents_status_idx ON public.agents(status);
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_data jsonb,
  plan jsonb,
  actions jsonb,
  results jsonb,
  status text NOT NULL DEFAULT 'running',
  error text,
  steps_completed integer DEFAULT 0,
  total_steps integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer
);
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX ae_agent_idx ON public.agent_executions(agent_id);
CREATE INDEX ae_status_idx ON public.agent_executions(status);
CREATE INDEX ae_started_idx ON public.agent_executions(started_at DESC);

-- ============================================================
-- ANALYTICS / DA/BI SYSTEM
-- ============================================================

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.platform_content(id),
  platform_id uuid REFERENCES public.platforms(id),
  platform text NOT NULL,
  event_type text NOT NULL,
  metric_value real,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX ae_post_idx ON public.analytics_events(post_id);
CREATE INDEX ae_platform_idx ON public.analytics_events(platform);
CREATE INDEX ae_recorded_idx ON public.analytics_events(recorded_at DESC);

CREATE TABLE public.da_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  name text NOT NULL,
  description text,
  widgets jsonb DEFAULT '[]',
  filters jsonb DEFAULT '{}',
  is_shared boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.da_dashboards ENABLE ROW LEVEL SECURITY;
CREATE INDEX dd_user_idx ON public.da_dashboards(user_id);
CREATE TRIGGER dd_updated_at BEFORE UPDATE ON public.da_dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.da_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid REFERENCES public.da_dashboards(id),
  report_type text NOT NULL,
  data jsonb NOT NULL,
  summary text,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.da_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  current_value real,
  previous_value real,
  change_percent real,
  unit text,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kpis_category_idx ON public.kpis(category);
CREATE INDEX kpis_recorded_idx ON public.kpis(recorded_at DESC);

CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type insight_type NOT NULL,
  title text NOT NULL,
  description text,
  confidence real DEFAULT 0,
  evidence jsonb DEFAULT '[]',
  recommendation text,
  related_post_ids uuid[] DEFAULT '{}',
  related_content jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'active',
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE INDEX insights_type_idx ON public.insights(insight_type);
CREATE INDEX insights_status_idx ON public.insights(status);
CREATE INDEX insights_confidence_idx ON public.insights(confidence);

-- ============================================================
-- AUTONOMOUS OPERATIONS
-- ============================================================

CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  actions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  next_run_at timestamptz,
  schedule_cron text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE INDEX automations_active_idx ON public.automations(is_active);
CREATE INDEX automations_trigger_idx ON public.automations(trigger_type);
CREATE TRIGGER automations_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
  status text NOT NULL,
  input_data jsonb,
  output_data jsonb,
  error text,
  duration_ms integer,
  executed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX al_automation_idx ON public.automation_logs(automation_id);
CREATE INDEX al_executed_idx ON public.automation_logs(executed_at DESC);

-- ============================================================
-- ASSETS (Media Library)
-- ============================================================

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  video_id uuid REFERENCES public.videos(id),
  asset_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint DEFAULT 0,
  duration_seconds real,
  tags text[] DEFAULT '{}',
  thumbnail_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX assets_user_idx ON public.assets(user_id);
CREATE INDEX assets_type_idx ON public.assets(asset_type);
CREATE INDEX assets_video_idx ON public.assets(video_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('videos', 'videos', false, 5368709120, 'video/mp4,video/webm,video/quicktime,vudio/ogg'),
  ('thumbnails', 'thumbnails', false, 10485760, 'image/jpeg,image/png,image/webp'),
  ('assets', 'assets', false, 104857600, '*/*');

-- Storage policies
CREATE POLICY "Users upload own videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users view own videos" ON storage.objects FOR SELECT WITH CHECK (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users upload own thumbnails" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users upload own assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- VECTOR SEARCH FUNCTION (AI/ML)
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_similar_content(
  query_embedding vector(1536),
  filter_type text DEFAULT NULL,
  limit_val integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content_type text,
  content_id uuid,
  similarity real,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.metadata
  FROM public.embeddings e
  WHERE filter_type IS NULL OR e.content_type = filter_type
  ORDER BY e.embedding <=> query_embedding
  LIMIT limit_val;
END;
$$;

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================

CREATE VIEW public.analytics_summary AS
SELECT
  pc.platform,
  COUNT(pc.id) as total_posts,
  COUNT(pc.id) FILTER (WHERE pc.status = 'published') as published_posts,
  COUNT(pc.id) FILTER (WHERE pc.status = 'scheduled') as scheduled_posts,
  AVG(pc.engagement_rate) as avg_engagement,
  SUM(pc.views) as total_views,
  SUM(pc.likes) as total_likes,
  SUM(pc.shares) as total_shares,
  SUM(pc.comments) as total_comments
FROM public.platform_content pc
GROUP BY pc.platform;

CREATE VIEW public.content_performance AS
SELECT
  pc.id,
  pc.title,
  pc.platform,
  pc.status,
  pc.engagement_rate,
  pc.views,
  pc.likes,
  pc.shares,
  pc.comments,
  pc.scheduled_at,
  pc.published_at,
  c.topic,
  c.pillar,
  v.title as video_title
FROM public.platform_content pc
LEFT JOIN public.clips c ON pc.clip_id = c.id
LEFT JOIN public.videos v ON c.video_id = v.id;

-- ============================================================
-- SAMPLE DATA: Agents
-- ============================================================

INSERT INTO public.agents (name, description, agent_type, system_prompt, configuration, autonomy_level) VALUES
('Content Repurpose Agent', 'Autonomously analyzes videos and creates platform-specific content', 'repurpose', 
 'You are an AI agent that autonomously analyzes video content, identifies key moments, and generates platform-optimized posts. Always maintain brand integrity. Never fabricate content.',
 '{"max_clips_per_video": 10, "min_duration": 30, "max_duration": 90, "platforms": ["youtube", "tiktok", "instagram", "facebook", "threads", "linkedin", "x"]}',
 'autonomous'),
('Schedule Optimizer Agent', 'Optimizes posting schedule based on engagement analytics', 'schedule',
 'You analyze engagement patterns and optimize content scheduling across all platforms. Always prioritize highest-engagement time slots.',
 '{"time_slots": ["06:00", "12:00", "18:00"], "optimization_window_days": 7}',
 'autonomous'),
('Publish Dispatch Agent', 'Automatically publishes approved content at scheduled times', 'publish',
 'You publish approved content to connected platforms at scheduled times. Handle errors gracefully and retry failed publications.',
 '{"retry_limit": 3, "retry_delay_seconds": 30}',
 'autonomous'),
('Analytics Scout Agent', 'Continuously scouts analytics for insights and trends', 'analyze',
 'You continuously analyze content performance, identify trends, and generate actionable insights. Look for patterns in engagement, reach, and retention.',
 '{"analysis_frequency_hours": 6, "insight_types": ["trend", "pattern", "opportunity", "warning"]}',
 'autonomous'),
('Content Scout Agent', 'Discovers new content opportunities from existing media', 'scout',
 'You scan existing media library for unprocessed content, identify content gaps, and recommend new content opportunities.',
 '{"scan_interval_hours": 24, "min_confidence": 0.5}',
 'autonomous');
