import React, { useState, useMemo } from 'react';
import { AnomaliesFeed } from '../components/AnomaliesFeed';
import { AnomaliesView } from '../components/AnomaliesView';
import { AnomalyRecord, DisasterRiskSummary } from '../types';
import { useSkyGuardStore } from '../store/useSkyGuardStore';

interface AnomaliesPageProps {
  anomalies: AnomalyRecord[];
  risks?: DisasterRiskSummary;
}

export const AnomaliesPage: React.FC<AnomaliesPageProps> = ({ anomalies = [], risks }) => {
  const storeRisks = useSkyGuardStore((state) => state.disasterRisks);
  const storeSelectedId = useSkyGuardStore((state) => state.selectedAnomalyId);
  const storeHistorical = useSkyGuardStore((state) => state.historicalAnomalies);
  const setSelectedAnomalyIdInStore = useSkyGuardStore((state) => state.setSelectedAnomalyId);

  const effectiveRisks = risks || storeRisks;

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>(storeSelectedId || '');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [archivedAnomaly, setArchivedAnomaly] = useState<AnomalyRecord | null>(null);

  // Sync when storeSelectedId changes externally (e.g. from sidebar or navbar deep link)
  React.useEffect(() => {
    if (storeSelectedId) {
      setSelectedAnomalyId(storeSelectedId);
    }
  }, [storeSelectedId]);

  const handleSelectAnomaly = (id: string) => {
    setSelectedAnomalyId(id);
    setSelectedAnomalyIdInStore(id);
  };

  const filteredAnomalies = useMemo(() => {
    return (anomalies || []).filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity);
  }, [anomalies, filterSeverity]);

  const activeId = useMemo(() => {
    if (selectedAnomalyId && (filteredAnomalies.some(a => a.id === selectedAnomalyId) || anomalies.some(a => a.id === selectedAnomalyId))) {
      return selectedAnomalyId;
    }
    return filteredAnomalies[0]?.id || anomalies[0]?.id || '';
  }, [selectedAnomalyId, filteredAnomalies, anomalies]);

  // Attempt to resolve selected anomaly from filtered feed, full active feed, or historical archive
  const selectedAnomaly = useMemo(() => {
    if (!activeId) return filteredAnomalies[0];
    
    // 1. Check in filtered active feed
    const fromFiltered = filteredAnomalies.find(a => a.id === activeId);
    if (fromFiltered) return fromFiltered;

    // 2. Check in all active anomalies (if filter is active)
    const fromActive = anomalies.find(a => a.id === activeId);
    if (fromActive) return fromActive;

    // 3. Check in local store historical list
    const fromHistory = storeHistorical.find(a => a.id === activeId);
    if (fromHistory) {
      return { ...fromHistory, is_historical: true };
    }

    // 4. Fall back to archived record fetched asynchronously if matching
    if (archivedAnomaly && archivedAnomaly.id === activeId) {
      return archivedAnomaly;
    }

    return filteredAnomalies[0] || null;
  }, [filteredAnomalies, anomalies, storeHistorical, activeId, archivedAnomaly]);

  // If activeId is not in memory, query backend API endpoint /api/anomalies/{anomaly_id}
  React.useEffect(() => {
    if (activeId && !filteredAnomalies.some(a => a.id === activeId) && !storeHistorical.some(a => a.id === activeId)) {
      fetch(`/api/anomalies/${activeId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.anomaly) {
            setArchivedAnomaly({ ...data.anomaly, is_historical: true });
          }
        })
        .catch(err => console.warn('[AnomaliesPage] History fetch warning:', err));
    }
  }, [activeId, filteredAnomalies, storeHistorical]);

  const compRisk = effectiveRisks?.composite_risk_level || 'LOW';
  const hazards = effectiveRisks?.hazards;

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-900">
      
      {/* Header Banner */}
      <div className="section-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="section-number">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
            <span>TIER 1 CORE ANOMALY ENGINE & TIER 2 RISK INTELLIGENCE</span>
          </div>
          <h1 className="section-title text-slate-900">Multivariate Anomaly Identification & SHAP Studio</h1>
          <p className="section-subtitle text-slate-600">
            Real-time detection operating strictly on Temperature (°C), Pressure (hPa), and Relative Humidity (%).
            Every flagged anomaly includes mandatory SHAP feature contribution analysis, sensor degradation signals, physics-based imputation, and spatial consensus verification.
          </p>
        </div>

        {/* Live Risk Intelligence Quick Summary Badge */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm font-mono text-xs space-y-2 min-w-[260px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">COMPOSITE HAZARD RISK</span>
            <span className={`font-black px-2.5 py-0.5 rounded-full text-xs ${
              compRisk === 'CRITICAL' || compRisk === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-200' : compRisk === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              {compRisk}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5 text-center">
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] text-slate-500 block">FLOOD</span>
              <strong className="text-sky-700">{hazards?.flood?.risk_level || 'LOW'}</strong>
            </div>
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] text-slate-500 block">HEAT</span>
              <strong className="text-amber-700">{hazards?.heatwave?.risk_level || 'LOW'}</strong>
            </div>
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] text-slate-500 block">CYCLONE</span>
              <strong className="text-emerald-700">{hazards?.cyclone?.risk_level || 'LOW'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Equal-Height Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[calc(100vh-14.5rem)] lg:min-h-[660px]">
        
        {/* Left Column: Deduplicated Flagged Anomaly Feed */}
        <div className="lg:col-span-4 xl:col-span-4 min-w-0 h-full flex flex-col">
          <AnomaliesFeed
            anomalies={filteredAnomalies}
            activeId={activeId}
            onSelectAnomaly={handleSelectAnomaly}
            filterSeverity={filterSeverity}
            onFilterChange={setFilterSeverity}
          />
        </div>

        {/* Right Column: Selected Anomaly Inspection Workspace */}
        <div className="lg:col-span-8 xl:col-span-8 min-w-0 h-full overflow-y-auto pr-2 pb-2 custom-feed-scrollbar">
          <AnomaliesView selectedAnomaly={selectedAnomaly} />
        </div>

      </div>
    </div>
  );
};
