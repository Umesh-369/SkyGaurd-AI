import React, { useState } from 'react';
import { Network, MapPin, Activity, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Station } from '../types';

interface StationMapProps {
  stations: Station[];
  selectedStationId: string;
  onSelectStation: (id: string) => void;
  is3DMode?: boolean;
  onToggle3D?: () => void;
}

interface NodePos {
  x: number;
  y: number;
  layer: string;
  subType: string;
}

const NEURAL_NODE_POSITIONS: Record<string, NodePos> = {
  // Input Layer: Coastal / Goa Sector Nodes (X = 90)
  'AWS-01':        { x: 90,  y: 95,  layer: 'INPUT LAYER', subType: 'Coastal Station' },
  'AWS_GOA_01':    { x: 90,  y: 95,  layer: 'INPUT LAYER', subType: 'Coastal Station' },
  'AWS-IND-GA-01': { x: 90,  y: 95,  layer: 'INPUT LAYER', subType: 'Coastal Station' },
  
  'AWS-02':        { x: 90,  y: 205, layer: 'INPUT LAYER', subType: 'Inland Station' },
  'AWS_GOA_02':    { x: 90,  y: 205, layer: 'INPUT LAYER', subType: 'Inland Station' },
  'AWS-IND-GA-02': { x: 90,  y: 205, layer: 'INPUT LAYER', subType: 'Inland Station' },

  'AWS-03':        { x: 90,  y: 315, layer: 'INPUT LAYER', subType: 'Port Station' },
  'AWS_GOA_03':    { x: 90,  y: 315, layer: 'INPUT LAYER', subType: 'Port Station' },
  'AWS-IND-GA-03': { x: 90,  y: 315, layer: 'INPUT LAYER', subType: 'Port Station' },

  'AWS-04':        { x: 90,  y: 425, layer: 'INPUT LAYER', subType: 'North Station' },
  'AWS_GOA_04':    { x: 90,  y: 425, layer: 'INPUT LAYER', subType: 'North Station' },
  'AWS-IND-GA-04': { x: 90,  y: 425, layer: 'INPUT LAYER', subType: 'North Station' },

  // Hidden / Processing Layer: Regional Hubs (X = 270)
  'AWS-IND-MUM':   { x: 270, y: 75,  layer: 'PROCESSING LAYER', subType: 'Coastal AWS' },
  'AWS-IND-AMD':   { x: 270, y: 175, layer: 'PROCESSING LAYER', subType: 'Western AWS' },
  'AWS-IND-BHO':   { x: 270, y: 275, layer: 'PROCESSING LAYER', subType: 'Central AWS' },
  'AWS-IND-HYD':   { x: 270, y: 375, layer: 'PROCESSING LAYER', subType: 'Deccan AWS' },
  'AWS-IND-BLR':   { x: 270, y: 465, layer: 'PROCESSING LAYER', subType: 'Plateau AWS' },

  // Output / Aggregation Layer: Metropolitan & Regional Gateways (X = 440)
  'AWS-IND-DEL':   { x: 440, y: 35,  layer: 'AGGREGATION LAYER', subType: 'National Capital AWS' },
  'AWS-IND-JAI':   { x: 440, y: 115, layer: 'AGGREGATION LAYER', subType: 'Desert Fringe' },
  'AWS-IND-LKO':   { x: 440, y: 205, layer: 'AGGREGATION LAYER', subType: 'Gangetic AWS' },
  'AWS-IND-CCU':   { x: 440, y: 310, layer: 'AGGREGATION LAYER', subType: 'Delta AWS' },
  'AWS-IND-MAA':   { x: 440, y: 425, layer: 'AGGREGATION LAYER', subType: 'Coastal AWS' }
};

