import React from 'react';
import { Cpu, Activity, AlertTriangle, CheckCircle2, Waves, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export interface DeepAnomalyIntelligence {
  is_deep_anomaly: boolean;
  reconstruction_loss: number;
  threshold: number;
  severity: string;
  confidence: number;
  reconstructed_window?: Array<{ temperature: number; pressure: number; humidity: number }>;
}

interface Props {
  deepIntelligence?: DeepAnomalyIntelligence;
}

export const DeepLearningPanel: React.FC<Props> = ({ deepIntelligence }) => {
  if (!deepIntelligence) {
    return (
      <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center space-x-3 text-sky-600 mb-2">
          <Cpu className="w-5 h-5 animate-pulse" />
          <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
            Deep Learning Anomaly Detector (PyTorch LSTM-Autoencoder)
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-sans">Evaluating sliding window sequence through LSTM Autoencoder...</p>
      </div>
    );
  }

  const { is_deep_anomaly, reconstruction_loss, threshold, severity, confidence } = deepIntelligence;

  const lossRatio = minMax((reconstruction_loss / maxVal(threshold, 0.001)) * 50.0, 0, 100);

  function minMax(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
  }

  function maxVal(a: number, b: number) {
    return Math.max(a, b);
  }

  return (
    <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
              🧠 Deep Learning Anomaly Detector (PyTorch LSTM-Autoencoder)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates non-linear temporal sequence reconstruction error over a 12-step sliding window
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 font-mono font-bold text-xs rounded-full border ${
            is_deep_anomaly ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
          }`}>
            {is_deep_anomaly ? `DEEP ANOMALY (${severity})` : 'SEQUENCE NORMAL'}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold text-xs rounded-full">
            {(confidence * 100).toFixed(1)}% CONFIDENCE
          </span>
        </div>
      </div>

      {/* Loss Meter */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="font-bold text-slate-700">Reconstruction Loss (MSE):</span>
          <div className="text-right">
            <span className={`font-extrabold text-sm ${is_deep_anomaly ? 'text-rose-600' : 'text-emerald-700'}`}>
              {reconstruction_loss.toFixed(4)}
            </span>
            <span className="text-[10px] text-slate-500 block">Threshold = {threshold.toFixed(4)}</span>
          </div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${lossRatio}%` }}
            transition={{ duration: 0.6 }}
            className={`h-full ${is_deep_anomaly ? 'bg-rose-600' : 'bg-indigo-600'}`}
          />
        </div>
      </div>

      {/* Latent Feature Space Architecture Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-700">
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">Sequence Length</span>
          <span className="font-bold text-slate-900">12 Timesteps</span>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">Input Dimension</span>
          <span className="font-bold text-slate-900">3 Features (T,P,RH)</span>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">Latent Bottleneck</span>
          <span className="font-bold text-indigo-700">8 Neurons</span>
        </div>
        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">Decoder Hidden</span>
          <span className="font-bold text-slate-900">16 Neurons</span>
        </div>
      </div>

    </div>
  );
};
