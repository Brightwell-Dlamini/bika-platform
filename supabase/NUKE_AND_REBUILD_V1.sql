-- =============================================================================
-- BIKA PLATFORM — NUKE AND REBUILD V1
-- =============================================================================
-- WARNING: This DESTROYS all public app data and recreates schema from scratch.
-- Does NOT delete auth.users (your login accounts stay). Re-link profiles after.
--
-- How to run:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file → Run
--   3. Authentication → create / confirm official users with same emails as seed
--   4. Link runs automatically if Auth users already exist
--
-- Design goals:
--   • Matches live Next.js adapters (snake_case columns, text business IDs)
--   • Auth = Supabase Auth only (NO password_hint / plaintext secrets)
--   • profiles.id = stable business id (usr-001); auth_user_id links to auth.users
--   • Public can INSERT incidents; officials UPDATE via RLS helpers
--   • Super Admin writes via service role API or is_super_admin()
--   • Seeded from original mockData — ready for demos and UAT
-- =============================================================================

BEGIN;

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS incidents_updated_at ON public.incidents CASCADE;
DROP TRIGGER IF EXISTS fleet_updated_at ON public.fleet CASCADE;
DROP TRIGGER IF EXISTS establishments_updated_at ON public.establishments CASCADE;
DROP TRIGGER IF EXISTS hotlines_updated_at ON public.hotlines CASCADE;

