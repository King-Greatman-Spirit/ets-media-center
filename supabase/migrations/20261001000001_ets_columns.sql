-- Adds columns used by newer app features. Run after the base migrations.
-- Safe to re-run (IF NOT EXISTS guards).

-- Library thumbnails (video frame captures) and AI media analysis text.
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS thumbnail_path text;
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS analysis_text text;

-- Publishing results on scheduled posts.
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS published_url text;
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS publish_error text;
