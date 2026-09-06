import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { StationMap } from '../components/StationMap';
import { Station3DMap } from '../components/Station3DMap';
import { SHAPChart } from '../components/SHAPChart';
import { Tier1DetectionCard } from '../components/Tier1DetectionCard';
import { Tier2RiskCard } from '../components/Tier2RiskCard';
import { ShapBreakdown } from '../components/ShapBreakdown';
import { ImputedValueCard } from '../components/ImputedValueCard';
import { SpatialConsensusPanel } from '../components/SpatialConsensusPanel';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Radio, 
  Activity, 
  Thermometer, 
  Gauge, 
  Droplets, 
  Wind,
  CloudRain, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { Station, Reading, AnomalyRecord, DisasterRiskSummary } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardPageProps {
  stations: Station[];
  liveReadings: Reading[];
  anomalies: AnomalyRecord[];
  disasterRisks?: DisasterRiskSummary;
  onNavigateTab: (tab: string) => void;
  is3DMode?: boolean;
}

import { useSkyGuardStore, CANONICAL_STATIONS } from '../store/useSkyGuardStore';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stations,
  liveReadings,
  anomalies,
  disasterRisks,
  onNavigateTab,
  is3DMode: initial3DMode = true
}) => {
  const { readingHistory, isSimulating, wsConnected } = useSkyGuardStore();
  const [selectedStationId, setSelectedStationId] = useState<string>('AWS-01');
  const [is3DView, setIs3DView] = useState<boolean>(initial3DMode);

  const selectedStation = stations.find(s => s.station_id === selectedStationId || s.id === selectedStationId) || stations[0] || CANONICAL_STATIONS[0];
  const activeAnomaliesCount = anomalies.filter(a => a.is_anomaly).length;

  // Dynamic System Health calculation across station network
  const overallHealth = Math.round(
    stations.reduce((acc, s) => acc + (s.health?.overall_health_score ?? 95), 0) / Math.max(1, stations.length)
  );
  const healthStatusLabel = overallHealth >= 90 ? 'OPTIMAL' : overallHealth >= 75 ? 'DEGRADED' : 'CRITICAL';
  const healthColorClass = overallHealth >= 90 ? 'text-emerald-700' : overallHealth >= 75 ? 'text-amber-700' : 'text-red-700';
  const healthDotClass = overallHealth >= 90 ? 'bg-emerald-600' : overallHealth >= 75 ? 'bg-amber-600' : 'bg-red-600';

  // Dynamic Composite Risk Level calculation
  const compositeRisk = disasterRisks?.composite_risk_level || 'LOW';
  const riskLabel = compositeRisk === 'LOW' ? 'NO THREAT' : compositeRisk === 'MEDIUM' ? 'ELEVATED RISK' : compositeRisk === 'HIGH' ? 'HIGH RISK' : 'SEVERE HAZARD';
  const riskColorClass = compositeRisk === 'LOW' ? 'text-emerald-700' : compositeRisk === 'MEDIUM' ? 'text-amber-700' : 'text-red-700';
  const riskDotClass = compositeRisk === 'LOW' ? 'bg-emerald-600' : compositeRisk === 'MEDIUM' ? 'bg-amber-600' : 'bg-red-600';

  const currentLiveReading = liveReadings.find(r => r.station_id === selectedStation.station_id || r.station_id === selectedStation.id);

  const currentTemp = currentLiveReading?.temperature ?? selectedStation.last_reading?.temperature ?? 28.5;
  const currentPress = currentLiveReading?.pressure ?? selectedStation.last_reading?.pressure ?? 1012.0;
  const currentHum = currentLiveReading?.humidity ?? selectedStation.last_reading?.humidity ?? 80.0;
  const currentWind = currentLiveReading?.wind_speed ?? 12.0;
  const currentRain = currentLiveReading?.rainfall ?? 0.0;

  // Filter reading history dynamically for selected station
  const stationHistory = readingHistory.filter(
    r => r.station_id === selectedStation.station_id || r.station_id === selectedStation.id
  );

  // Dynamic Parameter Trend Deltas
  const prevReading = stationHistory.length >= 2 ? stationHistory[stationHistory.length - 2] : null;
  const tempDelta = prevReading ? currentTemp - prevReading.temperature : 0.0;
  const pressDelta = prevReading ? currentPress - prevReading.pressure : 0.0;
  const humDelta = prevReading ? currentHum - prevReading.humidity : 0.0;

  const formatDeltaStr = (val: number, unit: string) => {
    if (Math.abs(val) < 0.01) return `0.0${unit}`;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}${unit}`;
  };

  const trendData = stationHistory.length >= 1
    ? stationHistory.slice(-15).map(r => ({
        time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live',
        temp: r.temperature,
        press: r.pressure,
        hum: r.humidity
      }))
    : [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), temp: currentTemp, press: currentPress, hum: currentHum }
      ];

  // Active Anomaly Evaluation for Selected Station
  const currentEval = currentLiveReading?.anomaly_evaluation;
  const isLiveAnom = Boolean(currentEval?.is_anomaly || (currentLiveReading?.injected_fault_type && currentLiveReading.injected_fault_type !== 'NONE'));
  const selectedStationAnom = isLiveAnom
    ? (anomalies.find(a => (a.station_id === selectedStation.station_id || a.station_id === selectedStation.id) && a.is_anomaly) || null)
    : null;
  const isAnomActive = isLiveAnom;

  const rawScore = currentEval
    ? Math.abs(currentEval.isolation_forest_score || 0)
    : (selectedStationAnom ? Math.abs(selectedStationAnom.isolation_forest_score || 0.35) : 0);
  const displayAnomalyScore = Number(Math.min(1.0, isAnomActive ? Math.max(0.45, rawScore) : 0.05).toFixed(2));
  const anomalyScoreOffset = Math.round(125 * (1 - displayAnomalyScore));

  const rootCauseText = (selectedStationAnom?.root_cause || currentEval?.root_cause || (currentLiveReading?.injected_fault_type !== 'NONE' ? currentLiveReading?.injected_fault_type : 'NONE') || '').toLowerCase();
  const isTempFlagged = isAnomActive && (rootCauseText.includes('temp') || rootCauseText.includes('spike'));
  const isPressFlagged = isAnomActive && (rootCauseText.includes('press') || rootCauseText.includes('drop'));
  const isHumFlagged = isAnomActive && (rootCauseText.includes('hum') || rootCauseText.includes('moisture'));

  const detectionTimestamp = selectedStationAnom?.timestamp 
    ? new Date(selectedStationAnom.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
    : currentLiveReading?.timestamp
    ? new Date(currentLiveReading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';

  const confidencePct = selectedStationAnom && selectedStationAnom.confidence !== null && selectedStationAnom.confidence !== undefined
    ? Math.round(selectedStationAnom.confidence * 100) 
    : currentEval && currentEval.confidence !== null && currentEval.confidence !== undefined
    ? Math.round(currentEval.confidence * 100) 
    : 95;

  const reasonText = isAnomActive && selectedStationAnom
    ? (selectedStationAnom.why_detected || `Flagged ${selectedStationAnom.root_cause || 'anomaly'}.`)
    : isAnomActive && currentEval && currentEval.is_anomaly
    ? (currentEval.why_detected || `Live stream detected ${currentEval.root_cause || 'anomaly'}.`)
    : 'All sensor readings within expected operational range.';

  const activeAnomalyRecord = selectedStationAnom;

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      
      {/* ROW 1: TOP 5 KPI OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: SYSTEM OVERVIEW */}
        <div className="luxury-card p-5 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-1 relative z-10">
            <span className="text-[11px] font-mono font-extrabold text-sky-700 uppercase tracking-widest block">
              SYSTEM OVERVIEW
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display tracking-wider leading-tight uppercase">
              ATMOSPHERIC COMMAND
            </h2>
            <p className="text-xs text-slate-600 font-sans leading-relaxed mt-1">
              Real-time AWS Monitoring, ML Anomaly Detection & Disaster Risk Intelligence
            </p>
          </div>
          <ShieldCheck className="absolute -bottom-2 -right-2 w-24 h-24 text-sky-500/10 pointer-events-none stroke-[1]" />
        </div>

        {/* Card 2: ACTIVE STATIONS */}
        <div className="luxury-card p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">
              ACTIVE STATIONS
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {stations.length < 10 ? `0${stations.length}` : stations.length}
            </div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center space-x-1.5 mt-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>100% OPERATIONAL</span>
            </div>
          </div>
          <div className="mt-3 h-6 w-full opacity-80">
            <svg className="w-full h-full text-sky-600" viewBox="0 0 100 25" fill="none">
              <path d="M0 20 Q 25 15, 50 18 T 100 8" stroke="#0284c7" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>

        {/* Card 3: ACTIVE ANOMALIES */}
        <div className="luxury-card p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">
              ACTIVE ANOMALIES
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {String(activeAnomaliesCount).padStart(2, '0')}
            </div>
            <div className={`text-xs font-semibold flex items-center space-x-1.5 mt-1 font-mono ${
              activeAnomaliesCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activeAnomaliesCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`}></span>
              <span>{activeAnomaliesCount > 0 ? `${activeAnomaliesCount} FLAGGED` : 'ALL NOMINAL'}</span>
            </div>
          </div>
          <div className="mt-3 h-6 w-full opacity-80">
            <svg className="w-full h-full text-sky-600" viewBox="0 0 100 25" fill="none">
              <path d="M0 22 Q 30 20, 60 12 T 100 18" stroke="#0284c7" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>

        {/* Card 4: SYSTEM HEALTH */}
        <div className="luxury-card p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">
              SYSTEM HEALTH
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {overallHealth}%
            </div>
            <div className={`text-xs font-semibold flex items-center space-x-1.5 mt-1 font-mono ${healthColorClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${healthDotClass}`}></span>
              <span>{healthStatusLabel}</span>
            </div>
          </div>
          <div className="mt-3 h-6 w-full opacity-80">
            <svg className="w-full h-full text-sky-600" viewBox="0 0 100 25" fill="none">
              <path d="M0 18 Q 30 10, 70 15 T 100 5" stroke="#0284c7" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>

        {/* Card 5: CURRENT RISK */}
        <div className="luxury-card p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">
              CURRENT RISK
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-3xl font-extrabold tracking-tight font-mono ${riskColorClass}`}>
              {compositeRisk}
            </div>
            <div className={`text-xs font-semibold flex items-center space-x-1.5 mt-1 font-mono ${riskColorClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${riskDotClass}`}></span>
              <span>{riskLabel}</span>
            </div>
          </div>
          <div className="mt-3 h-6 w-full opacity-80">
            <svg className="w-full h-full text-emerald-600" viewBox="0 0 100 25" fill="none">
              <path d="M0 15 Q 40 22, 70 12 T 100 20" stroke="#059669" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>

      </div>


      {/* ROW 2: LIVE AWS NETWORK MAP (~60%) + SELECTED STATION TELEMETRY (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Map Panel */}
        <div className="lg:col-span-7">
          {is3DView ? (
            <Station3DMap
              stations={stations}
              selectedStationId={selectedStation.station_id}
              onSelectStation={setSelectedStationId}
              onToggle3D={() => setIs3DView(false)}
            />
          ) : (
            <StationMap
              stations={stations}
              selectedStationId={selectedStation.station_id}
              onSelectStation={setSelectedStationId}
              onToggle3D={() => setIs3DView(true)}
            />
          )}
        </div>

        {/* Right Selected Station Details */}
        <div className="lg:col-span-5 luxury-card p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-mono font-extrabold text-sky-700 uppercase tracking-widest block">
                SELECTED STATION TELEMETRY
              </span>
              <h3 className="text-lg font-black text-slate-900 font-display tracking-wider uppercase mt-0.5">
                {selectedStation.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                {selectedStation.station_id} · {selectedStation.coordinates.lat}° N, {selectedStation.coordinates.lon}° E
              </p>
            </div>

          {/* Dynamic station status badge — reflects real anomaly/health state */}
          {(() => {
            const stHealth = selectedStation.health?.overall_health_score ?? 100;
            const stLabel = isAnomActive ? 'ANOMALY' : stHealth < 75 ? 'DEGRADED' : 'NORMAL';
            const stColor = isAnomActive
              ? 'bg-red-50 border-red-200 text-red-700'
              : stHealth < 75
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700';
            const stDot = isAnomActive
              ? 'bg-red-500 animate-ping'
              : stHealth < 75
              ? 'bg-amber-500 animate-pulse'
              : 'bg-emerald-500 animate-pulse';
            return (
              <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${stColor}`}>
                <span className={`w-2 h-2 rounded-full ${stDot}`}></span>
                <span>{stLabel}</span>
              </div>
            );
          })()}
        </div>

          {/* 3 Parameter Readout Cards */}
          <div className="grid grid-cols-3 gap-3 font-sans">
            
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-600 text-[10px] font-mono font-bold uppercase">
                <Thermometer className="w-3.5 h-3.5 text-red-600" />
                <span>TEMP</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight mt-1.5">
                {currentTemp.toFixed(1)}°C
              </div>
              <div className={`text-[10px] font-mono font-bold mt-1 flex items-center justify-center space-x-0.5 ${
                tempDelta >= 0 ? 'text-emerald-700' : 'text-sky-700'
              }`}>
                {tempDelta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-sky-600" />}
                <span>{formatDeltaStr(tempDelta, '°C')}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-600 text-[10px] font-mono font-bold uppercase">
                <Gauge className="w-3.5 h-3.5 text-sky-600" />
                <span>PRESSURE</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight mt-1.5">
                {currentPress.toFixed(1)} <span className="text-[10px] font-semibold text-slate-500">hPa</span>
              </div>
              <div className={`text-[10px] font-mono font-bold mt-1 flex items-center justify-center space-x-0.5 ${
                pressDelta >= 0 ? 'text-emerald-700' : 'text-sky-700'
              }`}>
                {pressDelta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-sky-600" />}
                <span>{formatDeltaStr(pressDelta, ' hPa')}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-600 text-[10px] font-mono font-bold uppercase">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                <span>HUMIDITY</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight mt-1.5">
                {currentHum.toFixed(1)}%
              </div>
              <div className={`text-[10px] font-mono font-bold mt-1 flex items-center justify-center space-x-0.5 ${
                humDelta >= 0 ? 'text-emerald-700' : 'text-sky-700'
              }`}>
                {humDelta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-sky-600" />}
                <span>{formatDeltaStr(humDelta, '%')}</span>
              </div>
            </div>

          </div>

          {/* Live Sensor Trend Chart */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600 mb-2">
              <span className="uppercase tracking-wider text-[10px] text-sky-700">LIVE SENSOR TREND (LAST 30 MINS)</span>
              <div className="flex items-center space-x-3 text-[10px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-slate-700">Temp</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  <span className="text-slate-700">Press</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span className="text-slate-700">Hum</span>
                </span>
              </div>
            </div>

            <div className="h-44 w-full bg-slate-50 rounded-xl border border-slate-200 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#0f172a' }} 
                  />
                  <Line type="monotone" dataKey="temp" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="press" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="hum" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>


      {/* ROW 3: TIER 1 & TIER 2 SIDE-BY-SIDE PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        <Tier1DetectionCard
          selectedStation={selectedStation}
          currentReading={currentLiveReading}
          activeAnomaly={selectedStationAnom || undefined}
        />

        {/* Dynamic AI Cascade Pipeline Stream Connector */}
        <div className="hidden lg:flex flex-col items-center justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group">
          {/* Subtle Data Stream Laser Line behind beacon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-[2px] bg-gradient-to-r from-sky-400 via-sky-300 to-emerald-400 -z-10 pointer-events-none opacity-70 overflow-hidden rounded-full">
            <motion.div
              className="w-8 h-full bg-white shadow-[0_0_8px_#38bdf8]"
              animate={{ x: [-32, 112] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
          </div>

          {/* Radiating Ripple Rings */}
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.85, 2.2], opacity: [0.65, 0.2, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
              className={`absolute w-10 h-10 rounded-full ${
                isAnomActive && displayAnomalyScore > 0.6
                  ? 'bg-red-400/40'
                  : isAnomActive
                  ? 'bg-amber-400/40'
                  : 'bg-sky-400/40'
              }`}
            />
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: 0.7, ease: 'easeOut' }}
              className={`absolute w-10 h-10 rounded-full ${
                isAnomActive && displayAnomalyScore > 0.6
                  ? 'bg-red-400/30'
                  : isAnomActive
                  ? 'bg-amber-400/30'
                  : 'bg-sky-400/30'
              }`}
            />

            {/* Central Beacon Disc */}
            <div
              className={`relative w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                isAnomActive && displayAnomalyScore > 0.6
                  ? 'border-red-400 text-red-600 shadow-[0_0_14px_rgba(239,68,68,0.35)]'
                  : isAnomActive
                  ? 'border-amber-400 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'border-sky-300 text-sky-700 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
              }`}
              title="Tier 1 Anomaly Isolation cascades directly into Tier 2 Risk Engine"
            >
              <motion.div
                animate={{ x: [-2, 3, -2] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                className="flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </div>

          {/* Floating Pipeline Badge */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none transition-opacity duration-200">
            <span
              className={`inline-flex items-center text-[8px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-xs bg-white/95 ${
                isAnomActive && displayAnomalyScore > 0.6
                  ? 'text-red-700 border-red-200'
                  : isAnomActive
                  ? 'text-amber-700 border-amber-200'
                  : 'text-sky-700 border-sky-200'
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full mr-1 ${
                  isAnomActive && displayAnomalyScore > 0.6
                    ? 'bg-red-500 animate-ping'
                    : isAnomActive
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              AI CASCADE
            </span>
          </div>
        </div>

        <Tier2RiskCard
          selectedStation={selectedStation}
          currentReading={currentLiveReading}
          activeAnomaly={selectedStationAnom || undefined}
        />
      </div>


      {/* ROW 4: SYSTEM ALERTS BOTTOM BAR */}
      <div className="luxury-card p-4 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between text-xs font-sans gap-3">
        <div className="flex flex-wrap items-center gap-6">
          <span className="font-extrabold text-slate-900 uppercase font-mono tracking-widest flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>SYSTEM ALERTS</span>
          </span>

          {/* Dynamic: anomaly status */}
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <span className={`w-2 h-2 rounded-full ${activeAnomaliesCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span>{activeAnomaliesCount > 0 ? `${activeAnomaliesCount} active anomal${activeAnomaliesCount > 1 ? 'ies' : 'y'} flagged` : 'All systems nominal'}</span>
          </div>

          {/* Dynamic: WebSocket connection */}
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-sky-600' : 'bg-amber-500 animate-pulse'}`}></span>
            <span>{wsConnected ? 'WebSocket connected' : 'WebSocket reconnecting...'}</span>
          </div>

          {/* Dynamic: simulation state */}
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-indigo-600' : 'bg-slate-400'}`}></span>
            <span>{isSimulating ? 'Simulation streaming' : 'Simulation paused'}</span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('anomalies')}
          className="text-sky-700 hover:text-sky-800 font-bold font-mono text-xs flex items-center space-x-1.5 whitespace-nowrap"
        >
          <span>VIEW ALL ALERTS</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dynamic SHAP Breakdown & Deep Inspection Section */}
      <div className="space-y-6 pt-4">
        <div className="section-header">
          <div className="section-number">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span>REAL-TIME EXPLAINABLE AI</span>
          </div>
          <h2 className="section-title text-slate-900">Deep Inspection & Dynamic SHAP Breakdown</h2>
        </div>

        <ShapBreakdown
          selectedStation={selectedStation}
          currentReading={currentLiveReading}
          activeAnomaly={selectedStationAnom || undefined}
        />

        {activeAnomaliesCount > 0 && activeAnomalyRecord && (
          <>
            <ImputedValueCard imputation={activeAnomalyRecord.imputed_value_suggestion} />
            <SpatialConsensusPanel spatialVerdict={activeAnomalyRecord.spatial_verdict} />
          </>
        )}
      </div>

    </div>
  );
};

