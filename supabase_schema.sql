-- ============================================================
-- Conflict Radar — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. EVENTS table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source      text,
    type        text,
    location    text,
    description text,
    risk_level  integer DEFAULT 1,
    latitude    double precision,
    longitude   double precision,
    url         text,
    metadata    jsonb,
    created_at  timestamp with time zone DEFAULT now()
);

-- Index for fast time-ordered fetches (frontend uses ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_location_idx   ON public.events USING gin (to_tsvector('english', coalesce(location, '')));

-- ── 2. INDICATORS table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.indicators (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name       text NOT NULL,
    value      double precision,
    category   text,
    metadata   jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS indicators_created_at_idx ON public.indicators (created_at DESC);
CREATE INDEX IF NOT EXISTS indicators_name_idx       ON public.indicators (name);

-- ── 3. Row Level Security ────────────────────────────────────
-- Anon key  → read only (frontend)
-- Service key → full access (backend fetcher)

ALTER TABLE public.events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read events (frontend uses anon key)
CREATE POLICY IF NOT EXISTS "events_public_read"
    ON public.events FOR SELECT
    USING (true);

-- Allow service role to insert/update/delete events
CREATE POLICY IF NOT EXISTS "events_service_write"
    ON public.events FOR ALL
    USING     (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow anyone to read indicators
CREATE POLICY IF NOT EXISTS "indicators_public_read"
    ON public.indicators FOR SELECT
    USING (true);

-- Allow service role to insert/update/delete indicators
CREATE POLICY IF NOT EXISTS "indicators_service_write"
    ON public.indicators FOR ALL
    USING     (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 4. Realtime (live feed on frontend) ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- ── Done ─────────────────────────────────────────────────────
-- After running this, restart the backend fetcher:
--   python -m backend.antigravity.fetcher.main --single-run
