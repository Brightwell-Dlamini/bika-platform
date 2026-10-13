-- =============================================================================
-- BIKA v2 — Canonical Schema
-- =============================================================================
-- Run this ONCE on a fresh database, or to fully reset.
-- WARNING: This drops all BIKA tables. Auth users are preserved.
--
-- Order of operations for a full rebuild:
--   1. sql/000_reset.sql          (this file)
--   2. sql/001_rls_hardening.sql  (later)
--   3. sql/002_functions.sql      (later)
--
-- After running: create Auth users in Supabase Dashboard with the same emails
-- as the seeded profiles below. Then run sql/002_functions.sql to auto-link.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Drop existing objects (order matters — FKs first)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.incident_events CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.attachment_records CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notification_log CASCADE;
DROP TABLE IF EXISTS public.domain_events CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.system_logos CASCADE;
DROP TABLE IF EXISTS public.hotlines CASCADE;
DROP TABLE IF EXISTS public.establishments CASCADE;
DROP TABLE IF EXISTS public.fleet CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.compute_sla_due_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_official() CASCADE;
DROP FUNCTION IF EXISTS public.current_agency() CASCADE;
DROP FUNCTION IF EXISTS public.track_incident(text) CASCADE;
DROP FUNCTION IF EXISTS public.link_auth_user_on_signup() CASCADE;

DROP TYPE IF EXISTS public.incident_event_type CASCADE;
DROP TYPE IF EXISTS public.report_type CASCADE;
DROP TYPE IF EXISTS public.incident_status CASCADE;
DROP TYPE IF EXISTS public.severity CASCADE;
DROP TYPE IF EXISTS public.mode CASCADE;
DROP TYPE IF EXISTS public.region CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.agency_code CASCADE;
DROP TYPE IF EXISTS public.permit_status CASCADE;
DROP TYPE IF EXISTS public.health_status CASCADE;
DROP TYPE IF EXISTS public.establishment_category CASCADE;
DROP TYPE IF EXISTS public.hotline_category CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Enums — MUST match app/types/index.ts exactly
-- -----------------------------------------------------------------------------
CREATE TYPE public.region AS ENUM ('Hhohho', 'Manzini', 'Shiselweni', 'Lubombo');
CREATE TYPE public.mode AS ENUM ('Road Transport', 'Restaurant/Food');
CREATE TYPE public.severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE public.report_type AS ENUM (
  'incident', 'complaint', 'compliment', 'rating', 'emergency'
);
CREATE TYPE public.incident_status AS ENUM (
  'submitted', 'triaged', 'assigned', 'in_progress',
  'awaiting_info', 'escalated', 'resolved', 'closed', 'rejected'
);
CREATE TYPE public.user_role AS ENUM (
  'super_admin', 'police', 'health_inspector', 'rank_marshal', 'public'
);
CREATE TYPE public.agency_code AS ENUM (
  'REPS', 'MOH', 'NRTC', 'NFES', 'MPWT', 'ACC', 'BIKA'
);
CREATE TYPE public.incident_event_type AS ENUM (
  'incident.submitted',
  'incident.triaged',
  'incident.assigned',
  'incident.status_changed',
  'incident.note_added',
  'incident.message_sent',
  'incident.escalated',
  'incident.resolved',
  'incident.closed',
  'incident.rated',
  'incident.attachment_added',
  'incident.duplicate_linked'
);
CREATE TYPE public.permit_status AS ENUM ('valid', 'expired', 'pending');
CREATE TYPE public.health_status AS ENUM ('compliant', 'warning', 'violation', 'pending');
CREATE TYPE public.establishment_category AS ENUM (
  'restaurant', 'market', 'food_vendor', 'trade_hub'
);
CREATE TYPE public.hotline_category AS ENUM (
  'emergency', 'police', 'fire', 'medical', 'transport', 'anti_corruption', 'general'
);

-- -----------------------------------------------------------------------------
-- 3. Agencies (seed — the operational backbone)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agencies (
  code           public.agency_code PRIMARY KEY,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  region         TEXT NOT NULL DEFAULT 'Nationwide',
  contact_phone  TEXT,
  contact_email  TEXT,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Profiles (extends auth.users, NOT a FK — business id is TEXT)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id             TEXT PRIMARY KEY,
  auth_user_id   UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  role           public.user_role NOT NULL DEFAULT 'public',
  region         TEXT NOT NULL DEFAULT 'Nationwide',
  agency_code    public.agency_code REFERENCES public.agencies(code) ON DELETE SET NULL,
  department     TEXT,
  badge_number   TEXT,
  phone          TEXT,
  active         BOOLEAN NOT NULL DEFAULT true,
  on_duty        BOOLEAN NOT NULL DEFAULT true,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_lower CHECK (email = lower(email))
);

