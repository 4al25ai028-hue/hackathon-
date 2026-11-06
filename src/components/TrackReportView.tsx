import React, { useState } from 'react';
import { Search, MapPin, CheckCircle, Clock, AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { CivicReport } from '../types';

interface TrackReportViewProps {
  reports: CivicReport[];
  onSelectReport: (report: CivicReport) => void;
}

export const TrackReportView: React.FC<TrackReportViewProps> = ({
  reports,
  onSelectReport,
}) => {
  const [searchId, setSearchId] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unverified' | 'resolved'>('all');

  const filteredReports = reports.filter((rep) => {
    const matchesSearch =
      searchId.trim() === '' ||
      rep.id.toLowerCase().includes(searchId.trim().toLowerCase()) ||
      rep.title.toLowerCase().includes(searchId.trim().toLowerCase()) ||
      rep.address.toLowerCase().includes(searchId.trim().toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'unverified') return rep.status === 'SUBMITTED_UNVERIFIED';
    if (filterType === 'resolved') return rep.status === 'RESOLVED_PENDING_VERIFICATION' || rep.status === 'VERIFIED_CLOSED';

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">Track Civic Reports &amp; Resolution Status</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your Tracking ID (e.g., <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">CC-2026-1041</code>) or search by location to check field updates and community verification.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search by Tracking ID, street name, or issue title..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => setFilterType('unverified')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterType === 'unverified' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unverified
            </button>
            <button
              onClick={() => setFilterType('resolved')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterType === 'resolved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved &amp; Verified
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold">
          <span>Found {filteredReports.length} Matching Reports</span>
          <span className="text-slate-400 font-normal">Click any card to view resolution proof and cast verification vote</span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
            No reports found matching your search term. Try another Tracking ID or clear your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((rep) => {
              const isResolved = rep.status === 'RESOLVED_PENDING_VERIFICATION' || rep.status === 'VERIFIED_CLOSED';

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  className="bg-white border border-slate-200 hover:border-emerald-500/80 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {rep.id}
                    </span>
                    <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                      rep.status === 'SUBMITTED_UNVERIFIED' ? 'bg-amber-50 text-amber-800' :
                      rep.status === 'VERIFIED_CLOSED' ? 'bg-green-100 text-green-800' :
                      rep.status === 'RESOLVED_PENDING_VERIFICATION' ? 'bg-emerald-50 text-emerald-800' :
                      rep.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {rep.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{rep.title}</h3>
                    <p className="text-slate-500 line-clamp-2 mt-1 leading-relaxed">{rep.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {rep.address.split(',')[0]}
                    </span>
                    <span>{rep.upvotes_count} community upvotes</span>
                  </div>

                  {isResolved && (
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded text-[11px] font-medium flex items-center justify-between">
                      <span>✓ Recorded Resolution on file</span>
                      <span className="font-semibold text-emerald-900">Verify Fix →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
