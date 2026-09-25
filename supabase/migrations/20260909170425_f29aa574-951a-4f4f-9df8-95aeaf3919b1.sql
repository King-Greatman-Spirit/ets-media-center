CREATE TYPE public.media_kind AS ENUM ('video','image','audio');
CREATE TYPE public.post_status AS ENUM ('draft','scheduled','published','failed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind public.media_kind NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  duration_seconds numeric,
  width integer,
  height integer,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media" ON public.media_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX media_assets_user_idx ON public.media_assets(user_id, created_at DESC);

CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  platform text NOT NULL,
  status public.post_status NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  hashtags text[] NOT NULL DEFAULT '{}',
  media_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own posts" ON public.scheduled_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX scheduled_posts_user_time_idx ON public.scheduled_posts(user_id, scheduled_at);
CREATE TRIGGER scheduled_posts_updated_at BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.repurpose_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_idea text NOT NULL,
  media_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  tone text,
  outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repurpose_sessions TO authenticated;
GRANT ALL ON public.repurpose_sessions TO service_role;
ALTER TABLE public.repurpose_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.repurpose_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  label text,
  credentials_ciphertext text NOT NULL,
  field_names text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'connected',
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_connections TO authenticated;
GRANT ALL ON public.platform_connections TO service_role;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.platform_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER platform_connections_updated_at BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users read own media files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own media files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own media files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own media files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);