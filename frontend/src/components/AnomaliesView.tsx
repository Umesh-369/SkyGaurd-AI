import React from 'react';
import { ShieldCheck, Brain, AlertTriangle, CloudRain, WifiOff, FileText, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { ShapBreakdown } from './ShapBreakdown';
import { ImputedValueCard } from './ImputedValueCard';
import { SpatialConsensusPanel } from './SpatialConsensusPanel';
import { AnomalyRecord } from '../types';
import { getCanonicalStationName } from '../store/useSkyGuardStore';

interface AnomaliesViewProps {
  selectedAnomaly?: AnomalyRecord;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({ selectedAnomaly }) => {
  if (!selectedAnomaly) {
    return (
      <div className="luxury-card p-12 bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px] font-sans">
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-600">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h3 className="text-base font-black font-display uppercase tracking-wider text-slate-900">
          AWS Station Network Operating Normally
        </h3>
        <p className="text-xs text-slate-600 max-w-md leading-relaxed">
          No anomalies detected. Inject custom fault modes (Temperature Spike, Pressure Drop, Bias Drift, Frozen Sensor, or Station Offline) in the <strong>Virtual AWS Simulator Studio</strong> to trigger real-time ML identification, SHAP feature breakdown, and spatio-temporal value imputation.
        </p>
      </div>
    );
  }

  const stationName = getCanonicalStationName(selectedAnomaly.station_id || selectedAnomaly.stationId);
  const isComm = selectedAnomaly.category === 'COMMUNICATION_FAILURE' || selectedAnomaly.status === 'Communication Failure' || selectedAnomaly.root_cause === 'station_offline' || selectedAnomaly.root_cause === 'delayed_data' || selectedAnomaly.root_cause === 'missing_data';
  const isDeterministic = isComm || Boolean(selectedAnomaly.is_deterministic);
  const isHistorical = Boolean(selectedAnomaly.is_historical);

  const category = selectedAnomaly.category || (isComm ? 'COMMUNICATION_FAILURE' : (selectedAnomaly.spatial_verdict?.includes('CORROBORATED') ? 'GENUINE_WEATHER_EVENT' : 'SENSOR_FAULT'));
  const interpretation = selectedAnomaly.interpretation || (isComm ? 'Communication Failure' : (category === 'GENUINE_WEATHER_EVENT' ? 'Genuine Weather Event' : 'Likely Sensor Fault'));

  const confidenceDisplay = isDeterministic || selectedAnomaly.confidence === null || selectedAnomaly.confidence === undefined
    ? 'N/A (Deterministic Rule Check)'
    : `${Math.round(selectedAnomaly.confidence * 100)}%`;

  const ifScoreDisplay = isDeterministic
    ? 'N/A (Bypassed ML)'
    : typeof selectedAnomaly.isolation_forest_score === 'number'
    ? `${selectedAnomaly.isolation_forest_score.toFixed(4)} (Threshold: -0.0200)`
    : 'N/A';

  return (
    <div className="space-y-6 font-sans min-w-0 w-full">
      
      {/* Historical / Archived Notice Banner */}
      {isHistorical && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-mono text-amber-900 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <History className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Archived Record:</strong> Anomaly is no longer in the active live feed. Displaying persisted incident report from historical memory.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800 shrink-0 uppercase">
            ARCHIVED LOG
          </span>
        </div>
      )}

      {/* Top Detail Card */}
      <div className="luxury-card p-5 sm:p-6 bg-white border border-slate-200 shadow-sm space-y-5 min-w-0 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-mono font-bold text-sky-700 tracking-wider">{selectedAnomaly.id}</span>
              <span className="text-slate-400">·</span>
              {category === 'COMMUNICATION_FAILURE' ? (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1 shrink-0">
                  <WifiOff className="w-3 h-3 shrink-0" />
                  <span>COMMUNICATION FAILURE</span>
                </span>
              ) : category === 'GENUINE_WEATHER_EVENT' ? (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center space-x-1 shrink-0">
                  <CloudRain className="w-3 h-3 shrink-0" />
                  <span>GENUINE WEATHER EVENT</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1 shrink-0">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>SENSOR FAULT</span>
                </span>
              )}
              {isDeterministic && (
                <span className="text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                  RULE-BASED
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-wide mt-1.5 truncate">
              {stationName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-slate-600">
              <span>TIMESTAMP: {new Date(selectedAnomaly.timestamp).toLocaleString()}</span>
              <span>·</span>
              <span className="text-sky-800 font-semibold">INTERPRETATION: {interpretation}</span>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono space-y-1 shrink-0">
            <span className={`text-xs font-black px-3 py-1 rounded-full border inline-block ${
              selectedAnomaly.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              {selectedAnomaly.severity} SEVERITY
            </span>
            <div className="text-xs text-slate-600">
              CALIBRATED CONFIDENCE: <span className="font-bold text-sky-700">{confidenceDisplay}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              IF SCORE: <span className="font-bold text-slate-800">{ifScoreDisplay}</span>
            </div>
          </div>
        </div>

        {/* Explainability Narrative Banner (Single Source of Truth) */}
        {selectedAnomaly.why_detected && (
          <div className={`p-4 rounded-xl space-y-1.5 border ${
            isDeterministic ? 'bg-purple-50/70 border-purple-200' : 'bg-sky-50/80 border-sky-200'
          }`}>
            <div className="flex items-center space-x-2 text-sky-800">
              {isDeterministic ? (
                <WifiOff className="w-4 h-4 text-purple-700 shrink-0" />
              ) : (
                <Brain className="w-4 h-4 text-sky-700 shrink-0" />
              )}
              <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                isDeterministic ? 'text-purple-800' : 'text-sky-800'
              }`}>
                {isDeterministic ? 'Deterministic Protocol Diagnosis — Telemetry Check' : 'Single Source of Truth — Model Explainability Narrative'}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-sans leading-relaxed break-words">
              {selectedAnomaly.why_detected}
            </p>
          </div>
        )}

        {/* Readout Parameter Values Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
          <div className="bg-slate-50/80 hover:bg-slate-50 transition-colors p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 uppercase block font-semibold">Temperature Reading</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {typeof selectedAnomaly.readings?.temperature === 'number' ? `${selectedAnomaly.readings.temperature.toFixed(1)} °C` : 'N/A'}
            </span>
          </div>
          <div className="bg-slate-50/80 hover:bg-slate-50 transition-colors p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 uppercase block font-semibold">Pressure Reading</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {typeof selectedAnomaly.readings?.pressure === 'number' ? `${selectedAnomaly.readings.pressure.toFixed(1)} hPa` : 'N/A'}
            </span>
          </div>
          <div className="bg-slate-50/80 hover:bg-slate-50 transition-colors p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 uppercase block font-semibold">Humidity Reading</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {typeof selectedAnomaly.readings?.humidity === 'number' ? `${selectedAnomaly.readings.humidity.toFixed(1)} %` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory SHAP Feature Contributions Chart */}
      <ShapBreakdown activeAnomaly={selectedAnomaly} />

      {/* Imputed Value Suggestion */}
      <ImputedValueCard imputation={selectedAnomaly.imputed_value_suggestion} />

      {/* Spatial Consistency Consensus Panel */}
      <SpatialConsensusPanel spatialVerdict={selectedAnomaly.spatial_verdict} />
    </div>
  );
};
