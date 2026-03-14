-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    type TEXT,
    location TEXT,
    description TEXT,
    risk_level INTEGER,
    latitude FLOAT,
    longitude FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indicators table
CREATE TABLE IF NOT EXISTS public.indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    value FLOAT,
    category TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Optional but recommended)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- Create public read-only policies
CREATE POLICY "Allow public read-only access to events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public read-only access to indicators" ON public.indicators FOR SELECT USING (true);
