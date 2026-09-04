import React from 'react';
import { Wrench, AlertTriangle, CheckCircle, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export interface FaultDiagnosis {
  fault_code: string;
  fault_label: string;
  confidence: number;
  field_technician_directive: string;
  probability_breakdown: Record<string, number>;
  urgency: string;
}

interface Props {
  diagnosis?: FaultDiagnosis;
}

export const FaultDiagnosticCard: React.FC<Props> = ({ diagnosis }) => {
  if (!diagnosis) {
    return (
      <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center space-x-3 text-sky-600 mb-2">
          <Wrench className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
            Multi-Class Hardware Fault Diagnostic Classifier
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-sans">No active sensor hardware fault detected on current stream sample.</p>
      </div>
    );
  }

  const { fault_code, fault_label, confidence, field_technician_directive, probability_breakdown, urgency } = diagnosis;

  return (
    <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-600">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
              🛠️ Multi-Class Hardware Fault Diagnostic Classifier
            </h3>
            <p className="text-xs text-slate-500">
              RandomForest Multi-Class Classifier trained on 6 physical sensor breakdown signatures
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 font-mono font-bold text-xs rounded-full">
            {urgency} URGENCY
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold text-xs rounded-full">
            {(confidence * 100).toFixed(1)}% CONFIDENCE
          </span>
        </div>
      </div>

      {/* Main Diagnosed Cause Card */}
      <div className="p-4 bg-gradient-to-r from-rose-50 via-slate-50 to-white rounded-xl border border-rose-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 font-mono">
            Diagnosed Fault Mode: {fault_code}
          </span>
          <Cpu className="w-4 h-4 text-rose-600" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 font-display">
          {fault_label}
        </h4>
        <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-slate-700 flex items-start space-x-2.5">
          <Wrench className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Field Technician Repair Directive:</span>
            <span>{field_technician_directive}</span>
          </div>
        </div>
      </div>

      {/* Probability Breakdown Progress Bars */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-slate-700 uppercase font-display tracking-wider block">
          Diagnostic Classification Probabilities:
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(probability_breakdown).map(([code, prob]) => (
            <div key={code} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className={`font-semibold ${code === fault_code ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                  {code}
                </span>
                <span className="font-bold text-slate-900">{(prob * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prob * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${code === fault_code ? 'bg-rose-600' : 'bg-sky-500'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
