export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Reading {
  station_id: string;
  station_name: string;
  coordinates: Coordinates;
  timestamp: string;
  temperature: number;
  pressure: number;
  humidity: number;
  wind_speed?: number;
  rainfall?: number;
  origin: 'SIMULATED' | 'WEATHER_API' | 'SENSOR' | 'OPENML';
  is_simulated_fault?: boolean;
  injected_fault_type?: string;
  anomaly_evaluation?: AnomalyEvaluation;
  contributing_factors?: SHAPFactor[];
  imputed_suggestion?: ImputedSuggestion;
  inference_latency_ms?: number;
}

export interface AnomalyEvaluation {
  is_anomaly: boolean;
  status?: 'Normal' | 'Anomaly' | 'Communication Failure';
  category?: 'SENSOR_FAULT' | 'GENUINE_WEATHER_EVENT' | 'COMMUNICATION_FAILURE' | 'NOMINAL';
  type?: 'Temperature' | 'Pressure' | 'Humidity' | 'Multi-sensor' | 'Communication' | 'Telemetry';
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  root_cause: string;
  interpretation?: 'Likely Sensor Fault' | 'Genuine Weather Event' | 'Communication Failure' | 'Requires Investigation';
  why_detected?: string;
  spatial_verdict: string;
  isolation_forest_score: number;
  decision_threshold?: number;
  model_name: string;
  model_version: string;
  narrative_pack?: {
    parameter?: string;
    observed?: string;
    expected?: string;
    deviation?: string;
    top_shap_contributors?: string;
    multi_sensor_status?: Record<string, string>;
    nearby_stations_status?: string;
    confidence?: string;
    interpretation?: string;
    reason_narrative?: string;
  };
}

export interface SHAPFactor {
  feature: string;
  value: number;
  shap_weight: number;
  abs_importance: number;
  impact: string;
  description: string;
}

export interface ImputedSuggestion {
  target_feature: string;
  original_value: number;
  corrected_value: number;
  difference: number;
  confidence: number;
  method: string;
}

export interface SpatialConsensus {
  verdict: string;
  is_corroborated: boolean;
  neighbor_count: number;
  distance_weighted_neighbor_avg?: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
  deltas?: {
    temp_delta: number;
    press_delta: number;
  };
  explanation?: string;
}

export interface StationHealth {
  station_id: string;
  overall_health_score: number;
  maintenance_recommended: boolean;
  urgency: 'NONE' | 'WARNING' | 'CRITICAL';
  sensor_scores: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
  degradation_reasons: string[];
}

export interface Station {
  station_id: string;
  id?: string;
  name: string;
  city?: string;
  state?: string;
  coordinates: Coordinates;
  elevation_m: number;
  status: string;
  last_reading?: {
    temperature: number;
    pressure: number;
    humidity: number;
    timestamp?: string;
  };
  health: StationHealth;
}

export interface AnomalyRecord {
  id: string;
  station_id: string;
  stationId?: string;
  station_name: string;
  stationName?: string;
  timestamp: string;
  origin: string;
  status?: 'Normal' | 'Anomaly' | 'Communication Failure';
  category?: 'SENSOR_FAULT' | 'GENUINE_WEATHER_EVENT' | 'COMMUNICATION_FAILURE';
  type?: 'Temperature' | 'Pressure' | 'Humidity' | 'Multi-sensor' | 'Communication' | 'Telemetry';
  readings: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
  is_anomaly: boolean;
  isAnomaly?: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  root_cause: string;
  rootCause?: string;
  confidence?: number | null;
  is_deterministic?: boolean;
  is_historical?: boolean;
  isolation_forest_score: number;
  spatial_verdict: string;
  interpretation?: 'Likely Sensor Fault' | 'Genuine Weather Event' | 'Communication Failure' | 'Requires Investigation';
  why_detected?: string;
  contributing_factors: SHAPFactor[];
  imputed_value_suggestion?: ImputedSuggestion;
}

export interface DisasterHazard {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  contributing_factors: string[];
}

export interface DisasterRiskSummary {
  tier_label: string;
  composite_risk_score: number;
  composite_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazards: {
    flood: DisasterHazard;
    heatwave: DisasterHazard;
    cyclone: DisasterHazard;
  };
  data_sources_used: string[];
}

export interface AlertItem {
  alert_id: string;
  station_id: string;
  station_name: string;
  category: 'SENSOR_FAULT' | 'WEATHER_HAZARD' | 'COMMUNICATION_FAILURE' | string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  cooldown_active: boolean;
}

export interface RecommendedAction {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  reason: string;
  evidence_basis: string;
  suggested_owner: string;
  estimated_resolution_time: string;
  is_safety_critical: boolean;
}

export interface HistoricalReplayFrame {
  frame_index: number;
  station_id: string;
  station_name?: string;
  city?: string;
  state?: string;
  timestamp: string;
  temperature: number;
  pressure: number;
  humidity: number;
  rainfall?: number;
  wind_speed?: number;
  aqi?: number;
  aqi_category?: string;
  dataset_source: string;
}

export interface SandboxEvaluationResult {
  status: string;
  station_id: string;
  timestamp: string;
  readings: {
    temperature: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
  };
  detection: AnomalyEvaluation;
  contributing_factors: SHAPFactor[];
  imputed_suggestion?: ImputedSuggestion;
  disaster_risks: DisasterRiskSummary;
  is_sandboxed: boolean;
}

