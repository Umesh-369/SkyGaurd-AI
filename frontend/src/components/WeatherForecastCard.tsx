import React from 'react';
import { TrendingUp, TrendingDown, CloudRain, Sun, Wind, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ForecastHorizon {
  horizon: string;
  temperature: { predicted: number; lower_95: number; upper_95: number };
  pressure: { predicted: number; lower_95: number; upper_95: number };
  humidity: { predicted: number; lower_95: number; upper_95: number };
}

export interface ForecastIntelligence {
  forecast_horizons: ForecastHorizon[];
  trend_status: string;
  horizon_6h_delta_temp: number;
  horizon_6h_delta_press: number;
  model_architecture?: string;
}

interface Props {
  forecast?: ForecastIntelligence;
}

export const WeatherForecastCard: React.FC<Props> = ({ forecast }) => {
  if (!forecast || !forecast.forecast_horizons || forecast.forecast_horizons.length === 0) {
    return (
      <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center space-x-3 text-sky-600 mb-2">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
            Time-Series Weather Forecaster (PyTorch GRU)
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-sans">Initializing GRU forecasting model stream...</p>
      </div>
    );
  }

  const { forecast_horizons, trend_status, horizon_6h_delta_temp, horizon_6h_delta_press } = forecast;

  const getTrendBadge = (status: string) => {
    switch (status) {
      case 'STORM_FRONT_APPROACHING':
        return {
          label: 'STORM FRONT APPROACHING',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <CloudRain className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
        };
      case 'THERMAL_HEAT_SURGE':
        return {
          label: 'THERMAL HEAT SURGE',
          color: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: <Sun className="w-3.5 h-3.5 text-rose-600" />
        };
      default:
        return {
          label: 'MICROCLIMATE STABLE',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <Wind className="w-3.5 h-3.5 text-emerald-600" />
        };
    }
  };

  const badge = getTrendBadge(trend_status);

  return (
    <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-extrabold uppercase font-display tracking-wider text-slate-900">
              🔮 Time-Series Weather & Drift Forecaster (PyTorch GRU)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multi-horizon prediction (+1h, +3h, +6h) with 95% Gaussian confidence intervals
          </p>
        </div>

        <div className={`px-3 py-1.5 rounded-full border text-xs font-bold font-mono flex items-center space-x-1.5 ${badge.color}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* 6h Trajectory Summary */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-600 font-medium">6-Hour Δ Temperature:</span>
          <span className={`font-mono font-bold ${horizon_6h_delta_temp >= 0 ? 'text-rose-600' : 'text-sky-600'}`}>
            {horizon_6h_delta_temp >= 0 ? `+${horizon_6h_delta_temp.toFixed(1)}` : horizon_6h_delta_temp.toFixed(1)} °C
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-600 font-medium">6-Hour Δ Pressure:</span>
          <span className={`font-mono font-bold ${horizon_6h_delta_press >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {horizon_6h_delta_press >= 0 ? `+${horizon_6h_delta_press.toFixed(1)}` : horizon_6h_delta_press.toFixed(1)} hPa
          </span>
        </div>
      </div>

      {/* Horizons Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {forecast_horizons.map((hz, idx) => (
          <motion.div
            key={hz.horizon}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 bg-gradient-to-br from-slate-50 to-sky-50/30 rounded-xl border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-sky-800 uppercase font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {hz.horizon}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">95% Bounds</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {/* Temperature */}
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans text-[11px]">Temp:</span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{hz.temperature.predicted}°C</span>
                  <span className="text-[10px] text-slate-500 block">
                    [{hz.temperature.lower_95} - {hz.temperature.upper_95}]
                  </span>
                </div>
              </div>

              {/* Pressure */}
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans text-[11px]">Pressure:</span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{hz.pressure.predicted} hPa</span>
                  <span className="text-[10px] text-slate-500 block">
                    [{hz.pressure.lower_95} - {hz.pressure.upper_95}]
                  </span>
                </div>
              </div>

              {/* Humidity */}
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans text-[11px]">Humidity:</span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">{hz.humidity.predicted}%</span>
                  <span className="text-[10px] text-slate-500 block">
                    [{hz.humidity.lower_95} - {hz.humidity.upper_95}]
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
};
