-- Create public storage bucket for project completion certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-certificates',
  'project-certificates',
  true,
  10485760,  -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow service-role (used by API routes) full access — RLS is handled at app layer
DROP POLICY IF EXISTS "service role full access" ON storage.objects;
CREATE POLICY "service role full access"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'project-certificates')
  WITH CHECK (bucket_id = 'project-certificates');

-- Allow public read of certificate files
DROP POLICY IF EXISTS "public read certificates" ON storage.objects;
CREATE POLICY "public read certificates"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'project-certificates');
