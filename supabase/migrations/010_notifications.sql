-- =============================================================================
-- BIKA 010 — In-app notifications + PWA push subscriptions
-- Safe to re-run. Apply in Supabase SQL Editor after 009.
--
-- IMPORTANT: public.profiles.id is TEXT (not UUID). user_id columns must match.
-- =============================================================================

-- Clean up any partial / failed previous attempt
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  href          TEXT,
  incident_id   TEXT REFERENCES public.incidents(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL DEFAULT 'general',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_incident
  ON public.notifications (incident_id);

CREATE TABLE public.push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subs_user
  ON public.push_subscriptions (user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Inserts are service-role only (no client insert policy)

DROP POLICY IF EXISTS "push_subs_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "push_subs_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "push_subs_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.notifications IS
  'In-app notification inbox for officers/admins. Written by service role via dispatcher.';
COMMENT ON TABLE public.push_subscriptions IS
  'Web Push (PWA) subscriptions per device. Endpoint unique per user.';
