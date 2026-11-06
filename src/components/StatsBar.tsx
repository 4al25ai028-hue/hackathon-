import React from 'react';
import { AnalyticsSummary } from '../types';
import { Clock, CheckCircle2, AlertOctagon, Copy, Activity, ShieldAlert } from 'lucide-react';

interface StatsBarProps {
  analytics: AnalyticsSummary | null;
  onFilterClick?: (status: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ analytics, onFilterClick }) => {
  if (!analytics) return null;

  return (
    <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto text-xs">
        
        {/* Total Issues Logged */}
        <div 
          onClick={() => onFilterClick && onFilterClick('All')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-max"
        >
          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-700">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">Total Registered</div>
            <div className="font-bold text-sm text-slate-900 font-mono">{analytics.total_reports}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Unverified Submissions */}
        <div 
          onClick={() => onFilterClick && onFilterClick('SUBMITTED_UNVERIFIED')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-max"
        >
          <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-700">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">Unverified Submissions</div>
            <div className="font-bold text-sm text-amber-700 font-mono">{analytics.unverified_count}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* In Progress */}
        <div 
          onClick={() => onFilterClick && onFilterClick('IN_PROGRESS')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-max"
        >
          <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-700">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">In Field Progress</div>
            <div className="font-bold text-sm text-blue-700 font-mono">{analytics.in_progress_count}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Resolved & Verified Closed */}
        <div 
          onClick={() => onFilterClick && onFilterClick('VERIFIED_CLOSED')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-max"
        >
          <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">Citizen Verified Closed</div>
            <div className="font-bold text-sm text-emerald-700 font-mono">{analytics.verified_closed_count}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

        {/* Potential Duplicate Warnings */}
        <div 
          onClick={() => onFilterClick && onFilterClick('DUPLICATES')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-max"
        >
          <div className="w-7 h-7 rounded bg-purple-50 flex items-center justify-center text-purple-700">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">Duplicate Flags (Review)</div>
            <div className="font-bold text-sm text-purple-700 font-mono">{analytics.potential_duplicates_count}</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden xl:block" />

        {/* Citizen Verification Rate */}
        <div className="flex items-center gap-2.5 min-w-max">
          <div className="w-7 h-7 rounded bg-emerald-100/50 flex items-center justify-center text-emerald-800">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-medium">Fix Verification Rate</div>
            <div className="font-bold text-sm text-emerald-800 font-mono">{analytics.fix_verification_rate}%</div>
          </div>
        </div>

      </div>
    </div>
  );
};
