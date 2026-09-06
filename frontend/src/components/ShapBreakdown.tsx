import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Cpu } from 'lucide-react';
import { useTelemetryStore, evaluateTier1Anomaly } from '../store/useSkyGuardStore';
import { Station, Reading, AnomalyRecord } from '../types';

interface ShapBreakdownProps {
  selectedStation?: Station;
  currentReading?: Reading;
  activeAnomaly?: AnomalyRecord;
}

export const ShapBreakdown: React.FC<ShapBreakdownProps> = ({
  selectedStation: propStation,
  currentReading: propReading,
  activeAnomaly: propAnomaly
}) => {
  const { stations, liveReadings, anomalies } = useTelemetryStore();

  const selectedStation = propStation || stations[0];
  const stationId = selectedStation?.station_id || selectedStation?.id || 'AWS-01';

  const currentReading = propReading || liveReadings.find(
    r => r.station_id === stationId || r.station_id === selectedStation?.id
  );

  const isLiveAnom = Boolean(currentReading?.anomaly_evaluation?.is_anomaly || (currentReading?.injected_fault_type && currentReading.injected_fault_type !== 'NONE'));

  const activeAnomaly = propAnomaly !== undefined
    ? propAnomaly
    : (isLiveAnom ? anomalies.find(a => (a.station_id === stationId || a.station_id === selectedStation?.id) && a.is_anomaly) : undefined);

  const temp = currentReading?.temperature ?? selectedStation?.last_reading?.temperature;
  const press = currentReading?.pressure ?? selectedStation?.last_reading?.pressure;
  const hum = currentReading?.humidity ?? selectedStation?.last_reading?.humidity;
  const faultType = currentReading?.injected_fault_type || (activeAnomaly?.root_cause !== 'normal' ? activeAnomaly?.root_cause : undefined);

  // Only evaluate if we have real data — avoid computing SHAP on undefined inputs
  const evalResult = (temp != null && press != null && hum != null)
    ? evaluateTier1Anomaly(temp, press, hum, faultType, activeAnomaly || currentReading?.anomaly_evaluation)
    : null;

  const factors = (currentReading?.contributing_factors && currentReading.contributing_factors.length > 0)
    ? currentReading.contributing_factors
    : (activeAnomaly?.contributing_factors && activeAnomaly.contributing_factors.length > 0)
    ? activeAnomaly.contributing_factors
    : (evalResult?.shapFactors ?? []);

  const data = factors.map(f => ({
    name: f.feature.toUpperCase(),
    weight: f.shap_weight,
    value: f.value,
    impact: f.impact,
    description: f.description
  }));

  // Dynamic chart height based on number of factors
  const chartHeight = Math.max(240, Math.min(360, data.length * 34));

  return (
    <div className="luxury-card p-5 sm:p-6 bg-white border border-slate-200 shadow-sm space-y-4 font-sans min-w-0 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-display truncate">
              SHAP Feature Contribution Breakdown <span className="text-sky-700 font-mono text-xs font-bold">(Explainable AI)</span>
            </h4>
            <p className="text-xs text-slate-600 font-sans mt-0.5">
              Dynamically quantifies exact numerical contribution of each sensor parameter towards anomaly decisions.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 shrink-0 self-start sm:self-auto">
          DYNAMIC TREE EXPLAINER
        </span>
      </div>

      {/* Empty state when no sensor data is available yet */}
      {data.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-500 font-mono bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Awaiting live sensor data — start the simulation or connect WebSocket to see SHAP analysis.
        </div>
      )}

      {/* Responsive Chart Container */}
      {data.length > 0 && (
        <>
          {/* Responsive Chart Container */}
          <div className="w-full min-w-0 pt-1 pb-1 overflow-x-auto custom-feed-scrollbar">
            <div className="w-full min-w-[280px]" style={{ height: `${chartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 8, right: 28, left: 4, bottom: 8 }}
                >
                  <XAxis
                    type="number"
                    domain={[-1, 1]}
                    ticks={[-1.0, -0.5, 0.0, 0.5, 1.0]}
                    tick={{ fontSize: 10.5, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={125}
                    tick={{ fontSize: 10, fill: '#0f172a', fontWeight: 700, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={(val: string) => {
                      const cleaned = val.replace(/^DEV_FROM_BASELINE_/, 'DEV_BASE_').replace(/^ROLLING_STD_/, 'R_STD_').replace(/^ROLLING_MEAN_/, 'R_MEAN_');
                      return cleaned.length > 15 ? `${cleaned.slice(0, 13)}..` : cleaned;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white text-slate-900 p-3 rounded-xl border border-slate-200 shadow-xl text-xs max-w-xs font-mono">
                            <div className="font-bold border-b border-slate-200 pb-1 mb-1 text-sky-700 uppercase">{d.name}</div>
                            <div>OBSERVED VALUE: <span className="font-bold text-slate-900">{d.value}</span></div>
                            <div>SHAP WEIGHT: <span className={`font-bold ${d.weight > 0 ? 'text-red-600' : 'text-sky-700'}`}>{d.weight > 0 ? `+${d.weight}` : d.weight}</span></div>
                            <div className="text-xs text-slate-600 mt-1.5 font-sans leading-relaxed">{d.description}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={Math.abs(entry.weight) > 0.3 ? '#dc2626' : Math.abs(entry.weight) > 0.1 ? '#d97706' : '#0284c7'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Feature Explanations with Clean Wrapping */}
          <div className="space-y-2 pt-1 font-sans">
            {factors.map((f, idx) => {
              const isPositive = f.shap_weight > 0;
              const isHighImpact = Math.abs(f.shap_weight) > 0.3;
              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/80 hover:bg-slate-50 p-2.5 sm:px-3.5 sm:py-2.5 rounded-lg border border-slate-200 gap-2 transition-colors"
                >
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono font-bold text-xs text-slate-900 uppercase bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {f.feature}:
                    </span>
                    {f.value !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        (val: {f.value})
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 font-sans leading-relaxed flex-1 sm:px-2 break-words">
                    {f.description}
                  </div>

                  <div className="shrink-0 flex items-center space-x-1.5 self-end sm:self-auto">
                    <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border shadow-2xs ${
                      isHighImpact
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : isPositive
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {isPositive ? `+${f.shap_weight}` : f.shap_weight}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
