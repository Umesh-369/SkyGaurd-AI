import React, { useId } from 'react';
import { motion } from 'framer-motion';

export interface ArchGaugeProps {
  /** Value normalized between 0 and 1 */
  value: number;
  /** Primary theme color for glow & beacon */
  strokeColor: string;
  /** Gradient color stops along the arc */
  gradientStops: Array<{ offset: string; color: string }>;
  /** Status severity flags */
  isWarn?: boolean;
  isCritical?: boolean;
  /** Content rendered inside the arch dome */
  centerTop?: React.ReactNode;
  centerBottom?: React.ReactNode;
  /** Optional tick labels [min, max], e.g. ["0.0", "1.0"] or ["0", "100"] */
  tickLabels?: [string, string];
  /** Optional custom ID prefix for SVG defs */
  idPrefix?: string;
}

export const ArchGauge: React.FC<ArchGaugeProps> = ({
  value,
  strokeColor,
  gradientStops,
  isWarn = false,
  isCritical = false,
  centerTop,
  centerBottom,
  tickLabels = ['0.0', '1.0'],
  idPrefix = 'gauge'
}) => {
  const generatedId = useId().replace(/:/g, '-');
  const gradientId = `${idPrefix}-grad-${generatedId}`;
  const glowId = `${idPrefix}-glow-${generatedId}`;

  // Clamped progress between 0 and 1
  const progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  // Geometry: center (80, 80), radius 60
  // Arc starts at left (20, 80), sweeps over top (80, 20), ends at right (140, 80)
  const cx = 80;
  const cy = 80;
  const r = 60;
  const arcLength = Math.PI * r; // ~188.4955
  const strokeDashoffset = arcLength * (1 - progress);

  // Position of glowing beacon head at current progress
  const beaconX = cx - r * Math.cos(progress * Math.PI);
  const beaconY = cy - r * Math.sin(progress * Math.PI);

  // Calibrated instrument tick marks at 0%, 25%, 50%, 75%, 100%
  const ticks = [0, 0.25, 0.5, 0.75, 1.0].map((t) => {
    const rIn = 48;
    const rOut = t === 0 || t === 0.5 || t === 1.0 ? 53 : 51;
    const x1 = cx - rIn * Math.cos(t * Math.PI);
    const y1 = cy - rIn * Math.sin(t * Math.PI);
    const x2 = cx - rOut * Math.cos(t * Math.PI);
    const y2 = cy - rOut * Math.sin(t * Math.PI);
    return { x1, y1, x2, y2, isMajor: t === 0.5 };
  });

  return (
    <div className="relative w-44 h-24 flex items-end justify-center select-none">
      <svg
        className="w-44 h-24 overflow-visible"
        viewBox="0 0 160 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, idx) => (
              <stop key={idx} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur
              stdDeviation={isCritical ? 4.5 : isWarn ? 3.5 : 2.5}
              result="blur"
            />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background Track */}
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          stroke="#e2e8f0"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Inner Subtle Dashed Instrument Track */}
        <path
          d="M 27 80 A 53 53 0 0 1 133 80"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.65"
        />

        {/* Instrument Ticks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isMajor ? '#94a3b8' : '#cbd5e1'}
            strokeWidth={tick.isMajor ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Scale Min & Max Labels */}
        <text
          x="16"
          y="90"
          textAnchor="middle"
          className="text-[8px] font-mono fill-slate-400 font-bold"
        >
          {tickLabels[0]}
        </text>
        <text
          x="144"
          y="90"
          textAnchor="middle"
          className="text-[8px] font-mono fill-slate-400 font-bold"
        >
          {tickLabels[1]}
        </text>

        {/* Animated Active Arc with Gradient & Glow */}
        <motion.path
          d="M 20 80 A 60 60 0 0 1 140 80"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          filter={`url(#${glowId})`}
        />

        {/* Animated Leading Head Beacon */}
        {progress > 0.02 && (
          <g>
            {/* Outer Radiating Pulse Aura */}
            <circle
              cx={beaconX}
              cy={beaconY}
              r={isCritical ? 7 : isWarn ? 6 : 5}
              fill={strokeColor}
              opacity={isCritical ? 0.6 : 0.4}
              style={{ transition: 'cx 0.85s cubic-bezier(0.16, 1, 0.3, 1), cy 0.85s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <animate
                attributeName="r"
                values={isCritical ? "7;11;7" : isWarn ? "6;10;6" : "5;8;5"}
                dur="1.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values={isCritical ? "0.4;0.8;0.4" : "0.3;0.6;0.3"}
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Crisp Solid Beacon Core */}
            <circle
              cx={beaconX}
              cy={beaconY}
              r="4"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2.5"
              style={{ transition: 'cx 0.85s cubic-bezier(0.16, 1, 0.3, 1), cy 0.85s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </g>
        )}
      </svg>

      {/* Centered Content under the Arch Dome */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
        {centerTop}
        {centerBottom}
      </div>
    </div>
  );
};
