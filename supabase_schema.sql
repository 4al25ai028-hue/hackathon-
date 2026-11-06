-- ==============================================================================
-- CivicConnect / GramVani – Supabase Database Schema
-- Unified Common Access Schema (All Authenticated Users Have Equal Dashboard Access)
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

-- 4. Create verifications table (Fix verification votes)
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

-- Indexes for high-performance geospatial queries & duplicate lookups
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_group_id ON public.reports(issue_group_id);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON public.reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON public.status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_verifications_report_id ON public.verifications(report_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.issue_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES: Equal Access for All Authenticated Users
-- -----------------------------------------------------------------------------

-- Public visitors may read public complaint records
CREATE POLICY "Public read on issue_groups" ON public.issue_groups FOR SELECT USING (true);
CREATE POLICY "Public read on reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Public read on status_history" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Public read on verifications" ON public.verifications FOR SELECT USING (true);

-- Public visitors can submit reports and verify fixes
CREATE POLICY "Public insert on reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert on verifications" ON public.verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert on subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);

-- Authenticated Users: Equal Full Access across the entire Dashboard
-- (View all complaints, submit new, update info, update status, group duplicates, assign departments, add notes)
CREATE POLICY "Authenticated users full access on reports" 
    ON public.reports 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Authenticated users full access on issue_groups" 
    ON public.issue_groups 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Authenticated users full access on status_history" 
    ON public.status_history 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Authenticated users full access on verifications" 
    ON public.verifications 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Authenticated users full access on subscribers" 
    ON public.subscribers 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Supabase Storage Bucket: report-images
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view photos in report-images bucket
CREATE POLICY "Public can view report images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'report-images');

-- Authenticated and registered users can upload complaint and resolution photos
CREATE POLICY "Anyone can upload report images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'report-images');

-- -----------------------------------------------------------------------------
-- Atomic Helper: Increment Upvotes
-- -----------------------------------------------------------------------------
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
