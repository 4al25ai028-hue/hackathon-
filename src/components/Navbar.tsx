import React from 'react';
import { 
  Building2, 
  MapPin, 
  PlusCircle, 
  Search, 
  ShieldCheck, 
  Flame, 
  AlertTriangle,
  User,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { AuthUser } from '../types';

interface NavbarProps {
  activeTab: 'map' | 'submit' | 'track' | 'hotspots' | 'admin';
  setActiveTab: (tab: 'map' | 'submit' | 'track' | 'hotspots' | 'admin') => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  pendingUnverifiedCount: number;
  onOpenHowToUse: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  pendingUnverifiedCount,
  onOpenHowToUse,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Top Civic Notice Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
              Municipal Public Services Platform
            </span>
            <span className="text-slate-500">·</span>
            <span className="hidden sm:inline text-slate-400">
              Compliant with Municipal Problem Statement PS-14
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Civic Helpline: 1800-425-2484</span>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Emergency Response 24x7</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div 
            onClick={() => setActiveTab('map')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
              <Building2 className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">CivicConnect</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Citizen Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Transparent Community Reporting &amp; Resolution Platform
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'map'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Issues &amp; Map</span>
              </button>

              <button
                onClick={() => setActiveTab('track')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'track'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Track Report</span>
              </button>

              <button
                onClick={() => setActiveTab('hotspots')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'hotspots'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Recurring Hotspots</span>
                <span className="md:hidden">Hotspots</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dashboard</span>
                {pendingUnverifiedCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                    {pendingUnverifiedCount}
                  </span>
                )}
              </button>
            </nav>

            {/* How to Use / Guide button */}
            <button
              onClick={onOpenHowToUse}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              title="How to Use Guide"
            >
              <span className="font-bold text-emerald-800">?</span>
              <span className="hidden sm:inline">User Guide</span>
            </button>

            {/* Submit Issue CTA Button */}
            <button
              onClick={() => setActiveTab('submit')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs ml-1"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>

            {/* User Auth / Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900">{currentUser.name || 'User'}</span>
                  <span className="text-[10px] text-slate-500">{currentUser.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors ml-1"
              >
                <User className="w-4 h-4 text-emerald-700" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
