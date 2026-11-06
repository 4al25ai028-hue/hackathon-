import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  ChevronRight, 
  Wrench,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { HotspotCluster, CivicReport } from '../types';

interface RecurringHotspotsViewProps {
  onSelectReportId: (id: string) => void;
}

export const RecurringHotspotsView: React.FC<RecurringHotspotsViewProps> = ({
  onSelectReportId,
}) => {
  const [clusters, setClusters] = useState<HotspotCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<HotspotCluster | null>(null);

  const fetchHotspots = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/recurring-hotspots');
      const data = await res.json();
      if (data.success) {
        setClusters(data.clusters || []);
        if (data.clusters?.length > 0) {
          setSelectedCluster(data.clusters[0]);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-slate-900 text-white p-6 rounded-xl space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <h1 className="text-base font-bold">Recurring Community Problems &amp; Hotspot Analytics</h1>
        </div>
        <p className="text-xs text-amber-100/90 max-w-2xl leading-relaxed">
          Automated spatial-temporal clustering identifies persistent chronic issues in the same micro-area. Instead of repeatedly patching isolated symptoms, municipal planners use this data for long-term structural overhauls.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
          Calculating geospatial clusters and recurrence frequencies...
        </div>
      ) : clusters.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
          No recurring hotspot clusters detected in current database.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Cluster Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
              <span>Detected Hotspots ({clusters.length})</span>
              <span className="text-slate-400 font-normal">Radius &lt; 200m</span>
            </div>

            <div className="space-y-2.5">
              {clusters.map((cluster) => {
                const isSelected = selectedCluster?.id === cluster.id;

                return (
                  <div
                    key={cluster.id}
                    onClick={() => setSelectedCluster(cluster)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 text-sm">
                        {cluster.location_name}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {cluster.total_incidents} Incidents
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 mb-2">
                      <span>{cluster.ward}</span> · <span className="font-semibold text-slate-700">{cluster.category}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-amber-800 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {cluster.recurrence_rate}% Recurrence Index
                      </span>
                      <span className="text-slate-500">
                        {cluster.active_incidents} Active / {cluster.resolved_incidents} Historic
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Dive Cluster Diagnostic */}
          <div className="lg:col-span-2">
            {selectedCluster ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 text-xs shadow-xs">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {selectedCluster.id}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        {selectedCluster.location_name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCluster.ward} · Coordinates: {selectedCluster.latitude}, {selectedCluster.longitude}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-700 font-mono">
                      {selectedCluster.recurrence_rate}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                      Recurrence Severity
                    </div>
                  </div>
                </div>

                {/* Root Cause & Civic Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Root Cause Analysis
                    </div>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {selectedCluster.primary_root_cause}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2">
                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <Wrench className="w-4 h-4 text-emerald-700" />
                      Recommended Civic Engineering Action
                    </div>
                    <p className="text-emerald-900 leading-relaxed text-xs">
                      {selectedCluster.recommended_civic_action}
                    </p>
                  </div>
                </div>

                {/* Linked Incidents in This Cluster */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Chronological Reports in this Cluster ({selectedCluster.incident_ids.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {selectedCluster.incident_ids.map((id, index) => (
                      <div
                        key={id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => onSelectReportId(id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            #{index + 1}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-slate-900">{id}</span>
                            <span className="text-slate-400 mx-2">·</span>
                            <span className="text-slate-600">Incident in cluster</span>
                          </div>
                        </div>

                        <button
                          className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 text-xs"
                        >
                          <span>Inspect Report</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                Select a hotspot to view structural root-cause analysis.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
