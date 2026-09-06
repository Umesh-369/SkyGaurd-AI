import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  AlertOctagon, 
  WifiOff, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  ShieldAlert, 
  Gauge, 
  SlidersHorizontal,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { useSkyGuardStore } from '../store/useSkyGuardStore';

export type StationFilterTab = 'ALL' | 'GOA' | 'INDIA';

export const SimulatorStudio: React.FC = () => {
  const {
    stations,
    isSimulating,
    simSpeed,
    liveReadings = [],
    anomalies = [],
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSimSpeed,
    injectFault,
    clearFaults,
    connectWebSocket
  } = useSkyGuardStore();

  const [stationTab, setStationTab] = useState<StationFilterTab>('ALL');
  const [selectedStationId, setSelectedStationId] = useState<string>('AWS-01');
  const [selectedParam, setSelectedParam] = useState<string>('temperature');
  const [magnitude, setMagnitude] = useState<number>(15.0);
  const [notification, setNotification] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStart = async () => {
    setLoadingAction('START');
    try {
      connectWebSocket();
      await startSimulation();
      notify('STREAM STARTED: Virtual AWS sensor telemetry is now broadcasting live.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStop = async () => {
    setLoadingAction('STOP');
    try {
      await stopSimulation();
      notify('STREAM PAUSED: Telemetry paused in place. State and chart traces held.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    setLoadingAction('RESET');
    try {
      await resetSimulation();
      notify('BASELINE RESET: Cleared all offsets and returned network to normal baseline distributions.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSpeed = async (spd: number) => {
    await setSimSpeed(spd);
    notify(`SPEED UPDATED: Simulation update cadence set to ${spd}× realtime.`);
  };

  const handleTrigger = async (faultType: string, param: string, mag: number) => {
    setLoadingAction(faultType);
    try {
      await injectFault(selectedStationId, faultType, param, mag);
      const stName = stations.find(s => s.station_id === selectedStationId || s.id === selectedStationId)?.name || selectedStationId;
      notify(`FAULT INJECTED: '${faultType.toUpperCase()}' on ${stName} (${param.toUpperCase()} +${mag})`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClear = async () => {
    setLoadingAction('CLEAR');
    try {
      await clearFaults();
      notify('CLEARED ALL INJECTIONS: All active fault modes reset to normal telemetry.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Filter stations based on selected tab
  const filteredStations = stations.filter(st => {
    const isGoa = st.station_id.startsWith('AWS-0') || st.station_id.includes('GA');
    if (stationTab === 'GOA') return isGoa;
    if (stationTab === 'INDIA') return !isGoa;
    return true;
  });

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-900 select-none">
      
      {/* Top Banner & Control Studio Bar */}
      <div className="luxury-card p-6 md:p-8 bg-white border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-700">
              <Gauge className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-slate-900">
                Virtual AWS Simulator Control Studio
              </h1>
              <p className="text-sky-700 text-xs font-mono font-bold mt-1">
                14 STATIONS (OPENML GOA + 10 MAJOR INDIAN CITIES) · REAL-TIME SENSOR STREAMING
              </p>
            </div>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm font-sans mt-3 max-w-3xl leading-relaxed">
            Programmatically streams live Temperature, Humidity, and Pressure (Tier 1 core stream) + Wind Speed and Rainfall (Tier 2 context stream) driven by learned baseline distributions across 14 stations. Inject 9 fault modes on demand to trigger real-time backend ML + SHAP pipeline analysis.
          </p>
        </div>

        {/* Master Controls: Start | Stop | Reset | Speed */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm">
          
          {/* Start Simulation */}
          <button
            onClick={handleStart}
            disabled={isSimulating || loadingAction === 'START'}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 active:scale-95 shadow-sm ${
              isSimulating
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 font-extrabold cursor-pointer'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{loadingAction === 'START' ? 'STARTING...' : 'START SIMULATION'}</span>
          </button>

          {/* Stop Simulation */}
          <button
            onClick={handleStop}
            disabled={!isSimulating || loadingAction === 'STOP'}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 active:scale-95 shadow-sm ${
              !isSimulating
                ? 'bg-amber-100 text-amber-600 border border-amber-200 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 font-extrabold cursor-pointer'
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
            <span>{loadingAction === 'STOP' ? 'PAUSING...' : 'STOP / PAUSE'}</span>
          </button>

          {/* Reset Simulation */}
          <button
            onClick={handleReset}
            disabled={loadingAction === 'RESET'}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-mono font-bold transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{loadingAction === 'RESET' ? 'RESETTING...' : 'RESET BASELINE'}</span>
          </button>

          {/* Speed Multiplier Selector */}
          <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="text-[11px] font-mono font-bold text-slate-600 mr-1 uppercase">SPEED:</span>
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeed(spd)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                  simSpeed === spd
                    ? 'bg-sky-600 text-white font-black shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

        </div>
      </div>


      {/* Notification Banner */}
      {notification && (
        <div className="luxury-card p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-900 text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Status Bar Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 luxury-card bg-white border border-slate-200 text-xs font-mono shadow-sm gap-3">
        <div className="flex items-center space-x-4 flex-wrap gap-y-1">
          <span className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-emerald-600 animate-ping' : 'bg-amber-500'}`}></span>
            <span className="font-extrabold text-slate-900">
              STATE: {isSimulating ? 'LIVE STREAMING ACTIVE' : 'PAUSED (STATE HELD IN PLACE)'}
            </span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-sky-700 font-bold">CADENCE: {simSpeed}× REALTIME</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-bold">STATIONS: 14 TOTAL</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            disabled={loadingAction === 'CLEAR'}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-mono font-bold transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
          >
            {loadingAction === 'CLEAR' ? 'CLEARING...' : 'CLEAR ALL ACTIVE INJECTIONS'}
          </button>
        </div>
      </div>

      {/* Station Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-700" />
          <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider">
            Station Network Topology ({stations.length} Active AWS Nodes)
          </h3>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setStationTab('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              stationTab === 'ALL' ? 'bg-white text-sky-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All 14 Stations
          </button>
          <button
            onClick={() => setStationTab('GOA')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              stationTab === 'GOA' ? 'bg-white text-sky-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Goa Stations (4)
          </button>
          <button
            onClick={() => setStationTab('INDIA')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              stationTab === 'INDIA' ? 'bg-white text-sky-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            National Metros (10)
          </button>
        </div>
      </div>

      {/* Active AWS Node Network Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStations.map((st) => {
          const liveR = liveReadings.find(r => r.station_id === st.station_id || r.station_id === st.id);
          const temp = liveR?.temperature ?? st.last_reading?.temperature;
          const press = liveR?.pressure ?? st.last_reading?.pressure;
          const humid = liveR?.humidity ?? st.last_reading?.humidity;
          const isAnom = liveR?.anomaly_evaluation?.is_anomaly;
          const isGoa = st.station_id.startsWith('AWS-0') || st.station_id.includes('GA');

          return (
            <div
              key={st.station_id}
              onClick={() => setSelectedStationId(st.station_id)}
              className={`luxury-card p-5 cursor-pointer transition-all duration-150 active:scale-98 ${
                selectedStationId === st.station_id
                  ? 'border-sky-600 ring-2 ring-sky-100 bg-sky-50/50 shadow-sm'
                  : isAnom
                  ? 'border-red-300 bg-red-50/50'
                  : 'bg-white hover:border-sky-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSimulating ? (isAnom ? 'bg-red-500 pulse-red' : 'bg-emerald-500 pulse-emerald') : 'bg-amber-500'}`}></div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider">{st.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {isGoa ? 'Goa Coastal Zone' : 'National IMD Grid'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {st.station_id}
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs mt-4">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Temp:</span>
                  <span className="font-bold text-sky-800">{temp != null ? `${temp.toFixed(1)} °C` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Pressure:</span>
                  <span className="font-bold text-sky-800">{press != null ? `${press.toFixed(1)} hPa` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-500">Humidity:</span>
                  <span className="font-bold text-sky-800">{humid != null ? `${humid.toFixed(1)} %` : '—'}</span>
                </div>
              </div>

              {isAnom && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] font-mono text-red-700 font-bold flex items-center space-x-2 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="truncate">ANOMALY DETECTED BY ML</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Control Panel & Anomaly Injection Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Target Configuration Panel */}
        <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-sky-700" />
              <span>Target Node & Parameter</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">Configure target AWS node and parameter offset magnitude.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-sky-700 block mb-2 uppercase font-mono">Target Virtual AWS Node</label>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:border-sky-600 focus:outline-none cursor-pointer"
            >
              <optgroup label="Goa Stations (4)">
                {stations.filter(s => s.station_id.startsWith('AWS-0') || s.station_id.includes('GA')).map(st => (
                  <option key={st.station_id} value={st.station_id} className="bg-white text-slate-900">
                    {st.name} ({st.station_id})
                  </option>
                ))}
              </optgroup>
              <optgroup label="National Indian Metros (10)">
                {stations.filter(s => !(s.station_id.startsWith('AWS-0') || s.station_id.includes('GA'))).map(st => (
                  <option key={st.station_id} value={st.station_id} className="bg-white text-slate-900">
                    {st.name} ({st.station_id})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-sky-700 block mb-2 uppercase font-mono">Target Parameter</label>
            <select
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:border-sky-600 focus:outline-none cursor-pointer"
            >
              <option value="temperature" className="bg-white text-slate-900">Temperature (°C)</option>
              <option value="pressure" className="bg-white text-slate-900">Atmospheric Pressure (hPa)</option>
              <option value="humidity" className="bg-white text-slate-900">Relative Humidity (%)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-sky-700 block mb-2 uppercase font-mono">Fault Offset Magnitude</label>
            <input
              type="number"
              value={magnitude}
              onChange={(e) => setMagnitude(parseFloat(e.target.value) || 15.0)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-sky-800 font-mono focus:border-sky-600 focus:outline-none"
            />
          </div>
        </div>

        {/* 7 Anomaly Injection Studio Controls */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Mode 1: Temperature Spike */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-red-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 rounded-xl bg-red-50 border border-red-200">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">1. Temperature Spike</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Injects extreme positive thermal step change (+{magnitude}°C). Evaluates rapid rate-of-change detection.
            </p>
            <button
              onClick={() => handleTrigger('temperature_spike', 'temperature', magnitude)}
              disabled={loadingAction === 'temperature_spike'}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'temperature_spike' ? 'INJECTING...' : 'INJECT TEMP SPIKE →'}</span>
            </button>
          </div>

          {/* Mode 2: Temperature Drop */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-blue-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">2. Temperature Drop</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Injects sharp thermal drop (-{magnitude}°C). Tests thermal depression fault thresholding.
            </p>
            <button
              onClick={() => handleTrigger('temperature_drop', 'temperature', magnitude)}
              disabled={loadingAction === 'temperature_drop'}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'temperature_drop' ? 'INJECTING...' : 'INJECT TEMP DROP →'}</span>
            </button>
          </div>

          {/* Mode 3: Pressure Drop */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-amber-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-amber-700">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">3. Pressure Drop</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simulates rapid barometric pressure drop (-{magnitude} hPa). Tests physical sensor bounds check.
            </p>
            <button
              onClick={() => handleTrigger('pressure_drop', 'pressure', magnitude)}
              disabled={loadingAction === 'pressure_drop'}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'pressure_drop' ? 'INJECTING...' : 'INJECT PRESSURE DROP →'}</span>
            </button>
          </div>

          {/* Mode 4: Humidity Spike */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-emerald-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-emerald-700">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">4. Humidity Spike</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Injects rapid relative humidity surge (+{magnitude}% RH). Tests moisture saturation limits.
            </p>
            <button
              onClick={() => handleTrigger('humidity_spike', 'humidity', magnitude)}
              disabled={loadingAction === 'humidity_spike'}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'humidity_spike' ? 'INJECTING...' : 'INJECT HUMIDITY SPIKE →'}</span>
            </button>
          </div>

          {/* Mode 5: Sensor Drift */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-indigo-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-indigo-700">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">5. Sensor Bias Drift</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Applies progressive linear bias drift over consecutive cycles. Tests degradation tracking.
            </p>
            <button
              onClick={() => handleTrigger('sensor_drift', selectedParam, magnitude)}
              disabled={loadingAction === 'sensor_drift'}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'sensor_drift' ? 'INJECTING...' : 'INJECT BIAS DRIFT →'}</span>
            </button>
          </div>

          {/* Mode 6: Stuck Sensor */}
          <div className="luxury-card p-5 bg-white border-l-4 border-l-purple-500 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
            <div className="flex items-center space-x-3 text-purple-700">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                <WifiOff className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">6. Stuck Sensor (Frozen)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Locks sensor telemetry at fixed float values. Tests zero-variance freeze anomaly detection.
            </p>
            <button
              onClick={() => handleTrigger('stuck_sensor', selectedParam, 0)}
              disabled={loadingAction === 'stuck_sensor'}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{loadingAction === 'stuck_sensor' ? 'FREEZING...' : 'FREEZE SENSOR READINGS →'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Mode 7 Full Width Card: Multivariate Fault */}
      <div className="luxury-card p-6 bg-red-50 border border-red-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-red-700">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <h3 className="text-base font-black font-display uppercase tracking-wider text-slate-900">
              7. Multivariate Severe System Fault
            </h3>
          </div>
          <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
            Triggers simultaneous correlated sensor failure across Temperature (+14.5°C spike), Pressure (-22 hPa drop), and Humidity (-35% drop). Demonstrates multi-factor SHAP explainability and value imputation.
          </p>
        </div>
        <button
          onClick={() => handleTrigger('multivariate_fault', 'all', 0)}
          disabled={loadingAction === 'multivariate_fault'}
          className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-mono font-black text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer whitespace-nowrap"
        >
          {loadingAction === 'multivariate_fault' ? 'TRIGGERING...' : 'TRIGGER MULTIVARIATE FAULT →'}
        </button>
      </div>

      {/* Section 4 & 9: Communication Failure Test Cases (Distinct 3rd Category) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mode 8: Station Offline / Missing Data */}
        <div className="luxury-card p-5 bg-white border-l-4 border-l-purple-600 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
          <div className="flex items-center space-x-3 text-purple-700">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">8. Station Offline / Missing Data</h4>
              <span className="text-[10px] font-mono font-bold text-purple-700">DISTINCT CATEGORY: COMMUNICATION FAILURE</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Drops packet transmission from target AWS node for 30 cycles. Triggers missing data & offline alert classification.
          </p>
          <button
            onClick={() => handleTrigger('station_offline', 'all', 0)}
            disabled={loadingAction === 'station_offline'}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{loadingAction === 'station_offline' ? 'SIMULATING OFFLINE...' : 'TRIGGER STATION OFFLINE →'}</span>
          </button>
        </div>

        {/* Mode 9: Delayed Data Packet */}
        <div className="luxury-card p-5 bg-white border-l-4 border-l-purple-600 border-slate-200 shadow-sm space-y-3 hover:border-sky-300 transition-all">
          <div className="flex items-center space-x-3 text-purple-700">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 font-display uppercase">9. Delayed Data / Long Gap</h4>
              <span className="text-[10px] font-mono font-bold text-purple-700">DISTINCT CATEGORY: COMMUNICATION FAILURE</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Simulates 18-second telemetry network latency and timestamp gap. Triggers transmission lag detection.
          </p>
          <button
            onClick={() => handleTrigger('delayed_data', 'all', 18)}
            disabled={loadingAction === 'delayed_data'}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{loadingAction === 'delayed_data' ? 'DELAYING PACKETS...' : 'TRIGGER PACKET DELAY (18s) →'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
