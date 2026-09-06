import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Clock, UserCheck, AlertTriangle, Sparkles, Check, ArrowRight } from 'lucide-react';
import { AnomalyRecord, DisasterRiskSummary, RecommendedAction } from '../types';
import { useSkyGuardStore } from '../store/useSkyGuardStore';

interface RecommendedActionsPanelProps {
  anomaly: AnomalyRecord;
  disasterRisks?: DisasterRiskSummary;
}

export const RecommendedActionsPanel: React.FC<RecommendedActionsPanelProps> = ({
  anomaly,
  disasterRisks
}) => {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const clearFaults = useSkyGuardStore((state) => state.clearFaults);
  const stations = useSkyGuardStore((state) => state.stations);

  const anomalyId = anomaly.id;
  const stationId = anomaly.station_id || anomaly.stationId || 'AWS-01';

  // Fetch deterministic recommendations from backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/anomalies/${anomalyId}/recommendations`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        return res.json();
      })
      .then((data) => {
        if (isMounted && data && Array.isArray(data.recommendations)) {
          setActions(data.recommendations);
        }
      })
      .catch((err) => {
        console.warn('[RecommendedActions] Fallback to local rule engine:', err);
        // Deterministic local fallback
        if (isMounted) {
          const isComm = anomaly.category === 'COMMUNICATION_FAILURE' || anomaly.status === 'Communication Failure';
          const topFeat = anomaly.contributing_factors?.[0]?.feature || 'temperature';
          const topWeight = anomaly.contributing_factors?.[0]?.shap_weight || 0.0;
          const compRisk = disasterRisks?.composite_risk_score || 0;

          if (isComm) {
            setActions([
              {
                id: `FALLBACK_${stationId}_1`,
                priority: compRisk > 50 ? 'CRITICAL' : 'HIGH',
                action: 'Dispatch Telemetry Link Diagnostics & Check Solar PSU',
                reason: `Station '${stationId}' packet loss detected by communication monitor.`,
                evidence_basis: 'Communication Monitor Timeout Rule Check',
                suggested_owner: 'Field Network Operations',
                estimated_resolution_time: '1 - 2 Hours',
                is_safety_critical: compRisk > 50
              },
              {
                id: `FALLBACK_${stationId}_2`,
                priority: 'MEDIUM',
                action: 'Activate Spatio-Temporal Nearest-Neighbor Virtual Proxy',
                reason: 'Maintain downstream forecasting pipeline without null gap artifacts.',
                evidence_basis: 'Spatial Consistency Engine Fallback',
                suggested_owner: 'Data Pipeline Service',
                estimated_resolution_time: 'Instant (Automated)',
                is_safety_critical: false
              }
            ]);
          } else {
            setActions([
              {
                id: `FALLBACK_${stationId}_1`,
                priority: anomaly.severity === 'CRITICAL' || compRisk > 60 ? 'CRITICAL' : 'HIGH',
                action: `Isolate Faulty Sensor & Recalibrate ${topFeat.toUpperCase()} Probe`,
                reason: `Isolated unphysical ${topFeat} anomaly (SHAP weight +${topWeight.toFixed(2)}) contradicted by spatial neighbors.`,
                evidence_basis: `SHAP Driver: '${topFeat}' | Isolation Forest Score: ${anomaly.isolation_forest_score.toFixed(4)}`,
                suggested_owner: 'AWS Quality Control Engineer',
                estimated_resolution_time: '24 Hours',
                is_safety_critical: true
              },
              {
                id: `FALLBACK_${stationId}_2`,
                priority: 'HIGH',
                action: `Adopt Imputed Value (${anomaly.imputed_value_suggestion?.corrected_value ?? 'Interpolated'}) into Analytics Feed`,
                reason: 'Correct unphysical reading via spatio-temporal KNN to prevent false positive risk triggers.',
                evidence_basis: 'Hybrid Spatio-Temporal EMA Imputer',
                suggested_owner: 'Data Pipeline Service',
                estimated_resolution_time: 'Instant (Automated)',
                is_safety_critical: false
              }
            ]);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anomalyId, stationId, anomaly.category, anomaly.severity, disasterRisks?.composite_risk_score]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleResolveAlert = async (id: string) => {
    setResolvingId(id);
    try {
      // Reuse existing active alert clear / dismiss mechanism
      await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' }).catch(() => null);
      await clearFaults(stationId);
      setAcknowledgedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } finally {
      setResolvingId(null);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="luxury-card p-6 bg-white border border-slate-200 shadow-sm space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider">
                Recommended Actions & Operational Protocol
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                DETERMINISTIC RULE SYNTHESIS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prioritized engineering corrective actions generated from Anomaly Category + SHAP Drivers + Spatial Consensus + Tier-2 Hazard Risk.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
          STATION: <strong className="text-slate-900">{stationId}</strong>
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
        </div>
      )}

      {/* Action Cards List */}
      {!loading && actions.length > 0 && (
        <div className="space-y-3.5">
          {actions.map((rec) => {
            const isAcknowledged = acknowledgedIds.has(rec.id);
            const isCritical = rec.priority === 'CRITICAL';

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border transition-all ${
                  isAcknowledged
                    ? 'bg-slate-50/70 border-slate-200 opacity-80'
                    : isCritical
                    ? 'bg-red-50/40 border-red-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-sky-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border uppercase ${getPriorityBadgeClass(rec.priority)}`}>
                        {rec.priority} PRIORITY
                      </span>
                      {rec.is_safety_critical && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center space-x-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>SAFETY CRITICAL</span>
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900 font-display">
                        {rec.action}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {rec.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
                      <span className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Owner: <strong className="text-slate-700">{rec.suggested_owner}</strong></span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ETA: <strong className="text-slate-700">{rec.estimated_resolution_time}</strong></span>
                      </span>
                      <span>·</span>
                      <span className="text-sky-700 truncate max-w-xs">
                        Basis: {rec.evidence_basis}
                      </span>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    {!isAcknowledged ? (
                      <>
                        <button
                          onClick={() => handleAcknowledge(rec.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ACKNOWLEDGE</span>
                        </button>
                        <button
                          onClick={() => handleResolveAlert(rec.id)}
                          disabled={resolvingId === rec.id}
                          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{resolvingId === rec.id ? 'RESOLVING...' : 'RESOLVE & CLEAR'}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-mono text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>ACKNOWLEDGED & QUEUED</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
