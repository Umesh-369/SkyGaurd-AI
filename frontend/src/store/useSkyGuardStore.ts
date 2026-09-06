import { create } from 'zustand';
import { Station, Reading, AnomalyRecord, DisasterRiskSummary } from '../types';

export interface OfflineEvalMetrics {
  tier1_anomaly_model?: {
    model_name: string;
    dataset: string;
    evaluation_type: string;
    evaluation_metrics: {
      precision: number;
      recall: number;
      f1_score: number;
      roc_auc: number;
      false_positive_rate: number;
    };
    confusion_matrix: {
      tp: number;
      fp: number;
      tn: number;
      fn: number;
    };
    parameters_evaluated: string[];
    features: string[];
    shap_importance?: Array<{ feature: string; importance: number; label: string }>;
  };
  imputation_model?: {
    model_name: string;
    evaluation_metrics: {
      temperature_mae: number;
      pressure_mae: number;
      humidity_mae: number;
    };
  };
}

export const ALL_14_STATIONS: Station[] = [
  // Primary Goa Dataset Stations (4)
  {
    station_id: 'AWS-01',
    name: 'Panaji Coastal Station',
    coordinates: { lat: 15.4989, lon: 73.8278 },
    elevation_m: 7.0,
    status: 'ONLINE',
    last_reading: { temperature: 28.5, pressure: 1012.0, humidity: 80.0 },
    health: { station_id: 'AWS-01', overall_health_score: 95.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 95.0, pressure: 98.0, humidity: 92.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-02',
    name: 'Margao Inland Station',
    coordinates: { lat: 15.2736, lon: 73.9581 },
    elevation_m: 12.0,
    status: 'ONLINE',
    last_reading: { temperature: 29.2, pressure: 1011.2, humidity: 74.0 },
    health: { station_id: 'AWS-02', overall_health_score: 91.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 90.0, pressure: 94.0, humidity: 89.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-03',
    name: 'Vasco Port Station',
    coordinates: { lat: 15.3959, lon: 73.8157 },
    elevation_m: 5.0,
    status: 'ONLINE',
    last_reading: { temperature: 28.0, pressure: 1012.5, humidity: 82.0 },
    health: { station_id: 'AWS-03', overall_health_score: 96.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 96.0, pressure: 97.0, humidity: 95.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-04',
    name: 'Mapusa North Station',
    coordinates: { lat: 15.5926, lon: 73.8117 },
    elevation_m: 18.0,
    status: 'ONLINE',
    last_reading: { temperature: 28.7, pressure: 1010.8, humidity: 74.0 },
    health: { station_id: 'AWS-04', overall_health_score: 93.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 93.0, pressure: 94.0, humidity: 92.0 }, degradation_reasons: [] }
  },
  // Secondary Local Indian Climate Dataset Stations (10 Cities)
  {
    station_id: 'AWS-IND-MUM',
    name: 'Mumbai Coastal AWS',
    coordinates: { lat: 19.0760, lon: 72.8777 },
    elevation_m: 14.0,
    status: 'ONLINE',
    last_reading: { temperature: 27.2, pressure: 1011.5, humidity: 75.0 },
    health: { station_id: 'AWS-IND-MUM', overall_health_score: 94.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 94.0, pressure: 95.0, humidity: 93.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-GA-01',
    name: 'Panaji Coastal Station',
    coordinates: { lat: 15.4989, lon: 73.8278 },
    elevation_m: 7.0,
    status: 'ONLINE',
    last_reading: { temperature: 28.5, pressure: 1012.0, humidity: 80.0 },
    health: { station_id: 'AWS-IND-GA-01', overall_health_score: 95.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 95.0, pressure: 98.0, humidity: 92.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-BLR',
    name: 'Bengaluru Plateau AWS',
    coordinates: { lat: 12.9716, lon: 77.5946 },
    elevation_m: 920.0,
    status: 'ONLINE',
    last_reading: { temperature: 24.5, pressure: 1014.0, humidity: 65.0 },
    health: { station_id: 'AWS-IND-BLR', overall_health_score: 97.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 97.0, pressure: 98.0, humidity: 96.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-MAA',
    name: 'Chennai Coastal AWS',
    coordinates: { lat: 13.0827, lon: 80.2707 },
    elevation_m: 6.0,
    status: 'ONLINE',
    last_reading: { temperature: 29.5, pressure: 1010.0, humidity: 78.0 },
    health: { station_id: 'AWS-IND-MAA', overall_health_score: 92.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 92.0, pressure: 93.0, humidity: 91.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-CCU',
    name: 'Kolkata Delta AWS',
    coordinates: { lat: 22.5726, lon: 88.3639 },
    elevation_m: 9.0,
    status: 'ONLINE',
    last_reading: { temperature: 26.8, pressure: 1009.5, humidity: 76.0 },
    health: { station_id: 'AWS-IND-CCU', overall_health_score: 93.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 93.0, pressure: 94.0, humidity: 92.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-HYD',
    name: 'Hyderabad Deccan AWS',
    coordinates: { lat: 17.3850, lon: 78.4867 },
    elevation_m: 542.0,
    status: 'ONLINE',
    last_reading: { temperature: 27.0, pressure: 1010.2, humidity: 64.0 },
    health: { station_id: 'AWS-IND-HYD', overall_health_score: 95.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 95.0, pressure: 96.0, humidity: 94.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-AMD',
    name: 'Ahmedabad Western AWS',
    coordinates: { lat: 23.0225, lon: 72.5714 },
    elevation_m: 53.0,
    status: 'ONLINE',
    last_reading: { temperature: 28.0, pressure: 1011.0, humidity: 58.0 },
    health: { station_id: 'AWS-IND-AMD', overall_health_score: 91.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 91.0, pressure: 92.0, humidity: 90.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-JAI',
    name: 'Jaipur Desert Fringe AWS',
    coordinates: { lat: 26.9124, lon: 75.7873 },
    elevation_m: 431.0,
    status: 'ONLINE',
    last_reading: { temperature: 26.5, pressure: 1009.0, humidity: 52.0 },
    health: { station_id: 'AWS-IND-JAI', overall_health_score: 89.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 89.0, pressure: 91.0, humidity: 87.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-LKO',
    name: 'Lucknow Gangetic AWS',
    coordinates: { lat: 26.8467, lon: 80.9462 },
    elevation_m: 123.0,
    status: 'ONLINE',
    last_reading: { temperature: 25.8, pressure: 1010.5, humidity: 68.0 },
    health: { station_id: 'AWS-IND-LKO', overall_health_score: 94.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 94.0, pressure: 95.0, humidity: 93.0 }, degradation_reasons: [] }
  },
  {
    station_id: 'AWS-IND-BHO',
    name: 'Bhopal Central AWS',
    coordinates: { lat: 23.2599, lon: 77.4126 },
    elevation_m: 527.0,
    status: 'ONLINE',
    last_reading: { temperature: 26.2, pressure: 1011.8, humidity: 60.0 },
    health: { station_id: 'AWS-IND-BHO', overall_health_score: 96.0, maintenance_recommended: false, urgency: 'NONE', sensor_scores: { temperature: 96.0, pressure: 97.0, humidity: 95.0 }, degradation_reasons: [] }
  }
];

export const CANONICAL_STATIONS = ALL_14_STATIONS;

interface SkyGuardState {
  activeTab: string;
  stations: Station[];
  liveReadings: Reading[];
  readingHistory: Reading[];
  anomalies: AnomalyRecord[];
  historicalAnomalies: AnomalyRecord[];
  selectedAnomalyId: string | null;
  disasterRisks?: DisasterRiskSummary;
  isSimulating: boolean;
  simSpeed: number;
  wsConnected: boolean;
  is3DMode: boolean;
  timeRange: '1H' | '24H' | '7D';
  liveInferenceLatency: number;
  realtimeShapValues: Array<{ feature: string; importance: number; label: string }>;
  offlineEvalMetrics?: OfflineEvalMetrics;

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  navigateToAnomaly: (anomalyId: string) => void;
  setTimeRange: (range: '1H' | '24H' | '7D') => void;
  setIs3DMode: (mode: boolean) => void;
  fetchInitialData: () => Promise<void>;
  connectWebSocket: () => void;
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  setSimSpeed: (speed: number) => Promise<void>;
  injectFault: (stationId: string, faultType: string, param: string, mag: number) => Promise<void>;
  clearFaults: (stationId?: string) => Promise<void>;
}

let wsSocket: WebSocket | null = null;
let reconnectTimer: any = null;

export const useSkyGuardStore = create<SkyGuardState>((set, get) => ({
  activeTab: 'dashboard',
  stations: ALL_14_STATIONS,
  liveReadings: [],
  readingHistory: [],
  anomalies: [],
  historicalAnomalies: [],
  selectedAnomalyId: null,
  disasterRisks: undefined,
  isSimulating: true,
  simSpeed: 1.0,
  wsConnected: false,
  is3DMode: true,
  timeRange: '1H',
  liveInferenceLatency: 8.05,
  realtimeShapValues: [
    { feature: 'temperature', importance: 0.465, label: 'Temperature (°C)' },
    { feature: 'pressure', importance: 0.382, label: 'Barometric Pressure (hPa)' },
    { feature: 'humidity', importance: 0.153, label: 'Relative Humidity (%)' }
  ],
  offlineEvalMetrics: undefined,

  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setSelectedAnomalyId: (id: string | null) => set({ selectedAnomalyId: id }),
  navigateToAnomaly: (anomalyId: string) => set({ selectedAnomalyId: anomalyId, activeTab: 'anomalies' }),
  setTimeRange: (range: '1H' | '24H' | '7D') => set({ timeRange: range }),
  setIs3DMode: (mode: boolean) => set({ is3DMode: mode }),

  fetchInitialData: async () => {
    try {
      const resSt = await fetch('/api/stations');
      if (resSt.ok) {
        const data = await resSt.json();
        if (data.stations && data.stations.length > 0) {
          set({ stations: data.stations });
        }
      }

      const resAnom = await fetch('/api/anomalies');
      if (resAnom.ok) {
        const data = await resAnom.json();
        if (data.anomalies && Array.isArray(data.anomalies) && data.anomalies.length > 0) {
          let currentAnoms = get().anomalies;
          let currentHist = get().historicalAnomalies;
          data.anomalies.forEach((incoming: any) => {
            currentAnoms = addOrUpdateAnomalyRecord(currentAnoms, incoming);
            currentHist = addOrUpdateAnomalyRecord(currentHist, incoming, 500);
          });
          set({ anomalies: currentAnoms, historicalAnomalies: currentHist });
        }
      }

      const resRisk = await fetch('/api/risks');
      if (resRisk.ok) {
        const data = await resRisk.json();
        if (data.risk_intelligence) set({ disasterRisks: data.risk_intelligence });
      }

      const resSim = await fetch('/api/simulator/status');
      if (resSim.ok) {
        const data = await resSim.json();
        if (data.is_running !== undefined) set({ isSimulating: data.is_running });
        if (data.speed_multiplier !== undefined) set({ simSpeed: data.speed_multiplier });
      }

      const resMetrics = await fetch('/api/analytics/metrics');
      if (resMetrics.ok) {
        const data = await resMetrics.json();
        set({ offlineEvalMetrics: data });
      }
    } catch (e) {
      console.warn('[SkyGuardStore] REST sync warning:', e);
    }
  },

  connectWebSocket: () => {
    if (wsSocket && (wsSocket.readyState === WebSocket.OPEN || wsSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsUrl = isLocalDev
        ? `ws://${window.location.hostname}:8000/ws/readings`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/readings`;
      wsSocket = new WebSocket(wsUrl);

      wsSocket.onopen = () => {
        set({ wsConnected: true });
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };

      wsSocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'ANOMALY_DETECTED') {
            const newAnom: AnomalyRecord = payload.anomaly;
            let updatedAnomalies = get().anomalies;
            let updatedHist = get().historicalAnomalies;
            if (newAnom) {
              updatedAnomalies = addOrUpdateAnomalyRecord(updatedAnomalies, newAnom);
              updatedHist = addOrUpdateAnomalyRecord(updatedHist, newAnom, 500);
            }

            set({
              anomalies: updatedAnomalies,
              historicalAnomalies: updatedHist,
              disasterRisks: payload.disaster_risks ?? get().disasterRisks,
              liveReadings: payload.readings ?? get().liveReadings
            });
          } else if (payload.event === 'ANOMALIES_RESET' || payload.event === 'ANOMALIES_CLEARED') {
            set({
              anomalies: [],
              disasterRisks: payload.disaster_risks ?? get().disasterRisks,
              liveReadings: payload.readings ?? get().liveReadings
            });
          } else if (payload.event === 'SENSOR_STREAM_UPDATE' && payload.readings) {
            const readings: Reading[] = payload.readings;
            const isSim = payload.is_running !== undefined ? payload.is_running : get().isSimulating;
            const spd = payload.speed_multiplier !== undefined ? payload.speed_multiplier : get().simSpeed;
            const latency = payload.inference_latency_ms ?? get().liveInferenceLatency;

            // Maintain rolling history (max 300 readings)
            const currentHistory = get().readingHistory;
            const updatedHistory = [...currentHistory, ...readings].slice(-300);

            // Update station last_readings
            const updatedStations = get().stations.map(st => {
              const matching = readings.find(r => r.station_id === st.station_id || r.station_id === st.id);
              if (matching) {
                return {
                  ...st,
                  last_reading: {
                    temperature: matching.temperature,
                    pressure: matching.pressure,
                    humidity: matching.humidity,
                    timestamp: matching.timestamp
                  }
                };
              }
              return st;
            });

            // Extract live SHAP factors if present
            const sampleWithShap = readings.find(r => r.contributing_factors && r.contributing_factors.length > 0);
            let updatedShap = get().realtimeShapValues;
            if (sampleWithShap && sampleWithShap.contributing_factors) {
              const tempF = sampleWithShap.contributing_factors.find(f => f.feature === 'temperature')?.abs_importance ?? 0.465;
              const pressF = sampleWithShap.contributing_factors.find(f => f.feature === 'pressure')?.abs_importance ?? 0.382;
              const humF = sampleWithShap.contributing_factors.find(f => f.feature === 'humidity')?.abs_importance ?? 0.153;
              const total = tempF + pressF + humF || 1.0;
              updatedShap = [
                { feature: 'temperature', importance: Number((tempF / total).toFixed(3)), label: 'Temperature (°C)' },
                { feature: 'pressure', importance: Number((pressF / total).toFixed(3)), label: 'Barometric Pressure (hPa)' },
                { feature: 'humidity', importance: Number((humF / total).toFixed(3)), label: 'Relative Humidity (%)' }
              ];
            }

            // Deduplicated anomaly updates for active stream
            let mergedAnomalies = get().anomalies;
            let mergedHist = get().historicalAnomalies;
            readings.forEach(r => {
              const stId = r.station_id || 'AWS-01';
              const isAnom = Boolean(r.anomaly_evaluation && r.anomaly_evaluation.is_anomaly);
              const hasFault = Boolean(r.injected_fault_type && r.injected_fault_type !== 'NONE');

              if (isAnom || hasFault) {
                const evalData: any = r.anomaly_evaluation || {};
                const factors = r.contributing_factors || evalData.contributing_factors || [];
                const rootCause = hasFault ? r.injected_fault_type! : (evalData.root_cause || 'sensor_anomaly');
                const isComm = evalData.category === 'COMMUNICATION_FAILURE' || evalData.status === 'Communication Failure' || rootCause === 'station_offline' || rootCause === 'delayed_data' || rootCause === 'missing_data';

                const streamAnom = {
                  id: `ANOM_${stId}_${rootCause}`,
                  station_id: stId,
                  stationId: stId,
                  station_name: getCanonicalStationName(stId),
                  stationName: getCanonicalStationName(stId),
                  timestamp: r.timestamp || new Date().toISOString(),
                  origin: r.origin || 'SIMULATED',
                  status: evalData.status || (isComm ? 'Communication Failure' : 'Anomaly'),
                  category: evalData.category || (isComm ? 'COMMUNICATION_FAILURE' : (evalData.interpretation === 'Genuine Weather Event' ? 'GENUINE_WEATHER_EVENT' : 'SENSOR_FAULT')),
                  type: evalData.type || (isComm ? 'Communication' : 'Multi-sensor'),
                  readings: { temperature: r.temperature, pressure: r.pressure, humidity: r.humidity },
                  is_anomaly: true,
                  isAnomaly: true,
                  severity: (evalData.severity || 'HIGH') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                  root_cause: rootCause,
                  rootCause: rootCause,
                  confidence: isComm ? (evalData.confidence ?? null) : (evalData.confidence || 0.95),
                  is_deterministic: isComm || Boolean(evalData.is_deterministic),
                  isolation_forest_score: isComm ? 0.0 : (evalData.isolation_forest_score || -0.25),
                  spatial_verdict: evalData.spatial_verdict || (isComm ? 'N/A — COMMUNICATION FAILURE' : 'CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)'),
                  interpretation: evalData.interpretation || (isComm ? 'Communication Failure' : 'Likely Sensor Fault'),
                  why_detected: evalData.why_detected || evalData.narrative_pack?.reason_narrative || (isComm ? `Communication protocol failure: ${rootCause.replace(/_/g, ' ')}` : `Anomaly flagged: ${rootCause.replace(/_/g, ' ')}`),
                  contributing_factors: factors,
                  imputed_value_suggestion: r.imputed_suggestion || evalData.imputed_suggestion
                };

                mergedAnomalies = addOrUpdateAnomalyRecord(mergedAnomalies, streamAnom);
                mergedHist = addOrUpdateAnomalyRecord(mergedHist, streamAnom, 500);
              }
            });

            // Only update anomalies state reference if anomalies list or readings actually changed
            const currentAnomalies = get().anomalies;
            const hasAnomChanged = mergedAnomalies.length !== currentAnomalies.length ||
              mergedAnomalies.some((m, idx) => {
                const c = currentAnomalies[idx];
                return !c || c.id !== m.id || c.readings.temperature !== m.readings.temperature || c.readings.pressure !== m.readings.pressure || c.readings.humidity !== m.readings.humidity;
              });

            const finalAnomalies = hasAnomChanged ? mergedAnomalies : currentAnomalies;

            set({
              liveReadings: readings,
              readingHistory: updatedHistory,
              stations: updatedStations,
              anomalies: finalAnomalies,
              historicalAnomalies: mergedHist,
              disasterRisks: payload.disaster_risks ?? get().disasterRisks,
              isSimulating: isSim,
              simSpeed: spd,
              liveInferenceLatency: latency,
              realtimeShapValues: updatedShap
            });
          }
        } catch (err) {
          console.error('[SkyGuardStore] WS parse error:', err);
        }
      };

      wsSocket.onclose = () => {
        set({ wsConnected: false });
        reconnectTimer = setTimeout(() => get().connectWebSocket(), 3000);
      };

      wsSocket.onerror = () => {
        set({ wsConnected: false });
      };
    } catch (e) {
      set({ wsConnected: false });
    }
  },

  startSimulation: async () => {
    try {
      await fetch('/api/simulator/start', { method: 'POST' });
      set({ isSimulating: true });
      get().fetchInitialData();
    } catch (e) {
      console.error('[SkyGuardStore] Start error:', e);
    }
  },

  stopSimulation: async () => {
    try {
      await fetch('/api/simulator/stop', { method: 'POST' });
      set({ isSimulating: false });
      get().fetchInitialData();
    } catch (e) {
      console.error('[SkyGuardStore] Stop error:', e);
    }
  },

  resetSimulation: async () => {
    try {
      await fetch('/api/simulator/reset', { method: 'POST' });
      set({ liveReadings: [], readingHistory: [], anomalies: [] });
      get().fetchInitialData();
    } catch (e) {
      console.error('[SkyGuardStore] Reset error:', e);
    }
  },

  setSimSpeed: async (speed: number) => {
    try {
      await fetch('/api/simulator/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed })
      });
      set({ simSpeed: speed });
    } catch (e) {
      console.error('[SkyGuardStore] Speed error:', e);
    }
  },

  injectFault: async (stationId: string, faultType: string, param: string, mag: number) => {
    try {
      const res = await fetch('/api/simulator/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: stationId,
          stationId: stationId,
          fault_type: faultType,
          faultType: faultType,
          parameter: param,
          magnitude: mag,
          duration_steps: 30
        })
      });
      if (res.ok) {
        const data = await res.json();
        let updatedAnomalies = get().anomalies;
        let updatedHist = get().historicalAnomalies;

        let selectedId = get().selectedAnomalyId;
        if (data.anomaly) {
          const normAnom = normalizeAnomalyRecord(data.anomaly);
          updatedAnomalies = addOrUpdateAnomalyRecord(updatedAnomalies, normAnom);
          updatedHist = addOrUpdateAnomalyRecord(updatedHist, normAnom, 500);
          selectedId = normAnom.id;
        }

        const updatedReadings: Reading[] = data.readings || get().liveReadings;
        const updatedStations = get().stations.map(st => {
          const matching = updatedReadings.find(r => r.station_id === st.station_id || r.station_id === st.id);
          if (matching) {
            return {
              ...st,
              last_reading: {
                temperature: matching.temperature,
                pressure: matching.pressure,
                humidity: matching.humidity,
                timestamp: matching.timestamp
              }
            };
          }
          return st;
        });

        set({
          anomalies: updatedAnomalies,
          historicalAnomalies: updatedHist,
          selectedAnomalyId: selectedId,
          liveReadings: updatedReadings,
          stations: updatedStations,
          disasterRisks: data.disaster_risks ?? get().disasterRisks
        });
      }
    } catch (e) {
      console.error('[SkyGuardStore] Fault injection error:', e);
    }
  },

  clearFaults: async (stationId?: string) => {
    try {
      const res = await fetch('/api/simulator/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station_id: stationId, stationId: stationId })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedReadings = data.readings || get().liveReadings;
        set({
          anomalies: [],
          liveReadings: updatedReadings,
          disasterRisks: data.disaster_risks ?? get().disasterRisks
        });
      }
    } catch (e) {
      console.error('[SkyGuardStore] Clear faults error:', e);
    }
  }
}));

export interface Tier1EvalResult {
  anomalyScore: number;
  confidencePct: number;
  statusBadge: 'NORMAL' | 'WARNING / DRIFT' | 'CRITICAL ANOMALY';
  badgeColor: string;
  badgeBg: string;
  rootCause: string;
  reasonText: string;
  isTempFlagged: boolean;
  isPressFlagged: boolean;
  isHumFlagged: boolean;
  shapFactors: Array<{
    feature: string;
    shap_weight: number;
    value: number;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }>;
}

export interface Tier2EvalResult {
  compositeRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  compositeRiskScore: number;
  floodRiskScore: number;
  floodRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  floodMeterPct: number;
  heatwaveRiskScore: number;
  heatwaveRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  heatwaveMeterPct: number;
  threatAlert: string;
  alertType: 'NOMINAL' | 'WARNING' | 'CRITICAL';
}

export function evaluateTier1Anomaly(
  temperature: number,
  pressure: number,
  humidity: number,
  injectedFaultType?: string,
  backendEval?: any
): Tier1EvalResult {
  const BASE_TEMP = 28.5;
  const BASE_PRESS = 1012.0;
  const BASE_HUM = 75.0;

  const tempDelta = temperature - BASE_TEMP;
  const pressDelta = BASE_PRESS - pressure;
  const humDelta = humidity - BASE_HUM;

  const absTempDev = Math.abs(tempDelta);
  const absPressDev = Math.abs(pressDelta);
  const absHumDev = Math.abs(humDelta);

  const hasInjectedFault = Boolean(injectedFaultType && injectedFaultType !== 'NONE');

  // If backend evaluation is provided, use it directly as single source of truth (Section 8)
  if (backendEval) {
    const isAnom = Boolean(backendEval.is_anomaly ?? backendEval.isAnomaly ?? hasInjectedFault);
    const category = backendEval.category || (backendEval.status === 'Communication Failure' ? 'COMMUNICATION_FAILURE' : 'SENSOR_FAULT');
    const isComm = category === 'COMMUNICATION_FAILURE' || backendEval.status === 'Communication Failure' || backendEval.root_cause === 'station_offline' || backendEval.root_cause === 'delayed_data' || backendEval.root_cause === 'missing_data';

    let anomalyScore: number;
    let statusBadge: 'NORMAL' | 'WARNING / DRIFT' | 'CRITICAL ANOMALY' = 'NORMAL';

    if (isComm) {
      anomalyScore = 0.95;
      statusBadge = 'CRITICAL ANOMALY';
    } else if (isAnom) {
      const baseConfidence = typeof backendEval.confidence === 'number' ? backendEval.confidence : 0.88;
      const ifScore = typeof backendEval.isolation_forest_score === 'number' ? Math.abs(backendEval.isolation_forest_score) : 0.25;

      let calculatedScore: number;
      if (backendEval.severity === 'CRITICAL') {
        calculatedScore = Math.max(0.80, Math.min(0.99, baseConfidence));
        statusBadge = 'CRITICAL ANOMALY';
      } else if (backendEval.severity === 'HIGH') {
        calculatedScore = Math.max(0.68, Math.min(0.88, baseConfidence * 0.92));
        statusBadge = 'CRITICAL ANOMALY';
      } else if (backendEval.severity === 'MEDIUM' || hasInjectedFault) {
        calculatedScore = Math.max(0.42, Math.min(0.68, ifScore * 1.8 + 0.30));
        statusBadge = 'WARNING / DRIFT';
      } else {
        calculatedScore = Math.max(0.35, Math.min(0.55, ifScore * 1.4 + 0.20));
        statusBadge = 'WARNING / DRIFT';
      }
      anomalyScore = Number(calculatedScore.toFixed(2));
    } else {
      // Nominal reading - dynamic baseline score (0.01 - 0.20) based on actual live sensor reading
      const normScore = Math.min(0.22, Math.max(0.01, (absTempDev / 35.0) * 0.4 + (absPressDev / 45.0) * 0.4 + (absHumDev / 80.0) * 0.2));
      anomalyScore = Number(normScore.toFixed(2));
      statusBadge = 'NORMAL';
    }

    const rootCause = backendEval.root_cause || backendEval.rootCause || injectedFaultType || (isAnom ? 'sensor_anomaly' : 'nominal');
    const reasonText = isAnom
      ? (backendEval.why_detected || backendEval.narrative_pack?.reason_narrative || `Anomaly flagged: ${rootCause.replace(/_/g, ' ')}`)
      : 'All sensor readings within expected operational range.';
    const confidencePct = Math.round((backendEval.confidence ?? 0.95) * 100);

    const isTempFlagged = isAnom && (rootCause.includes('temp') || absTempDev > 6.0);
    const isPressFlagged = isAnom && (rootCause.includes('press') || absPressDev > 10.0);
    const isHumFlagged = isAnom && (rootCause.includes('humid') || absHumDev > 20.0);

    const shapFactors = (backendEval.contributing_factors && backendEval.contributing_factors.length > 0)
      ? backendEval.contributing_factors
      : [
          { feature: 'temperature', shap_weight: isTempFlagged ? 0.65 : 0.15, value: Number(temperature.toFixed(1)), impact: isTempFlagged ? 'HIGH' : 'LOW', description: `${tempDelta >= 0 ? '+' : ''}${tempDelta.toFixed(1)}°C deviation from normal baseline` },
          { feature: 'pressure', shap_weight: isPressFlagged ? 0.55 : 0.12, value: Number(pressure.toFixed(1)), impact: isPressFlagged ? 'HIGH' : 'LOW', description: `${pressDelta >= 0 ? '+' : ''}${pressDelta.toFixed(1)} hPa deviation from baseline` },
          { feature: 'humidity', shap_weight: isHumFlagged ? 0.40 : 0.08, value: Number(humidity.toFixed(1)), impact: isHumFlagged ? 'HIGH' : 'LOW', description: `${humDelta >= 0 ? '+' : ''}${humDelta.toFixed(1)}% humidity shift` }
        ];

    return {
      anomalyScore,
      confidencePct,
      statusBadge,
      badgeColor: statusBadge === 'CRITICAL ANOMALY' ? 'text-red-700 font-extrabold' : statusBadge === 'WARNING / DRIFT' ? 'text-amber-700 font-extrabold' : 'text-emerald-700 font-bold',
      badgeBg: statusBadge === 'CRITICAL ANOMALY' ? 'bg-red-100 border-red-300' : statusBadge === 'WARNING / DRIFT' ? 'bg-amber-100 border-amber-300' : 'bg-emerald-100 border-emerald-300',
      rootCause,
      reasonText,
      isTempFlagged,
      isPressFlagged,
      isHumFlagged,
      shapFactors
    };
  }

  // Fallback client-side calculation
  const tempIndex = absTempDev > 5.0 ? Math.min(1.0, (absTempDev - 5.0) / 10.0) : (absTempDev / 30.0);
  const pressIndex = absPressDev > 8.0 ? Math.min(1.0, (absPressDev - 8.0) / 15.0) : (absPressDev / 50.0);
  const humIndex = absHumDev > 18.0 ? Math.min(1.0, (absHumDev - 18.0) / 25.0) : (absHumDev / 80.0);

  const isPhysOutOfBounds = temperature < -5 || temperature > 55 || pressure < 900 || pressure > 1060 || humidity < 0 || humidity > 100;

  let rawScore = Math.max(tempIndex * 0.45 + pressIndex * 0.40 + humIndex * 0.15, isPhysOutOfBounds ? 0.95 : 0);
  if (hasInjectedFault) {
    rawScore = Math.max(rawScore, 0.75);
  }

  const anomalyScore = Number(Math.min(1.0, Math.max(0.01, rawScore)).toFixed(2));

  let statusBadge: 'NORMAL' | 'WARNING / DRIFT' | 'CRITICAL ANOMALY' = 'NORMAL';
  if (anomalyScore >= 0.65 || isPhysOutOfBounds) {
    statusBadge = 'CRITICAL ANOMALY';
  } else if (anomalyScore >= 0.35 || hasInjectedFault) {
    statusBadge = 'WARNING / DRIFT';
  }

  const isTempFlagged = statusBadge !== 'NORMAL' && (absTempDev > 6.0 || temperature > 40.0);
  const isPressFlagged = statusBadge !== 'NORMAL' && (absPressDev > 10.0 || pressure < 995.0);
  const isHumFlagged = statusBadge !== 'NORMAL' && (absHumDev > 22.0 || humidity > 95.0 || humidity < 25.0);

  let confidencePct = statusBadge === 'CRITICAL ANOMALY' ? 96 : (statusBadge === 'WARNING / DRIFT' ? 88 : 95);
  let rootCause: string = (hasInjectedFault && injectedFaultType ? injectedFaultType : (isTempFlagged ? 'temperature_spike' : (isPressFlagged ? 'pressure_drop' : 'nominal'))) || 'nominal';
  let reasonText = statusBadge !== 'NORMAL' ? `Sensor anomaly flagged: ${rootCause.replace(/_/g, ' ')}` : 'All sensor readings within expected operational range.';

  const shapT = absTempDev > 0 ? Number((tempDelta / 15.0).toFixed(3)) : 0.05;
  const shapP = absPressDev > 0 ? Number((-pressDelta / 20.0).toFixed(3)) : 0.05;
  const shapRH = absHumDev > 0 ? Number((humDelta / 30.0).toFixed(3)) : 0.05;

  const shapFactors = [
    {
      feature: 'temperature',
      shap_weight: shapT,
      value: Number(temperature.toFixed(1)),
      impact: Math.abs(shapT) > 0.3 ? 'HIGH' : Math.abs(shapT) > 0.1 ? 'MEDIUM' : 'LOW',
      description: `${tempDelta >= 0 ? '+' : ''}${tempDelta.toFixed(1)}°C deviation from 28.5°C normal baseline`
    },
    {
      feature: 'pressure',
      shap_weight: shapP,
      value: Number(pressure.toFixed(1)),
      impact: Math.abs(shapP) > 0.3 ? 'HIGH' : Math.abs(shapP) > 0.1 ? 'MEDIUM' : 'LOW',
      description: `${pressDelta >= 0 ? '+' : ''}${pressDelta.toFixed(1)} hPa pressure drop from 1012.0 hPa baseline`
    },
    {
      feature: 'humidity',
      shap_weight: shapRH,
      value: Number(humidity.toFixed(1)),
      impact: Math.abs(shapRH) > 0.3 ? 'HIGH' : Math.abs(shapRH) > 0.1 ? 'MEDIUM' : 'LOW',
      description: `${humDelta >= 0 ? '+' : ''}${humDelta.toFixed(1)}% humidity shift from 75.0% baseline`
    }
  ] as Array<{ feature: string; shap_weight: number; value: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; description: string }>;

  return {
    anomalyScore,
    confidencePct,
    statusBadge,
    badgeColor: statusBadge === 'CRITICAL ANOMALY' ? 'text-red-700 font-extrabold' : statusBadge === 'WARNING / DRIFT' ? 'text-amber-700 font-extrabold' : 'text-emerald-700 font-bold',
    badgeBg: statusBadge === 'CRITICAL ANOMALY' ? 'bg-red-100 border-red-300' : statusBadge === 'WARNING / DRIFT' ? 'bg-amber-100 border-amber-300' : 'bg-emerald-100 border-emerald-300',
    rootCause,
    reasonText,
    isTempFlagged,
    isPressFlagged,
    isHumFlagged,
    shapFactors
  };
}

export function evaluateTier2Risk(
  temperature: number,
  pressure: number,
  humidity: number,
  rainfall: number = 0.0,
  windSpeed: number = 12.0,
  tier1Eval?: Tier1EvalResult
): Tier2EvalResult {
  const heatwaveScore = Math.min(100, Math.max(0, Math.round(Math.max(0, (temperature - 30.0) * 9.0) + humidity * 0.15)));
  const heatwaveLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = heatwaveScore >= 75 ? 'SEVERE' : heatwaveScore >= 50 ? 'HIGH' : heatwaveScore >= 25 ? 'MODERATE' : 'LOW';
  const heatwaveMeterPct = Math.min(100, Math.max(6, heatwaveScore));

  const floodScore = Math.min(100, Math.max(0, Math.round(rainfall * 2.8 + Math.max(0, humidity - 70) * 0.6 + Math.max(0, 1012.0 - pressure) * 1.8)));
  const floodLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = floodScore >= 75 ? 'SEVERE' : floodScore >= 50 ? 'HIGH' : floodScore >= 25 ? 'MODERATE' : 'LOW';
  const floodMeterPct = Math.min(100, Math.max(6, floodScore));

  const cycloneScore = Math.min(100, Math.max(0, Math.round(Math.max(0, 1010.0 - pressure) * 4.2 + windSpeed * 1.3)));

  const isTier1Crit = tier1Eval?.statusBadge === 'CRITICAL ANOMALY';
  const maxScore = Math.max(heatwaveScore, floodScore, cycloneScore, isTier1Crit ? (tier1Eval?.anomalyScore || 0.7) * 85 : 0);
  const compositeRiskScore = Math.round(maxScore);

  let compositeRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 'LOW';
  if (compositeRiskScore >= 75) {
    compositeRiskLevel = 'SEVERE';
  } else if (compositeRiskScore >= 50) {
    compositeRiskLevel = 'HIGH';
  } else if (compositeRiskScore >= 25) {
    compositeRiskLevel = 'MODERATE';
  } else {
    compositeRiskLevel = 'LOW';
  }

  let threatAlert = 'Nominal weather context. No active environmental hazards detected in sector.';
  let alertType: 'NOMINAL' | 'WARNING' | 'CRITICAL' = 'NOMINAL';

  if (temperature > 40.0) {
    threatAlert = `EXTREME HEATWAVE THREAT: Ambient temp ${temperature.toFixed(1)}°C exceeds critical 40.0°C safety threshold.`;
    alertType = 'CRITICAL';
  } else if (pressure < 995.0 && humidity > 80.0) {
    threatAlert = `HIGH FLOOD & CYCLONIC THREAT: Barometric pressure dropped to ${pressure.toFixed(1)} hPa with ${humidity.toFixed(1)}% relative humidity.`;
    alertType = 'CRITICAL';
  } else if (isTier1Crit) {
    threatAlert = `TIER 1 ANOMALY CASCADE: ${tier1Eval?.reasonText || 'Sensor fault flagged on active station.'}`;
    alertType = 'CRITICAL';
  } else if (compositeRiskScore >= 50) {
    threatAlert = `ELEVATED ENVIRONMENTAL RISK: Risk score at ${compositeRiskScore}%. Heightened alert for local weather hazards.`;
    alertType = 'WARNING';
  } else if (compositeRiskScore >= 25) {
    threatAlert = `MODERATE RISK ADVISORY: Environmental parameters indicating moderate hazard conditions (${compositeRiskScore}%).`;
    alertType = 'WARNING';
  } else if (tier1Eval?.statusBadge === 'WARNING / DRIFT') {
    threatAlert = `SENSOR DRIFT ADVISORY: Sensor parameters displaying drift patterns. Re-evaluation in progress.`;
    alertType = 'WARNING';
  }

  return {
    compositeRiskLevel,
    compositeRiskScore,
    floodRiskScore: floodScore,
    floodRiskLevel: floodLevel,
    floodMeterPct,
    heatwaveRiskScore: heatwaveScore,
    heatwaveRiskLevel: heatwaveLevel,
    heatwaveMeterPct,
    threatAlert,
    alertType
  };
}

export function getCanonicalStationName(stationId?: string): string {
  if (!stationId) return 'Panaji Coastal Station';
  const canonicalMap: Record<string, string> = {
    'AWS-01': 'Panaji Coastal Station',
    'AWS-IND-GA-01': 'Panaji Coastal Station',
    'AWS-02': 'Margao Inland Station',
    'AWS-IND-GA-02': 'Margao Inland Station',
    'AWS-03': 'Vasco Port Station',
    'AWS-IND-GA-03': 'Vasco Port Station',
    'AWS-04': 'Mapusa North Station',
    'AWS-IND-GA-04': 'Mapusa North Station',
    'AWS-IND-MUM': 'Mumbai Coastal AWS',
    'AWS-IND-BLR': 'Bengaluru Plateau AWS',
    'AWS-IND-MAA': 'Chennai Coastal AWS',
    'AWS-IND-CCU': 'Kolkata Delta AWS',
    'AWS-IND-HYD': 'Hyderabad Deccan AWS',
    'AWS-IND-AMD': 'Ahmedabad Western AWS',
    'AWS-IND-JAI': 'Jaipur Desert Fringe AWS',
    'AWS-IND-LKO': 'Lucknow Gangetic AWS',
    'AWS-IND-BHO': 'Bhopal Central AWS',
  };
  return canonicalMap[stationId] || canonicalMap[stationId.toUpperCase()] || 'Panaji Coastal Station';
}

export function normalizeAnomalyRecord(raw: any): AnomalyRecord {
  let stId = raw.station_id || raw.stationId || 'AWS-01';
  if (stId === 'AWS-IND-DEL' || stId === 'DELHI') {
    stId = 'AWS-IND-GA-01';
  }
  const stName = getCanonicalStationName(stId);
  const rootCause = raw.root_cause || raw.rootCause || 'temperature_spike';

  const isComm = raw.category === 'COMMUNICATION_FAILURE' || raw.status === 'Communication Failure' || rootCause === 'station_offline' || rootCause === 'delayed_data' || rootCause === 'missing_data';
  const category = raw.category || (isComm ? 'COMMUNICATION_FAILURE' : (raw.spatial_verdict?.includes('CORROBORATED') ? 'GENUINE_WEATHER_EVENT' : 'SENSOR_FAULT'));
  const status = raw.status || (isComm ? 'Communication Failure' : (raw.is_anomaly ?? raw.isAnomaly ? 'Anomaly' : 'Normal'));
  const interpretation = raw.interpretation || (isComm ? 'Communication Failure' : (category === 'GENUINE_WEATHER_EVENT' ? 'Genuine Weather Event' : 'Likely Sensor Fault'));

  const confidence = isComm
    ? (raw.confidence !== undefined ? raw.confidence : null)
    : (raw.confidence !== undefined ? raw.confidence : 0.95);

  const ifScore = isComm
    ? (raw.isolation_forest_score !== undefined ? raw.isolation_forest_score : 0.0)
    : (raw.isolation_forest_score ?? raw.isolationForestScore ?? -0.25);

  return {
    id: raw.id || `ANOM_${stId}_${rootCause}`,
    station_id: stId,
    stationId: stId,
    station_name: stName,
    stationName: stName,
    timestamp: raw.timestamp || new Date().toISOString(),
    origin: raw.origin || 'SIMULATED',
    status: status as 'Normal' | 'Anomaly' | 'Communication Failure',
    category: category as 'SENSOR_FAULT' | 'GENUINE_WEATHER_EVENT' | 'COMMUNICATION_FAILURE',
    type: raw.type || (isComm ? 'Communication' : 'Multi-sensor'),
    readings: raw.readings || {
      temperature: raw.temperature ?? 28.5,
      pressure: raw.pressure ?? 1012.0,
      humidity: raw.humidity ?? 75.0
    },
    is_anomaly: raw.is_anomaly ?? raw.isAnomaly ?? true,
    isAnomaly: raw.is_anomaly ?? raw.isAnomaly ?? true,
    severity: raw.severity || 'HIGH',
    root_cause: rootCause,
    rootCause: rootCause,
    confidence: confidence,
    is_deterministic: isComm || Boolean(raw.is_deterministic),
    is_historical: Boolean(raw.is_historical),
    isolation_forest_score: ifScore,
    spatial_verdict: raw.spatial_verdict || raw.spatialVerdict || (isComm ? 'N/A — COMMUNICATION FAILURE' : 'CONTRADICTED_BY_NEIGHBORS (ISOLATED SENSOR FAULT)'),
    interpretation: interpretation as 'Likely Sensor Fault' | 'Genuine Weather Event' | 'Communication Failure' | 'Requires Investigation',
    why_detected: raw.why_detected || raw.narrative_pack?.reason_narrative || (isComm ? `Communication protocol failure: ${rootCause.replace(/_/g, ' ')}` : (raw.is_anomaly ? `Anomaly flagged: ${rootCause.replace(/_/g, ' ')}` : 'Normal operation.')),
    contributing_factors: raw.contributing_factors || raw.contributingFactors || [],
    imputed_value_suggestion: raw.imputed_value_suggestion || raw.imputedSuggestion
  };
}

export function addOrUpdateAnomalyRecord(
  anomalies: AnomalyRecord[],
  incomingRaw: any,
  maxCapacity: number = 50
): AnomalyRecord[] {
  const incoming = normalizeAnomalyRecord(incomingRaw);

  if (!incoming.is_anomaly) {
    return anomalies.filter(a => !(
      a.station_id === incoming.station_id || a.stationId === incoming.stationId
    ));
  }

  const existingIdx = anomalies.findIndex(a => {
    const sameStation = a.station_id === incoming.station_id || a.stationId === incoming.stationId;
    const sameRootCause = a.root_cause === incoming.root_cause || a.rootCause === incoming.rootCause;

    const timeA = new Date(a.timestamp).getTime();
    const timeInc = new Date(incoming.timestamp).getTime();
    const timeDiffMs = Math.abs(timeInc - timeA);
    const within30s = !isNaN(timeDiffMs) && timeDiffMs < 30000;

    return sameStation && (sameRootCause || within30s);
  });

  if (existingIdx !== -1) {
    const updated = [...anomalies];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...incoming,
      id: updated[existingIdx].id,
      timestamp: incoming.timestamp,
      readings: incoming.readings,
      confidence: incoming.confidence,
      is_deterministic: incoming.is_deterministic,
      isolation_forest_score: incoming.isolation_forest_score,
      contributing_factors: incoming.contributing_factors.length > 0
        ? incoming.contributing_factors
        : updated[existingIdx].contributing_factors,
      imputed_value_suggestion: incoming.imputed_value_suggestion || updated[existingIdx].imputed_value_suggestion
    };
    return updated;
  }

  return [incoming, ...anomalies].slice(0, maxCapacity);
}

export const useTelemetryStore = useSkyGuardStore;


