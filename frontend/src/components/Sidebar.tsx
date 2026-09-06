import React from 'react';
import { 
  ShieldCheck, 
  Home, 
  AlertTriangle, 
  ShieldAlert, 
  Sliders, 
  BarChart3, 
  Bell, 
  Settings,
  Server,
  Globe,
  RadioTower,
  CloudSun,
  ChevronRight,
  WifiOff
} from 'lucide-react';
import { useSkyGuardStore, getCanonicalStationName } from '../store/useSkyGuardStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, activeAlertCount }) => {
  const anomalies = useSkyGuardStore((state) => state.anomalies);
  const navigateToAnomaly = useSkyGuardStore((state) => state.navigateToAnomaly);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'anomalies', label: 'Anomalies', icon: Bell, badge: activeAlertCount },
    { id: 'disaster-risk', label: 'Risk Intelligence', icon: ShieldAlert },
    { id: 'simulator', label: 'Simulator Studio', icon: Sliders },
    { id: 'analytics', label: 'Live Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between p-4 shrink-0 font-sans shadow-sm bg-white border-r border-slate-200 z-30 select-none overflow-y-auto custom-feed-scrollbar">
      
      <div className="space-y-5">
        {/* Brand Header */}
        <div 
          className="flex items-center space-x-3 px-2 py-2 cursor-pointer group rounded-xl hover:bg-sky-50 transition-all border border-transparent hover:border-sky-200"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl text-white shadow-md shadow-sky-500/20 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 tracking-wider leading-none font-display uppercase">
              SkyGuard <span className="text-sky-600">AI</span>
            </h1>
            <p className="text-[11px] text-sky-700 font-mono font-medium mt-1 uppercase tracking-wider">AWS Command Center</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (activeTab === 'dashboard' && item.id === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'overview' || item.id === 'dashboard') {
                    setActiveTab('dashboard');
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-extrabold border-l-4 border-sky-600 shadow-sm border-sky-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                  <span className="tracking-wide">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold bg-red-100 text-red-700 border border-red-200 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Active Anomaly Shortcut Panel */}
        {anomalies && anomalies.length > 0 && (
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-2 font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-rose-800 uppercase tracking-wider flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>ACTIVE ALERTS ({anomalies.length})</span>
              </span>
              <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {anomalies.slice(0, 3).map((anom) => {
                const stName = getCanonicalStationName(anom.station_id || anom.stationId);
                const isComm = anom.category === 'COMMUNICATION_FAILURE' || anom.status === 'Communication Failure';
                return (
                  <div
                    key={anom.id}
                    onClick={() => navigateToAnomaly(anom.id)}
                    className="p-2 bg-white rounded-lg border border-rose-200/80 hover:border-sky-500 hover:bg-sky-50/60 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-bold text-slate-900 truncate group-hover:text-sky-700">
                        {stName}
                      </div>
                      <div className="text-[9.5px] font-mono text-slate-500 truncate flex items-center space-x-1">
                        {isComm ? (
                          <span className="text-purple-700 font-semibold">COMM FAILURE</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">{(anom.root_cause || anom.rootCause || 'anomaly').replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Data Source & Radar Telemetry Card */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        
        {/* Data Source Badge Box (As in Image 2) */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-sky-700 uppercase tracking-widest font-mono">
            <span>DATA SOURCE</span>
            <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          </div>

          <div className="flex items-center space-x-2.5 text-slate-700 text-xs">
            <RadioTower className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 leading-none text-xs">AWS Sensors</div>
              <div className="text-[11px] text-emerald-700 font-mono mt-0.5">14 / 14 Online</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 text-slate-700 text-xs pt-2 border-t border-slate-200">
            <CloudSun className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 leading-none text-xs">Weather API</div>
              <div className="text-[11px] text-sky-700 font-mono mt-0.5">Live Synced</div>
            </div>
          </div>
        </div>

        {/* Tactical Radar Graphic Illustration (As in Image 2) */}
        <div className="relative rounded-xl p-3 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-slate-100 border border-sky-200 flex items-center justify-between overflow-hidden">
          <div className="space-y-0.5 relative z-10">
            <div className="text-[10px] font-mono font-extrabold text-sky-800 uppercase">SAT-RADAR 24/7</div>
            <div className="text-[11px] font-bold text-slate-900">All India Coverage</div>
          </div>
          <div className="relative w-8 h-8 flex items-center justify-center text-sky-600 z-10">
            <RadioTower className="w-6 h-6 animate-pulse" />
          </div>
          <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none"></div>
        </div>

      </div>
    </aside>
  );
};
