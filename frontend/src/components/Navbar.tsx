import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  Sliders, 
  BarChart3, 
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSkyGuardStore, getCanonicalStationName } from '../store/useSkyGuardStore';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  wsConnected: boolean;
  activeAlertCount: number;
  is3DMode?: boolean;
  setIs3DMode?: (mode: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  wsConnected,
  activeAlertCount,
  is3DMode = true,
  setIs3DMode
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const anomalies = useSkyGuardStore((state) => state.anomalies);
  const navigateToAnomaly = useSkyGuardStore((state) => state.navigateToAnomaly);

  const [timeString, setTimeString] = useState<string>(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} IST`;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeString(`${hours}:${minutes}:${seconds} IST`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-nav-bar px-6 py-2.5 flex items-center justify-between font-sans select-none border-b border-slate-200 bg-white/90">
      
      {/* Center Nav Tabs */}
      <nav className="flex items-center space-x-1.5 overflow-x-auto py-1">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            activeTab === 'dashboard'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-b-sky-600 border-sky-300 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-sky-600" />
          <span>MISSION CONTROL</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            activeTab === 'anomalies'
              ? 'bg-red-50 text-red-700 border-b-2 border-b-red-600 border-red-300 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>ANOMALIES</span>
          {activeAlertCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('disaster-risk')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            activeTab === 'disaster-risk'
              ? 'bg-emerald-50 text-emerald-700 border-b-2 border-b-emerald-600 border-emerald-300 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          <span>RISK INTELLIGENCE</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            activeTab === 'simulator'
              ? 'bg-amber-50 text-amber-700 border-b-2 border-b-amber-600 border-amber-300 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-600" />
          <span>SIMULATOR</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            activeTab === 'analytics'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-b-indigo-600 border-indigo-300 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>ANALYTICS</span>
        </motion.button>
      </nav>

      {/* Right Controls & Status Bar */}
      <div className="flex items-center space-x-4">
        
        {/* System Online Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SYSTEM ONLINE</span>
        </div>

        {/* Clock Display */}
        <div className="font-mono text-xs font-extrabold text-sky-800 bg-sky-50/80 px-3 py-1 rounded-lg border border-sky-200">
          {timeString || '--:--:-- IST'}
        </div>

        {/* Notification Bell with Interactive Alert Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
            aria-label="Toggle notifications"
          >
            <Bell className="w-4 h-4 text-sky-600" />
            {activeAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-3 space-y-3 font-sans animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center space-x-1.5">
                  <Bell className="w-3.5 h-3.5 text-sky-700" />
                  <span>Telemetry Alerts</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {anomalies.length} Active
                </span>
              </div>

              {anomalies.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-sans">
                  No active anomaly alerts in network.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-feed-scrollbar">
                  {anomalies.slice(0, 5).map((anom) => {
                    const stName = getCanonicalStationName(anom.station_id || anom.stationId);
                    const isComm = anom.category === 'COMMUNICATION_FAILURE' || anom.status === 'Communication Failure';
                    return (
                      <div
                        key={anom.id}
                        onClick={() => {
                          navigateToAnomaly(anom.id);
                          setDropdownOpen(false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-100 hover:border-sky-300 bg-slate-50 hover:bg-sky-50/70 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700 truncate max-w-[170px]">
                            {stName}
                          </span>
                          <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                            anom.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {anom.severity}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                          <span className="truncate">
                            {isComm ? 'COMMUNICATION FAILURE' : (anom.root_cause || anom.rootCause || 'anomaly').replace(/_/g, ' ')}
                          </span>
                          <span className="text-sky-700 font-bold ml-1">
                            {anom.confidence !== null && anom.confidence !== undefined ? `${Math.round(anom.confidence * 100)}%` : 'RULE'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => {
                  setActiveTab('anomalies');
                  setDropdownOpen(false);
                }}
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer shadow-sm"
              >
                Open Flagged Feed & SHAP Studio
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
