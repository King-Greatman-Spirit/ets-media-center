-- ETS Media Command Center — one-time fix.
-- Creates the `media` storage bucket used by the Media Library and Shorts pipeline.
-- Safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  524288000,
  ARRAY['video/mp4','video/webm','video/quicktime','video/ogg','audio/mpeg','audio/wav','audio/ogg','image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;
