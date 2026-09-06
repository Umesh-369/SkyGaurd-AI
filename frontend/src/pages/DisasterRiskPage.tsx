import React from 'react';
import { Droplets, Thermometer, Wind, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { DisasterRiskSummary } from '../types';

interface DisasterRiskPageProps {
  risks?: DisasterRiskSummary;
}

export const DisasterRiskPage: React.FC<DisasterRiskPageProps> = ({ risks }) => {
  const hazards = risks?.hazards;

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-900">
      
      {/* Banner */}
      <div className="luxury-card p-6 md:p-8 bg-white border-l-8 border-l-emerald-600 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider px-3 py-1 rounded-full tier2-pill">
              TIER 2 EXTENDED HAZARD ENGINE
            </span>
            <span className="text-xs text-emerald-700 font-mono font-semibold">(Environmental Risk Layer)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider mt-2 text-slate-900">
            Disaster Risk Intelligence & Threat Projection
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-sans mt-2 max-w-3xl leading-relaxed">
            Operates on top of Tier 1's validated AWS sensor stream. Integrates Weather API precipitation and wind metrics to assess flood, thermal stress, and coastal cyclone vulnerabilities.
          </p>
        </div>
        <div className="text-left md:text-right bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 shadow-sm font-mono">
          <div className="text-xs text-slate-500 font-bold">COMPOSITE RISK STATUS</div>
          <div className={`text-3xl font-black mt-1 ${
            risks?.composite_risk_level === 'CRITICAL' || risks?.composite_risk_level === 'HIGH'
              ? 'text-red-700'
              : risks?.composite_risk_level === 'MEDIUM'
              ? 'text-amber-700'
              : 'text-emerald-700'
          }`}>
            {risks?.composite_risk_level || '—'}
          </div>
        </div>
      </div>

      {/* No data state — shown when backend hasn't responded yet */}
      {!hazards && (
        <div className="luxury-card p-12 bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-sm font-black font-display uppercase tracking-wider text-slate-900">
            Awaiting Risk Intelligence Data
          </h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-sans">
            Risk data is computed from live AWS sensor readings. Ensure the simulation is running and the WebSocket is connected.
          </p>
        </div>
      )}

      {/* Hazard Cards Grid — only rendered when real data is available */}
      {hazards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Risk 1: Flood & Heavy Rainfall */}
          <div className="luxury-card p-6 bg-white border border-slate-200 border-t-4 border-t-sky-600 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
                  <Droplets className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 font-display uppercase tracking-wider">Flood & Rainfall</h3>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {hazards.flood.risk_level}
              </span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>RISK INDEX SCORE</span>
                <span className="text-sky-700 font-extrabold text-sm">{hazards.flood.risk_score.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-sky-600 h-full transition-all duration-500" style={{ width: `${Math.min(100, hazards.flood.risk_score)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <span className="font-bold text-sky-700 block uppercase text-[10px]">Contributing Environmental Drivers:</span>
              {hazards.flood.contributing_factors.map((f, i) => (
                <div key={i} className="text-slate-700 text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk 2: Heatwave Risk */}
          <div className="luxury-card p-6 bg-white border border-slate-200 border-t-4 border-t-amber-500 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <Thermometer className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 font-display uppercase tracking-wider">Thermal Stress</h3>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {hazards.heatwave.risk_level}
              </span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>RISK INDEX SCORE</span>
                <span className="text-amber-700 font-extrabold text-sm">{hazards.heatwave.risk_score.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, hazards.heatwave.risk_score)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <span className="font-bold text-amber-700 block uppercase text-[10px]">Contributing Environmental Drivers:</span>
              {hazards.heatwave.contributing_factors.map((f, i) => (
                <div key={i} className="text-slate-700 text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk 3: Cyclone & Storm Surge */}
          <div className="luxury-card p-6 bg-white border border-slate-200 border-t-4 border-t-emerald-600 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <Wind className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 font-display uppercase tracking-wider">Cyclone & Storm</h3>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {hazards.cyclone.risk_level}
              </span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>RISK INDEX SCORE</span>
                <span className="text-emerald-700 font-extrabold text-sm">{hazards.cyclone.risk_score.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${Math.min(100, hazards.cyclone.risk_score)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <span className="font-bold text-emerald-700 block uppercase text-[10px]">Contributing Environmental Drivers:</span>
              {hazards.cyclone.contributing_factors.map((f, i) => (
                <div key={i} className="text-slate-700 text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Provenance Card */}
      <div className="luxury-card p-5 bg-white border border-slate-200 text-slate-700 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>DATA PROVENANCE: Validated Tier 1 AWS Sensor Feed + Open-Meteo Weather API Integration</span>
        </div>
        <span className="font-bold text-sky-700">TAG: WEATHER_API_SYNCHRONIZED</span>
      </div>

    </div>
  );
};

