import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { DisasterRiskPage } from './pages/DisasterRiskPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSkyGuardStore } from './store/useSkyGuardStore';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    stations,
    liveReadings,
    anomalies,
    disasterRisks,
    wsConnected,
    is3DMode,
    setIs3DMode,
    isSimulating,
    simSpeed,
    fetchInitialData,
    connectWebSocket,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSimSpeed,
    injectFault,
    clearFaults
  } = useSkyGuardStore();

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();
    const interval = setInterval(fetchInitialData, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeAlertCount = anomalies.filter(a => a.is_anomaly).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-sky-100 selection:text-sky-900">
      
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          wsConnected={wsConnected}
          activeAlertCount={activeAlertCount}
          is3DMode={is3DMode}
          setIs3DMode={setIs3DMode}
        />

        {/* Page Content View with Framer Motion Page Transition */}
        <main className="flex-1 overflow-y-auto p-6 bg-tactical-grid">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardPage
                  stations={stations}
                  liveReadings={liveReadings}
                  anomalies={anomalies}
                  disasterRisks={disasterRisks}
                  onNavigateTab={setActiveTab}
                  is3DMode={is3DMode}
                />
              )}

              {activeTab === 'anomalies' && (
                <AnomaliesPage anomalies={anomalies} risks={disasterRisks} />
              )}

              {activeTab === 'simulator' && (
                <SimulatorPage
                  stations={stations}
                  isSimulating={isSimulating}
                  simSpeed={simSpeed}
                  onStartSimulation={startSimulation}
                  onStopSimulation={stopSimulation}
                  onResetSimulation={resetSimulation}
                  onSpeedChange={setSimSpeed}
                  onInjectFault={injectFault}
                  onClearFaults={clearFaults}
                  liveReadings={liveReadings}
                  anomalies={anomalies}
                />
              )}

              {activeTab === 'disaster-risk' && (
                <DisasterRiskPage risks={disasterRisks} />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsPage />
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-4xl font-sans">
                  <div className="luxury-card p-8 bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center space-x-3 text-sky-600">
                      <SettingsIcon className="w-6 h-6" />
                      <h1 className="text-xl font-extrabold font-display uppercase tracking-wider text-slate-900">
                        System Configuration & Threshold Settings
                      </h1>
                    </div>
                    <p className="text-sm text-slate-600">
                      Configure real-time WebSocket polling intervals, IsolationForest contamination thresholds, and WebGL rendering preferences.
                    </p>
                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700">IsolationForest Contamination Alpha:</span>
                        <span className="font-mono font-bold text-sky-700">0.05 (Trained on 115,406 samples)</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700">WebSocket Sensor Stream Port:</span>
                        <span className="font-mono font-bold text-sky-700">/ws/readings</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700">Spatial Consistency Radius:</span>
                        <span className="font-mono font-bold text-sky-700">50.0 km</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer Bar */}
        <footer className="bg-white border-t border-slate-200 px-6 py-3 text-xs text-slate-600 font-sans flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">SkyGuard AI — AWS Intelligence System</span>
          </div>
        </footer>

      </div>

    </div>
  );
};
