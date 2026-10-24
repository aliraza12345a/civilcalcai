import React from 'react';
import { GeneralDeflectionResult } from '../engine/beams/deflection';
import { LengthUnit, ForceUnit, MomentUnit, convertUnit } from '../engine/units';

interface DeflectionDiagramProps {
  deflectionResult: GeneralDeflectionResult;
  span: number;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  momentUnit: MomentUnit;
}

export const DeflectionDiagram: React.FC<DeflectionDiagramProps> = ({
  deflectionResult,
  span,
  lengthUnit,
  momentUnit,
}) => {
  const { points, maxDeflection } = deflectionResult;

  if (!points || points.length === 0) {
    return <div className="text-slate-500 italic p-4 text-center">No diagram data available</div>;
  }

  // Display unit factors:
  // Show deflection in mm (if metric) or inches (if imperial) for engineering readability
  const dispDeflUnit = lengthUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254; // from meters

  // Dimensions for aligned SVG diagrams
  const width = 800;
  const heightBMD = 180;
  const heightDefl = 200;
  const margin = { top: 25, right: 40, bottom: 35, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeightBMD = heightBMD - margin.top - margin.bottom;
  const plotHeightDefl = heightDefl - margin.top - margin.bottom;

  // Max / Min scales for BMD
  const momentValues = points.map(p => convertUnit(p.moment, 'N*m', momentUnit));
  let minM = Math.min(...momentValues, 0);
  let maxM = Math.max(...momentValues, 0);
  if (Math.abs(maxM - minM) < 1e-6) {
    maxM = 1;
    minM = -1;
  }
  const paddingM = (maxM - minM) * 0.15;
  const upperM = maxM + paddingM;
  const lowerM = minM - paddingM;

  const getBMDY = (val: number) => {
    return margin.top + plotHeightBMD * (1 - (val - lowerM) / (upperM - lowerM));
  };
  const zeroBMDY = getBMDY(0);

  // Max / Min scales for Deflected Shape (upward is positive, downward is negative)
  const deflValues = points.map(p => p.deflection * deflMultiplier);
  let minD = Math.min(...deflValues, 0);
  let maxD = Math.max(...deflValues, 0);
  if (Math.abs(maxD - minD) < 1e-6) {
    maxD = 1;
    minD = -1;
  }
  const paddingD = (maxD - minD) * 0.15;
  const upperD = maxD + paddingD;
  const lowerD = minD - paddingD;

  const getDeflY = (val: number) => {
    return margin.top + plotHeightDefl * (1 - (val - lowerD) / (upperD - lowerD));
  };
  const zeroDeflY = getDeflY(0);

  const getX = (xVal: number) => {
    return margin.left + (xVal / span) * plotWidth;
  };

  // Build SVG Paths for BMD
  let bmdPathD = `M ${getX(points[0].x)} ${zeroBMDY}`;
  points.forEach(p => {
    const mVal = convertUnit(p.moment, 'N*m', momentUnit);
    bmdPathD += ` L ${getX(p.x)} ${getBMDY(mVal)}`;
  });
  bmdPathD += ` L ${getX(points[points.length - 1].x)} ${zeroBMDY} Z`;

  let bmdStrokeD = '';
  points.forEach((p, idx) => {
    const mVal = convertUnit(p.moment, 'N*m', momentUnit);
    bmdStrokeD += `${idx === 0 ? 'M' : 'L'} ${getX(p.x)} ${getBMDY(mVal)} `;
  });

  // Build SVG Paths for Deflection Curve
  let deflStrokeD = '';
  points.forEach((p, idx) => {
    const dVal = p.deflection * deflMultiplier;
    deflStrokeD += `${idx === 0 ? 'M' : 'L'} ${getX(p.x)} ${getDeflY(dVal)} `;
  });

  // Peak locations
  const maxDeflDisp = maxDeflection.value * deflMultiplier;
  const maxDeflX = getX(maxDeflection.location);
  const maxDeflY = getDeflY(maxDeflDisp);

  return (
    <div className="space-y-6">
      {/* Visual Alignment Container */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Diagram 1: Bending Moment Diagram (BMD) */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-200">
                1. Bending Moment Diagram (BMD)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Units: {momentUnit} (Sagging = Positive)
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${heightBMD}`} className="w-full h-auto max-w-full font-mono text-[10px]">
              {/* Grid / Zero Axis */}
              <line 
                x1={margin.left} 
                y1={zeroBMDY} 
                x2={width - margin.right} 
                y2={zeroBMDY} 
                stroke="#475569" 
                strokeWidth="1.5" 
                strokeDasharray="4 3" 
              />
              <text x={margin.left - 8} y={zeroBMDY + 3} textAnchor="end" fill="#94a3b8">0</text>

              {/* Shaded Area & Line */}
              <path d={bmdPathD} fill="rgba(251, 191, 36, 0.12)" />
              <path d={bmdStrokeD} fill="none" stroke="#fbbf24" strokeWidth="2.5" />

              {/* Peak Values */}
              <text x={margin.left - 8} y={getBMDY(maxM) + 3} textAnchor="end" fill="#fbbf24">
                +{maxM.toFixed(2)}
              </text>
              {minM < -1e-4 && (
                <text x={margin.left - 8} y={getBMDY(minM) + 3} textAnchor="end" fill="#fbbf24">
                  {minM.toFixed(2)}
                </text>
              )}

              {/* Span Markers */}
              <line x1={margin.left} y1={heightBMD - margin.bottom} x2={width - margin.right} y2={heightBMD - margin.bottom} stroke="#334155" strokeWidth="1" />
              <text x={margin.left} y={heightBMD - 12} textAnchor="middle" fill="#64748b">x = 0</text>
              <text x={width - margin.right} y={heightBMD - 12} textAnchor="middle" fill="#64748b">
                x = {span} {lengthUnit}
              </text>
            </svg>
          </div>
        </div>

        {/* Separator indicating exact vertical alignment */}
        <div className="border-t border-slate-800/80 my-1"></div>

        {/* Diagram 2: Deflected Shape Graph (Aligned on exact same x-axis) */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-200">
                2. Deflected Elastic Curve (y vs x)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Units: {dispDeflUnit} (Upward = +y, Downward = -y)
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${heightDefl}`} className="w-full h-auto max-w-full font-mono text-[10px]">
              {/* Zero Reference Line */}
              <line 
                x1={margin.left} 
                y1={zeroDeflY} 
                x2={width - margin.right} 
                y2={zeroDeflY} 
                stroke="#475569" 
                strokeWidth="1.5" 
                strokeDasharray="4 3" 
              />
              <text x={margin.left - 8} y={zeroDeflY + 3} textAnchor="end" fill="#94a3b8">0</text>

              {/* Deflection Curve */}
              <path d={deflStrokeD} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

              {/* Max Deflection Callout */}
              <circle cx={maxDeflX} cy={maxDeflY} r="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
              <line 
                x1={maxDeflX} 
                y1={zeroDeflY} 
                x2={maxDeflX} 
                y2={maxDeflY} 
                stroke="#38bdf8" 
                strokeWidth="1" 
                strokeDasharray="2 2" 
              />

              {/* Callout box for Max Deflection */}
              <g transform={`translate(${Math.min(Math.max(maxDeflX - 65, margin.left), width - margin.right - 130)}, ${maxDeflY > zeroDeflY ? maxDeflY + 12 : maxDeflY - 28})`}>
                <rect x="0" y="0" width="130" height="24" rx="4" fill="#082f49" stroke="#0284c7" strokeWidth="1" />
                <text x="65" y="15" textAnchor="middle" fill="#7dd3fc" fontWeight="bold">
                  y_max = {maxDeflDisp.toFixed(3)} {dispDeflUnit}
                </text>
              </g>

              {/* Span Markers */}
              <line x1={margin.left} y1={heightDefl - margin.bottom} x2={width - margin.right} y2={heightDefl - margin.bottom} stroke="#334155" strokeWidth="1" />
              <text x={margin.left} y={heightDefl - 12} textAnchor="middle" fill="#64748b">x = 0</text>
              <text x={maxDeflX} y={heightDefl - 12} textAnchor="middle" fill="#38bdf8">
                x = {maxDeflection.location.toFixed(2)} {lengthUnit}
              </text>
              <text x={width - margin.right} y={heightDefl - 12} textAnchor="middle" fill="#64748b">
                x = {span} {lengthUnit}
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Assumptions Box */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <h4 className="font-semibold text-xs text-sky-300 uppercase tracking-wide">
          Governing Assumptions & Structural Mechanics Basis
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400">
          {deflectionResult.assumptions.map((assump, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="text-sky-400 font-bold">&bull;</span>
              <span>{assump}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
