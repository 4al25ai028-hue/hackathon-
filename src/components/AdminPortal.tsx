import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { CivicReport, ReportStatus } from '../types';

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

  // Tabs inside admin
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'duplicates' | 'all'>('queue');
  const [searchQuery, setSearchQuery] = useState('');

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
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold">Civic Operations Management Desk</h1>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
              SUPER_ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforcing PS-14 compliance: Unverified triage, side-by-side duplicate review, and verified resolution updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

    </div>
  );
};
