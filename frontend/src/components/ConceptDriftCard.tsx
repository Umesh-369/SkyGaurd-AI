import React from 'react';
import { RefreshCw, Activity, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ConceptDriftData {
  station_id: string;
  concept_drift_index: number;
  drift_status: string;
  running_baselines: {
    temperature: { mean: number; std: number };
    pressure: { mean: number; std: number };
    humidity: { mean: number; std: number };
  };
  feature_drift_ratios: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
}

interface Props {
  driftData?: ConceptDriftData;
}

export const ConceptDriftCard: React.FC<Props> = ({ driftData }) => {
  if (!driftData) {
    return (
      <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center space-x-3 text-sky-600 mb-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
            Online Continual Stream Learner
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-sans">Accumulating stream samples for online Welford baseline adaptation...</p>
      </div>
    );
  }

  const { concept_drift_index, drift_status, running_baselines, feature_drift_ratios } = driftData;

  const getDriftBadge = (status: string) => {
    if (status.includes('SIGNIFICANT')) {
      return { label: 'SIGNIFICANT CONCEPT DRIFT', color: 'bg-rose-100 text-rose-900 border-rose-300', icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> };
    } else if (status.includes('MODERATE')) {
      return { label: 'MODERATE BASELINE SHIFT', color: 'bg-amber-100 text-amber-900 border-amber-300', icon: <Activity className="w-3.5 h-3.5 text-amber-600" /> };
    }
    return { label: 'BASELINE STABLE', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> };
  };

  const badge = getDriftBadge(drift_status);

  return (
    <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
              🔄 Online Stream Learner & Concept Drift Engine
            </h3>
            <p className="text-xs text-slate-500">
              Welford online statistics accumulator + Page-Hinkley CUSUM drift detection
            </p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-full border text-xs font-bold font-mono flex items-center space-x-1.5 ${badge.color}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Main Concept Drift Index Progress */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="font-bold text-slate-700">Concept Drift Index:</span>
          <span className="font-extrabold text-sky-800 text-sm">{concept_drift_index}%</span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, concept_drift_index)}%` }}
            transition={{ duration: 0.6 }}
            className={`h-full ${
              concept_drift_index >= 75 ? 'bg-rose-600' : concept_drift_index >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Adapted Welford Baselines */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase font-display tracking-wider block">
          Adapted Welford Running Baselines:
        </span>

        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          {/* Temp */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 block font-sans">Temperature Mean</span>
            <span className="text-sm font-extrabold text-slate-900">{running_baselines.temperature.mean}°C</span>
            <span className="text-[10px] text-slate-500 block">σ = ±{running_baselines.temperature.std}°C</span>
          </div>

          {/* Pressure */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 block font-sans">Pressure Mean</span>
            <span className="text-sm font-extrabold text-slate-900">{running_baselines.pressure.mean} hPa</span>
            <span className="text-[10px] text-slate-500 block">σ = ±{running_baselines.pressure.std} hPa</span>
          </div>

          {/* Humidity */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 block font-sans">Humidity Mean</span>
            <span className="text-sm font-extrabold text-slate-900">{running_baselines.humidity.mean}%</span>
            <span className="text-[10px] text-slate-500 block">σ = ±{running_baselines.humidity.std}%</span>
          </div>
        </div>
      </div>

    </div>
  );
};
