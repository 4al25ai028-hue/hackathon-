-- ==============================================================================
-- CivicConnect / GramVani – Supabase Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Create issue_groups table
CREATE TABLE IF NOT EXISTS public.issue_groups (
    id TEXT PRIMARY KEY,
    issue_title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    total_reports INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED_UNVERIFIED',
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ward TEXT,
    image_url TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    submitter_name TEXT,
    submitter_contact TEXT,
    upvotes_count INTEGER DEFAULT 1,
    potential_duplicate_of TEXT,
    duplicate_confidence DOUBLE PRECISION,
    is_duplicate_flagged BOOLEAN DEFAULT FALSE,
    issue_group_id TEXT REFERENCES public.issue_groups(id) ON DELETE SET NULL,
    duplicate_status TEXT DEFAULT 'unique',
    admin_notes TEXT,
    assigned_department TEXT,
    assigned_officer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolution_image_url TEXT,
    verified_count INTEGER DEFAULT 0,
    disputed_count INTEGER DEFAULT 0
);

-- 3. Create status_history table (Audit trail)
CREATE TABLE IF NOT EXISTS public.status_history (
    id BIGSERIAL PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create verifications table (Citizen fix verification votes)
CREATE TABLE IF NOT EXISTS public.verifications (
    id BIGSERIAL PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    is_verified_fixed BOOLEAN NOT NULL,
    comment TEXT,
    citizen_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create subscribers table
CREATE TABLE IF NOT EXISTS public.subscribers (
    id BIGSERIAL PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create admin_users table (Municipal Officer Authentication in Supabase)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Indiranagar Zone Operations',
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    badge_number TEXT DEFAULT 'CIVIC-OFFICER-701',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance geospatial queries & duplicate lookups
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_group_id ON public.reports(issue_group_id);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON public.reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON public.status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_verifications_report_id ON public.verifications(report_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE public.issue_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create Open RLS Policies for Public/Anon API access
CREATE POLICY "Allow public read access on issue_groups" ON public.issue_groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on issue_groups" ON public.issue_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on issue_groups" ON public.issue_groups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on issue_groups" ON public.issue_groups FOR DELETE USING (true);

CREATE POLICY "Allow public read access on reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on reports" ON public.reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on reports" ON public.reports FOR DELETE USING (true);

CREATE POLICY "Allow public read access on status_history" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on status_history" ON public.status_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on verifications" ON public.verifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on verifications" ON public.verifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on subscribers" ON public.subscribers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on admin_users for auth" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on admin_users" ON public.admin_users FOR UPDATE USING (true);

-- Initial Administrator Account in Supabase (You can change or add more officers directly in Supabase table)
INSERT INTO public.admin_users (email, username, password_hash, full_name, department, role, badge_number)
VALUES ('admin@gramvani.gov.in', 'admin', 'admin123', 'Chief Operations Officer', 'Indiranagar Zone Operations', 'SUPER_ADMIN', 'CIVIC-OFFICER-701')
ON CONFLICT (email) DO NOTHING;

-- Optional helper function to atomically increment upvotes
CREATE OR REPLACE FUNCTION public.increment_upvote(report_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.reports
    SET upvotes_count = COALESCE(upvotes_count, 0) + 1
    WHERE id = report_id_param
    RETURNING upvotes_count INTO new_count;
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
