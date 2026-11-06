/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { ReportsFeed } from './components/ReportsFeed';
import { SubmitReportModal } from './components/SubmitReportModal';
import { ReportDetailModal } from './components/ReportDetailModal';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { AdminPortal } from './components/AdminPortal';
import { RecurringHotspotsView } from './components/RecurringHotspotsView';
import { TrackReportView } from './components/TrackReportView';
import { HowToUseModal } from './components/HowToUseModal';
import { AuthModal } from './components/AuthModal';
import { CivicReport, AnalyticsSummary, AuthUser } from './types';
import { Building2, Shield, CheckCircle, Info, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'submit' | 'track' | 'hotspots' | 'dashboard'>('map');
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportForUpdate, setSelectedReportForUpdate] = useState<CivicReport | null>(null);

  // User Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('civicconnect_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('civicconnect_user');
    showToast('Signed out successfully.');
    if (activeTab === 'dashboard') setActiveTab('map');
  };

  const fetchData = async () => {
    try {
      const [repRes, anaRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/analytics'),
      ]);

      if (!repRes.ok) throw new Error(`Reports fetch failed: ${repRes.status}`);
      if (!anaRes.ok) throw new Error(`Analytics fetch failed: ${anaRes.status}`);

      const repData = await repRes.json();
      const anaData = await anaRes.json();

      if (repData.success) {
        setReports(repData.reports);
      }
      if (anaData.success) {
        setAnalytics(anaData.analytics);
      }
    } catch (err) {
      console.error('Failed to load civic data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedReport = reports.find(r => r.id === selectedReportId) || null;
  const pendingUnverifiedCount = reports.filter(r => r.status === 'SUBMITTED_UNVERIFIED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        pendingUnverifiedCount={pendingUnverifiedCount}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
      />

      {/* Municipal Performance Counter Bar */}
      <StatsBar
        analytics={analytics}
        onFilterClick={(status) => {
          setActiveTab('map');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 text-xs">
            Connecting to municipal database &amp; loading reports...
          </div>
        ) : (
          <>
            {/* View 1: Map & Feed View */}
            {activeTab === 'map' && (
              <ReportsFeed
                reports={reports}
                selectedReport={selectedReport}
                onSelectReport={(rep) => setSelectedReportId(rep.id)}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
              />
            )}

            {/* View 2: Direct Citizen Search by Tracking ID */}
            {activeTab === 'track' && (
              <TrackReportView
                reports={reports}
                onSelectReport={(rep) => setSelectedReportId(rep.id)}
              />
            )}

            {/* View 3: Recurring Hotspots & Root Cause Analytics */}
            {activeTab === 'hotspots' && (
              <RecurringHotspotsView
                onSelectReportId={(id) => setSelectedReportId(id)}
              />
            )}

            {/* View 4: Submit Issue Form */}
            {activeTab === 'submit' && (
              <div className="max-w-2xl mx-auto">
                <SubmitReportModal
                  isOpen={true}
                  onClose={() => setActiveTab('map')}
                  onSuccess={(newReport) => {
                    fetchData();
                    showToast(`Report ${newReport.id} submitted! Status: Unverified pending review.`);
                    setSelectedReportId(newReport.id);
                    setActiveTab('map');
                  }}
                  existingReports={reports}
                />
              </div>
            )}

            {/* View 5: Community Dashboard */}
            {activeTab === 'dashboard' && (
              <AdminPortal
                reports={reports}
                onSelectReport={(rep) => setSelectedReportId(rep.id)}
                onRefreshReports={fetchData}
                onOpenStatusModal={(rep) => setSelectedReportForUpdate(rep)}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onNavigateHome={() => setActiveTab('map')}
              />
            )}
          </>
        )}

      </main>

      {/* Detailed Report Modal */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onSelectReportId={(id) => setSelectedReportId(id)}
          onOpenStatusUpdate={(rep) => setSelectedReportForUpdate(rep)}
        />
      )}

      {/* How to Use Guide Modal */}
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsHowToUseOpen(false);
        }}
        onSelectSampleReport={(id) => {
          setSelectedReportId(id);
          setIsHowToUseOpen(false);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('civicconnect_user', JSON.stringify(user));
          showToast(`Welcome, ${user.name || user.email}! Signed in successfully.`);
          setActiveTab('dashboard');
        }}
      />

      {/* Floating Submit Modal (when triggered from other views) */}
      {isSubmitModalOpen && (
        <SubmitReportModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={(newReport) => {
            fetchData();
            showToast(`Report ${newReport.id} submitted! Marked as unverified.`);
            setSelectedReportId(newReport.id);
          }}
          existingReports={reports}
        />
      )}

      {/* Status Update Modal */}
      {selectedReportForUpdate && (
        <StatusUpdateModal
          report={selectedReportForUpdate}
          onClose={() => setSelectedReportForUpdate(null)}
          onSuccess={(updatedReport) => {
            fetchData();
            showToast(`Status updated to ${updatedReport.status.replace(/_/g, ' ')} for ${updatedReport.id}`);
            if (selectedReportId === updatedReport.id) {
              setSelectedReportId(updatedReport.id);
            }
          }}
        />
      )}

      {/* Municipal Civic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-slate-900">CivicConnect</span>
            <span>· Municipal Problem Reporting &amp; Resolution Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Problem Statement PS-14 Compliant</span>
            <span>·</span>
            <span>Supabase Database &amp; Storage Connected</span>
            <span>·</span>
            <span>Unified Community Dashboard</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
