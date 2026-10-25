import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Play, Pause, Crosshair } from 'lucide-react';
import { BeamModel, BeamReactionsResult } from '../engine/beams/types';
import { BeamDiagramsResult } from '../engine/beams/diagrams';
import { GeneralDeflectionResult } from '../engine/beams/deflection';
import { LengthUnit, ForceUnit, DistributedLoadUnit, MomentUnit, convertUnit } from '../engine/units';

interface InteractiveBeamVisualizerProps {
  beamModel: BeamModel;
  reactionsResult: BeamReactionsResult;
  diagramsResult: BeamDiagramsResult;
  deflectionResult: GeneralDeflectionResult;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  distLoadUnit: DistributedLoadUnit;
  momentUnit: MomentUnit;
}

export const InteractiveBeamVisualizer: React.FC<InteractiveBeamVisualizerProps> = ({
  beamModel,
  reactionsResult,
  diagramsResult,
  deflectionResult,
  lengthUnit,
  forceUnit,
  distLoadUnit,
  momentUnit,
}) => {
  const L = beamModel.span;
  const isSS = beamModel.type === 'simply-supported';

  // Movable Scrubber / Probe Position in Base SI (meters, 0 <= probeX <= L)
  const [probeX, setProbeX] = useState<number>(L / 2);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const sweepRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (sweepRef.current !== null) cancelAnimationFrame(sweepRef.current);
  }, []);

  // SVG Geometry Dimensions
  const svgWidth = 860;
  const margin = { left: 80, right: 40, top: 20, bottom: 25 };
  const plotWidth = svgWidth - margin.left - margin.right;

  const hBeam = 130;
  const hSFD = 150;
  const hBMD = 160;
  const hDefl = 150;

  // Conversion Multipliers
  const dispDeflUnit = lengthUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;

  // Mapping coordinate x [0, L] to SVG screen X
  const toScreenX = useCallback((x: number) => {
    return margin.left + Math.max(0, Math.min(1, x / L)) * plotWidth;
  }, [L, plotWidth, margin.left]);

  // Inverse mapping: screen X to x [0, L]
  const fromScreenX = useCallback((screenX: number) => {
    const norm = (screenX - margin.left) / plotWidth;
    return Math.max(0, Math.min(L, norm * L));
  }, [L, plotWidth, margin.left]);

  // Handle Drag / Hover Scrubber across SVGs
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    // Scale clientX if SVG is scaled by CSS
    const scale = svgWidth / rect.width;
    const svgX = clientX * scale;
    if (svgX >= margin.left && svgX <= margin.left + plotWidth) {
      setProbeX(fromScreenX(svgX));
    }
  };

  // Automated Sweep Animation
  const toggleSweep = () => {
    if (isSweeping) {
      if (sweepRef.current) cancelAnimationFrame(sweepRef.current);
      setIsSweeping(false);
    } else {
      setIsSweeping(true);
      let dir = 1;
      let curr = probeX;
      const step = L / 240;

      const sweepLoop = () => {
        curr += step * dir;
        if (curr >= L) {
          curr = L;
          dir = -1;
        } else if (curr <= 0) {
          curr = 0;
          dir = 1;
        }
        setProbeX(curr);
        sweepRef.current = requestAnimationFrame(sweepLoop);
      };
      sweepRef.current = requestAnimationFrame(sweepLoop);
    }
  };

  // Jump to the moment peak (an interior positive peak is also a V = 0 point).
  const jumpToMaxMoment = () => setProbeX(diagramsResult.maxMoment.location);

  const jumpToMaxDeflection = () => {
    if (deflectionResult.maxDeflection.location !== undefined) {
      setProbeX(deflectionResult.maxDeflection.location);
    }
  };

  // Live Readout at Current Probe Position
  const probeValues = useMemo(() => {
    const x = probeX;
    const shear = diagramsResult.shearAt(x);
    const moment = diagramsResult.momentAt(x);
    const deflection = deflectionResult.deflectionAt(x);
    const slope = deflectionResult.slopeAt(x);

    const xDisp = convertUnit(x, 'm', lengthUnit);
    const shearDispLeft = convertUnit(shear.left, 'N', forceUnit);
    const shearDispRight = convertUnit(shear.right, 'N', forceUnit);
    const momentDisp = convertUnit(moment, 'N*m', momentUnit);
    const deflDisp = deflection * deflMultiplier;
    const slopeMrad = slope * 1000;

    const hasStep = Math.abs(shear.right - shear.left) > 1e-3;

    return {
      x,
      xDisp,
      shearLeft: shearDispLeft,
      shearRight: shearDispRight,
      hasStep,
      moment: momentDisp,
      isSagging: moment >= 0,
      deflection: deflDisp,
      slopeMrad,
    };
  }, [probeX, diagramsResult, deflectionResult, lengthUnit, forceUnit, momentUnit, deflMultiplier]);

  // Scales for SFD
  const sfdPoints = diagramsResult.points;
  const sfdValues = sfdPoints.map((p) => convertUnit(p.shear, 'N', forceUnit));
  let minV = Math.min(...sfdValues, 0);
  let maxV = Math.max(...sfdValues, 0);
  if (Math.abs(maxV - minV) < 1e-5) {
    maxV = 1;
    minV = -1;
  }
  const padV = (maxV - minV) * 0.18;
  const upperV = maxV + padV;
  const lowerV = minV - padV;
  const getSFDY = (val: number) => {
    const plotH = hSFD - margin.top - margin.bottom;
    return margin.top + plotH * (1 - (val - lowerV) / (upperV - lowerV));
  };
  const zeroSFDY = getSFDY(0);

  // Scales for BMD
  const bmdValues = sfdPoints.map((p) => convertUnit(p.moment, 'N*m', momentUnit));
  let minM = Math.min(...bmdValues, 0);
  let maxM = Math.max(...bmdValues, 0);
  if (Math.abs(maxM - minM) < 1e-5) {
    maxM = 1;
    minM = -1;
  }
  const padM = (maxM - minM) * 0.18;
  const upperM = maxM + padM;
  const lowerM = minM - padM;
  const getBMDY = (val: number) => {
    const plotH = hBMD - margin.top - margin.bottom;
    return margin.top + plotH * (1 - (val - lowerM) / (upperM - lowerM));
  };
  const zeroBMDY = getBMDY(0);

  // Scales for Deflection
  const deflPoints = deflectionResult.points;
  const deflValues = deflPoints.map((p) => p.deflection * deflMultiplier);
  let minD = Math.min(...deflValues, 0);
  let maxD = Math.max(...deflValues, 0);
  if (Math.abs(maxD - minD) < 1e-5) {
    maxD = 1;
    minD = -1;
  }
  const padD = (maxD - minD) * 0.22;
  const upperD = maxD + padD;
  const lowerD = minD - padD;
  const getDeflY = (val: number) => {
    const plotH = hDefl - margin.top - margin.bottom;
    return margin.top + plotH * (1 - (val - lowerD) / (upperD - lowerD));
  };
  const zeroDeflY = getDeflY(0);

  // SVG Paths for SFD
  let sfdPathD = `M ${toScreenX(sfdPoints[0]?.x ?? 0)} ${zeroSFDY}`;
  sfdPoints.forEach((p) => {
    const vDisp = convertUnit(p.shear, 'N', forceUnit);
    sfdPathD += ` L ${toScreenX(p.x)} ${getSFDY(vDisp)}`;
  });
  sfdPathD += ` L ${toScreenX(sfdPoints[sfdPoints.length - 1]?.x ?? L)} ${zeroSFDY} Z`;

  let sfdStrokeD = '';
  sfdPoints.forEach((p, idx) => {
    const vDisp = convertUnit(p.shear, 'N', forceUnit);
    sfdStrokeD += `${idx === 0 ? 'M' : 'L'} ${toScreenX(p.x)} ${getSFDY(vDisp)} `;
  });

  // SVG Paths for BMD
  let bmdPathD = `M ${toScreenX(sfdPoints[0]?.x ?? 0)} ${zeroBMDY}`;
  sfdPoints.forEach((p) => {
    const mDisp = convertUnit(p.moment, 'N*m', momentUnit);
    bmdPathD += ` L ${toScreenX(p.x)} ${getBMDY(mDisp)}`;
  });
  bmdPathD += ` L ${toScreenX(sfdPoints[sfdPoints.length - 1]?.x ?? L)} ${zeroBMDY} Z`;

  let bmdStrokeD = '';
  sfdPoints.forEach((p, idx) => {
    const mDisp = convertUnit(p.moment, 'N*m', momentUnit);
    bmdStrokeD += `${idx === 0 ? 'M' : 'L'} ${toScreenX(p.x)} ${getBMDY(mDisp)} `;
  });

  // SVG Paths for Deflection
  let deflStrokeD = '';
  deflPoints.forEach((p, idx) => {
    const dDisp = p.deflection * deflMultiplier;
    deflStrokeD += `${idx === 0 ? 'M' : 'L'} ${toScreenX(p.x)} ${getDeflY(dDisp)} `;
  });

  const probeScreenX = toScreenX(probeX);

  return (
    <div className="space-y-4">
      {/* Interactive Precision Scrubber Bar (The "move able" graph feature!) */}
      <div className="p-4 rounded-xl bg-slate-900/95 border border-sky-500/40 shadow-xl shadow-sky-950/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-sky-400">
            <Crosshair className="w-4 h-4 animate-pulse text-sky-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Interactive Precision Probe (Movable Cursor)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSweep}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-all ${
                isSweeping
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                  : 'bg-slate-800 text-sky-300 hover:bg-slate-700'
              }`}
            >
              {isSweeping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSweeping ? 'Stop Sweep' : 'Auto Sweep'}</span>
            </button>

            <button
              onClick={jumpToMaxMoment}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium"
              title="Jump to location of maximum positive bending moment"
            >
              Jump to M_max
            </button>

            <button
              onClick={jumpToMaxDeflection}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium"
              title="Jump to location of peak deflection"
            >
              Jump to δ_max
            </button>
          </div>
        </div>

        {/* Movable Position Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Probe Location (x):</span>
            <span className="text-sky-300 font-bold text-sm">
              x = {probeValues.xDisp.toFixed(3)} {lengthUnit} ({((probeX / L) * 100).toFixed(1)}% of span)
            </span>
          </div>
          <input
            type="range"
            aria-label="Probe location along beam"
            min="0"
            max={L}
            step={L / 500}
            value={probeX}
            aria-valuetext={`${probeValues.xDisp.toFixed(3)} ${lengthUnit}`}
            onChange={(e) => setProbeX(Number(e.target.value))}
            className="w-full accent-sky-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Real-time Synchronized Readout Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase block">Shear Force V(x)</span>
            {probeValues.hasStep ? (
              <div className="text-sky-300 font-bold text-xs">
                <span>L: {probeValues.shearLeft.toFixed(2)}</span>
                <span className="text-slate-500 mx-1">|</span>
                <span>R: {probeValues.shearRight.toFixed(2)}</span> {forceUnit}
              </div>
            ) : (
              <div className="text-sky-300 font-bold text-sm">
                {probeValues.shearRight.toFixed(2)} {forceUnit}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase block">Moment M(x)</span>
            <div className={`font-bold text-sm ${probeValues.isSagging ? 'text-emerald-400' : 'text-amber-400'}`}>
              {probeValues.moment.toFixed(2)} {momentUnit}
            </div>
            <span className="text-[9px] text-slate-500">
              {probeValues.isSagging ? 'Sagging (Tension bottom)' : 'Hogging (Tension top)'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase block">Deflection y(x)</span>
            <div className="text-indigo-300 font-bold text-sm">
              {probeValues.deflection.toFixed(3)} {dispDeflUnit}
            </div>
            <span className="text-[9px] text-slate-500">
              {probeValues.deflection < 0 ? 'Downward (-)' : 'Upward (+)'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase block">Slope θ(x)</span>
            <div className="text-purple-300 font-bold text-sm">
              {probeValues.slopeMrad.toFixed(3)} mrad
            </div>
            <span className="text-[9px] text-slate-500">
              {(probeValues.slopeMrad / 1000).toFixed(6)} rad
            </span>
          </div>

        </div>
      </div>

      {/* Synchronized Aligned SVGs Suite */}
      <div className="space-y-3">
        <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] leading-relaxed text-slate-300" aria-label="Diagram sign conventions">
          Sign convention: x is positive to the right; upward shear and sagging moment are positive; upward deflection is positive. Downward loads are entered as positive magnitudes. SFD and BMD use the internal cut convention; deflection is shown with its physical sign.
        </p>
        {/* 1. Beam Loading Elevation Schematic */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
            <span className="font-bold text-slate-300">1. Beam Elevation & Applied Loads</span>
            <span className="text-[11px]">Hover or drag anywhere to probe</span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${hBeam}`}
            role="img"
            aria-label={`Beam with ${beamModel.pointLoads.length} point loads, ${beamModel.uniformLoads.length} distributed loads, and ${beamModel.pointMoments.length} applied moments. Positive vertical loads act downward and negative loads act upward. Positive applied moments are counterclockwise.`}
            className="w-full h-auto cursor-crosshair block overflow-visible select-none"
            onPointerMove={handlePointerMove}
          >
            <defs>
              <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
              </linearGradient>
              <pattern id="fixedHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="2" />
              </pattern>
            </defs>

            {/* Beam Horizontal Girder */}
            <rect
              x={margin.left}
              y={55}
              width={plotWidth}
              height={14}
              fill="url(#beamGradient)"
              rx="2"
              stroke="#0284c7"
              strokeWidth="1.5"
            />

            {/* Supports Rendering */}
            {isSS ? (
              <>
                {/* Support A (Pin at x = 0) */}
                <polygon
                  points={`${margin.left},69 ${margin.left - 12},87 ${margin.left + 12},87`}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth="1.5"
                />
                <circle cx={margin.left} cy={69} r="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1={margin.left - 18} y1={88} x2={margin.left + 18} y2={88} stroke="#94a3b8" strokeWidth="2" />

                {/* Support B (Roller at x = L) */}
                <polygon
                  points={`${margin.left + plotWidth},69 ${margin.left + plotWidth - 12},83 ${margin.left + plotWidth + 12},83`}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth="1.5"
                />
                <circle cx={margin.left + plotWidth} cy={69} r="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx={margin.left + plotWidth - 6} cy={86} r="3" fill="#94a3b8" />
                <circle cx={margin.left + plotWidth + 6} cy={86} r="3" fill="#94a3b8" />
                <line x1={margin.left + plotWidth - 18} y1={89} x2={margin.left + plotWidth + 18} y2={89} stroke="#94a3b8" strokeWidth="2" />
              </>
            ) : (
              <>
                {/* Fixed Support Wall */}
                {beamModel.fixedEnd === 'left' ? (
                  <rect
                    x={margin.left - 18}
                    y={35}
                    width={18}
                    height={55}
                    fill="url(#fixedHatch)"
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                ) : (
                  <rect
                    x={margin.left + plotWidth}
                    y={35}
                    width={18}
                    height={55}
                    fill="url(#fixedHatch)"
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                )}
              </>
            )}

            {/* Concentrated Point Loads (P) */}
            {beamModel.pointLoads.map((pl, idx) => {
              const sx = toScreenX(pl.position);
              const pDisp = convertUnit(pl.magnitude, 'N', forceUnit).toFixed(1);
              const downward = pl.magnitude >= 0;
              const startY = downward ? 18 : 105;
              const tipY = downward ? 55 : 69;
              const baseY = downward ? 45 : 77;
              return (
                <g key={pl.id}>
                  <line x1={sx} y1={startY} x2={sx} y2={baseY} stroke="#f43f5e" strokeWidth="2.5" />
                  <polygon points={`${sx},${tipY} ${sx - 5},${baseY} ${sx + 5},${baseY}`} fill="#f43f5e" />
                  <text x={sx} y={downward ? 14 : 120} fill="#fda4af" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    P{idx + 1}: {pDisp} {forceUnit} {downward ? 'down' : 'up'}
                  </text>
                </g>
              );
            })}

            {/* Uniform Distributed Loads (UDL) */}
            {beamModel.uniformLoads.map((ul, idx) => {
              const startX = toScreenX(ul.start);
              const endX = toScreenX(ul.end);
              const width = endX - startX;
              const uDisp = convertUnit(ul.magnitude, 'N/m', distLoadUnit).toFixed(1);
              const downward = ul.magnitude >= 0;
              const arrowCount = Math.max(2, Math.floor(width / 18));
              const arrowXs = Array.from({ length: arrowCount }, (_, i) => startX + width * i / (arrowCount - 1));
              return (
                <g key={ul.id}>
                  <rect
                    x={startX}
                    y={28}
                    width={width}
                    height={25}
                    fill="rgba(56, 189, 248, 0.15)"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <line x1={startX} y1={28} x2={endX} y2={28} stroke="#38bdf8" strokeWidth="1.5" />
                  {arrowXs.map((arrowX, arrowIndex) => (
                    <g key={arrowIndex}>
                      <line x1={arrowX} y1={downward ? 29 : 52} x2={arrowX} y2={downward ? 49 : 31} stroke="#38bdf8" strokeWidth="1.3" />
                      <polygon points={downward ? `${arrowX},53 ${arrowX - 3},47 ${arrowX + 3},47` : `${arrowX},27 ${arrowX - 3},33 ${arrowX + 3},33`} fill="#38bdf8" />
                    </g>
                  ))}
                  <text x={startX + width / 2} y={23} fill="#bae6fd" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    w{idx + 1}: {uDisp} {distLoadUnit} {downward ? 'down' : 'up'}
                  </text>
                </g>
              );
            })}

            {/* Applied point moments: CCW positive, CW negative. */}
            {beamModel.pointMoments.map((pm, idx) => {
              const sx = toScreenX(pm.position);
              const mDisp = convertUnit(pm.magnitude, 'N*m', momentUnit).toFixed(1);
              return (
                <g key={pm.id}>
                  <circle cx={sx} cy={62} r={14} fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x={sx} y={67} fill="#fbbf24" fontSize="16" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">{pm.magnitude >= 0 ? '↺' : '↻'}</text>
                  <text x={sx} y={105} fill="#fcd34d" fontSize="9" fontFamily="monospace" textAnchor="middle">M{idx + 1}: {mDisp} {momentUnit} {pm.magnitude >= 0 ? 'CCW' : 'CW'}</text>
                </g>
              );
            })}

            {/* Reaction Force Labels at Supports */}
            {isSS && (
              <>
                <g>
                  <line x1={margin.left} y1={reactionsResult.reactions.RA.vertical >= 0 ? 112 : 93} x2={margin.left} y2={reactionsResult.reactions.RA.vertical >= 0 ? 93 : 112} stroke="#10b981" strokeWidth="2" />
                  <polygon points={reactionsResult.reactions.RA.vertical >= 0 ? `${margin.left},91 ${margin.left - 4},98 ${margin.left + 4},98` : `${margin.left},114 ${margin.left - 4},107 ${margin.left + 4},107`} fill="#10b981" />
                  <text x={margin.left} y={124} fill="#6ee7b7" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    R_A: {convertUnit(reactionsResult.reactions.RA.vertical, 'N', forceUnit).toFixed(1)} {forceUnit}
                  </text>
                </g>
                <g>
                  <line x1={margin.left + plotWidth} y1={reactionsResult.reactions.RB.vertical >= 0 ? 112 : 93} x2={margin.left + plotWidth} y2={reactionsResult.reactions.RB.vertical >= 0 ? 93 : 112} stroke="#10b981" strokeWidth="2" />
                  <polygon points={reactionsResult.reactions.RB.vertical >= 0 ? `${margin.left + plotWidth},91 ${margin.left + plotWidth - 4},98 ${margin.left + plotWidth + 4},98` : `${margin.left + plotWidth},114 ${margin.left + plotWidth - 4},107 ${margin.left + plotWidth + 4},107`} fill="#10b981" />
                  <text x={margin.left + plotWidth} y={124} fill="#6ee7b7" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    R_B: {convertUnit(reactionsResult.reactions.RB.vertical, 'N', forceUnit).toFixed(1)} {forceUnit}
                  </text>
                </g>
              </>
            )}

            {/* Synchronized Vertical Probe Guideline */}
            <line
              x1={probeScreenX}
              y1={5}
              x2={probeScreenX}
              y2={hBeam - 5}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
          </svg>
        </div>

        {/* 2. Shear Force Diagram (SFD) */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
            <span className="font-bold text-sky-400">2. Shear Force Diagram (SFD)</span>
            <span className="text-[11px]">
              V_max = {convertUnit(diagramsResult.maxShear.value, 'N', forceUnit).toFixed(2)} {forceUnit} | 
              V_min = {convertUnit(diagramsResult.minShear.value, 'N', forceUnit).toFixed(2)} {forceUnit}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${hSFD}`}
            role="img"
            aria-label={`Shear force diagram. Maximum ${convertUnit(diagramsResult.maxShear.value, 'N', forceUnit).toFixed(2)} ${forceUnit}; minimum ${convertUnit(diagramsResult.minShear.value, 'N', forceUnit).toFixed(2)} ${forceUnit}.`}
            className="w-full h-auto cursor-crosshair block overflow-visible select-none"
            onPointerMove={handlePointerMove}
          >
            <defs>
              <linearGradient id="sfdPositiveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="sfdNegativeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid & Axes */}
            <line x1={margin.left} y1={zeroSFDY} x2={margin.left + plotWidth} y2={zeroSFDY} stroke="#64748b" strokeWidth="1.2" />
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={hSFD - margin.bottom} stroke="#475569" strokeWidth="1" />

            {/* Y-Axis Value Labels */}
            <text x={margin.left - 8} y={getSFDY(upperV - padV)} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
              +{upperV - padV > 0 ? (upperV - padV).toFixed(1) : ''}
            </text>
            <text x={margin.left - 8} y={zeroSFDY + 3} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="bold">
              0
            </text>
            <text x={margin.left - 8} y={getSFDY(lowerV + padV)} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
              {lowerV + padV < 0 ? (lowerV + padV).toFixed(1) : ''}
            </text>
            <text x={margin.left - 8} y={margin.top - 5} fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="end">
              V ({forceUnit})
            </text>

            {/* SFD Filled Area */}
            <path d={sfdPathD} fill="url(#sfdPositiveGrad)" />

            {/* SFD Solid Plot Line */}
            <path d={sfdStrokeD} fill="none" stroke="#38bdf8" strokeWidth="2.2" />

            {/* Synchronized Vertical Probe Indicator */}
            <line
              x1={probeScreenX}
              y1={margin.top}
              x2={probeScreenX}
              y2={hSFD - margin.bottom}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            <circle
              cx={probeScreenX}
              cy={getSFDY(probeValues.shearRight)}
              r="4.5"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* 3. Bending Moment Diagram (BMD) */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
            <span className="font-bold text-emerald-400">3. Bending Moment Diagram (BMD)</span>
            <span className="text-[11px]">
              M_max = {convertUnit(diagramsResult.maxMoment.value, 'N*m', momentUnit).toFixed(2)} {momentUnit} at x = {convertUnit(diagramsResult.maxMoment.location, 'm', lengthUnit).toFixed(2)} {lengthUnit}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${hBMD}`}
            role="img"
            aria-label={`Bending moment diagram. Maximum ${convertUnit(diagramsResult.maxMoment.value, 'N*m', momentUnit).toFixed(2)} ${momentUnit}; minimum ${convertUnit(diagramsResult.minMoment.value, 'N*m', momentUnit).toFixed(2)} ${momentUnit}.`}
            className="w-full h-auto cursor-crosshair block overflow-visible select-none"
            onPointerMove={handlePointerMove}
          >
            <defs>
              <linearGradient id="bmdSaggingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid & Axes */}
            <line x1={margin.left} y1={zeroBMDY} x2={margin.left + plotWidth} y2={zeroBMDY} stroke="#64748b" strokeWidth="1.2" />
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={hBMD - margin.bottom} stroke="#475569" strokeWidth="1" />

            {/* Y-Axis Value Labels */}
            <text x={margin.left - 8} y={getBMDY(upperM - padM)} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
              +{upperM - padM > 0 ? (upperM - padM).toFixed(1) : ''}
            </text>
            <text x={margin.left - 8} y={zeroBMDY + 3} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="bold">
              0
            </text>
            <text x={margin.left - 8} y={getBMDY(lowerM + padM)} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
              {lowerM + padM < 0 ? (lowerM + padM).toFixed(1) : ''}
            </text>
            <text x={margin.left - 8} y={margin.top - 5} fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="end">
              M ({momentUnit})
            </text>

            {/* BMD Filled Area */}
            <path d={bmdPathD} fill="url(#bmdSaggingGrad)" />

            {/* BMD Solid Plot Line */}
            <path d={bmdStrokeD} fill="none" stroke="#10b981" strokeWidth="2.2" />

            {/* Peak Moment Marker Pin */}
            {diagramsResult.maxMoment && (
              <g>
                <circle
                  cx={toScreenX(diagramsResult.maxMoment.location)}
                  cy={getBMDY(convertUnit(diagramsResult.maxMoment.value, 'N*m', momentUnit))}
                  r="5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Synchronized Vertical Probe Indicator */}
            <line
              x1={probeScreenX}
              y1={margin.top}
              x2={probeScreenX}
              y2={hBMD - margin.bottom}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            <circle
              cx={probeScreenX}
              cy={getBMDY(probeValues.moment)}
              r="4.5"
              fill="#10b981"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* 4. Deflected Elastic Curve */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
            <span className="font-bold text-indigo-400">4. Deflected Shape & Elastic Curve</span>
            <span className="text-[11px]">
              y_max = {(deflectionResult.maxDeflection.value * deflMultiplier).toFixed(3)} {dispDeflUnit} at x = {convertUnit(deflectionResult.maxDeflection.location, 'm', lengthUnit).toFixed(2)} {lengthUnit}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${hDefl}`}
            role="img"
            aria-label={`Deflected shape. Maximum absolute deflection ${convertUnit(deflectionResult.maxDeflection.magnitude, 'm', dispDeflUnit === 'mm' ? 'mm' : 'in').toFixed(3)} ${dispDeflUnit}.`}
            className="w-full h-auto cursor-crosshair block overflow-visible select-none"
            onPointerMove={handlePointerMove}
          >
            {/* Grid & Neutral Zero Line */}
            <line x1={margin.left} y1={zeroDeflY} x2={margin.left + plotWidth} y2={zeroDeflY} stroke="#64748b" strokeWidth="1.2" strokeDasharray="3,3" />
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={hDefl - margin.bottom} stroke="#475569" strokeWidth="1" />

            {/* Y-Axis Value Labels */}
            <text x={margin.left - 8} y={zeroDeflY + 3} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="end" fontWeight="bold">
              0
            </text>
            <text x={margin.left - 8} y={getDeflY(lowerD + padD)} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
              {(lowerD + padD).toFixed(2)}
            </text>
            <text x={margin.left - 8} y={margin.top - 5} fill="#818cf8" fontSize="9" fontFamily="monospace" textAnchor="end">
              y ({dispDeflUnit})
            </text>

            {/* Deflection Elastic Curve (Glowing Line) */}
            <path d={deflStrokeD} fill="none" stroke="#6366f1" strokeWidth="2.5" />

            {/* Maximum Deflection Marker Pin */}
            <circle
              cx={toScreenX(deflectionResult.maxDeflection.location)}
              cy={getDeflY(deflectionResult.maxDeflection.value * deflMultiplier)}
              r="5"
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* Synchronized Vertical Probe Indicator */}
            <line
              x1={probeScreenX}
              y1={margin.top}
              x2={probeScreenX}
              y2={hDefl - margin.bottom}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
            <circle
              cx={probeScreenX}
              cy={getDeflY(probeValues.deflection)}
              r="4.5"
              fill="#6366f1"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
