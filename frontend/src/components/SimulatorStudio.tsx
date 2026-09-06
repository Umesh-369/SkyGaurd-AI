import React, { useState, useEffect, useRef } from 'react';
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
  History,
  Radio,
  FlaskConical,
  Sparkles,
  RefreshCw,
  FastForward,
  Pause,
  Globe,
  MapPin,
  Wind,
  Droplets,
  Layers
} from 'lucide-react';
import { useSkyGuardStore } from '../store/useSkyGuardStore';
import { HistoricalReplayFrame, SandboxEvaluationResult } from '../types';

export type SandboxOperationalMode = 'LIVE' | 'HISTORICAL_REPLAY' | 'SIMULATION_SANDBOX';
export type HistoricalDatasetType = 'ALL' | 'INDIAN_CLIMATE' | 'OPENML_GOA';
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

  // Sandbox Operational Mode State
  const [sandboxMode, setSandboxMode] = useState<SandboxOperationalMode>('LIVE');
  const [selectedDataset, setSelectedDataset] = useState<HistoricalDatasetType>('ALL');
  const [stationTab, setStationTab] = useState<StationFilterTab>('ALL');

  const [selectedStationId, setSelectedStationId] = useState<string>('AWS-01');
  const [selectedParam, setSelectedParam] = useState<string>('temperature');
  const [magnitude, setMagnitude] = useState<number>(15.0);
  const [notification, setNotification] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Historical Replay State
  const [historicalFrames, setHistoricalFrames] = useState<HistoricalReplayFrame[]>([]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [sandboxEvaluation, setSandboxEvaluation] = useState<SandboxEvaluationResult | null>(null);
  const [loadingReplay, setLoadingReplay] = useState<boolean>(false);

  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch historical dataset frames when mode, station, or dataset type changes
  useEffect(() => {
    if (sandboxMode === 'HISTORICAL_REPLAY') {
      setLoadingReplay(true);
      fetch(`/api/anomalies/historical/dataset-stream?station_id=${selectedStationId}&dataset_type=${selectedDataset}&limit=200`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.frames)) {
            setHistoricalFrames(data.frames);
            setReplayIndex(0);
            if (data.frames.length > 0) {
              evaluateSandboxFrame(data.frames[0]);
            }
          }
        })
        .catch(err => console.warn('[SimulatorStudio] Historical fetch error:', err))
        .finally(() => setLoadingReplay(false));
    }
  }, [sandboxMode, selectedStationId, selectedDataset]);

  // Evaluate sandboxed frame through backend ML pipeline without writing to live feed
  const evaluateSandboxFrame = async (frame: Partial<HistoricalReplayFrame>) => {
    try {
      const targetSt = frame.station_id || selectedStationId;
      const res = await fetch('/api/simulator/sandbox-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: targetSt,
          temperature: frame.temperature ?? 28.5,
          pressure: frame.pressure ?? 1012.0,
          humidity: frame.humidity ?? 78.0,
          wind_speed: frame.wind_speed ?? 12.0,
          rainfall: frame.rainfall ?? 0.0,
          timestamp: frame.timestamp
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxEvaluation(data);
      }
    } catch (e) {
      console.warn('[SimulatorStudio] Sandbox eval error:', e);
    }
  };

  // Historical Replay Tick Loop
  useEffect(() => {
    if (isReplaying && historicalFrames.length > 0) {
      const intervalMs = Math.max(150, 1000 / replaySpeed);
      replayTimerRef.current = setInterval(() => {
        setReplayIndex(prev => {
          const next = prev + 1;
          if (next >= historicalFrames.length) {
            setIsReplaying(false);
            return prev;
          }
          evaluateSandboxFrame(historicalFrames[next]);
          return next;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isReplaying, historicalFrames, replaySpeed]);

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
      if (sandboxMode === 'SIMULATION_SANDBOX') {
        // Evaluate in strict sandbox mode
        let simT = 28.5;
        let simP = 1012.0;
        let simRH = 78.0;

        if (faultType === 'temperature_spike') simT += mag;
        else if (faultType === 'temperature_drop') simT -= mag;
        else if (faultType === 'pressure_drop') simP -= mag;
        else if (faultType === 'humidity_spike') simRH = Math.min(100, simRH + mag);
        else if (faultType === 'multivariate_fault') {
          simT += 14.5;
          simP -= 22.0;
          simRH = Math.max(0, simRH - 35.0);
        }

        await evaluateSandboxFrame({
          station_id: selectedStationId,
          temperature: simT,
          pressure: simP,
          humidity: simRH,
          timestamp: new Date().toISOString()
        });
        notify(`SANDBOX TEST: Simulated '${faultType.toUpperCase()}' evaluated in local sandbox.`);
      } else {
        // Execute standard hardware simulator fault injection
        await injectFault(selectedStationId, faultType, param, mag);
        const stName = stations.find(s => s.station_id === selectedStationId || s.id === selectedStationId)?.name || selectedStationId;
        notify(`FAULT INJECTED: '${faultType.toUpperCase()}' on ${stName} (${param.toUpperCase()} +${mag})`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClear = async () => {
    setLoadingAction('CLEAR');
    try {
      await clearFaults();
      setSandboxEvaluation(null);
      notify('CLEARED ALL INJECTIONS: All active fault modes reset to normal telemetry.');
    } finally {
      setLoadingAction(null);
    }
  };

  const currentReplayFrame = historicalFrames[replayIndex];

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
              <FlaskConical className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-slate-900">
                Virtual AWS Simulation Sandbox
              </h1>
              <p className="text-sky-700 text-xs font-mono font-bold mt-1">
                14 STATIONS (OPENML GOA + 10 MAJOR INDIAN CITIES) · MULTI-SOURCE CLIMATE DATASETS & REPLAY
              </p>
            </div>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm font-sans mt-3 max-w-3xl leading-relaxed">
            Execute live hardware simulation streams, scrub historical OpenML and All-India meteorological datasets across 14 stations, or run isolated controlled fault experiments through the real Tier 1 & Tier 2 ML pipeline without polluting live production feeds.
          </p>
        </div>

        {/* Operational Mode Selector: LIVE / HISTORICAL REPLAY / SIMULATION SANDBOX */}
        <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => { setSandboxMode('LIVE'); setIsReplaying(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              sandboxMode === 'LIVE'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>LIVE STREAM</span>
          </button>
          <button
            onClick={() => { setSandboxMode('HISTORICAL_REPLAY'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              sandboxMode === 'HISTORICAL_REPLAY'
                ? 'bg-sky-600 text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>HISTORICAL REPLAY</span>
          </button>
          <button
            onClick={() => { setSandboxMode('SIMULATION_SANDBOX'); setIsReplaying(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              sandboxMode === 'SIMULATION_SANDBOX'
                ? 'bg-indigo-600 text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>ISOLATED SANDBOX</span>
          </button>
        </div>
      </div>

      {/* Persistent Mode Indicator Banner */}
      <div className={`p-4 rounded-2xl border text-xs font-mono font-bold flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
        sandboxMode === 'LIVE'
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
          : sandboxMode === 'HISTORICAL_REPLAY'
          ? 'bg-sky-50/80 border-sky-300 text-sky-900'
          : 'bg-indigo-50/80 border-indigo-300 text-indigo-900'
      }`}>
        <div className="flex items-center space-x-3">
          <span className={`w-3.5 h-3.5 rounded-full animate-ping ${
            sandboxMode === 'LIVE' ? 'bg-emerald-600' : sandboxMode === 'HISTORICAL_REPLAY' ? 'bg-sky-600' : 'bg-indigo-600'
          }`} />
          <div>
            <span className="font-extrabold uppercase tracking-wider text-sm">
              ACTIVE MODE: {sandboxMode === 'LIVE' ? 'LIVE CONTINUOUS HARDWARE STREAM' : sandboxMode === 'HISTORICAL_REPLAY' ? 'HISTORICAL MULTI-SOURCE REPLAY ENGINE' : 'ISOLATED SIMULATION SANDBOX'}
            </span>
            <p className="text-[11px] font-sans font-normal opacity-90">
              {sandboxMode === 'LIVE'
                ? 'Broadcasting real-time hardware telemetry across all 14 stations directly to Dashboard and Anomalies Feed.'
                : sandboxMode === 'HISTORICAL_REPLAY'
                ? 'Stepping through actual OpenML Goa (43409) and Indian National Climate datasets (10 Metros) through the ML inference pipeline.'
                : 'Controlled fault experiments running isolated in memory. Live dashboard feeds remain completely undisturbed.'}
            </p>
          </div>
        </div>

        {/* Master Controls: Start | Stop | Reset | Speed */}
        {sandboxMode === 'LIVE' && (
          <div className="flex flex-wrap items-center gap-2 bg-white/90 p-2 rounded-xl border border-emerald-200 shadow-2xs">
            <button
              onClick={handleStart}
              disabled={isSimulating || loadingAction === 'START'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                isSimulating ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START</span>
            </button>
            <button
              onClick={handleStop}
              disabled={!isSimulating || loadingAction === 'STOP'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                !isSimulating ? 'bg-amber-100 text-amber-700 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-mono font-bold cursor-pointer"
            >
              RESET
            </button>
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-300">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeed(spd)}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-bold cursor-pointer ${
                    simSpeed === spd ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 border'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Historical Replay Player Controls Bar (Luxury Light Theme) */}
      {sandboxMode === 'HISTORICAL_REPLAY' && (
        <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider">
                  Historical Climate Dataset Player
                </h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    FRAME {replayIndex + 1} OF {historicalFrames.length || '200'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    SOURCE: {currentReplayFrame?.dataset_source || (selectedDataset === 'INDIAN_CLIMATE' ? 'Indian National Climate Dataset (2024–2025)' : 'OpenML 43409')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button
                onClick={() => setIsReplaying(!isReplaying)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                  isReplaying ? 'bg-amber-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'
                }`}
              >
                {isReplaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isReplaying ? 'PAUSE REPLAY' : 'PLAY REPLAY'}</span>
              </button>
              <button
                onClick={() => { setReplayIndex(0); if (historicalFrames.length > 0) evaluateSandboxFrame(historicalFrames[0]); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 cursor-pointer border border-slate-200"
                title="Restart from frame 0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                <span className="text-[10px] font-mono font-bold text-slate-500 mr-1">SPEED:</span>
                {[0.5, 1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setReplaySpeed(spd)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                      replaySpeed === spd ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {spd}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dataset Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Dataset Source:</span>
              <button
                onClick={() => setSelectedDataset('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedDataset === 'ALL'
                    ? 'bg-sky-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🌐 All Datasets (India + Goa)
              </button>
              <button
                onClick={() => setSelectedDataset('INDIAN_CLIMATE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedDataset === 'INDIAN_CLIMATE'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🇮🇳 Indian National Climate (10 Metros)
              </button>
              <button
                onClick={() => setSelectedDataset('OPENML_GOA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedDataset === 'OPENML_GOA'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🌴 OpenML Goa Dataset 43409
              </button>
            </div>

            {loadingReplay && (
              <span className="text-[11px] font-mono text-sky-700 flex items-center space-x-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Loading Dataset Frames...</span>
              </span>
            )}
          </div>

          {/* Timeline Scrubber */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-600">
              <span className="flex items-center space-x-2">
                <span>Timestamp: <strong>{currentReplayFrame?.timestamp ? new Date(currentReplayFrame.timestamp).toLocaleString() : '—'}</strong></span>
                {currentReplayFrame?.city && (
                  <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    📍 {currentReplayFrame.city}, {currentReplayFrame.state} ({currentReplayFrame.station_id})
                  </span>
                )}
              </span>
              <span className="text-slate-500 font-bold">Scrub Historical Timeline ({replayIndex + 1}/{historicalFrames.length})</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, historicalFrames.length - 1)}
              value={replayIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setReplayIndex(idx);
                if (historicalFrames[idx]) evaluateSandboxFrame(historicalFrames[idx]);
              }}
              className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Sandbox Live Inference Inspection Card (Crisp Luxury Light Theme) */}
      {(sandboxMode === 'HISTORICAL_REPLAY' || sandboxMode === 'SIMULATION_SANDBOX') && sandboxEvaluation && (
        <div className="luxury-card p-6 bg-white text-slate-900 border border-slate-200 shadow-sm space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
              <span className="font-extrabold text-xs text-indigo-700 uppercase tracking-wider font-sans">
                Real-Time Sandbox ML Inference Output
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                STRICTLY ISOLATED · ZERO PRODUCTION WRITE
              </span>
              {currentReplayFrame?.city && (
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  📍 {currentReplayFrame.city}, {currentReplayFrame.state}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">TEMPERATURE</span>
              <strong className="text-slate-900 text-base font-extrabold">{sandboxEvaluation.readings?.temperature?.toFixed(2)} °C</strong>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">PRESSURE</span>
              <strong className="text-slate-900 text-base font-extrabold">{sandboxEvaluation.readings?.pressure?.toFixed(1)} hPa</strong>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">HUMIDITY</span>
              <strong className="text-slate-900 text-base font-extrabold">{sandboxEvaluation.readings?.humidity?.toFixed(1)} %</strong>
            </div>
            <div className={`p-3.5 rounded-xl border shadow-2xs ${
              sandboxEvaluation.detection?.is_anomaly 
                ? 'bg-red-50/90 border-red-200 text-red-800' 
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
            }`}>
              <span className="text-[10px] font-bold block uppercase opacity-80">ML DETECTION VERDICT</span>
              <strong className="text-sm font-black flex items-center space-x-1.5 mt-0.5">
                <span>{sandboxEvaluation.detection?.is_anomaly ? '⚠️ FLAGGED ANOMALY' : '✓ NORMAL / NOMINAL'}</span>
              </strong>
            </div>
          </div>

          {/* Real Live SHAP Breakdown in Sandbox */}
          {sandboxEvaluation.contributing_factors && sandboxEvaluation.contributing_factors.length > 0 && (
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 block uppercase font-sans">
                  SHAP Contributing Factors Breakdown:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">KernelExplainer Feature Weights</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {sandboxEvaluation.contributing_factors.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-700 font-mono font-semibold">{f.feature}:</span>
                    <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded text-xs ${
                      f.shap_weight > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-sky-50 text-sky-600 border border-sky-100'
                    }`}>
                      {f.shap_weight > 0 ? `+${f.shap_weight.toFixed(3)}` : f.shap_weight.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spatio-Temporal Imputation & Tier-2 Hazard Indicators in Sandbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            {sandboxEvaluation.imputed_suggestion && (
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between">
                <span className="text-sky-900 font-sans text-[11px] font-bold">Imputed Value Correction:</span>
                <span className="font-mono font-bold text-sky-800">
                  {sandboxEvaluation.imputed_suggestion.target_feature} → {sandboxEvaluation.imputed_suggestion.corrected_value}
                </span>
              </div>
            )}
            {sandboxEvaluation.disaster_risks && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <span className="text-indigo-900 font-sans text-[11px] font-bold">Tier-2 Hazard Score:</span>
                <span className="font-mono font-bold text-indigo-800">
                  {sandboxEvaluation.disaster_risks.composite_risk_score} / 100 ({sandboxEvaluation.disaster_risks.composite_risk_level})
                </span>
              </div>
            )}
          </div>
        </div>
      )}


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
