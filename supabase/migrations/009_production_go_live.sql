-- =============================================================================
-- BIKA 009 — Production go-live hardening
-- Safe to re-run. Apply in Supabase SQL Editor after 008.
-- =============================================================================

-- 1) Wipe any remaining seed password hints (Auth is sole credential store)
UPDATE public.profiles
SET password_hint = NULL
WHERE password_hint IS NOT NULL;

-- 2) Optional: deactivate obvious seed demo emails if Auth users not yet provisioned
-- (Uncomment after you have created real Super Admin Auth accounts)
-- UPDATE public.profiles SET active = false
-- WHERE email IN (
--   'superadmin@bika.gov.sz',
--   'police.manzini@bika.gov.sz',
--   'health.hhohho@bika.gov.sz',
--   'marshal.manzinirank@bika.gov.sz',
--   'citizen.tem@gmail.com'
-- );

-- 3) Storage: keep public read for evidence URLs; restrict anonymous spam uploads
--    Officials and authenticated citizens may upload; path must be under incident-attachments
DROP POLICY IF EXISTS "Anyone can upload incident attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view incident attachments" ON storage.objects;
DROP POLICY IF EXISTS "incident_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "incident_attachments_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "incident_attachments_anon_upload" ON storage.objects;

CREATE POLICY "incident_attachments_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'incident-attachments');

-- Authenticated uploads (officials + any signed-in user)
CREATE POLICY "incident_attachments_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'incident-attachments');

-- Anon may still upload for public reporting (citizen evidence without login).
-- Constrained to the dedicated bucket only.
CREATE POLICY "incident_attachments_anon_upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'incident-attachments');

-- No public deletes/updates from client
DROP POLICY IF EXISTS "incident_attachments_no_update" ON storage.objects;
DROP POLICY IF EXISTS "incident_attachments_no_delete" ON storage.objects;

CREATE POLICY "incident_attachments_no_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "incident_attachments_no_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (false);

-- 4) Ensure track RPC exists (idempotent)
CREATE OR REPLACE FUNCTION public.track_incident(p_incident_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.incidents%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.incidents WHERE id = p_incident_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'severity', r.severity,
    'region', r.region,
    'location', r.location,
    'category', r.category,
    'mode', r.mode,
    'description', r.description,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'assigned_officer_name', r.assigned_officer_name,
    'sla_due_at', r.sla_due_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_incident(TEXT) TO anon, authenticated;

COMMENT ON COLUMN public.profiles.password_hint IS
  'Deprecated. Must remain NULL in production. Authentication is via Supabase Auth only.';
