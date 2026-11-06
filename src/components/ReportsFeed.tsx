import React, { useState } from 'react';
import { 
  Filter, 
  MapPin, 
  ThumbsUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  Search,
  Copy,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { CivicReport, IssueCategory, ReportStatus } from '../types';
import { MapView } from './MapView';

interface ReportsFeedProps {
  reports: CivicReport[];
  selectedReport: CivicReport | null;
  onSelectReport: (report: CivicReport) => void;
  onOpenSubmitModal: () => void;
  filterStatus?: string;
}

const CATEGORIES = [
  'All',
  'Roads & Potholes',
  'Sanitation & Waste',
  'Streetlighting & Electrical',
  'Water Supply & Drainage',
  'Parks & Public Amenities',
  'Traffic & Signage',
];

const STATUSES = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Unverified (Review)', value: 'SUBMITTED_UNVERIFIED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved (Pending Verification)', value: 'RESOLVED_PENDING_VERIFICATION' },
  { label: 'Verified & Closed', value: 'VERIFIED_CLOSED' },
];

export const ReportsFeed: React.FC<ReportsFeedProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  onOpenSubmitModal,
  filterStatus: initialStatusFilter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState(initialStatusFilter || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  const filteredReports = reports.filter((report) => {
    if (selectedCategory !== 'All' && report.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && report.status !== selectedStatus) return false;
    if (showDuplicatesOnly && !report.is_duplicate_flagged) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        report.id.toLowerCase().includes(q) ||
        report.title.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.address.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Filter & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or tracking ID..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 w-full sm:w-auto"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 w-full sm:w-auto"
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Duplicate filter toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDuplicatesOnly}
              onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Duplicates Flagged ({reports.filter(r => r.is_duplicate_flagged).length})</span>
          </label>

          {/* View mode buttons */}
          <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded font-medium ${viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded font-medium ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Full Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded font-medium ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Feed
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area (Split Grid) */}
      <div className={`grid gap-5 ${
        viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : viewMode === 'map' ? 'grid-cols-1' : 'grid-cols-1'
      }`}>
        
        {/* Map View Column */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-7 h-[600px]' : 'h-[680px]'}`}>
            <MapView
              reports={filteredReports}
              selectedReport={selectedReport}
              onSelectReport={onSelectReport}
            />
          </div>
        )}

        {/* Reports List Column */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-5 h-[600px]' : 'h-auto'} flex flex-col space-y-3 overflow-y-auto pr-1`}>
            
            <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold sticky top-0 bg-slate-50 py-1 z-10">
              <span>Showing {filteredReports.length} Reports</span>
              <button
                onClick={onOpenSubmitModal}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </button>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                No civic issues match your current filters.
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelected = selectedReport?.id === report.id;
                const isResolved = report.status === 'RESOLVED_PENDING_VERIFICATION' || report.status === 'VERIFIED_CLOSED';

                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className={`bg-white rounded-xl p-4 border text-xs cursor-pointer transition-all hover:border-slate-400 ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: ID, Category, Status */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {report.id}
                        </span>
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {report.category}
                        </span>
                      </div>
                      
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        report.status === 'SUBMITTED_UNVERIFIED' ? 'bg-amber-50 text-amber-800' :
                        report.status === 'VERIFIED_CLOSED' ? 'bg-green-100 text-green-800' :
                        report.status === 'RESOLVED_PENDING_VERIFICATION' ? 'bg-emerald-50 text-emerald-800' :
                        report.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {report.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Duplicate Flag Alert */}
                    {report.is_duplicate_flagged && (
                      <div className="mb-2 p-1.5 bg-purple-50 text-purple-800 rounded border border-purple-200 text-[10px] flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold">
                          <Copy className="w-3 h-3 text-purple-600" />
                          Potential Duplicate (Review Pending)
                        </span>
                        {report.duplicate_confidence && (
                          <span className="font-mono">{Math.round(report.duplicate_confidence * 100)}% match</span>
                        )}
                      </div>
                    )}

                    {/* Title & Description */}
                    <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                      {report.title}
                    </h3>
                    <p className="text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {report.description}
                    </p>

                    {/* Address & Meta */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 text-slate-600 truncate max-w-[220px]">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{report.address}</span>
                      </span>

                      <div className="flex items-center gap-3 shrink-0 text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-slate-400" />
                          <span>{report.upvotes_count}</span>
                        </span>
                        <span>·</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Recorded resolution tag */}
                    {isResolved && (
                      <div className="mt-2.5 p-1.5 bg-emerald-50/80 rounded border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between font-medium">
                        <span>✓ Recorded Resolution &amp; Fix Verification</span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                    )}

                  </div>
                );
              })
            )}

          </div>
        )}

      </div>
    </div>
  );
};
