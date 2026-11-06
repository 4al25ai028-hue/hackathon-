import React, { useState } from 'react';
import { X, Wrench, AlertTriangle, CheckCircle, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { CivicReport, ReportStatus } from '../types';

interface StatusUpdateModalProps {
  report: CivicReport | null;
  onClose: () => void;
  onSuccess: (updatedReport: CivicReport) => void;
}

const DEPARTMENTS = [
  'Roads & Infrastructure Division',
  'Sanitation & Solid Waste Management',
  'Electricity & Streetlighting Board',
  'Water Supply & Sewage Board',
  'Horticulture & Parks Department',
  'Traffic Engineering & Signage Cell',
  'Disaster Management Quick Response',
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  report,
  onClose,
  onSuccess,
}) => {
  if (!report) return null;

  const [status, setStatus] = useState<ReportStatus>(
    report.status === 'SUBMITTED_UNVERIFIED' ? 'UNDER_REVIEW' : report.status
  );
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const [resolutionImageUrl, setResolutionImageUrl] = useState(report.resolution_image_url || '');
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || '');
  const [department, setDepartment] = useState(report.assigned_department || DEPARTMENTS[0]);
  const [officerName, setOfficerName] = useState(report.assigned_officer || 'Officer V. Raman');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isResolving = status === 'RESOLVED_PENDING_VERIFICATION' || status === 'VERIFIED_CLOSED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // ENFORCE MANDATORY CONSTRAINT: "Never claim resolution without a recorded update."
    if (isResolving) {
      if (!resolutionNotes.trim() || resolutionNotes.trim().length < 10) {
        setErrorMsg(
          'Mandatory PS-14 Constraint: You cannot set status to Resolved without a recorded resolution update (minimum 10 characters detailing work carried out).'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolution_notes: isResolving ? resolutionNotes.trim() : null,
          resolution_image_url: resolutionImageUrl.trim() || null,
          admin_notes: adminNotes.trim() || null,
          assigned_department: department,
          assigned_officer: officerName,
          officer_name: officerName,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      onSuccess(data.report);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Official Status &amp; Resolution Dispatch
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Target Issue Reference */}
          <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 space-y-0.5">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-600">
              <span>{report.id}</span>
              <span className="font-semibold text-slate-800">{report.category}</span>
            </div>
            <div className="font-bold text-slate-900 text-xs line-clamp-1">{report.title}</div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Status Selector */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Transition Status To:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="UNDER_REVIEW">Under Review (Triage &amp; Inspection)</option>
              <option value="IN_PROGRESS">In Progress (Field Work Order Dispatched)</option>
              <option value="RESOLVED_PENDING_VERIFICATION">
                Resolved (Field Fix Completed - Awaiting Resident Verification)
              </option>
              <option value="VERIFIED_CLOSED">Verified Closed (Final Resolution Confirmed)</option>
              <option value="REJECTED_DUPLICATE">Rejected / Duplicate Issue</option>
            </select>
          </div>

          {/* Department & Officer Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Assigned Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Field Officer / Supervisor
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* MANDATORY RESOLUTION SECTION (Conditioned on Resolution Status) */}
          {isResolving && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                <span>Mandatory Recorded Resolution Update</span>
              </div>
              
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">
                  Field Action &amp; Resolution Notes <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Mandatory description of work completed (e.g., 'Cleared obstruction with hydro-jet, replaced 2m pipe segment, repaved with asphalt hot mix')"
                  className="w-full px-2.5 py-1.5 border border-emerald-300 rounded text-xs bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-800 italic">
                  Rule: System forbids resolution claims without verified field action notes.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-emerald-950 mb-1">
                  Resolution Proof Photo URL
                </label>
                <input
                  type="url"
                  value={resolutionImageUrl}
                  onChange={(e) => setResolutionImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-2.5 py-1.5 border border-emerald-300 rounded text-xs bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Administrative Internal Notes */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Internal Audit Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal operational logs, contractor reference numbers..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Audit...</span>
                </>
              ) : (
                <span>Commit Status Update</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
