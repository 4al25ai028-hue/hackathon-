import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CivicReport,
  IssueGroup,
  StatusHistoryItem,
  VerificationVote,
  ReportStatus,
} from './types.js';

// ---------------------------------------------------------------------------
// SUPABASE CONNECTION (single source of truth – no local SQLite fallback)
// ---------------------------------------------------------------------------
// Server-side code should use the SERVICE ROLE key (bypasses RLS). Never expose
// it to the browser. If it is missing we fall back to the anon key, in which
// case your RLS policies must allow the operations below.
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseKey.includes('your-anon-public-key')
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export function getDatabaseStatus(): {
  is_connected: boolean;
  provider: 'supabase' | 'sqlite_fallback';
  url: string;
  configured: boolean;
  message: string;
} {
  if (isSupabaseConfigured) {
    let cleanUrl = supabaseUrl;
    try {
      const parsed = new URL(supabaseUrl);
      cleanUrl = `${parsed.protocol}//${parsed.hostname}`;
    } catch {}
    return {
      is_connected: true,
      provider: 'supabase',
      url: cleanUrl,
      configured: true,
      message: `Active Supabase backend connected (${cleanUrl}). All data persistence, audit trails, and issue groups are stored in Supabase.`,
    };
  }

  return {
    is_connected: false,
    provider: 'sqlite_fallback',
    url: 'local',
    configured: false,
    message: 'Supabase URL & Anon Key not yet provided in .env. Running in local mode.',
  };
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function rowToReport(row: any): CivicReport {
  return {
    ...row,
    is_anonymous: Boolean(row.is_anonymous),
    is_duplicate_flagged: Boolean(row.is_duplicate_flagged),
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    issue_group_id: row.issue_group_id || null,
    duplicate_status: row.duplicate_status || 'unique',
  };
}

/** Throws a readable error if a Supabase call failed. */
function check<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`Supabase ${context} failed: ${result.error.message}`);
  return result.data as T;
}

/** Strip characters that would break PostgREST's `or()` filter syntax. */
function sanitizeSearch(term: string): string {
  return term.trim().replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Uploads an image (Data URL / base64) to the Supabase Storage bucket 'report-images'.
 * If already a public HTTP/HTTPS URL, returns it unchanged.
 */
export async function uploadImageToSupabaseStorage(
  base64OrDataUrl: string,
  prefix: string = 'complaint'
): Promise<string> {
  if (!base64OrDataUrl) return '';
  if (!base64OrDataUrl.startsWith('data:image/')) return base64OrDataUrl;
  if (!isSupabaseConfigured || !supabase) return base64OrDataUrl;

  try {
    const match = base64OrDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) return base64OrDataUrl;

    const mimeType = match[1];
    const base64Data = match[2];
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError.message);
      return base64OrDataUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from('report-images')
      .getPublicUrl(filename);

    return publicUrlData?.publicUrl || base64OrDataUrl;
  } catch (err: any) {
    console.warn('Failed to upload image to report-images bucket:', err);
    return base64OrDataUrl;
  }
}

// ---------------------------------------------------------------------------
// 1. Get all reports with optional filters
// ---------------------------------------------------------------------------
export async function getReportsData(filters: {
  category?: string;
  status?: string;
  ward?: string;
  search?: string;
  flagged_duplicates?: boolean;
}): Promise<CivicReport[]> {
  let query = supabase.from('reports').select('*');

  if (filters.category && filters.category !== 'All') query = query.eq('category', filters.category);
  if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
  if (filters.ward && filters.ward !== 'All') query = query.eq('ward', filters.ward);
  if (filters.flagged_duplicates) query = query.eq('is_duplicate_flagged', true);

  if (filters.search) {
    const clean = sanitizeSearch(filters.search);
    if (clean) {
      const term = `%${clean}%`;
      query = query.or(
        `id.ilike.${term},title.ilike.${term},description.ilike.${term},address.ilike.${term}`
      );
    }
  }

  query = query.order('created_at', { ascending: false });

  const data = check(await query, 'reports query');
  return (data || []).map(rowToReport);
}

