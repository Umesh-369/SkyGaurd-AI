import React, { useEffect, useState } from 'react';
import { ShieldCheck, Thermometer, Gauge, Droplets } from 'lucide-react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useTelemetryStore, evaluateTier1Anomaly } from '../store/useSkyGuardStore';
import { Station, Reading, AnomalyRecord } from '../types';
import { ArchGauge } from './ArchGauge';

interface Tier1DetectionCardProps {
  selectedStation?: Station;
  currentReading?: Reading;
  activeAnomaly?: AnomalyRecord;
}

export const AnimatedNumber: React.FC<{ value: number; decimals?: number; className?: string }> = ({
  value = 0,
  decimals = 2,
  className
}) => {
  const safeVal = Number.isFinite(value) ? value : 0;
  const spring = useSpring(safeVal, { stiffness: 90, damping: 18 });
  const [display, setDisplay] = useState(safeVal.toFixed(decimals));

  useEffect(() => {
    spring.set(safeVal);
  }, [safeVal, spring]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (Number.isFinite(latest)) {
        setDisplay(latest.toFixed(decimals));
      }
    });
  }, [spring, decimals]);

  return <span className={className}>{display}</span>;
};

export const Tier1DetectionCard: React.FC<Tier1DetectionCardProps> = ({
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

  const temp = currentReading?.temperature ?? selectedStation?.last_reading?.temperature ?? 28.5;
  const press = currentReading?.pressure ?? selectedStation?.last_reading?.pressure ?? 1012.0;
  const hum = currentReading?.humidity ?? selectedStation?.last_reading?.humidity ?? 75.0;
  const faultType = currentReading?.injected_fault_type || (activeAnomaly?.root_cause !== 'normal' ? activeAnomaly?.root_cause : undefined);

  const evalResult = evaluateTier1Anomaly(
    temp,
    press,
    hum,
    faultType,
    activeAnomaly || currentReading?.anomaly_evaluation
  );

  const detectionTimestamp = activeAnomaly?.timestamp
    ? new Date(activeAnomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
    : currentReading?.timestamp
    ? new Date(currentReading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';

  const isCritical = evalResult.anomalyScore > 0.60 || evalResult.statusBadge === 'CRITICAL ANOMALY';
  const isWarn = evalResult.anomalyScore >= 0.35 && !isCritical;

  const strokeColor = isCritical ? '#dc2626' : isWarn ? '#d97706' : '#059669';

  const tier1GradientStops = isCritical
    ? [
        { offset: '0%', color: '#fb923c' },
        { offset: '50%', color: '#ef4444' },
        { offset: '100%', color: '#b91c1c' }
      ]
    : isWarn
    ? [
        { offset: '0%', color: '#fde047' },
        { offset: '50%', color: '#f59e0b' },
        { offset: '100%', color: '#d97706' }
      ]
    : [
        { offset: '0%', color: '#34d399' },
        { offset: '50%', color: '#10b981' },
        { offset: '100%', color: '#0284c7' }
      ];

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}
      transition={{ duration: 0.2 }}
      className="luxury-card p-6 bg-white border border-slate-200 shadow-sm space-y-4 font-sans hover:border-sky-300 transition-colors"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 text-sky-700">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="font-extrabold text-xs uppercase tracking-widest font-mono">
            TIER 1 · SENSOR ANOMALY DETECTION
          </h3>
        </div>

        <AnimatePresence mode="wait">
          <motion.span
            key={evalResult.statusBadge}
            initial={{ scale: 1.15, filter: 'brightness(1.3)' }}
            animate={{ scale: 1, filter: 'brightness(1)' }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`inline-flex items-center text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border shadow-xs ${evalResult.badgeBg} ${evalResult.badgeColor}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isCritical
                  ? 'bg-red-500 animate-ping'
                  : isWarn
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            {evalResult.statusBadge}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Sensor Parameters */}
        <div className="space-y-2.5 text-xs">
          {/* Temp Chip */}
          <motion.div
            key={evalResult.isTempFlagged ? 'temp-flagged' : 'temp-normal'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
              evalResult.isTempFlagged
                ? 'bg-red-50/90 border-red-300 text-red-900 font-bold shadow-sm ring-1 ring-red-400/40'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Thermometer className={`w-3.5 h-3.5 ${evalResult.isTempFlagged ? 'text-red-600 animate-pulse' : 'text-rose-500'}`} />
              <span>Temp (<AnimatedNumber value={temp} decimals={1} />°C)</span>
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={evalResult.isTempFlagged ? 'flagged' : 'normal'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  evalResult.isTempFlagged ? 'text-red-700 bg-red-100 border-red-300 animate-pulse' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                }`}
              >
                {evalResult.isTempFlagged ? 'FLAGGED' : 'Normal'}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          {/* Pressure Chip */}
          <motion.div
            key={evalResult.isPressFlagged ? 'press-flagged' : 'press-normal'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
              evalResult.isPressFlagged
                ? 'bg-red-50/90 border-red-300 text-red-900 font-bold shadow-sm ring-1 ring-red-400/40'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Gauge className={`w-3.5 h-3.5 ${evalResult.isPressFlagged ? 'text-red-600 animate-pulse' : 'text-sky-600'}`} />
              <span>Pressure (<AnimatedNumber value={press} decimals={1} /> hPa)</span>
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={evalResult.isPressFlagged ? 'flagged' : 'normal'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  evalResult.isPressFlagged ? 'text-red-700 bg-red-100 border-red-300 animate-pulse' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                }`}
              >
                {evalResult.isPressFlagged ? 'FLAGGED' : 'Normal'}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          {/* Humidity Chip */}
          <motion.div
            key={evalResult.isHumFlagged ? 'hum-flagged' : 'hum-normal'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
              evalResult.isHumFlagged
                ? 'bg-red-50/90 border-red-300 text-red-900 font-bold shadow-sm ring-1 ring-red-400/40'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Droplets className={`w-3.5 h-3.5 ${evalResult.isHumFlagged ? 'text-red-600 animate-pulse' : 'text-sky-600'}`} />
              <span>Humidity (<AnimatedNumber value={hum} decimals={1} />%)</span>
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={evalResult.isHumFlagged ? 'flagged' : 'normal'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  evalResult.isHumFlagged ? 'text-red-700 bg-red-100 border-red-300 animate-pulse' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                }`}
              >
                {evalResult.isHumFlagged ? 'FLAGGED' : 'Normal'}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Anomaly Score 180-Degree Arch Speedometer Gauge */}
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <span className="text-[10px] font-mono font-extrabold text-sky-700 uppercase tracking-widest mb-1">
            ANOMALY SCORE
          </span>

          <ArchGauge
            value={evalResult.anomalyScore}
            strokeColor={strokeColor}
            gradientStops={tier1GradientStops}
            isWarn={isWarn}
            isCritical={isCritical}
            tickLabels={['0.0', '1.0']}
            idPrefix="tier1"
            centerTop={
              <motion.span
                animate={isCritical ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ repeat: isCritical ? Infinity : 0, duration: 2, ease: 'easeInOut' }}
                className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight leading-none"
              >
                <AnimatedNumber value={evalResult.anomalyScore} decimals={2} />
              </motion.span>
            }
            centerBottom={
              <span
                className={`text-[9px] font-mono font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full border shadow-xs ${
                  isCritical
                    ? 'text-red-700 bg-red-100/90 border-red-300 animate-pulse'
                    : isWarn
                    ? 'text-amber-700 bg-amber-100/90 border-amber-300'
                    : 'text-emerald-700 bg-emerald-100/90 border-emerald-300'
                }`}
              >
                {evalResult.statusBadge}
              </span>
            }
          />
        </div>

        {/* Diagnostics & Detection Reason */}
        <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-sky-700 block font-mono font-bold uppercase">DETECTION TIME</span>
            <span className="font-bold text-slate-900 font-mono text-xs">{detectionTimestamp}</span>
          </div>
          <div>
            <span className="text-[10px] text-sky-700 block font-mono font-bold uppercase">CONFIDENCE</span>
            <span className="font-bold text-emerald-700 font-mono">
              <AnimatedNumber value={evalResult.confidencePct} decimals={0} />%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-sky-700 block font-mono font-bold uppercase">REASON</span>
            <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">
              {evalResult.reasonText}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
