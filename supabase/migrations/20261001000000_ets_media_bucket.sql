-- Creates the `media` bucket used by the Media Library.
--
-- The 20260909 migration created the storage *policies* for this bucket
-- ("Users * own media files") but never created the bucket itself, so every
-- upload failed. Run this after 20260909170425.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  524288000,
  'video/mp4,video/webm,video/quicktime,video/ogg,image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg'
)
ON CONFLICT (id) DO NOTHING;