const SYNAPTIC_CONNECTIONS: [string, string][] = [
  ["AWS-01", "AWS-IND-MUM"],
  ["AWS-01", "AWS-IND-BHO"],
  ["AWS-02", "AWS-IND-HYD"],
  ["AWS-02", "AWS-IND-BLR"],
  ["AWS-03", "AWS-IND-MUM"],
  ["AWS-03", "AWS-IND-HYD"],
  ["AWS-04", "AWS-IND-AMD"],
  ["AWS-04", "AWS-IND-BHO"],
  ["AWS-IND-MUM", "AWS-IND-DEL"],
  ["AWS-IND-AMD", "AWS-IND-DEL"],
  ["AWS-IND-DEL", "AWS-IND-JAI"],
  ["AWS-IND-DEL", "AWS-IND-LKO"],
  ["AWS-IND-MUM", "AWS-IND-JAI"],
  ["AWS-IND-AMD", "AWS-IND-JAI"],
  ["AWS-IND-AMD", "AWS-IND-LKO"],
  ["AWS-IND-BHO", "AWS-IND-LKO"],
  ["AWS-IND-BHO", "AWS-IND-CCU"],
  ["AWS-IND-HYD", "AWS-IND-CCU"],
  ["AWS-IND-HYD", "AWS-IND-MAA"],
  ["AWS-IND-BLR", "AWS-IND-MAA"],
  ["AWS-01", "AWS-02"],
  ["AWS-02", "AWS-03"],
  ["AWS-03", "AWS-04"],
  ["AWS-IND-MUM", "AWS-IND-AMD"],
  ["AWS-IND-BHO", "AWS-IND-HYD"],
  ["AWS-IND-LKO", "AWS-IND-CCU"]
];