DROP TABLE IF EXISTS public.attachment_records CASCADE;
DROP TABLE IF EXISTS public.domain_events CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.system_logos CASCADE;
DROP TABLE IF EXISTS public.hotlines CASCADE;
DROP TABLE IF EXISTS public.establishments CASCADE;
DROP TABLE IF EXISTS public.fleet CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_official() CASCADE;
DROP FUNCTION IF EXISTS public.track_incident(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;

DROP TYPE IF EXISTS public.hotline_category_enum CASCADE;
DROP TYPE IF EXISTS public.establishment_category_enum CASCADE;
DROP TYPE IF EXISTS public.health_status_enum CASCADE;
DROP TYPE IF EXISTS public.permit_status_enum CASCADE;
DROP TYPE IF EXISTS public.report_type_enum CASCADE;
DROP TYPE IF EXISTS public.user_role_enum CASCADE;
DROP TYPE IF EXISTS public.incident_status_enum CASCADE;
DROP TYPE IF EXISTS public.severity_enum CASCADE;
DROP TYPE IF EXISTS public.transport_mode_enum CASCADE;
DROP TYPE IF EXISTS public.region_enum CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE public.region_enum AS ENUM ('Hhohho', 'Manzini', 'Shiselweni', 'Lubombo');
CREATE TYPE public.transport_mode_enum AS ENUM ('Road Transport', 'Restaurant/Food');
CREATE TYPE public.severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE public.incident_status_enum AS ENUM (
  'Submitted', 'Received', 'Under Review', 'Verified', 'Assigned',
  'In Progress', 'Awaiting Information', 'Escalated', 'Resolved',
  'Closed', 'Rejected', 'Duplicate'
);
CREATE TYPE public.user_role_enum AS ENUM (
  'Super Admin', 'Police', 'Health Inspector', 'Rank Marshal', 'Public User'
);
CREATE TYPE public.report_type_enum AS ENUM (
  'Incident', 'Complaint', 'Compliment', 'Rating', 'Emergency'
);
CREATE TYPE public.permit_status_enum AS ENUM ('Valid', 'Expired', 'Pending');
CREATE TYPE public.health_status_enum AS ENUM (
  'Compliant', 'Warning', 'Violation Found', 'Pending Inspection'
);
CREATE TYPE public.establishment_category_enum AS ENUM (
  'Restaurant', 'Market', 'Food Vendor', 'Trade Hub'
);
CREATE TYPE public.hotline_category_enum AS ENUM (
  'Emergency', 'Police', 'Fire & Rescue', 'Medical', 'Transport', 'Anti-Corruption', 'General'
);

CREATE TABLE public.profiles (
  id                TEXT PRIMARY KEY,
  auth_user_id      UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  role              public.user_role_enum NOT NULL DEFAULT 'Public User',
  region            TEXT NOT NULL DEFAULT 'Nationwide',
  department        TEXT,
  badge_number      TEXT,
  phone             TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  on_duty           BOOLEAN NOT NULL DEFAULT true,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_lower CHECK (email = lower(email))
);

CREATE INDEX idx_profiles_auth_user ON public.profiles(auth_user_id);
CREATE INDEX idx_profiles_role_active ON public.profiles(role, active);
CREATE INDEX idx_profiles_region ON public.profiles(region);

CREATE TABLE public.incidents (
  id                      TEXT PRIMARY KEY,
  report_type             public.report_type_enum NOT NULL,
  category                TEXT NOT NULL,
  incident_type           TEXT NOT NULL,
  mode                    public.transport_mode_enum NOT NULL,
  region                  public.region_enum NOT NULL,
  location                TEXT NOT NULL,
  terminal_rank_name      TEXT,
  description             TEXT NOT NULL,
  severity                public.severity_enum NOT NULL DEFAULT 'MEDIUM',
  status                  public.incident_status_enum NOT NULL DEFAULT 'Submitted',
  reporter_name           TEXT,
  reporter_phone          TEXT,
  reporter_email          TEXT,
  is_anonymous            BOOLEAN NOT NULL DEFAULT false,
  vehicle_registration    TEXT,
  fleet_id                TEXT,
  linked_establishment_id TEXT,
  driver_name             TEXT,
  operator_name           TEXT,
  restaurant_name         TEXT,
  coordinates             JSONB,
  attachments             JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_department     TEXT,
  assigned_officer_id     TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_officer_name   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at         TIMESTAMPTZ,
  assigned_at             TIMESTAMPTZ,
  sla_due_at              TIMESTAMPTZ,
  first_responded_at      TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  messages                JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_logs              JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalated_count         INTEGER NOT NULL DEFAULT 0,
  is_repeated_alert       BOOLEAN NOT NULL DEFAULT false,
  rating_details          JSONB
);

CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_region ON public.incidents(region);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_created ON public.incidents(created_at DESC);
CREATE INDEX idx_incidents_vehicle ON public.incidents(vehicle_registration);
CREATE INDEX idx_incidents_mode ON public.incidents(mode);
CREATE INDEX idx_incidents_officer ON public.incidents(assigned_officer_id);

CREATE TABLE public.fleet (
  id                   TEXT PRIMARY KEY,
  registration_number  TEXT NOT NULL UNIQUE,
  fleet_id             TEXT NOT NULL,
  vic                  TEXT,
  vehicle_type         TEXT NOT NULL,
  operator_name        TEXT NOT NULL,
  driver_name          TEXT,
  route                TEXT,
  region               public.region_enum NOT NULL,
  rank                 TEXT,
  permit_status        public.permit_status_enum NOT NULL DEFAULT 'Pending',
  permit_expiry        DATE,
  complaints_count     INTEGER NOT NULL DEFAULT 0,
  compliments_count    INTEGER NOT NULL DEFAULT 0,
  rating               NUMERIC(3,1) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_region ON public.fleet(region);
CREATE INDEX idx_fleet_permit ON public.fleet(permit_status);

CREATE TABLE public.establishments (
  id                         TEXT PRIMARY KEY,
  name                       TEXT NOT NULL,
  trading_name               TEXT,
  reference_number           TEXT UNIQUE,
  category                   public.establishment_category_enum NOT NULL,
  owner_operator             TEXT,
  location                   TEXT NOT NULL,
  region                     public.region_enum NOT NULL,
  contact_phone              TEXT,
  health_inspection_status   public.health_status_enum NOT NULL DEFAULT 'Pending Inspection',
  last_inspection_date       DATE,
  rating                     NUMERIC(3,1) NOT NULL DEFAULT 0,
  complaints_count           INTEGER NOT NULL DEFAULT 0,
  compliments_count          INTEGER NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_est_region ON public.establishments(region);
CREATE INDEX idx_est_health ON public.establishments(health_inspection_status);

CREATE TABLE public.hotlines (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  number           TEXT NOT NULL,
  category         public.hotline_category_enum NOT NULL,
  description      TEXT,
  department       TEXT,
  available_hours  TEXT,
  is_toll_free     BOOLEAN NOT NULL DEFAULT false,
  priority         INTEGER NOT NULL DEFAULT 10,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_logos (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  subtitle           TEXT,
  acronym            TEXT NOT NULL,
  role               TEXT,
  custom_image_url   TEXT,
  badge_color        TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.system_config (
  id                      TEXT PRIMARY KEY DEFAULT 'default',
  app_name                TEXT NOT NULL DEFAULT 'BIKA',
  sub_title               TEXT,
  max_image_size_bytes    INTEGER NOT NULL DEFAULT 1048576,
  allowed_image_formats   TEXT[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  session_timeout_mins    INTEGER NOT NULL DEFAULT 30,
  enable_2fa              BOOLEAN NOT NULL DEFAULT false,
  offline_sync_enabled    BOOLEAN NOT NULL DEFAULT true,
  whatsapp_gateway_url    TEXT,
  sms_gateway_key         TEXT,
  email_smtp_host         TEXT,
  escalation_rules        JSONB NOT NULL DEFAULT '[]'::jsonb,
  incident_categories     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id          TEXT PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_name   TEXT NOT NULL,
  user_role   public.user_role_enum,
  action      TEXT NOT NULL,
  target_id   TEXT,
  ip_address  TEXT,
  details     TEXT
);
CREATE INDEX idx_audit_ts ON public.audit_logs(timestamp DESC);

CREATE TABLE public.domain_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_domain_events_created ON public.domain_events(created_at DESC);

CREATE TABLE public.attachment_records (
  id           TEXT PRIMARY KEY,
  incident_id  TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  size_bytes   INTEGER,
  mime_type    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fleet_updated_at BEFORE UPDATE ON public.fleet
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER establishments_updated_at BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER hotlines_updated_at BEFORE UPDATE ON public.hotlines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET auth_user_id = NEW.id, updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND (auth_user_id IS NULL OR auth_user_id IS DISTINCT FROM NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_link_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.active = true AND p.role = 'Super Admin'
      AND (
        p.auth_user_id = auth.uid()
        OR lower(p.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_official()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.active = true
      AND p.role IN ('Super Admin','Police','Health Inspector','Rank Marshal')
      AND (
        p.auth_user_id = auth.uid()
        OR lower(p.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_official() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.track_incident(p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec public.incidents;
BEGIN
  SELECT * INTO rec FROM public.incidents WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(rec);
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_incident(text) TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_auth ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY profiles_update_admin_or_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR auth_user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt()->>'email',''))
  )
  WITH CHECK (true);

CREATE POLICY incidents_insert_public ON public.incidents
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY incidents_select_auth ON public.incidents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY incidents_select_anon ON public.incidents
  FOR SELECT TO anon USING (true);
CREATE POLICY incidents_update_officials ON public.incidents
  FOR UPDATE TO authenticated USING (public.is_official()) WITH CHECK (true);
CREATE POLICY incidents_delete_admin ON public.incidents
  FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY fleet_select_auth ON public.fleet FOR SELECT TO authenticated USING (true);
CREATE POLICY fleet_write_officials ON public.fleet FOR ALL TO authenticated
  USING (public.is_official()) WITH CHECK (true);

CREATE POLICY est_select_auth ON public.establishments FOR SELECT TO authenticated USING (true);
CREATE POLICY est_write_officials ON public.establishments FOR ALL TO authenticated
  USING (public.is_official()) WITH CHECK (true);

CREATE POLICY hotlines_read ON public.hotlines FOR SELECT TO anon, authenticated
  USING (active = true OR public.is_super_admin());
CREATE POLICY hotlines_write ON public.hotlines FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (true);

CREATE POLICY logos_read ON public.system_logos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY logos_write ON public.system_logos FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (true);

CREATE POLICY config_read ON public.system_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY config_write ON public.system_config FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (true);

CREATE POLICY audit_admin ON public.audit_logs FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (true);

CREATE POLICY domain_events_official ON public.domain_events FOR ALL TO authenticated
  USING (public.is_official()) WITH CHECK (true);

CREATE POLICY attachments_insert ON public.attachment_records
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY attachments_select ON public.attachment_records
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can upload incident attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view incident attachments" ON storage.objects;
DROP POLICY IF EXISTS incident_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS incident_attachments_select ON storage.objects;

CREATE POLICY incident_attachments_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'incident-attachments');
CREATE POLICY incident_attachments_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'incident-attachments');

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.establishments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hotlines; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;

BEGIN;

INSERT INTO public.profiles (id, name, email, role, region, department, badge_number, phone, active, on_duty, avatar_url) VALUES
('usr-001', 'Sibusiso Dlamini', 'superadmin@bika.gov.sz', 'Super Admin', 'Nationwide',
 'National Transport & Trade Command', 'NAT-001', '+268 7602 1100', true, true,
 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
('usr-002', 'Inspector Nomsa Mthembu', 'police.manzini@bika.gov.sz', 'Police', 'Manzini',
 'Eswatini Royal Police Service - Traffic Division', 'RPS-8842', '+268 7611 4432', true, true,
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
('usr-003', 'Dr. Thabo Nkambule', 'health.hhohho@bika.gov.sz', 'Health Inspector', 'Hhohho',
 'Ministry of Health & Trade - Public Hygiene Directorate', 'MOH-319', '+268 7622 9901', true, true,
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
('usr-004', 'Makhosini Zwane', 'marshal.manzinirank@bika.gov.sz', 'Rank Marshal', 'Manzini',
 'Manzini Central Bus & Kombi Rank Association', 'RMAR-042', '+268 7655 1204', true, true,
 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80');

INSERT INTO public.fleet (id, registration_number, fleet_id, vic, vehicle_type, operator_name, driver_name, route, region, rank, permit_status, permit_expiry, complaints_count, compliments_count, rating) VALUES
('flt-001', 'PSD 412 BH', 'KOM-MZN-042', 'VIC-994182', '15-Seater Toyota Quantum Kombi',
 'Swazi Express Kombis', 'Sipho Hlophe', 'Manzini Rank <-> Mbabane Central', 'Manzini', 'Manzini Main Rank',
 'Valid', '2026-12-31', 6, 1, 2.8),
('flt-002', 'FSD 882 CH', 'BUS-HH-012', 'VIC-112903', '65-Seater Scania Bus',
 'Highland Luxury Coaches', 'Vusi Simelane', 'Mbabane <-> Piggs Peak <-> Matsamo', 'Hhohho', 'Mbabane Central Rank',
 'Valid', '2027-04-15', 1, 12, 4.7),
('flt-003', 'HSD 219 BH', 'KOM-SHS-008', 'VIC-338102', '15-Seater Nissan NV350 Kombi',
 'Southern Star Transport', 'Musa Ginindza', 'Nhlangano <-> Hlathikhulu', 'Shiselweni', 'Nhlangano Rank',
 'Valid', '2026-11-20', 0, 8, 4.9),
('flt-004', 'LSD 304 EH', 'KOM-LBM-019', 'VIC-771204', '15-Seater Toyota Quantum',
 'Lubombo Express', 'Muzi Dlamini', 'Siteki <-> Big Bend <-> Simunye', 'Lubombo', 'Siteki Rank',
 'Expired', '2026-06-30', 4, 0, 3.1);

INSERT INTO public.establishments (id, name, trading_name, reference_number, category, owner_operator, location, region, contact_phone, health_inspection_status, last_inspection_date, rating, complaints_count, compliments_count) VALUES
('est-001', 'Mbabane Central Market Grill', 'Mbabane Plaza Eatery', 'EST-HH-0012', 'Restaurant',
 'Gcina Nxumalo', 'Shop 14, Mbabane Plaza', 'Hhohho', '+268 2404 1234', 'Warning', '2026-07-15', 3.2, 5, 2),
('est-002', 'Matsapha Food Hub & Bakery', 'Matsapha Bakery', 'EST-MZN-0041', 'Market',
 'Lindiwe Vilakati', 'Matsapha Industrial Site, Complex 4', 'Manzini', '+268 2518 9000', 'Compliant', '2026-08-05', 4.8, 0, 9),
('est-003', 'Siteki Town Square Food Stall', 'Siteki Fresh Market', 'EST-LBM-0019', 'Trade Hub',
 'S. Maziya', 'Siteki Main Market Street', 'Lubombo', '+268 2343 4112', 'Compliant', '2026-06-18', 4.1, 1, 4);

INSERT INTO public.hotlines (id, name, number, category, description, department, available_hours, is_toll_free, priority, active) VALUES
('hotline-1', 'Police Emergency Response', '999', 'Police',
 'Immediate police response for road crimes, reckless driving, violent disputes, or emergencies.',
 'Royal Eswatini Police Service (REPS)', '24/7 Nationwide', true, 1, true),
('hotline-2', 'National Fire & Rescue Services', '933', 'Fire & Rescue',
 'Emergency fire response, road vehicle extrication, chemical hazards, and rescue operations.',
 'Eswatini National Fire & Emergency Services', '24/7 Nationwide', true, 2, true),
('hotline-3', 'National Ambulance & Medical Dispatch', '977', 'Medical',
 'Emergency trauma care, road accident casualty evacuation, and hospital dispatch.',
 'Ministry of Health Emergency Unit', '24/7 Nationwide', true, 3, true),
('hotline-4', 'BIKA Toll-Free Incident Desk', '800-BIKA (800-2452)', 'Transport',
 'Public complaints, kombi overloading reports, overcharging, and bus rank assistance.',
 'Ministry of Public Works & Transport', '6:00 AM - 10:00 PM Daily', true, 4, true),
('hotline-5', 'National Road Transport Council (NRTC)', '+268 2404 2321', 'Transport',
 'Operator licensing, route permit verification, and rank marshal logistics oversight.',
 'National Road Transport Council', '8:00 AM - 5:00 PM (Mon-Fri)', false, 5, true),
('hotline-6', 'Anti-Corruption & Bribery Hotline', '800-8000', 'Anti-Corruption',
 'Confidential reporting of extortion, rank bribery, and official corruption.',
 'Anti-Corruption Commission Eswatini', '24/7 Toll-Free & Confidential', true, 6, true);

INSERT INTO public.system_logos (id, name, subtitle, acronym, role, badge_color) VALUES
('bika_master', 'BIKA National Reporting System',
 'Kingdom of Eswatini Central Incident & Transport Monitoring Crest', 'BIKA',
 'Central National Incident & Compliance Crest', 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'),
('works', 'Ministry of Public Works & Transport',
 'Government of the Kingdom of Eswatini', 'MPWT',
 'Transport Policy & Public Infrastructure', 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'),
('nrtc', 'National Road Transport Council',
 'Public Transport Regulatory Authority', 'NRTC',
 'Kombi, Bus & Freight Permitting & Oversight', 'bg-blue-500/10 text-blue-400 border-blue-500/30'),
('reps', 'Royal Eswatini Police Service',
 'Traffic & Crime Prevention Command', 'REPS',
 'Road Safety, Overloading & Law Enforcement', 'bg-blue-600/10 text-blue-300 border-blue-500/30'),
('fire', 'National Fire & Emergency Services',
 'Rescue & Hazardous Incident Response', 'NFES',
 'Emergency Extraction, Fire Rescue & Hazmat', 'bg-red-500/10 text-red-400 border-red-500/30');

INSERT INTO public.system_config (
  id, app_name, sub_title, max_image_size_bytes, allowed_image_formats,
  session_timeout_mins, enable_2fa, offline_sync_enabled,
  whatsapp_gateway_url, sms_gateway_key, email_smtp_host,
  escalation_rules, incident_categories
) VALUES (
  'default',
  'BIKA',
  'Eswatini Integrated Real-Time Transport & Trade Reporting Platform',
  1048576,
  ARRAY['image/jpeg','image/png','image/webp'],
  30, false, true,
  '', '', '',
  $esc$[
    {"id":"esc-001","severity":"CRITICAL","firstResponseDeadlineMins":15,"escalationDeadlineMins":30,"secondaryEscalationMins":60,"responsibleDepartment":"National Transport & Emergency Rapid Response Center","notificationChannels":["Email","SMS","WhatsApp","InApp"]},
    {"id":"esc-002","severity":"HIGH","firstResponseDeadlineMins":30,"escalationDeadlineMins":120,"secondaryEscalationMins":240,"responsibleDepartment":"Regional Traffic & Health Inspection Command","notificationChannels":["SMS","InApp"]},
    {"id":"esc-003","severity":"MEDIUM","firstResponseDeadlineMins":120,"escalationDeadlineMins":480,"secondaryEscalationMins":1440,"responsibleDepartment":"District Transport & Hygiene Inspection Unit","notificationChannels":["InApp","Email"]},
    {"id":"esc-004","severity":"LOW","firstResponseDeadlineMins":1440,"escalationDeadlineMins":2880,"secondaryEscalationMins":5760,"responsibleDepartment":"General Customer & Transport Care","notificationChannels":["InApp"]}
  ]$esc$::jsonb,
  $cat${
    "Road Transport": ["Dangerous Driving & Speeding","Vehicle Overloading","Unsafe Vehicle Condition","Overcharging Commuter Fares","Bus Rank Congestion","Route Violation","Driver Misconduct","Unlicensed Operator"],
    "Restaurant/Food": ["Food Poisoning / Contamination","Hygiene & Sanitation Violation","Expired Produce / Food Product","Price Gouging / Overcharging","Unlicensed Food Vendor","Customer Conduct & Abuse"]
  }$cat$::jsonb
);

INSERT INTO public.incidents (
  id, report_type, category, incident_type, mode, region, location, terminal_rank_name,
  description, severity, status, reporter_name, reporter_phone, is_anonymous,
  vehicle_registration, fleet_id, driver_name, operator_name, restaurant_name,
  coordinates, attachments, assigned_department, assigned_officer_id, assigned_officer_name,
  created_at, updated_at, acknowledged_at, assigned_at, first_responded_at,
  resolved_at, closed_at, messages, audit_logs, escalated_count, is_repeated_alert, rating_details
) VALUES
(
  'BIKA-11-08-2026-045', 'Incident', 'Reckless Driving & Overloading', 'Severe Speeding & Overloading',
  'Road Transport', 'Manzini', 'MR3 Highway near Matsapha Flyover', 'Manzini Main Rank',
  'Kombi registration PSD 412 BH operating on the Manzini-Mbabane route was severely overloaded with 22 passengers in a 15-seater vehicle. Driver driving recklessly at high speed on wet roads.',
  'HIGH', 'In Progress', 'Temalangeni Shongwe', '+268 7699 0011', false,
  'PSD 412 BH', 'KOM-MZN-042', 'Sipho Hlophe', 'Swazi Express Kombis', NULL,
  '{"lat":-26.5028,"lng":31.3197}'::jsonb,
  '[{"id":"att-101","name":"kombi_overload_matsapha.jpg","url":"https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80","sizeBytes":420000,"type":"image/jpeg"}]'::jsonb,
  'Eswatini Royal Police Service - Traffic Division', 'usr-002', 'Inspector Nomsa Mthembu',
  '2026-08-11T07:15:00Z', '2026-08-11T07:45:00Z', '2026-08-11T07:18:20Z', '2026-08-11T07:22:10Z', '2026-08-11T07:30:00Z',
  NULL, NULL,
  '[{"id":"msg-001","senderId":"usr-005","senderName":"Temalangeni Shongwe","senderRole":"Public User","message":"The kombi just passed the Matsapha exit.","timestamp":"2026-08-11T07:15:00Z"},{"id":"msg-002","senderId":"usr-002","senderName":"Inspector Nomsa Mthembu","senderRole":"Police","message":"Highway patrol unit RPS-12 dispatched.","timestamp":"2026-08-11T07:30:00Z"}]'::jsonb,
  '[{"id":"aud-001","timestamp":"2026-08-11T07:15:00Z","actorName":"Temalangeni Shongwe","actorRole":"Public User","action":"SUBMITTED","details":"Report created"}]'::jsonb,
  0, true, NULL
),
(
  'BIKA-11-08-2026-046', 'Complaint', 'Hygiene & Food Safety', 'Expired Food & Unhygienic Kitchen',
  'Restaurant/Food', 'Hhohho', 'Mbabane Plaza Food Court', NULL,
  'Found raw chicken stored improperly next to cooked vegetables. Unpleasant odor in kitchen area.',
  'MEDIUM', 'Verified', 'Anonymous Citizen', NULL, true,
  NULL, NULL, NULL, NULL, 'Mbabane Central Market Grill',
  '{"lat":-26.3262,"lng":31.1442}'::jsonb,
  '[{"id":"att-102","name":"kitchen_inspection_mbabane.jpg","url":"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80","sizeBytes":650000,"type":"image/jpeg"}]'::jsonb,
  'Ministry of Health & Trade - Public Hygiene Directorate', 'usr-003', 'Dr. Thabo Nkambule',
  '2026-08-11T06:00:00Z', '2026-08-11T06:40:00Z', '2026-08-11T06:10:00Z', '2026-08-11T06:15:00Z', '2026-08-11T06:40:00Z',
  NULL, NULL,
  '[{"id":"msg-003","senderId":"usr-003","senderName":"Dr. Thabo Nkambule","senderRole":"Health Inspector","message":"On-site inspection scheduled.","timestamp":"2026-08-11T06:40:00Z"}]'::jsonb,
  '[{"id":"aud-003","timestamp":"2026-08-11T06:00:00Z","actorName":"Anonymous","actorRole":"Public User","action":"SUBMITTED","details":"Anonymous"}]'::jsonb,
  0, false, NULL
),
(
  'BIKA-11-08-2026-047', 'Emergency', 'Public Safety Hazard', 'Major Kombi Collision & Fuel Leak',
  'Road Transport', 'Lubombo', 'Lomahasha Border Road Crossing', NULL,
  'Collision involving public transport kombi near Lomahasha queue. Fuel leaking near passenger zone.',
  'CRITICAL', 'Escalated', 'Border Control Guard Mamba', '+268 7633 4455', false,
  'CSD 901 EH', 'TRK-LBM-088', NULL, 'Lomahasha Trans-Express', NULL,
  '{"lat":-25.9833,"lng":31.9833}'::jsonb,
  '[{"id":"att-103","name":"accident_scene.jpg","url":"https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80","sizeBytes":890000,"type":"image/jpeg"}]'::jsonb,
  'Eswatini Royal Police Service - Traffic Division', 'usr-001', 'Sibusiso Dlamini (Super Admin Override)',
  '2026-08-11T08:00:00Z', '2026-08-11T08:15:00Z', '2026-08-11T08:01:00Z', '2026-08-11T08:02:00Z', NULL,
  NULL, NULL,
  '[{"id":"msg-004","senderId":"usr-001","senderName":"Sibusiso Dlamini","senderRole":"Super Admin","message":"CRITICAL ALERT dispatched.","timestamp":"2026-08-11T08:05:00Z"}]'::jsonb,
  '[{"id":"aud-004","timestamp":"2026-08-11T08:00:00Z","actorName":"Border Guard Mamba","actorRole":"Public User","action":"SUBMITTED_CRITICAL","details":"Critical"}]'::jsonb,
  2, false, NULL
),
(
  'BIKA-10-08-2026-048', 'Compliment', 'Exceptional Service', 'Driver Honesty & Safe Driving',
  'Road Transport', 'Shiselweni', 'Nhlangano Main Rank', 'Nhlangano Rank',
  'Driver Musa Ginindza returned lost wallet with E2,500 and national ID intact.',
  'LOW', 'Closed', 'Bheki Mdluli', '+268 7622 1144', false,
  'HSD 219 BH', NULL, 'Musa Ginindza', 'Southern Star Transport', NULL,
  '{"lat":-27.1167,"lng":31.2000}'::jsonb,
  '[]'::jsonb,
  'Manzini Central Bus & Kombi Rank Association', NULL, NULL,
  '2026-08-10T14:20:00Z', '2026-08-10T16:00:00Z', '2026-08-10T14:25:00Z', NULL, NULL,
  '2026-08-10T15:50:00Z', '2026-08-10T16:00:00Z',
  '[{"id":"msg-005","senderId":"usr-004","senderName":"Makhosini Zwane","senderRole":"Rank Marshal","message":"Driver commended.","timestamp":"2026-08-10T15:50:00Z"}]'::jsonb,
  '[{"id":"aud-005","timestamp":"2026-08-10T14:20:00Z","actorName":"Bheki Mdluli","actorRole":"Public User","action":"SUBMITTED","details":"Compliment"}]'::jsonb,
  0, false, NULL
),
(
  'BIKA-09-08-2026-049', 'Rating', 'Restaurant Quality', 'Food Trade Service Assessment',
  'Restaurant/Food', 'Manzini', 'Matsapha Industrial Food Market', NULL,
  'Pristine hygiene and delicious fresh meals. Outstanding staff courtesy.',
  'LOW', 'Resolved', 'Siphesihle Khumalo', NULL, false,
  NULL, NULL, NULL, NULL, 'Matsapha Food Hub',
  '{"lat":-26.5000,"lng":31.3100}'::jsonb,
  '[]'::jsonb,
  NULL, NULL, NULL,
  '2026-08-09T11:10:00Z', '2026-08-09T12:00:00Z', NULL, NULL, NULL,
  NULL, NULL,
  '[]'::jsonb, '[]'::jsonb, 0, false,
  '{"overall":4.8,"safety":5.0,"cleanliness":4.9,"customerService":4.8,"reliability":4.7,"pricing":4.5,"waitingTime":4.6}'::jsonb
);

INSERT INTO public.audit_logs (id, timestamp, user_name, user_role, action, target_id, ip_address, details) VALUES
('aud-rec-001', '2026-08-11T08:15:22Z', 'Sibusiso Dlamini', 'Super Admin', 'ESCALATION_OVERRIDE',
 'BIKA-11-08-2026-047', '196.202.210.4', 'Triggered traffic response for Lomahasha emergency'),
('aud-rec-002', '2026-08-11T07:22:10Z', 'Sibusiso Dlamini', 'Super Admin', 'INCIDENT_ASSIGNMENT',
 'BIKA-11-08-2026-045', '196.202.210.4', 'Assigned to Inspector Nomsa Mthembu'),
('aud-rec-003', '2026-08-11T06:40:00Z', 'Dr. Thabo Nkambule', 'Health Inspector', 'STATUS_CHANGE',
 'BIKA-11-08-2026-046', '196.202.208.12', 'Status changed to Verified');

UPDATE public.profiles p
SET auth_user_id = u.id, updated_at = now()
FROM auth.users u
WHERE lower(p.email) = lower(u.email);

COMMIT;