// ---------------------------------------------------------------------------
// 2. Get single report details including audit history and verifications
// ---------------------------------------------------------------------------
export async function getReportDetailData(id: string): Promise<{
  report: CivicReport | null;
  history: StatusHistoryItem[];
  verifications: VerificationVote[];
  originalReport: CivicReport | null;
}> {
  const { data: repData, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Supabase report fetch failed: ${error.message}`);
  if (!repData) {
    return { report: null, history: [], verifications: [], originalReport: null };
  }

  const report = rowToReport(repData);

  const [historyRes, verifRes] = await Promise.all([
    supabase.from('status_history').select('*').eq('report_id', id).order('created_at', { ascending: true }),
    supabase.from('verifications').select('*').eq('report_id', id).order('created_at', { ascending: false }),
  ]);

  const history = check(historyRes, 'status_history fetch') || [];
  const verifications = check(verifRes, 'verifications fetch') || [];

  let originalReport: CivicReport | null = null;
  if (report.potential_duplicate_of) {
    const { data: origData } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report.potential_duplicate_of)
      .maybeSingle();
    if (origData) originalReport = rowToReport(origData);
  }

  return {
    report,
    history: history as StatusHistoryItem[],
    verifications: verifications as VerificationVote[],
    originalReport,
  };
}

// ---------------------------------------------------------------------------
// 3. Save new complaint report
// ---------------------------------------------------------------------------
export async function saveReportData(report: Partial<CivicReport>): Promise<CivicReport> {
  if (!report.id) throw new Error('Report id is required.');

  const now = new Date().toISOString();

  // If report image is a base64 / data URL, upload to Supabase Storage 'report-images' bucket
  let storedImageUrl = report.image_url || '';
  if (storedImageUrl.startsWith('data:image/')) {
    storedImageUrl = await uploadImageToSupabaseStorage(storedImageUrl, 'complaint');
  }

  const row = {
    id: report.id,
    title: report.title || 'Untitled',
    description: report.description || 'No description',
    category: report.category || 'Other',
    priority: report.priority || 'Medium',
    status: report.status || 'SUBMITTED_UNVERIFIED',
    address: report.address || 'Reported within Municipality',
    latitude: report.latitude ?? null,
    longitude: report.longitude ?? null,
    ward: report.ward || 'General Ward',
    image_url: storedImageUrl,
    is_anonymous: Boolean(report.is_anonymous),
    submitter_name: report.submitter_name || 'Citizen',
    submitter_contact: report.submitter_contact || 'N/A',
    upvotes_count: report.upvotes_count || 1,
    potential_duplicate_of: report.potential_duplicate_of || null,
    duplicate_confidence: report.duplicate_confidence ?? null,
    is_duplicate_flagged: Boolean(report.is_duplicate_flagged),
    issue_group_id: report.issue_group_id || null,
    duplicate_status: report.duplicate_status || 'unique',
    admin_notes: report.admin_notes || null,
    assigned_department: report.assigned_department || null,
    assigned_officer: report.assigned_officer || null,
    created_at: report.created_at || now,
    updated_at: report.updated_at || now,
    resolved_at: report.resolved_at || null,
    resolution_notes: report.resolution_notes || null,
    resolution_image_url: report.resolution_image_url || null,
    verified_count: report.verified_count || 0,
    disputed_count: report.disputed_count || 0,
  };

  const inserted = check(
    await supabase.from('reports').insert([row]).select().single(),
    'report insert'
  );

  // Initial audit history entry
  const historyRes = await supabase.from('status_history').insert([
    {
      report_id: row.id,
      from_status: null,
      to_status: row.status,
      action: 'Citizen Submission',
      actor_type: 'CITIZEN',
      actor_name: report.submitter_name || 'Resident',
      notes: row.is_duplicate_flagged
        ? `Report logged and flagged under issue group ${row.issue_group_id || row.potential_duplicate_of}.`
        : 'Report submitted successfully. Marked as unverified pending civic review.',
      created_at: row.created_at,
    },
  ]);
  if (historyRes.error) {
    console.warn('Report saved but audit history insert failed:', historyRes.error.message);
  }

  return rowToReport(inserted);
}

// ---------------------------------------------------------------------------
// 4. Update status & administrative fields
// ---------------------------------------------------------------------------
export async function updateReportStatusData(
  id: string,
  newStatus: ReportStatus,
  officerName: string,
  resolutionNotes?: string,
  adminNotes?: string,
  assignedDepartment?: string,
  assignedOfficer?: string,
  resolutionImageUrl?: string
): Promise<CivicReport> {
  const now = new Date().toISOString();

  const { data: curr, error: currErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (currErr) throw new Error(`Supabase report fetch failed: ${currErr.message}`);
  if (!curr) throw new Error(`Report ${id} not found.`);

  // If resolution image is a base64 / data URL, upload to Supabase Storage 'report-images' bucket
  let storedResImageUrl = resolutionImageUrl || curr.resolution_image_url;
  if (storedResImageUrl && storedResImageUrl.startsWith('data:image/')) {
    storedResImageUrl = await uploadImageToSupabaseStorage(storedResImageUrl, 'resolution');
  }

  const resolvedAt =
    curr.resolved_at ||
    (['RESOLVED_PENDING_VERIFICATION', 'VERIFIED_CLOSED'].includes(newStatus) ? now : null);

  const updated = check(
    await supabase
      .from('reports')
      .update({
        status: newStatus,
        resolution_notes: resolutionNotes || curr.resolution_notes,
        resolution_image_url: storedResImageUrl,
        admin_notes: adminNotes || curr.admin_notes,
        assigned_department: assignedDepartment || curr.assigned_department,
        assigned_officer: assignedOfficer || curr.assigned_officer,
        resolved_at: resolvedAt,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single(),
    'report update'
  );

  const historyRes = await supabase.from('status_history').insert([
    {
      report_id: id,
      from_status: curr.status,
      to_status: newStatus,
      action: `Status set to ${newStatus}`,
      actor_type: 'USER',
      actor_name: officerName,
      notes: resolutionNotes || adminNotes || 'Status update logged',
      created_at: now,
    },
  ]);
  if (historyRes.error) {
    console.warn('Status updated but audit history insert failed:', historyRes.error.message);
  }

  return rowToReport(updated);
}

// ---------------------------------------------------------------------------
// 5. Upvote report
// ---------------------------------------------------------------------------
export async function upvoteReportData(id: string): Promise<number> {
  // Preferred: atomic increment through a Postgres function (see SQL notes).
  const rpc = await supabase.rpc('increment_upvote', { report_id_param: id });
  if (!rpc.error && typeof rpc.data === 'number') return rpc.data;

  // Fallback if the RPC hasn't been created yet (not atomic under heavy load).
  const { data: curr, error } = await supabase
    .from('reports')
    .select('upvotes_count')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Supabase upvote fetch failed: ${error.message}`);
  if (!curr) throw new Error(`Report ${id} not found.`);

  const next = (curr.upvotes_count || 0) + 1;
  check(
    await supabase.from('reports').update({ upvotes_count: next }).eq('id', id).select('upvotes_count').single(),
    'upvote update'
  );
  return next;
}

