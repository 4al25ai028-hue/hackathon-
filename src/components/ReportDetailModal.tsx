import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  ThumbsUp, 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Check, 
  Send, 
  ChevronRight,
  ExternalLink,
  Shield,
  FileText,
  User,
  ThumbsDown,
  Sparkles,
  Link2
} from 'lucide-react';
import { CivicReport, StatusHistoryItem, VerificationVote } from '../types';

interface ReportDetailModalProps {
  reportId: string | null;
  onClose: () => void;
  onSelectReportId: (id: string) => void;
  isAdmin: boolean;
  onOpenStatusUpdate?: (report: CivicReport) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  reportId,
  onClose,
  onSelectReportId,
  isAdmin,
  onOpenStatusUpdate,
}) => {
  const [report, setReport] = useState<CivicReport | null>(null);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [verifications, setVerifications] = useState<VerificationVote[]>([]);
  const [originalReport, setOriginalReport] = useState<CivicReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upvote state
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Subscribe state
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Fix verification voting
  const [verificationComment, setVerificationComment] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [userVoted, setUserVoted] = useState<boolean | null>(null);

  // GramVani AI Priority state
  const [aiPriorityData, setAiPriorityData] = useState<{
    priority_number: number;
    priority_level: string;
    label: string;
    description: string;
    source: string;
  } | null>(null);
  const [isCalculatingPriority, setIsCalculatingPriority] = useState(false);

  const fetchReportDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setAiPriorityData(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setReport(data.report);
      setHistory(data.history || []);
      setVerifications(data.verifications || []);
      setOriginalReport(data.original_report || null);
      setUpvotes(data.report.upvotes_count || 0);

      // Trigger GramVani AI Priority calculation
      fetchAiPriority(data.report);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiPriority = async (rep: CivicReport) => {
    setIsCalculatingPriority(true);
    try {
      const res = await fetch('/api/priority/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: rep.id,
          title: rep.title,
          description: rep.description,
          category: rep.category,
          location: rep.address,
          ward: rep.ward,
          people_affected: rep.upvotes_count || 10,
          submission_date: rep.created_at,
          status: rep.status,
        }),
      });
      const pData = await res.json();
      if (pData.success) {
        setAiPriorityData(pData);
      }
    } catch (err) {
      console.error('Failed to calculate GramVani AI priority:', err);
    } finally {
      setIsCalculatingPriority(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchReportDetails(reportId);
      setUserVoted(null);
      setVerificationComment('');
    }
  }, [reportId]);

  if (!reportId) return null;

  const handleUpvote = async () => {
    if (hasUpvoted || !report) return;
    try {
      const res = await fetch(`/api/reports/${report.id}/upvote`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUpvotes(data.upvotes_count);
        setHasUpvoted(true);
      }
    } catch {}
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail || !report) return;
    try {
      const res = await fetch(`/api/reports/${report.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSubscribed(true);
      }
    } catch {}
  };

  const handleVerificationVote = async (isFixed: boolean) => {
    if (!report) return;
    setIsSubmittingVote(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_verified_fixed: isFixed,
          comment: verificationComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUserVoted(isFixed);
        // Refresh details to show updated counts and status
        fetchReportDetails(report.id);
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting verification');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_UNVERIFIED':
        return { label: 'Unverified (Awaiting Review)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'UNDER_REVIEW':
        return { label: 'Under Review & Triage', color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'IN_PROGRESS':
        return { label: 'Field Work in Progress', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'RESOLVED_PENDING_VERIFICATION':
        return { label: 'Resolved (Pending Citizen Verification)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
      case 'VERIFIED_CLOSED':
        return { label: 'Citizen Verified & Closed', color: 'text-green-800 bg-green-100 border-green-300' };
      case 'REJECTED_DUPLICATE':
        return { label: 'Merged with Original Issue', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      default:
        return { label: status, color: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {report?.id || reportId}
            </span>
            {report && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(report.status).color}`}>
                {getStatusBadge(report.status).label}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && report && onOpenStatusUpdate && (
              <button
                onClick={() => onOpenStatusUpdate(report)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-xs"
              >
                Update Status (Officer)
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Loading issue audit trail &amp; resolution records...
          </div>
        ) : error || !report ? (
          <div className="p-8 text-center text-red-600 text-xs">
            {error || 'Unable to retrieve report.'}
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
            
            {/* Main Title & Metadata */}
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-snug">
                {report.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-2">
                <span className="font-semibold text-slate-700">{report.category}</span>
                <span>·</span>
                <span>Priority: <strong className="text-slate-800">{report.priority}</strong></span>
                <span>·</span>
                <span>{report.ward}</span>
                <span>·</span>
                <span>Logged {new Date(report.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* GramVani AI Priority Banner */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="font-semibold text-xs text-emerald-300">
                    GramVani AI Complaint Priority Rating
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    gemini-3.1-flash-lite
                  </span>
                </div>

                {aiPriorityData ? (
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Priority Score: {aiPriorityData.priority_number} / 5
                  </span>
                ) : isCalculatingPriority ? (
                  <span className="text-[11px] text-slate-400 font-mono animate-pulse">
                    Evaluating risks...
                  </span>
                ) : (
                  <button
                    onClick={() => fetchAiPriority(report)}
                    className="text-[11px] text-emerald-400 underline font-medium hover:text-emerald-300"
                  >
                    Run AI Priority Check
                  </button>
                )}
              </div>

              {aiPriorityData && (
                <div className="text-[11px] text-slate-300 space-y-1 border-t border-slate-800 pt-2">
                  <div className="font-semibold text-white">
                    {aiPriorityData.label}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {aiPriorityData.description}
                  </p>
                </div>
              )}
            </div>

            {/* Potential Duplicate Banner */}
            {report.is_duplicate_flagged && report.potential_duplicate_of && (
              <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-purple-900 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-purple-700" />
                    Flagged as Potential Duplicate of {report.potential_duplicate_of}
                  </span>
                  {report.duplicate_confidence && (
                    <span className="text-[11px] bg-purple-100 text-purple-800 font-mono px-2 py-0.5 rounded">
                      {Math.round(report.duplicate_confidence * 100)}% match
                    </span>
                  )}
                </div>
                <p className="text-purple-800 text-[11px]">
                  Under PS-14 compliance rules, this report has been preserved for municipal officer evaluation rather than auto-deleted.
                </p>
                {originalReport && (
                  <button
                    onClick={() => onSelectReportId(originalReport.id)}
                    className="text-xs text-purple-900 font-semibold hover:underline flex items-center gap-1 pt-1"
                  >
                    View Original Report: {originalReport.title} ({originalReport.id}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Issue Description & Image */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1 text-[11px] uppercase tracking-wide">
                    Citizen Description
                  </h3>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {report.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{report.address}</span>
                  {report.latitude && report.longitude && (
                    <span className="font-mono text-[10px] text-slate-400">
                      ({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>Submitter: <strong>{report.is_anonymous ? 'Anonymous Resident' : report.submitter_name}</strong></span>
                  <span>·</span>
                  <span>Contact: {report.submitter_contact}</span>
                </div>
              </div>

              {/* Photo Evidence */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-1 text-[11px] uppercase tracking-wide">
                  Initial Photo
                </h3>
                {report.image_url ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                    <img
                      src={report.image_url}
                      alt="Citizen report photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-400 text-[11px]">
                    No photo uploaded
                  </div>
                )}
              </div>
            </div>

            {/* Upvote & Community Engagement Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpvote}
                  disabled={hasUpvoted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                    hasUpvoted
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{hasUpvoted ? 'Upvoted' : 'I am also affected'} ({upvotes})</span>
                </button>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Higher community upvotes escalate priority during ward dispatch
                </span>
              </div>

              {/* Subscribe Form */}
              <form onSubmit={handleSubscribe} className="flex items-center gap-1.5">
                {isSubscribed ? (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Subscribed for updates
                  </span>
                ) : (
                  <>
                    <input
                      type="email"
                      required
                      placeholder="Email for SMS/alerts"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white w-44"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-white rounded hover:bg-slate-900"
                    >
                      Notify Me
                    </button>
                  </>
                )}
              </form>
            </div>

            {/* MANDATORY PS-14 SECTION: Official Resolution Details & Verification */}
            {(report.status === 'RESOLVED_PENDING_VERIFICATION' || report.status === 'VERIFIED_CLOSED' || report.resolution_notes) && (
              <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Recorded Municipal Resolution
                      </h3>
                      <p className="text-[11px] text-emerald-800">
                        {report.status === 'VERIFIED_CLOSED'
                          ? 'Fix confirmed by local community residents.'
                          : 'Awaiting local resident verification.'}
                      </p>
                    </div>
                  </div>
                  {report.resolved_at && (
                    <span className="text-[11px] text-slate-600 font-mono">
                      Resolved: {new Date(report.resolved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
                      Official Field Crew Update
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-emerald-200 text-slate-800 leading-relaxed font-sans">
                      {report.resolution_notes || 'Field team completed repairs.'}
                    </div>
                    {report.assigned_department && (
                      <div className="text-[11px] text-slate-600">
                        Department: <strong>{report.assigned_department}</strong> · Officer: {report.assigned_officer || 'Duty Supervisor'}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide mb-1">
                      Resolution Proof Photo
                    </div>
                    {report.resolution_image_url ? (
                      <div className="rounded-lg overflow-hidden border border-emerald-200 aspect-video bg-white">
                        <img
                          src={report.resolution_image_url}
                          alt="Resolution evidence"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-white/60 rounded-lg text-slate-400 text-center text-[11px] border border-emerald-100">
                        Verified by physical on-site telemetry
                      </div>
                    )}
                  </div>
                </div>

                {/* CITIZEN FIX VERIFICATION VOTING WORKFLOW */}
                <div className="border-t border-emerald-200/80 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        Resident Fix Verification Audit
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Have you visited this location? Confirm whether the issue is resolved or still persists.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="text-emerald-700">✓ {report.verified_count} Confirmed</span>
                      <span className="text-red-600">✗ {report.disputed_count} Disputed</span>
                    </div>
                  </div>

                  {userVoted !== null ? (
                    <div className="p-3 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-medium text-xs">
                      {userVoted
                        ? '✓ Thank you! Your verification has been recorded in the public ledger.'
                        : '⚠️ Your report that the issue persists has been logged for supervisor re-inspection.'}
                    </div>
                  ) : (
                    <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-200">
                      <input
                        type="text"
                        placeholder="Optional comment (e.g., 'Inspected today, road is smooth now' or 'Pothole filled but gravel is loose')"
                        value={verificationComment}
                        onChange={(e) => setVerificationComment(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs mb-2"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerificationVote(true)}
                          disabled={isSubmittingVote}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Fix Confirmed (Problem Resolved)</span>
                        </button>
                        <button
                          onClick={() => handleVerificationVote(false)}
                          disabled={isSubmittingVote}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold text-xs flex items-center gap-1.5"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Issue Still Persists</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Transparent Audit Timeline */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Transparent Resolution History &amp; Audit Trail
              </h3>

              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
                {history.length === 0 ? (
                  <p className="text-slate-400 text-xs">No status updates logged yet.</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-200" />

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 text-xs">
                            {item.action}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Actor: <strong className="text-slate-700">{item.actor_name}</strong> ({item.actor_type})
                        </div>
                        {item.notes && (
                          <p className="text-slate-700 text-xs mt-1 bg-white p-2 rounded border border-slate-200/80">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Public Verifications Feed */}
            {verifications.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  Recent Citizen Verification Comments ({verifications.length})
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {verifications.map((v) => (
                    <div key={v.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-start justify-between text-xs">
                      <div>
                        <span className={`font-semibold mr-2 ${v.is_verified_fixed ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {v.is_verified_fixed ? '✓ Verified' : '✗ Disputed'}
                        </span>
                        <span className="text-slate-700">{v.comment || 'Verified without comment'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
