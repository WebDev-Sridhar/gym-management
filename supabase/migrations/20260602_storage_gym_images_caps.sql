-- V3 Task 2: Lock down gym-images bucket
-- Audit G5: bucket was public with NULL file_size_limit and NULL MIME whitelist.
-- The client-side storageService.js compresses to ≤300KB before upload, so a
-- 512KB ceiling is comfortable headroom + blocks abuse via direct curl/API.
-- MIME whitelist restricts to the 3 formats the CMS image uploader actually
-- accepts after compression.
--
-- Idempotent: setting file_size_limit + allowed_mime_types again is a no-op
-- if the values already match.

UPDATE storage.buckets
SET file_size_limit = 524288,  -- 512 KB
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
WHERE id = 'gym-images';
