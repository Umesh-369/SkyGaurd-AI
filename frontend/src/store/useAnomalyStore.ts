import { create } from 'zustand';
import { useSkyGuardStore, addOrUpdateAnomalyRecord, normalizeAnomalyRecord } from './useSkyGuardStore';

interface AnomalyStoreState {
  selectedAnomalyId: string | null;
  filterSeverity: string;
  setSelectedAnomalyId: (id: string | null) => void;
  setFilterSeverity: (severity: string) => void;
  addOrUpdateAnomaly: (incoming: any) => void;
  resolveAnomaly: (stationId: string, rootCause?: string) => void;
}

export const useAnomalyStore = create<AnomalyStoreState>((set) => ({
  selectedAnomalyId: null,
  filterSeverity: 'ALL',
  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),
  setFilterSeverity: (severity) => set({ filterSeverity: severity }),
  addOrUpdateAnomaly: (incoming) => {
    const current = useSkyGuardStore.getState().anomalies;
    const updated = addOrUpdateAnomalyRecord(current, incoming);
    useSkyGuardStore.setState({ anomalies: updated });
  },
  resolveAnomaly: (stationId, rootCause) => {
    const current = useSkyGuardStore.getState().anomalies;
    const updated = current.filter(a => !(
      (a.station_id === stationId || a.stationId === stationId) &&
      (!rootCause || a.root_cause === rootCause || a.rootCause === rootCause)
    ));
    useSkyGuardStore.setState({ anomalies: updated });
  }
}));

export { addOrUpdateAnomalyRecord, normalizeAnomalyRecord };