CREATE INDEX idx_profiles_auth_user    ON public.profiles(auth_user_id);
CREATE INDEX idx_profiles_role_active  ON public.profiles(role, active) WHERE active = true;
CREATE INDEX idx_profiles_duty         ON public.profiles(region, agency_code, role)
  WHERE active = true AND on_duty = true;

-- -----------------------------------------------------------------------------
-- 5. Incidents (summary row — the source of truth is incident_events)
-- -----------------------------------------------------------------------------
CREATE TABLE public.incidents (
  id                       TEXT PRIMARY KEY,
  report_type              public.report_type NOT NULL,
  category                 TEXT NOT NULL,
  mode                     public.mode NOT NULL,
  region                   public.region NOT NULL,
  location                 TEXT NOT NULL,
  description              TEXT NOT NULL,
  severity                 public.severity NOT NULL DEFAULT 'MEDIUM',
  status                   public.incident_status NOT NULL DEFAULT 'submitted',

  -- Reporter (PII — filtered by RLS/RPC for public reads)
  reporter_name            TEXT,
  reporter_phone           TEXT,
  reporter_email           TEXT,
  is_anonymous             BOOLEAN NOT NULL DEFAULT false,

  -- Entity links
  vehicle_registration     TEXT,
  fleet_id                 TEXT,
  establishment_id         TEXT,
  operator_name            TEXT,
  driver_name              TEXT,
  establishment_name       TEXT,

  -- Assignment
  assigned_officer_id      TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_officer_name    TEXT,
  assigned_agency_code     public.agency_code REFERENCES public.agencies(code) ON DELETE SET NULL,
  assigned_at              TIMESTAMPTZ,

  -- Coordinates
  coordinates              JSONB,

  -- Timing
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  triaged_at               TIMESTAMPTZ,
  first_responded_at       TIMESTAMPTZ,
  resolved_at              TIMESTAMPTZ,
  closed_at                TIMESTAMPTZ,
  sla_due_at               TIMESTAMPTZ,

  -- Meta
  is_repeated_alert        BOOLEAN NOT NULL DEFAULT false,
  escalated_count          INTEGER NOT NULL DEFAULT 0,
  duplicate_of_id          TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,

  -- Attachments (small, embedded)
  attachments              JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Citizen satisfaction
  citizen_rating_score     INTEGER CHECK (citizen_rating_score IS NULL OR (citizen_rating_score BETWEEN 1 AND 5)),
  citizen_rating_comment   TEXT,
  citizen_rated_at         TIMESTAMPTZ
);

-- Hot-path indexes
CREATE INDEX idx_incidents_status          ON public.incidents(status);
CREATE INDEX idx_incidents_region          ON public.incidents(region);
CREATE INDEX idx_incidents_severity        ON public.incidents(severity);
CREATE INDEX idx_incidents_created         ON public.incidents(created_at DESC);
CREATE INDEX idx_incidents_vehicle         ON public.incidents(vehicle_registration)
  WHERE vehicle_registration IS NOT NULL;
CREATE INDEX idx_incidents_mode            ON public.incidents(mode);
CREATE INDEX idx_incidents_officer         ON public.incidents(assigned_officer_id)
  WHERE assigned_officer_id IS NOT NULL;
CREATE INDEX idx_incidents_agency          ON public.incidents(assigned_agency_code)
  WHERE assigned_agency_code IS NOT NULL;
CREATE INDEX idx_incidents_sla_due         ON public.incidents(sla_due_at)
  WHERE sla_due_at IS NOT NULL
    AND status NOT IN ('closed', 'resolved', 'rejected');
CREATE INDEX idx_incidents_status_created  ON public.incidents(status, created_at DESC);
CREATE INDEX idx_incidents_region_status   ON public.incidents(region, status);
CREATE INDEX idx_incidents_severity_open   ON public.incidents(severity, status)
  WHERE status NOT IN ('closed', 'resolved', 'rejected');

-- -----------------------------------------------------------------------------
-- 6. Incident events (append-only — the audit + timeline source of truth)
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  type          public.incident_event_type NOT NULL,

  actor_id      TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name    TEXT NOT NULL,
  actor_role    public.user_role NOT NULL,

  -- Public = citizen-visible. Internal = officers only.
  is_public     BOOLEAN NOT NULL DEFAULT true,

  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_incident_created ON public.incident_events(incident_id, created_at DESC);
CREATE INDEX idx_events_public           ON public.incident_events(incident_id, created_at DESC)
  WHERE is_public = true;
