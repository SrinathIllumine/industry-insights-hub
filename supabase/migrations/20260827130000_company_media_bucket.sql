-- Public storage bucket for images uploaded from the company profile editor
-- (benchmark charts, etc). No login in this app, so anon may read and write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-media', 'company-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read company-media" ON storage.objects;
DROP POLICY IF EXISTS "Public upload company-media" ON storage.objects;
DROP POLICY IF EXISTS "Public update company-media" ON storage.objects;
DROP POLICY IF EXISTS "Public delete company-media" ON storage.objects;

CREATE POLICY "Public read company-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-media');

CREATE POLICY "Public upload company-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-media');

CREATE POLICY "Public update company-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-media')
  WITH CHECK (bucket_id = 'company-media');

CREATE POLICY "Public delete company-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-media');