// ---------------------------------------------------------------------------
// 6. Verify fix by citizen
// ---------------------------------------------------------------------------
export async function verifyFixData(
  id: string,
  isFixed: boolean,
  comment: string,
  citizenToken: string = 'citizen_web'
): Promise<CivicReport> {
  const now = new Date().toISOString();

  const { data: curr, error: currErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (currErr) throw new Error(`Supabase report fetch failed: ${currErr.message}`);
  if (!curr) throw new Error(`Report ${id} not found.`);

  check(
    await supabase.from('verifications').insert([
      {
        report_id: id,
        is_verified_fixed: isFixed,
        comment,
        citizen_token: citizenToken,
        created_at: now,
      },
    ]).select(),
    'verification insert'
  );

  const verifiedCount = (curr.verified_count || 0) + (isFixed ? 1 : 0);
  const disputedCount = (curr.disputed_count || 0) + (isFixed ? 0 : 1);

  const shouldClose =
    isFixed && verifiedCount >= 2 && curr.status === 'RESOLVED_PENDING_VERIFICATION';

  const patch: Record<string, any> = {
    verified_count: verifiedCount,
    disputed_count: disputedCount,
  };
  if (shouldClose) {
    patch.status = 'VERIFIED_CLOSED';
    patch.updated_at = now;
  }

  const updated = check(
    await supabase.from('reports').update(patch).eq('id', id).select().single(),
    'verification count update'
  );

  if (shouldClose) {
    const historyRes = await supabase.from('status_history').insert([
      {
        report_id: id,
        from_status: 'RESOLVED_PENDING_VERIFICATION',
        to_status: 'VERIFIED_CLOSED',
        action: 'Citizen Verification Passed',
        actor_type: 'CITIZEN',
        actor_name: 'Community Residents',
        notes: `${verifiedCount} citizens confirmed resolution on site.`,
        created_at: now,
      },
    ]);
    if (historyRes.error) {
      console.warn('Report closed but audit history insert failed:', historyRes.error.message);
    }
  }

  return rowToReport(updated);
}

// ---------------------------------------------------------------------------
// 7. Get Issue Groups with associated citizen reports
// ---------------------------------------------------------------------------
export async function getIssueGroupsData(): Promise<IssueGroup[]> {
  const [groupsRes, reportsRes] = await Promise.all([
    supabase.from('issue_groups').select('*').order('updated_at', { ascending: false }),
    supabase
      .from('reports')
      .select('*')
      .not('issue_group_id', 'is', null)
      .order('created_at', { ascending: true }),
  ]);

  const groupRows = check(groupsRes, 'issue_groups fetch') || [];
  const allReports = (check(reportsRes, 'grouped reports fetch') || []).map(rowToReport);

  return groupRows.map((gRow: any) => {
    const reportsInGroup = allReports.filter((r) => r.issue_group_id === gRow.id);
    return {
      id: gRow.id,
      issue_title: gRow.issue_title,
      category: gRow.category,
      location: gRow.location,
      latitude: gRow.latitude !== null && gRow.latitude !== undefined ? Number(gRow.latitude) : null,
      longitude: gRow.longitude !== null && gRow.longitude !== undefined ? Number(gRow.longitude) : null,
      total_reports: reportsInGroup.length || gRow.total_reports || 1,
      created_at: gRow.created_at,
      updated_at: gRow.updated_at,
      reports: reportsInGroup,
    };
  });
}

// ---------------------------------------------------------------------------
// 8. Clear / purge all records
// ---------------------------------------------------------------------------
export async function clearAllData(): Promise<void> {
  // Delete child tables first to respect foreign keys.
  const steps: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = [
    ['verifications', () => supabase.from('verifications').delete().gte('id', 0)],
    ['status_history', () => supabase.from('status_history').delete().gte('id', 0)],
    ['reports', () => supabase.from('reports').delete().neq('id', '')],
    ['issue_groups', () => supabase.from('issue_groups').delete().neq('id', '')],
    ['subscribers', () => supabase.from('subscribers').delete().gte('id', 0)],
  ];

  for (const [table, run] of steps) {
    const { error } = await run();
    if (error) throw new Error(`Supabase clear of "${table}" failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 9. Re-seed database with sample data
// ---------------------------------------------------------------------------
export async function seedSampleData(): Promise<void> {
  await clearAllData();

  const now = new Date().toISOString();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

  check(
    await supabase.from('issue_groups').insert([
      {
        id: 'ISSUE-0001',
        issue_title: 'Deep crater pothole on 5th Main & Elm Street',
        category: 'Roads & Potholes',
        location: '412 5th Main Road, Ward 12, Indiranagar',
        latitude: 12.9716,
        longitude: 77.6412,
        total_reports: 2,
        created_at: hoursAgo(36),
        updated_at: now,
      },
    ]).select(),
    'seed issue_groups'
  );

  const baseReport = {
    category: 'Roads & Potholes',
    priority: 'High',
    status: 'SUBMITTED_UNVERIFIED',
    ward: 'Ward 12 (Central)',
    issue_group_id: 'ISSUE-0001',
    duplicate_status: 'grouped',
    assigned_department: 'Roads & Infrastructure',
    assigned_officer: null,
    resolved_at: null,
    resolution_notes: null,
    resolution_image_url: null,
    verified_count: 0,
    disputed_count: 0,
    updated_at: now,
  };

  const reports = [
    {
      ...baseReport,
      id: 'GP-2026-001',
      title: 'Deep crater pothole on 5th Main & Elm St',
      description: 'Massive pothole in middle of lane before crosswalk. Scooters swerving dangerous.',
      address: '412 5th Main Road, Ward 12',
      latitude: 12.9716,
      longitude: 77.6412,
      image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      is_anonymous: false,
      submitter_name: 'Priya Sharma',
      submitter_contact: '+91 98*** **412',
      upvotes_count: 14,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: false,
      admin_notes: 'Triaged via GramVani engine.',
      created_at: hoursAgo(36),
    },
    {
      ...baseReport,
      id: 'GP-2026-002',
      title: 'Huge pothole near Elm Street signal',
      description: 'Deep road damage and crater right next to 5th Main junction. Unsafe after dark.',
      address: '420 5th Main Road, Ward 12',
      latitude: 12.9718,
      longitude: 77.6414,
      image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
      is_anonymous: true,
      submitter_name: 'Anonymous Citizen',
      submitter_contact: 'Masked',
      upvotes_count: 3,
      potential_duplicate_of: 'GP-2026-001',
      duplicate_confidence: 0.88,
      is_duplicate_flagged: true,
      admin_notes: 'System grouped under ISSUE-0001 based on 28m proximity & 88% content match.',
      created_at: hoursAgo(14),
    },
  ];

  check(await supabase.from('reports').insert(reports).select(), 'seed reports');

  check(
    await supabase.from('status_history').insert(
      reports.map((r) => ({
        report_id: r.id,
        from_status: null,
        to_status: r.status,
        action: 'Citizen Submission',
        actor_type: 'CITIZEN',
        actor_name: r.submitter_name,
        notes: r.is_duplicate_flagged
          ? `Report logged and flagged under issue group ${r.issue_group_id}.`
          : 'Report submitted successfully. Marked as unverified pending civic review.',
        created_at: r.created_at,
      }))
    ).select(),
    'seed status_history'
  );
}

// ---------------------------------------------------------------------------
// 10. Universal User Authentication via Supabase Auth
// ---------------------------------------------------------------------------
export async function authenticateUser(
  emailInput: string,
  passwordInput: string,
  action: 'login' | 'signup' = 'login'
): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}> {
  const cleanEmail = (emailInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  // 1. SUPABASE AUTHENTICATION (Uses Supabase Auth for all registered users)
  if (isSupabaseConfigured && supabase) {
    try {
      if (action === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail.toLowerCase(),
          password: cleanPass,
        });

        if (signUpError) {
          return { success: false, error: signUpError.message };
        }

        if (signUpData?.user) {
          const u = signUpData.user;
          const displayName = u.user_metadata?.full_name || u.email?.split('@')[0] || cleanEmail;
          return {
            success: true,
            user: {
              id: u.id,
              email: u.email || cleanEmail,
              name: displayName,
            },
          };
        }
      }

      // Login using official supabase.auth.signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail.toLowerCase(),
        password: cleanPass,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData?.user) {
        const u = authData.user;
        const displayName = u.user_metadata?.full_name || u.email?.split('@')[0] || cleanEmail;
        return {
          success: true,
          user: {
            id: u.id,
            email: u.email || cleanEmail,
            name: displayName,
          },
        };
      }

      return {
        success: false,
        error: 'Authentication failed. Please verify your email and password.',
      };
    } catch (err: any) {
      console.warn('Supabase authentication error:', err);
      return {
        success: false,
        error: err.message || 'Supabase authentication failed.',
      };
    }
  }

  // 2. Local/Dev fallback when Supabase keys are not yet configured in environment:
  if (cleanEmail && cleanPass.length >= 3) {
    const displayName = cleanEmail.includes('@')
      ? cleanEmail.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
      : cleanEmail;

    return {
      success: true,
      user: {
        id: `usr-${Date.now()}`,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@example.com`,
        name: displayName,
      },
    };
  }

  return {
    success: false,
    error: 'Please enter a valid email and password.',
  };
}

// Backward-compatible alias for any existing code
export const authenticateAdminUser = async (userOrEmail: string, pass: string, action?: 'login' | 'signup') => {
  const result = await authenticateUser(userOrEmail, pass, action);
  return {
    success: result.success,
    officer: result.user ? {
      name: result.user.name,
      badge: 'COMMUNITY',
      role: 'USER',
      username: result.user.email,
      email: result.user.email,
    } : undefined,
    user: result.user,
    error: result.error,
  };
};