CREATE INDEX idx_events_type             ON public.incident_events(type, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Assignments (denormalized history — one row per assignment change)
-- -----------------------------------------------------------------------------
CREATE TABLE public.assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id    TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  officer_id     TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_code    public.agency_code NOT NULL REFERENCES public.agencies(code),
  assigned_by    TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at  TIMESTAMPTZ,
  reason         TEXT
);

CREATE INDEX idx_assignments_incident ON public.assignments(incident_id, assigned_at DESC);
CREATE INDEX idx_assignments_officer  ON public.assignments(officer_id, assigned_at DESC)
  WHERE unassigned_at IS NULL;

-- -----------------------------------------------------------------------------
-- 8. Attachment records (structured metadata — files live in Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE public.attachment_records (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  uploaded_by   TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_incident ON public.attachment_records(incident_id);

-- -----------------------------------------------------------------------------
-- 9. Fleet
-- -----------------------------------------------------------------------------
CREATE TABLE public.fleet (
  id                    TEXT PRIMARY KEY,
  registration_number   TEXT NOT NULL UNIQUE,
  fleet_id              TEXT NOT NULL,
  vic                   TEXT,
  vehicle_type          TEXT NOT NULL,
  operator_name         TEXT NOT NULL,
  driver_name           TEXT,
  route                 TEXT,
  region                public.region NOT NULL,
  rank                  TEXT,
  permit_status         public.permit_status NOT NULL DEFAULT 'pending',
  permit_expiry         DATE,
  complaints_count      INTEGER NOT NULL DEFAULT 0,
  compliments_count     INTEGER NOT NULL DEFAULT 0,
  rating                NUMERIC(3,1) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_region ON public.fleet(region);
CREATE INDEX idx_fleet_permit ON public.fleet(permit_status);

-- -----------------------------------------------------------------------------
-- 10. Establishments
-- -----------------------------------------------------------------------------
CREATE TABLE public.establishments (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  trading_name           TEXT,
  reference_number       TEXT UNIQUE,
  category               public.establishment_category NOT NULL,
  owner_operator         TEXT,
  location               TEXT NOT NULL,
  region                 public.region NOT NULL,
  contact_phone          TEXT,
  health_status          public.health_status NOT NULL DEFAULT 'pending',
  last_inspection_date   DATE,
  rating                 NUMERIC(3,1) NOT NULL DEFAULT 0,
  complaints_count       INTEGER NOT NULL DEFAULT 0,
  compliments_count      INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_est_region ON public.establishments(region);
CREATE INDEX idx_est_health ON public.establishments(health_status);

-- -----------------------------------------------------------------------------
-- 11. Hotlines
-- -----------------------------------------------------------------------------
CREATE TABLE public.hotlines (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  number           TEXT NOT NULL,
  category         public.hotline_category NOT NULL,
  description      TEXT,
  agency_code      public.agency_code REFERENCES public.agencies(code) ON DELETE SET NULL,
  available_hours  TEXT NOT NULL DEFAULT '24/7',
  is_toll_free     BOOLEAN NOT NULL DEFAULT false,
  priority         INTEGER NOT NULL DEFAULT 10,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 12. System config & logos
-- -----------------------------------------------------------------------------
CREATE TABLE public.system_config (
  id                      TEXT PRIMARY KEY DEFAULT 'default',
  app_name                TEXT NOT NULL DEFAULT 'BIKA',
  sub_title               TEXT,
  max_image_size_bytes    INTEGER NOT NULL DEFAULT 1048576,
  allowed_image_formats   TEXT[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  session_timeout_mins    INTEGER NOT NULL DEFAULT 30,
  offline_sync_enabled    BOOLEAN NOT NULL DEFAULT true,
  whatsapp_gateway_url    TEXT,
  sms_gateway_key         TEXT,
  email_smtp_host         TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_logos (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  subtitle           TEXT,
  acronym            TEXT NOT NULL,
  role               TEXT,
  custom_image_url   TEXT,
  badge_color        TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 13. Audit & ops
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id      TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name    TEXT NOT NULL,
  user_role    public.user_role,
  action       TEXT NOT NULL,
  target_id    TEXT,
  ip_address   TEXT,
  details      TEXT
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE public.notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  event             TEXT NOT NULL,
  incident_id       TEXT,
  channels          TEXT[] NOT NULL DEFAULT '{}',
  message           TEXT,
  delivery_result   JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_notif_created  ON public.notification_log(created_at DESC);
CREATE INDEX idx_notif_incident ON public.notification_log(incident_id);

-- -----------------------------------------------------------------------------
-- 14. Triggers
-- -----------------------------------------------------------------------------

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fleet_updated_at
  BEFORE UPDATE ON public.fleet
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hotlines_updated_at
  BEFORE UPDATE ON public.hotlines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SLA auto-compute on insert (severity-based)
CREATE OR REPLACE FUNCTION public.compute_sla_due_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + CASE NEW.severity
      WHEN 'CRITICAL' THEN INTERVAL '2 hours'
      WHEN 'HIGH'     THEN INTERVAL '8 hours'
      WHEN 'MEDIUM'   THEN INTERVAL '24 hours'
      WHEN 'LOW'      THEN INTERVAL '72 hours'
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidents_sla
  BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.compute_sla_due_at();

-- Auto-link auth.users → profiles on signup (by email)
CREATE OR REPLACE FUNCTION public.link_auth_user_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET auth_user_id = NEW.id, updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND (auth_user_id IS NULL OR auth_user_id IS DISTINCT FROM NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_auth_user_on_signup();

-- -----------------------------------------------------------------------------
-- 15. RLS helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.active = true
      AND p.role = 'super_admin'
      AND (p.auth_user_id = auth.uid()
           OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_official()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.active = true
      AND p.role IN ('super_admin', 'police', 'health_inspector', 'rank_marshal')
      AND (p.auth_user_id = auth.uid()
           OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.current_agency()
RETURNS public.agency_code LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.agency_code FROM public.profiles p
  WHERE p.active = true
    AND (p.auth_user_id = auth.uid()
         OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_official()    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_agency() TO authenticated;

-- -----------------------------------------------------------------------------
-- 16. Public track RPC — safe subset for citizens
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_incident(p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.incidents;
  events jsonb;
BEGIN
  SELECT * INTO r FROM public.incidents WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(e ORDER BY e.created_at ASC), '[]'::jsonb)
  INTO events
  FROM (
    SELECT id, type, actor_name, actor_role, payload, created_at
    FROM public.incident_events
    WHERE incident_id = p_id AND is_public = true
  ) e;

  RETURN jsonb_build_object(
    'id',                     r.id,
    'report_type',            r.report_type,
    'category',               r.category,
    'mode',                   r.mode,
    'region',                 r.region,
    'location',               r.location,
    'description',            r.description,
    'severity',               r.severity,
    'status',                 r.status,
    'assigned_officer_name',  r.assigned_officer_name,
    'assigned_agency_code',   r.assigned_agency_code,
    'coordinates',            r.coordinates,
    'attachments',            r.attachments,
    'created_at',             r.created_at,
    'updated_at',             r.updated_at,
    'triaged_at',             r.triaged_at,
    'first_responded_at',     r.first_responded_at,
    'resolved_at',            r.resolved_at,
    'closed_at',              r.closed_at,
    'sla_due_at',             r.sla_due_at,
    'citizen_rating_score',   r.citizen_rating_score,
    'events',                 events
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_incident(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 17. RLS — enabled, permissive for now (hardening in 001_rls_hardening.sql)
-- -----------------------------------------------------------------------------
ALTER TABLE public.agencies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotlines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log    ENABLE ROW LEVEL SECURITY;

-- Bootstrap policies (locked down in 001)
CREATE POLICY agencies_read_all ON public.agencies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY hotlines_read_active ON public.hotlines
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY logos_read_all ON public.system_logos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY config_read_all ON public.system_config
  FOR SELECT TO anon, authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 18. Realtime (tables that push to clients)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;     EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hotlines;        EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- -----------------------------------------------------------------------------
-- 19. Storage bucket
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS incident_attachments_read   ON storage.objects;
DROP POLICY IF EXISTS incident_attachments_write  ON storage.objects;
CREATE POLICY incident_attachments_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'incident-attachments');
CREATE POLICY incident_attachments_write ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'incident-attachments');

-- -----------------------------------------------------------------------------
-- 20. Seed data
-- -----------------------------------------------------------------------------

-- Agencies
INSERT INTO public.agencies (code, name, short_name, region, contact_phone, contact_email) VALUES
  ('REPS', 'Royal Eswatini Police Service',          'Police',        'Nationwide', '999',                'ops@reps.gov.sz'),
  ('MOH',  'Ministry of Health & Trade',             'Health',        'Nationwide', '+268 2404 2000',     'health@moh.gov.sz'),
  ('NRTC', 'National Road Transport Council',        'NRTC',          'Nationwide', '+268 2404 2321',     'info@nrtc.co.sz'),
  ('NFES', 'National Fire & Emergency Services',     'Fire & Rescue', 'Nationwide', '933',                'ops@nfes.gov.sz'),
  ('MPWT', 'Ministry of Public Works & Transport',   'Public Works',  'Nationwide', '+268 2404 2000',     'info@mpwt.gov.sz'),
  ('ACC',  'Anti-Corruption Commission Eswatini',    'ACC',           'Nationwide', '800-8000',           'report@acc.org.sz'),
  ('BIKA', 'BIKA National Coordination Desk',        'BIKA',          'Nationwide', '800-2452',           'ops@bika.gov.sz')
ON CONFLICT (code) DO NOTHING;

-- Profiles (demo officials — create matching Auth users afterward)
INSERT INTO public.profiles (
  id, name, email, role, region, agency_code, department, badge_number, phone, active, on_duty, avatar_url
) VALUES
  ('usr-001', 'Sibusiso Dlamini',      'superadmin@bika.gov.sz',      'super_admin',      'Nationwide', 'BIKA', 'National Coordination',       'NAT-001', '+268 7602 1100', true, true, NULL),
  ('usr-002', 'Inspector Nomsa Mthembu','police.manzini@bika.gov.sz',  'police',           'Manzini',    'REPS', 'Traffic Division',            'RPS-8842', '+268 7611 4432', true, true, NULL),
  ('usr-003', 'Dr. Thabo Nkambule',    'health.hhohho@bika.gov.sz',   'health_inspector', 'Hhohho',     'MOH',  'Public Hygiene Directorate',  'MOH-319',  '+268 7622 9901', true, true, NULL),
  ('usr-004', 'Makhosini Zwane',       'marshal.manzini@bika.gov.sz', 'rank_marshal',     'Manzini',    'NRTC', 'Rank Management',             'RMAR-042', '+268 7655 1204', true, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Hotlines
INSERT INTO public.hotlines (
  id, name, number, category, description, agency_code, available_hours, is_toll_free, priority, active
) VALUES
  ('hot-001', 'Police Emergency',       '999',              'police',         'Immediate police response for road crimes, reckless driving, emergencies.', 'REPS', '24/7',            true,  1, true),
  ('hot-002', 'Fire & Rescue',          '933',              'fire',           'Fire response, extrication, hazmat, rescue operations.',                    'NFES', '24/7',            true,  2, true),
  ('hot-003', 'Ambulance & Medical',    '977',              'medical',        'Emergency trauma, accident casualty evacuation, hospital dispatch.',        'MOH',  '24/7',            true,  3, true),
  ('hot-004', 'BIKA Incident Desk',     '800-2452',         'transport',      'Public complaints, kombi overloading, overcharging, rank assistance.',      'BIKA', '6:00–22:00 daily', true,  4, true),
  ('hot-005', 'NRTC',                   '+268 2404 2321',   'transport',      'Operator licensing, route permits, rank oversight.',                        'NRTC', '8:00–17:00 Mon–Fri', false, 5, true),
  ('hot-006', 'Anti-Corruption',        '800-8000',         'anti_corruption','Confidential reporting of extortion, bribery, corruption.',                 'ACC',  '24/7',            true,  6, true)
ON CONFLICT (id) DO NOTHING;

-- System config
INSERT INTO public.system_config (id, app_name, sub_title) VALUES (
  'default', 'BIKA',
  'Eswatini Integrated Real-Time Transport & Trade Reporting Platform'
) ON CONFLICT (id) DO NOTHING;

-- System logos
INSERT INTO public.system_logos (id, name, subtitle, acronym, role, badge_color) VALUES
  ('works', 'Ministry of Public Works & Transport', 'Government of the Kingdom of Eswatini',      'MPWT', 'Transport Policy & Public Infrastructure',      'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'),
  ('nrtc',  'National Road Transport Council',      'Public Transport Regulatory Authority',       'NRTC', 'Kombi, Bus & Freight Permitting & Oversight',   'bg-blue-500/10 text-blue-400 border-blue-500/30'),
  ('reps',  'Royal Eswatini Police Service',        'Traffic & Crime Prevention Command',          'REPS', 'Road Safety, Overloading & Law Enforcement',    'bg-blue-600/10 text-blue-300 border-blue-500/30'),
  ('fire',  'National Fire & Emergency Services',   'Rescue & Hazardous Incident Response',        'NFES', 'Emergency Extraction, Fire Rescue & Hazmat',    'bg-red-500/10 text-red-400 border-red-500/30')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Post-install checklist:
--   1. Supabase Dashboard → Authentication → Users → create the four officials
--      above with the SAME emails and a strong password.
--   2. The on_auth_user_created trigger auto-links profiles.auth_user_id.
--   3. Run sql/001_rls_hardening.sql next.
-- =============================================================================
