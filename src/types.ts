export type ReportStatus =
  | 'SUBMITTED_UNVERIFIED'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED_PENDING_VERIFICATION'
  | 'VERIFIED_CLOSED'
  | 'REJECTED_DUPLICATE';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type IssueCategory =
  | 'Roads & Potholes'
  | 'Sanitation & Waste'
  | 'Streetlighting & Electrical'
  | 'Water Supply & Drainage'
  | 'Parks & Public Amenities'
  | 'Traffic & Signage'
  | 'Other';

export interface CivicReport {
  id: string; // e.g. CC-2026-1042
  title: string;
  description: string;
  category: IssueCategory;
  priority: PriorityLevel;
  status: ReportStatus;
  address: string;
  latitude: number | null;
  longitude: number | null;
  ward: string;
  image_url: string;
  is_anonymous: boolean;
  submitter_name: string;
  submitter_contact: string;
  upvotes_count: number;
  potential_duplicate_of: string | null;
  duplicate_confidence: number | null;
  is_duplicate_flagged: boolean;
  issue_group_id: string | null;
  duplicate_status: 'unique' | 'possible_duplicate' | 'grouped' | string;
  admin_notes: string | null;
  assigned_department: string | null;
  assigned_officer: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  resolution_image_url: string | null;
  verified_count: number;
  disputed_count: number;
}

export interface IssueGroup {
  id: string; // e.g. ISSUE-0001
  issue_title: string;
  category: IssueCategory;
  location: string;
  latitude: number | null;
  longitude: number | null;
  total_reports: number;
  created_at: string;
  updated_at: string;
  reports?: CivicReport[];
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export interface StatusHistoryItem {
  id: number;
  report_id: string;
  from_status: ReportStatus | null;
  to_status: ReportStatus;
  action: string;
  actor_type: 'CITIZEN' | 'ADMIN' | 'SYSTEM' | 'FIELD_CREW' | 'USER';
  actor_name: string;
  notes: string;
  created_at: string;
}

export interface VerificationVote {
  id?: number;
  report_id: string;
  is_verified_fixed: boolean;
  comment: string;
  created_at?: string;
}

export interface DuplicateCheckResult {
  is_potential_duplicate: boolean;
  matched_report: CivicReport | null;
  confidence: number;
  reason: string;
}

export interface HotspotCluster {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  ward: string;
  category: IssueCategory;
  total_incidents: number;
  active_incidents: number;
  resolved_incidents: number;
  recurrence_rate: number; // percentage
  primary_root_cause: string;
  recommended_civic_action: string;
  incident_ids: string[];
}

export interface AnalyticsSummary {
  total_reports: number;
  unverified_count: number;
  in_progress_count: number;
  resolved_count: number;
  verified_closed_count: number;
  potential_duplicates_count: number;
  avg_resolution_hours: number;
  fix_verification_rate: number; // percentage of resolved that passed citizen verification
  category_breakdown: { category: string; count: number }[];
  priority_breakdown: { priority: string; count: number }[];
  ward_breakdown: { ward: string; count: number }[];
}
