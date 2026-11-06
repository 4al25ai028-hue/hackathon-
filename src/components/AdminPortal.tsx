import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Copy, 
  ArrowRight, 
  UserCheck, 
  Search, 
  Filter, 
  ExternalLink,
  Lock,
  Layers,
  Wrench,
  Camera,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Sparkles,
  MapPin,
  Trash2,
  Database
} from 'lucide-react';
import { CivicReport, ReportStatus, IssueGroup } from '../types';

interface AdminPortalProps {
  reports: CivicReport[];
  onSelectReport: (report: CivicReport) => void;
  onRefreshReports: () => void;
  onOpenStatusModal: (report: CivicReport) => void;
  isAdminLoggedIn: boolean;
  onLogin: (pin: string) => Promise<boolean>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  reports,
  onSelectReport,
  onRefreshReports,
  onOpenStatusModal,
  isAdminLoggedIn,
  onLogin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tabs inside admin: Default to 'groups' for Grouped Community Issue Dashboard
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'queue' | 'duplicates' | 'all'>('groups');
  const [searchQuery, setSearchQuery] = useState('');

  // Issue Groups State
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Database Connection Status
  const [dbStatus, setDbStatus] = useState<{
    is_connected: boolean;
    provider: string;
    url: string;
    configured: boolean;
    message: string;
  } | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch DB status:', err);
    }
  };

  const fetchIssueGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const res = await fetch('/api/issue-groups');
      const data = await res.json();
      if (data.success) {
        setIssueGroups(data.issue_groups || []);
        // Auto-expand all groups by default
        const initExpand: Record<string, boolean> = {};
        (data.issue_groups || []).forEach((g: IssueGroup) => {
          initExpand[g.id] = true;
        });
        setExpandedGroups(initExpand);
      }
    } catch (err) {
      console.error('Failed to fetch issue groups:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchIssueGroups();
      fetchDatabaseStatus();
    }
  }, [isAdminLoggedIn, reports]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleUngroupReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/admin/issue-groups/ungroup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchIssueGroups();
        onRefreshReports();
      }
    } catch (err) {
      console.error('Ungroup error:', err);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Are you sure you want to remove all local database records? This will clear all submitted complaints and issue groups.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/clear-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchIssueGroups();
        onRefreshReports();
      }
    } catch (err) {
      console.error('Clear database error:', err);
    }
  };

  const handleSeedDatabase = async () => {
    try {
      const res = await fetch('/api/admin/seed-database', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchIssueGroups();
        onRefreshReports();
      }
    } catch (err) {
      console.error('Seed database error:', err);
    }
  };

  // Duplicate comparator state
  const [selectedDuplicate, setSelectedDuplicate] = useState<CivicReport | null>(null);
  const [isProcessingDuplicate, setIsProcessingDuplicate] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    const success = await onLogin(pinInput);
    setIsLoggingIn(false);
    if (!success) {
      setLoginError('Invalid Administrator PIN. (Default demo PIN: civic2026)');
    }
  };

  const handleDuplicateAction = async (reportId: string, action: 'MERGE_AND_CLOSE' | 'CONFIRM_DISTINCT', originalId?: string) => {
    setIsProcessingDuplicate(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/duplicate-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          target_original_id: originalId,
          officer_notes: action === 'MERGE_AND_CLOSE'
            ? `Admin verified duplicate of ${originalId}. Consolidated citations.`
            : 'Admin physically verified this is a distinct issue requiring independent fix.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDuplicate(null);
        onRefreshReports();
      }
    } catch (err: any) {
      alert(err.message || 'Error processing duplicate');
    } finally {
      setIsProcessingDuplicate(false);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white mx-auto flex items-center justify-center">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Civic Officer Authorization</h2>
          <p className="text-slate-500">
            Authorized municipal officers only. Access triage desk, duplicate management, and resolution updates.
          </p>
        </div>

        {loginError && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {loginError}
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Officer Security PIN
            </label>
            <input
              type="password"
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN (e.g. civic2026)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Demo PIN: <strong className="text-slate-600">civic2026</strong></p>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors shadow-xs"
          >
            {isLoggingIn ? 'Authenticating...' : 'Sign In to Officer Portal'}
          </button>
        </form>
      </div>
    );
  }

  // Filter queues
  const unverifiedList = reports.filter(r => r.status === 'SUBMITTED_UNVERIFIED');
  const duplicateList = reports.filter(r => r.is_duplicate_flagged && r.status !== 'REJECTED_DUPLICATE');
  const activeReviewList = reports.filter(r => r.status === 'UNDER_REVIEW' || r.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      
      {/* Officer Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold">Civic Operations Management Desk</h1>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
              SUPER_ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforcing PS-14 compliance: Unverified triage, side-by-side duplicate review, and verified resolution updates.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 border ${
                dbStatus?.is_connected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus?.is_connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {dbStatus?.is_connected
                ? `Supabase: Connected (${dbStatus.url})`
                : 'Supabase: Ready for URL & Anon Key (Running on SQLite Fallback)'}
            </span>

            <button
              onClick={() => setShowSchemaModal(true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Supabase Setup &amp; SQL Schema</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'groups' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-300" />
            <span>Grouped Issues ({issueGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeSubTab === 'queue' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Unverified Queue ({unverifiedList.length})
          </button>

          <button
            onClick={() => setActiveSubTab('duplicates')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeSubTab === 'duplicates' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Duplicate Reviews ({duplicateList.length})
          </button>

          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeSubTab === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Active Work Orders ({activeReviewList.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 0: GROUPED COMMUNITY ISSUES (GramVani Duplicate System) */}
      {activeSubTab === 'groups' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  GramVani AI Grouped Community Issues Dashboard
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
                  gemini-3.1-flash-lite
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically consolidates multiple citizen reports describing the same underlying community problem into unified issue cards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearDatabase}
                className="px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Remove all local database records"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Clear Database</span>
              </button>
              <button
                onClick={handleSeedDatabase}
                className="px-3 py-1.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Load sample complaints into local database"
              >
                <Database className="w-3.5 h-3.5 text-slate-600" />
                <span>Load Sample Data</span>
              </button>
              <button
                onClick={fetchIssueGroups}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoadingGroups ? (
            <div className="py-12 text-center text-slate-400 text-xs font-mono">
              Loading grouped community issues from database...
            </div>
          ) : issueGroups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No grouped issues found in database.
            </div>
          ) : (
            <div className="space-y-4">
              {issueGroups.map((group) => {
                const isExpanded = Boolean(expandedGroups[group.id]);
                const reportCount = group.reports?.length || group.total_reports || 1;

                return (
                  <div
                    key={group.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* ISSUE CARD HEADER */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded font-mono">
                            {group.id}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                            COMMUNITY ISSUE: {group.category.toUpperCase()}
                          </span>
                          {reportCount > 1 && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Users className="w-3 h-3 text-purple-700" />
                              {reportCount} Citizens Consolidated
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug pt-0.5">
                          {group.issue_title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <strong>Location:</strong> {group.location}
                          </span>
                          <span>·</span>
                          <span>
                            <strong>Total Reports:</strong> <strong className="text-emerald-700 font-bold">{reportCount}</strong>
                          </span>
                          <span>·</span>
                          <span className="text-slate-400">
                            Updated {new Date(group.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleGroupExpand(group.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
                      >
                        <span>{isExpanded ? 'Collapse Details' : `View ${reportCount} Reports`}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* EXPANDABLE INDIVIDUAL CITIZEN COMPLAINT REPORTS */}
                    {isExpanded && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-700" />
                            <span>COMPLAINT REPORTS ({reportCount})</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 italic">
                            All original titles, descriptions, and timestamps preserved
                          </span>
                        </div>

                        <div className="space-y-3">
                          {group.reports && group.reports.length > 0 ? (
                            group.reports.map((rep, idx) => (
                              <div
                                key={rep.id}
                                className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-xs shadow-2xs hover:border-slate-300"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                      Report {idx + 1}: {rep.id}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                      Status: {rep.status}
                                    </span>
                                    {rep.duplicate_status && (
                                      <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                                        {rep.duplicate_status}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onSelectReport(rep)}
                                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs underline flex items-center gap-1"
                                    >
                                      Full Details <ExternalLink className="w-3 h-3" />
                                    </button>
                                    {group.reports && group.reports.length > 1 && (
                                      <button
                                        onClick={() => handleUngroupReport(rep.id)}
                                        className="text-red-700 hover:text-red-800 text-[11px] font-medium border border-red-200 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100"
                                        title="Separate this report into a standalone issue card"
                                      >
                                        Separate Report
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="font-semibold text-slate-800 mb-0.5">
                                    "{rep.title}"
                                  </div>
                                  <p className="text-slate-700 leading-relaxed bg-slate-50/70 p-2.5 rounded border border-slate-200/80">
                                    {rep.description}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                  <span>
                                    Submitter: <strong>{rep.is_anonymous ? 'Anonymous Resident' : rep.submitter_name}</strong> ({rep.submitter_contact})
                                  </span>
                                  <span>Submitted: {new Date(rep.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-400 text-xs italic">No individual report records linked.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: UNVERIFIED TRIAGE QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Unverified Submissions Awaiting Staff Triage</h2>
              <p className="text-xs text-slate-500">
                Rule: All reports remain strictly unverified until validated by civic staff.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
              {unverifiedList.length} Pending
            </span>
          </div>

          {unverifiedList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
              No pending unverified reports. All submissions have been triaged!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unverifiedList.map((rep) => (
                <div key={rep.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{rep.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-700">{rep.category}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{rep.ward}</span>
                      {rep.is_duplicate_flagged && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                          Duplicate Flag
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">{rep.title}</div>
                    <p className="text-slate-500 line-clamp-1">{rep.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectReport(rep)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => onOpenStatusModal(rep)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Triage &amp; Assign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DUPLICATE REVIEW WORKBENCH */}
      {activeSubTab === 'duplicates' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-4 h-4 text-purple-600" />
              Duplicate Review &amp; Side-by-Side Resolution Workbench
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict PS-14 Constraint: Duplicates are flagged for officer review instead of being automatically discarded. Compare and merge or confirm unique.
            </p>
          </div>

          {duplicateList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
              No potential duplicate reports pending review.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* List of Flagged Duplicates */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                  Flagged Reports Queue ({duplicateList.length})
                </h3>
                <div className="space-y-2">
                  {duplicateList.map((dup) => {
                    const original = reports.find(r => r.id === dup.potential_duplicate_of);
                    const isSelected = selectedDuplicate?.id === dup.id;

                    return (
                      <div
                        key={dup.id}
                        onClick={() => setSelectedDuplicate(dup)}
                        className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/50 shadow-xs ring-1 ring-purple-400'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-slate-900">{dup.id}</span>
                          <span className="font-mono text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            {Math.round((dup.duplicate_confidence || 0) * 100)}% Similarity
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 mb-1">{dup.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-purple-600" />
                          <span>Flagged match: <strong className="text-slate-700">{dup.potential_duplicate_of}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Inspector */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                {selectedDuplicate ? (
                  (() => {
                    const original = reports.find(r => r.id === selectedDuplicate.potential_duplicate_of);

                    return (
                      <div className="space-y-4 text-xs">
                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                          <span>Side-by-Side Evaluation</span>
                          <span className="font-mono text-purple-700 text-[11px]">
                            Confidence: {Math.round((selectedDuplicate.duplicate_confidence || 0) * 100)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Left: Original Report */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                            <span className="font-bold text-slate-500 text-[10px] uppercase">Original Parent Issue</span>
                            <div className="font-mono font-bold text-slate-900">{original?.id || selectedDuplicate.potential_duplicate_of}</div>
                            <div className="font-semibold text-slate-800 line-clamp-2">{original?.title || 'Original record not loaded'}</div>
                            <p className="text-[11px] text-slate-600 line-clamp-3">{original?.description}</p>
                            <div className="text-[10px] text-slate-400 pt-1">
                              Upvotes: {original?.upvotes_count || 0} · Status: {original?.status}
                            </div>
                          </div>

                          {/* Right: Candidate Duplicate */}
                          <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 space-y-1.5">
                            <span className="font-bold text-purple-800 text-[10px] uppercase">Candidate Duplicate</span>
                            <div className="font-mono font-bold text-slate-900">{selectedDuplicate.id}</div>
                            <div className="font-semibold text-slate-800 line-clamp-2">{selectedDuplicate.title}</div>
                            <p className="text-[11px] text-slate-600 line-clamp-3">{selectedDuplicate.description}</p>
                            <div className="text-[10px] text-purple-700 pt-1">
                              Upvotes: {selectedDuplicate.upvotes_count} · Submitter: {selectedDuplicate.submitter_name}
                            </div>
                          </div>
                        </div>

                        {/* Officer Actions */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            Select Officer Determination:
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDuplicateAction(selectedDuplicate.id, 'MERGE_AND_CLOSE', selectedDuplicate.potential_duplicate_of || undefined)}
                              disabled={isProcessingDuplicate}
                              className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm Duplicate &amp; Merge Upvotes</span>
                            </button>
                            <button
                              onClick={() => handleDuplicateAction(selectedDuplicate.id, 'CONFIRM_DISTINCT')}
                              disabled={isProcessingDuplicate}
                              className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Declare Independent Distinct Issue</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Select a flagged duplicate from the left column to run side-by-side comparison.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ALL ACTIVE WORK ORDERS */}
      {activeSubTab === 'all' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active Field Work Orders</h2>
              <p className="text-xs text-slate-500">
                Update progress, assign crews, and file official recorded resolutions with photo evidence.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {activeReviewList.map((rep) => (
              <div key={rep.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{rep.id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      {rep.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{rep.assigned_department || 'Unassigned'}</span>
                  </div>
                  <div className="font-bold text-slate-900">{rep.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Location: {rep.address} · Priority: {rep.priority}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectReport(rep)}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onOpenStatusModal(rep)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Record Resolution / Update</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUPABASE SETUP & SQL SCHEMA MODAL */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Supabase Cloud Database Integration</h3>
                  <p className="text-xs text-slate-500">
                    Connect your own Supabase project using SUPABASE_URL and SUPABASE_ANON_KEY.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  dbStatus?.is_connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dbStatus?.is_connected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {dbStatus?.is_connected
                        ? 'Supabase Backend Connected'
                        : 'Running on Local Fallback (Supabase URL & Anon Key Needed)'}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">{dbStatus?.message}</div>
                </div>
                <button
                  onClick={fetchDatabaseStatus}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-md shadow-xs hover:bg-slate-50 shrink-0"
                >
                  Refresh Status
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 text-xs">Quick Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Create a free project at{' '}
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 underline font-medium"
                    >
                      supabase.com
                    </a>{' '}
                    or open your existing dashboard.
                  </li>
                  <li>
                    In your Supabase project, go to <strong>SQL Editor</strong> &gt; <strong>New query</strong>.
                  </li>
                  <li>
                    Copy the SQL schema below, paste it into the editor, and click <strong>Run</strong>.
                  </li>
                  <li>
                    Go to <strong>Project Settings</strong> &gt; <strong>API</strong> to copy your <strong>Project URL</strong> and <strong>anon public key</strong>.
                  </li>
                  <li>
                    Open your project's <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">.env</code> file and add:
                    <pre className="mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
{`SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`}
                    </pre>
                  </li>
                </ol>
              </div>

              {/* SQL Schema View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    PostgreSQL Migration Script (<code className="font-mono text-[11px]">supabase_schema.sql</code>)
                  </div>
                  <button
                    onClick={() => {
                      const schemaSql = `-- ==============================================================================
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

-- Indexes for high-performance geospatial queries & duplicate lookups
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_group_id ON public.reports(issue_group_id);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON public.reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON public.status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_verifications_report_id ON public.verifications(report_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.issue_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
                      navigator.clipboard.writeText(schemaSql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Complete SQL Schema</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                  <span className="text-emerald-400">-- Supabase SQL Schema for CivicConnect / GramVani</span>
                  <br />
                  CREATE TABLE IF NOT EXISTS public.issue_groups (
                  <br />
                  &nbsp;&nbsp;id TEXT PRIMARY KEY,
                  <br />
                  &nbsp;&nbsp;issue_title TEXT NOT NULL,
                  <br />
                  &nbsp;&nbsp;category TEXT NOT NULL,
                  <br />
                  &nbsp;&nbsp;location TEXT,
                  <br />
                  &nbsp;&nbsp;latitude DOUBLE PRECISION,
                  <br />
                  &nbsp;&nbsp;longitude DOUBLE PRECISION,
                  <br />
                  &nbsp;&nbsp;total_reports INTEGER DEFAULT 1,
                  <br />
                  &nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT NOW()
                  <br />
                  );
                  <br />
                  <br />
                  <span className="text-emerald-400">-- Plus reports, status_history, verifications, subscribers, indexes &amp; RLS policies...</span>
                  <br />
                  <span className="text-slate-400">/* Click the "Copy Complete SQL Schema" button above to get the full copy-paste ready script */</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
              <button
                onClick={() => setShowSchemaModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