export const StationMap: React.FC<StationMapProps> = ({
  stations,
  selectedStationId,
  onSelectStation
}) => {
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);

  const hoveredStation = stations.find(s => s.station_id === hoveredStationId || s.id === hoveredStationId);
  const activeHoveredReadings = hoveredStation?.last_reading;

  return (
    <div className="luxury-card p-6 relative overflow-hidden bg-white text-slate-900 min-h-[560px] flex flex-col justify-between border border-slate-200 shadow-sm space-y-4 font-sans select-none hover:border-sky-300 transition-colors">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
            <Network className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-wider">
              2D NEURAL NETWORK TOPOLOGY GRAPH <span className="text-sky-700 font-mono text-xs">({stations.length} NODES)</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Layered Synaptic Topology & Real-Time Telemetry Stream Pathways
            </p>
          </div>
        </div>

      </div>

      {/* Neural Graph Canvas Container */}
      <div className="relative h-[450px] w-full rounded-2xl bg-slate-50/60 border border-slate-200 p-4 flex items-center justify-center overflow-hidden">
        
        {/* Subtle Grid Dot Matrix Background Pattern */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#94A3B8 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Layer Headings */}
        <div className="absolute top-3 left-0 right-0 px-12 flex justify-between pointer-events-none text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest z-10">
          <span>INPUT LAYER (GOA)</span>
          <span>PROCESSING LAYER (REGIONAL)</span>
          <span>AGGREGATION LAYER (METRO)</span>
        </div>

        {/* Synaptic Pathway Edges & Animated Signal Pulses SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 520 520" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="glowPulse" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {SYNAPTIC_CONNECTIONS.map(([srcId, tgtId], idx) => {
            const posSrc = NEURAL_NODE_POSITIONS[srcId];
            const posTgt = NEURAL_NODE_POSITIONS[tgtId];
            if (!posSrc || !posTgt) return null;

            const isRelated = hoveredStationId && (srcId === hoveredStationId || tgtId === hoveredStationId);
            const isSelectedLink = (srcId === selectedStationId || tgtId === selectedStationId);

            const dx = posTgt.x - posSrc.x;
            const cx1 = posSrc.x + dx * 0.4;
            const cy1 = posSrc.y;
            const cx2 = posSrc.x + dx * 0.6;
            const cy2 = posTgt.y;
            const pathD = `M ${posSrc.x} ${posSrc.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${posTgt.x} ${posTgt.y}`;

            const lineColor = isRelated || isSelectedLink ? '#0284c7' : '#CBD5E1';
            const lineWidth = isRelated || isSelectedLink ? 2.5 : 1.2;
            const lineOpacity = isRelated || isSelectedLink ? 0.9 : 0.45;

            return (
              <g key={idx}>
                {/* Synaptic Pathway Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={lineWidth}
                  opacity={lineOpacity}
                  strokeDasharray={isRelated ? '6 4' : 'none'}
                />

                {/* Real-time Streaming Signal Pulse Dot */}
                <circle cx="0" cy="0" r={isRelated ? "3.5" : "2.5"} fill={isRelated || isSelectedLink ? '#0284c7' : '#38BDF8'} opacity={isRelated ? 1 : 0.75} filter="url(#glowPulse)">
                  <animateMotion
                    dur={`${2.5 + (idx % 4) * 0.6}s`}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Neural Activation Nodes */}
        <div className="relative w-full h-full z-20">
          {stations.map((st) => {
            const stId = st.station_id || st.id || 'AWS-01';
            const pos = NEURAL_NODE_POSITIONS[stId] || { x: 260, y: 260, layer: 'PROCESSING', subType: 'AWS Node' };
            const isSelected = stId === selectedStationId;
            const isHovered = stId === hoveredStationId;

            const health = st.health?.overall_health_score ?? 100;
            const hasFault = health < 60;
            const hasWarning = health >= 60 && health < 85;

            const posX = (pos.x / 520) * 100;
            const posY = (pos.y / 520) * 100;

            const tempStr = st.last_reading?.temperature != null
              ? `${st.last_reading.temperature.toFixed(1)}°C`
              : '—';

            const statusDotColor = hasFault ? 'bg-red-500' : hasWarning ? 'bg-amber-500' : 'bg-emerald-500';
            const cityName = st.name.split(' ')[0];

            return (
              <div
                key={stId}
                onClick={() => onSelectStation(stId)}
                onMouseEnter={() => setHoveredStationId(stId)}
                onMouseLeave={() => setHoveredStationId(null)}
                style={{ top: `${posY}%`, left: `${posX}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                  isSelected ? 'z-30 scale-110' : isHovered ? 'z-40 scale-125' : 'z-20'
                }`}
              >
                <div className="flex flex-col items-center group relative">
                  
                  {/* Outer Activation Halo */}
                  {hasFault ? (
                    <div className="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping" />
                  ) : hasWarning ? (
                    <div className="absolute -inset-2 rounded-full bg-amber-400/30 animate-pulse" />
                  ) : (
                    <div className="absolute -inset-2 rounded-full bg-emerald-400/20 animate-ping opacity-20" />
                  )}

                  {/* Inner Activation Core */}
                  <div className={`relative p-1.5 rounded-full bg-white border-2 shadow-md flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-sky-600 ring-4 ring-sky-100'
                      : isHovered
                      ? 'border-sky-500 ring-2 ring-sky-100'
                      : 'border-slate-300 group-hover:border-sky-400'
                  }`}>
                    <span className={`w-3.5 h-3.5 rounded-full ${statusDotColor} flex items-center justify-center shadow-inner`}>
                      <span className="w-1 h-1 rounded-full bg-white"></span>
                    </span>
                  </div>

                  {/* Monospace Station & Telemetry Pill */}
                  <div className={`mt-1.5 px-2.5 py-1 rounded-full text-center border backdrop-blur-md shadow-sm transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-600 border-sky-600 text-white font-extrabold shadow-md'
                      : isHovered
                      ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-md'
                      : 'bg-white/95 border-slate-200 text-slate-800 font-bold'
                  }`}>
                    <span className="text-[10px] font-sans tracking-wide uppercase">{cityName}</span>
                    <span className="text-[10px] font-mono font-extrabold ml-1.5">{tempStr}</span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Glassmorphism Hover Card (Dynamically flips between top and bottom to avoid covering nodes) */}
        <AnimatePresence>
          {hoveredStation && (() => {
            const hoveredNodePos = NEURAL_NODE_POSITIONS[hoveredStation.station_id || hoveredStation.id || '']?.y ?? 260;
            const isBottomNode = hoveredNodePos > 280; // If node is in the lower half, show tooltip at the top

            return (
              <motion.div
                initial={{ opacity: 0, y: isBottomNode ? -8 : 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isBottomNode ? -8 : 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute ${isBottomNode ? 'top-3 right-3' : 'bottom-3 right-3'} bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl text-xs font-sans z-50 min-w-[230px] space-y-2 pointer-events-none`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-600" />
                    <span className="font-extrabold text-slate-900 font-display uppercase">{hoveredStation.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {hoveredStation.station_id}
                  </span>
                </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 text-center">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">TEMP</span>
                  <strong className="text-slate-900">
                    {activeHoveredReadings?.temperature != null ? `${activeHoveredReadings.temperature.toFixed(1)}°C` : '—'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">PRESS</span>
                  <strong className="text-slate-900">
                    {activeHoveredReadings?.pressure != null ? `${activeHoveredReadings.pressure.toFixed(0)} hPa` : '—'}
                  </strong>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">HUMID</span>
                  <strong className="text-slate-900">
                    {activeHoveredReadings?.humidity != null ? `${activeHoveredReadings.humidity.toFixed(0)}%` : '—'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-500">
                <span>SYNAPTIC STATUS:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full ${
                  (hoveredStation.health?.overall_health_score ?? 100) < 60
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {(hoveredStation.health?.overall_health_score ?? 100) < 60 ? 'SENSOR ANOMALY' : 'ACTIVE STREAMING'}
                </span>
              </div>
            </motion.div>
            );
          })()}
        </AnimatePresence>

      </div>
    </div>
  );
};
