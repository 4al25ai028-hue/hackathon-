import React from 'react';
import { 
  X, 
  PlusCircle, 
  Search, 
  ShieldCheck, 
  Flame, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle,
  ThumbsUp,
  MapPin,
  Sparkles
} from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'map' | 'submit' | 'track' | 'hotspots' | 'admin') => void;
  onSelectSampleReport: (id: string) => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectSampleReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8 text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">How to Use CivicConnect (PS-14)</h2>
              <p className="text-[11px] text-slate-500">
                Step-by-step guide for citizens and municipal administrators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Demo Credentials */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-900 text-xs">Officer Demo Security PIN:</span>
              <code className="ml-2 font-mono font-bold bg-white px-2 py-0.5 rounded text-emerald-800 border border-emerald-300">
                civic2026
              </code>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateTab('admin');
              }}
              className="px-3 py-1 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 transition-colors text-[11px]"
            >
              Open Officer Portal →
            </button>
          </div>

          {/* Section 1: For Citizens (Residents) */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs flex items-center gap-1.5 text-emerald-800">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              Resident &amp; Citizen Features
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              
              {/* Feature 1A */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Report an Issue</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Click <strong>"Report Issue"</strong> in the top header. As you type, the NLP engine auto-detects category &amp; priority. Anonymity toggle masks your name for privacy.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab('submit');
                  }}
                  className="text-emerald-700 font-bold hover:underline text-[11px] pt-1 block"
                >
                  Try Reporting a Problem →
                </button>
              </div>

              {/* Feature 1B */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>Track by ID &amp; Upvote</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Search any Tracking ID (e.g., <code className="font-mono text-slate-800">CC-2026-1041</code>). View the step-by-step progress timeline or click <strong>"I am also affected"</strong> to upvote.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab('track');
                  }}
                  className="text-blue-700 font-bold hover:underline text-[11px] pt-1 block"
                >
                  Search Reports →
                </button>
              </div>

              {/* Feature 1C */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verify a Resolution</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When field crews mark a problem resolved, residents inspect the fix and vote <strong>"Fix Confirmed 👍"</strong> or <strong>"Issue Still Persists 👎"</strong>.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onSelectSampleReport('CC-2026-0752');
                  }}
                  className="text-emerald-700 font-bold hover:underline text-[11px] pt-1 block"
                >
                  Inspect Sample Fix (Park Swing) →
                </button>
              </div>

              {/* Feature 1D */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Recurring Hotspots</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Switch to <strong>"Recurring Hotspots"</strong> to see repeated problem clusters (e.g. Market Road junction) and root-cause civil engineering recommendations.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab('hotspots');
                  }}
                  className="text-amber-700 font-bold hover:underline text-[11px] pt-1 block"
                >
                  View Hotspots Map →
                </button>
              </div>

            </div>
          </div>

          {/* Section 2: For Municipal Officers */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs flex items-center gap-1.5 text-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                2
              </span>
              Civic Officer Administrator Workflow
            </h3>

            <div className="space-y-2.5">
              
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-slate-200 text-slate-800 flex items-center justify-center font-bold shrink-0 text-xs">
                  A
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Sign in to Officer Portal</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click <strong>"Civic Officer Login"</strong> on the top right. Enter PIN <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-300">civic2026</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-slate-200 text-slate-800 flex items-center justify-center font-bold shrink-0 text-xs">
                  B
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Triage Unverified Submissions</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Submissions are strictly unverified until reviewed. Select any pending report, inspect photos, assign department, and upgrade status to <em>Under Review</em> or <em>In Progress</em>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-purple-200 text-purple-900 flex items-center justify-center font-bold shrink-0 text-xs">
                  C
                </div>
                <div>
                  <div className="font-semibold text-purple-950">Review Potential Duplicates Side-by-Side</div>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    In the <strong>Duplicate Reviews</strong> tab, compare candidate duplicates with the original issue. Choose <strong>"Confirm Duplicate &amp; Merge Upvotes"</strong> or <strong>"Declare Independent Distinct Issue"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-emerald-200 text-emerald-950 flex items-center justify-center font-bold shrink-0 text-xs">
                  D
                </div>
                <div>
                  <div className="font-semibold text-emerald-950">Record Mandatory Resolution Updates</div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    When marking an issue Resolved, the platform enforces mandatory field notes (minimum 10 characters) and proof photo upload before status can be updated.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Compliant with Municipal Problem Statement PS-14
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Got it, Let's Explore
          </button>
        </div>

      </div>
    </div>
  );
};
