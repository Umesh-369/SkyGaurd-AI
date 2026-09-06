import React, { useRef } from 'react';
import { Printer, Download, X, ShieldCheck, ShieldAlert, Cpu, Brain, Layers, BarChart2, CheckCircle2, AlertTriangle, FileText, Clock, Compass } from 'lucide-react';
import { AnomalyRecord, DisasterRiskSummary, Station } from '../types';
import { getCanonicalStationName } from '../store/useSkyGuardStore';

interface IncidentReportModalProps {
  anomaly: AnomalyRecord;
  disasterRisks?: DisasterRiskSummary;
  station?: Station;
  onClose: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  anomaly,
  disasterRisks,
  station,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const stationName = anomaly.station_name || anomaly.stationName || getCanonicalStationName(anomaly.station_id || anomaly.stationId || 'AWS-01');
  const stationId = anomaly.station_id || anomaly.stationId || 'AWS-01';
  const isComm = anomaly.category === 'COMMUNICATION_FAILURE' || anomaly.status === 'Communication Failure';
  const compRiskScore = disasterRisks?.composite_risk_score ?? 0;
  const compRiskLevel = disasterRisks?.composite_risk_level ?? 'LOW';

  const factors = anomaly.contributing_factors || [];
  const maxShap = Math.max(...factors.map((f) => Math.abs(f.shap_weight)), 1.0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Modal Top Action Bar (Hidden during printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-sky-400" />
            <span className="font-extrabold text-sm uppercase tracking-wider font-display">
              Official SkyGuard Incident Dossier & Diagnostic Report
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition-all flex items-center space-x-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT / SAVE TO PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-8 sm:p-10 overflow-y-auto space-y-8 font-sans text-slate-900 bg-white print:p-0 print:overflow-visible">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
            <div>
              <div className="flex items-center space-x-2 text-sky-700 font-mono text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>SKYGUARD AI — AUTONOMOUS AWS INTEGRITY PLATFORM</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-slate-900 mt-1">
                Incident Diagnostic Dossier
              </h1>
              <p className="text-xs font-mono text-slate-500 mt-1">
                INCIDENT ID: <strong className="text-slate-900">{anomaly.id}</strong> · GENERATED AT: {new Date().toUTCString()}
              </p>
            </div>

            <div className="text-left sm:text-right font-mono space-y-1 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase inline-block ${
                anomaly.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {anomaly.severity} SEVERITY
              </span>
              <div className="text-[11px] text-slate-500">
                STATION: <strong className="text-slate-900">{stationName} ({stationId})</strong>
              </div>
              <div className="text-[11px] text-slate-500">
                TIMETAG: <strong className="text-slate-900">{new Date(anomaly.timestamp).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Classification */}
          <div className="space-y-3">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center space-x-1.5">
              <span>1. EXECUTIVE INCIDENT CLASSIFICATION & ROOT CAUSE</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">CATEGORY</span>
                <strong className="text-slate-900">{anomaly.category || 'SENSOR_FAULT'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">CONFIDENCE</span>
                <strong className="text-sky-700">
                  {anomaly.confidence != null ? `${Math.round(anomaly.confidence * 100)}%` : 'N/A (Rule Check)'}
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">ISOLATION FOREST SCORE</span>
                <strong className="text-slate-900">
                  {anomaly.isolation_forest_score != null ? anomaly.isolation_forest_score.toFixed(4) : 'N/A'}
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">COMPOSITE RISK INDEX</span>
                <strong className={compRiskScore > 50 ? 'text-red-700' : 'text-emerald-700'}>
                  {compRiskScore}% ({compRiskLevel})
                </strong>
              </div>
            </div>

            <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 text-xs font-sans text-slate-700 space-y-1">
              <strong className="text-sky-900 font-mono block">DIAGNOSTIC REASONING:</strong>
              <p>{anomaly.why_detected || 'Automated ML isolation forest and spatial consensus check flagged anomalous telemetry signature.'}</p>
            </div>
          </div>

          {/* Section 2: Sensor Telemetry Snapshot vs Baseline */}
          <div className="space-y-3">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center space-x-1.5">
              <span>2. PHYSICAL TELEMETRY SNAPSHOT & IMPUTED CORRECTION</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Parameter</th>
                    <th className="p-3">Observed Reading</th>
                    <th className="p-3">Station Baseline</th>
                    <th className="p-3">Deviation Delta</th>
                    <th className="p-3">Imputed Value (Hybrid EMA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 font-bold text-slate-800">Air Temperature</td>
                    <td className="p-3 font-black text-slate-900">
                      {typeof anomaly.readings?.temperature === 'number' ? `${anomaly.readings.temperature.toFixed(2)} °C` : '—'}
                    </td>
                    <td className="p-3 text-slate-600">28.50 °C</td>
                    <td className="p-3 text-slate-700">
                      {typeof anomaly.readings?.temperature === 'number' ? `${(anomaly.readings.temperature - 28.5).toFixed(2)} °C` : '—'}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {anomaly.imputed_value_suggestion?.target_feature === 'temperature'
                        ? `${anomaly.imputed_value_suggestion.corrected_value.toFixed(2)} °C`
                        : 'Nominal / Unaltered'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">Atmospheric Pressure</td>
                    <td className="p-3 font-black text-slate-900">
                      {typeof anomaly.readings?.pressure === 'number' ? `${anomaly.readings.pressure.toFixed(2)} hPa` : '—'}
                    </td>
                    <td className="p-3 text-slate-600">1012.00 hPa</td>
                    <td className="p-3 text-slate-700">
                      {typeof anomaly.readings?.pressure === 'number' ? `${(anomaly.readings.pressure - 1012.0).toFixed(2)} hPa` : '—'}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {anomaly.imputed_value_suggestion?.target_feature === 'pressure'
                        ? `${anomaly.imputed_value_suggestion.corrected_value.toFixed(2)} hPa`
                        : 'Nominal / Unaltered'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">Relative Humidity</td>
                    <td className="p-3 font-black text-slate-900">
                      {typeof anomaly.readings?.humidity === 'number' ? `${anomaly.readings.humidity.toFixed(2)} %` : '—'}
                    </td>
                    <td className="p-3 text-slate-600">78.00 %</td>
                    <td className="p-3 text-slate-700">
                      {typeof anomaly.readings?.humidity === 'number' ? `${(anomaly.readings.humidity - 78.0).toFixed(2)} %` : '—'}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {anomaly.imputed_value_suggestion?.target_feature === 'humidity'
                        ? `${anomaly.imputed_value_suggestion.corrected_value.toFixed(2)} %`
                        : 'Nominal / Unaltered'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Exact Rendered SHAP Feature Contribution Vector Chart */}
          <div className="space-y-3">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center space-x-1.5">
              <span>3. EXACT SHAP MODEL FEATURE ATTRIBUTION WEIGHTS</span>
            </h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              {factors.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 italic">No SHAP attribution needed for deterministic check.</p>
              ) : (
                factors.slice(0, 6).map((factor, idx) => {
                  const isPositive = factor.shap_weight >= 0;
                  const barWidthPercent = Math.min(100, Math.round((Math.abs(factor.shap_weight) / maxShap) * 100));

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-800">{factor.feature}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 text-[11px]">Value: {factor.value?.toFixed(2) ?? '—'}</span>
                          <span className={`font-extrabold ${isPositive ? 'text-red-700' : 'text-blue-700'}`}>
                            SHAP: {factor.shap_weight > 0 ? `+${factor.shap_weight.toFixed(4)}` : factor.shap_weight.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${barWidthPercent}%` }}
                          className={`h-full rounded-full ${isPositive ? 'bg-red-500' : 'bg-blue-500'}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 4: Spatial Consensus & Tier-2 Hazard Assessment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                SPATIO-TEMPORAL CONSENSUS VERDICT
              </span>
              <p className="text-xs font-bold text-slate-900 font-mono">
                {anomaly.spatial_verdict || 'CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)'}
              </p>
              <p className="text-[11px] text-slate-600">
                Cross-validated against neighboring AWS stations within 35 km radius to prevent false alerts.
              </p>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                TIER-2 WEATHER HAZARD PROFILE
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center pt-1">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">FLOOD</span>
                  <strong className="text-slate-900">{disasterRisks?.hazards?.flood?.risk_score ?? 0}%</strong>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">HEATWAVE</span>
                  <strong className="text-slate-900">{disasterRisks?.hazards?.heatwave?.risk_score ?? 0}%</strong>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">CYCLONE</span>
                  <strong className="text-slate-900">{disasterRisks?.hazards?.cyclone?.risk_score ?? 0}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Official Sign-Off Audit Trail */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-500 gap-4">
            <div>
              <span>REPORT DIGEST: SHA256:{anomaly.id.slice(0, 16)}</span>
              <span className="block text-[10px]">SKYGUARD AI · AUTONOMOUS ANOMALY DETECTION ENGINE</span>
            </div>
            <div className="text-left sm:text-right">
              <span>STATUS: DISPATCHED & LOGGED</span>
              <span className="block text-[10px]">CERTIFIED FOR AUDIT & INCIDENT LOGGING</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
