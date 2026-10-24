import React from 'react';
import { SectionModel, SectionResult } from '../engine/sections';
import { LengthUnit } from '../engine/units';

interface SectionViewerProps {
  model: SectionModel;
  result: SectionResult;
  lengthUnit: LengthUnit;
}

export const SectionViewer: React.FC<SectionViewerProps> = ({ model, result, lengthUnit }) => {
  if (!result.isValid) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-500">
        Enter valid section dimensions to generate cross-section diagram.
      </div>
    );
  }

  const svgWidth = 440;
  const svgHeight = 340;
  const pad = 65;

  const totalW = result.totalWidth;
  const totalH = result.totalHeight;

  // Scale factor to fit inside SVG bounds
  const scale = Math.min((svgWidth - 2 * pad) / totalW, (svgHeight - 2 * pad) / totalH);

  const cxSVG = svgWidth / 2;
  const cySVG = svgHeight / 2;

  // Centroid in SVG coordinates
  // Notice: in structural coords, y is 0 at bottom, but in SVG y increases downward!
  // Section centered at (cxSVG, cySVG)
  const toSVG = (x: number, y: number) => {
    const screenX = cxSVG + (x - totalW / 2) * scale;
    const screenY = cySVG - (y - totalH / 2) * scale;
    return { x: screenX, y: screenY };
  };

  const centroidSVG = toSVG(result.centroid.x, result.centroid.y);

  // Conversion multiplier for dimension display
  const dimMultiplier = lengthUnit === 'm' ? 1000 : 1 / 0.0254; // to mm or inches
  const dispUnit = lengthUnit === 'm' ? 'mm' : 'in';

  const renderShapePath = () => {
    switch (model.type) {
      case 'rectangle': {
        const p1 = toSVG(0, model.height);
        const w = model.width * scale;
        const h = model.height * scale;
        return (
          <rect 
            x={p1.x} 
            y={p1.y} 
            width={w} 
            height={h} 
            fill="rgba(56, 189, 248, 0.15)" 
            stroke="#38bdf8" 
            strokeWidth="2" 
          />
        );
      }
      case 'circle': {
        const r = (model.diameter / 2) * scale;
        return (
          <circle 
            cx={cxSVG} 
            cy={cySVG} 
            r={r} 
            fill="rgba(56, 189, 248, 0.15)" 
            stroke="#38bdf8" 
            strokeWidth="2" 
          />
        );
      }
      case 'hollow-rectangle': {
        const outerP = toSVG(0, model.outerHeight);
        const outerW = model.outerWidth * scale;
        const outerH = model.outerHeight * scale;

        const innerOffX = (model.outerWidth - model.innerWidth) / 2;
        const innerOffY = (model.outerHeight - model.innerHeight) / 2;
        const innerP = toSVG(innerOffX, model.outerHeight - innerOffY);
        const innerW = model.innerWidth * scale;
        const innerH = model.innerHeight * scale;

        return (
          <g>
            <rect 
              x={outerP.x} 
              y={outerP.y} 
              width={outerW} 
              height={outerH} 
              fill="rgba(56, 189, 248, 0.15)" 
              stroke="#38bdf8" 
              strokeWidth="2" 
            />
            <rect 
              x={innerP.x} 
              y={innerP.y} 
              width={innerW} 
              height={innerH} 
              fill="#020617" 
              stroke="#64748b" 
              strokeWidth="1.5" 
              strokeDasharray="4 2" 
            />
          </g>
        );
      }
      case 'hollow-circle': {
        const R = (model.outerDiameter / 2) * scale;
        const r = (model.innerDiameter / 2) * scale;
        return (
          <g>
            <circle cx={cxSVG} cy={cySVG} r={R} fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="2" />
            <circle cx={cxSVG} cy={cySVG} r={r} fill="#020617" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
          </g>
        );
      }
      case 't-section': {
        // T-Section polygon:
        // Web: from x = (bf - tw)/2 to (bf + tw)/2, y = 0 to hw
        // Flange: x = 0 to bf, y = hw to hw + tf
        const bf = model.flangeWidth;
        const tf = model.flangeThickness;
        const hw = model.webHeight;
        const tw = model.webThickness;
        const xWebL = (bf - tw) / 2;
        const xWebR = (bf + tw) / 2;
        const totalH = hw + tf;

        const pts = [
          toSVG(xWebL, 0),
          toSVG(xWebR, 0),
          toSVG(xWebR, hw),
          toSVG(bf, hw),
          toSVG(bf, totalH),
          toSVG(0, totalH),
          toSVG(0, hw),
          toSVG(xWebL, hw)
        ].map(p => `${p.x},${p.y}`).join(' ');

        return <polygon points={pts} fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="2" />;
      }
      case 'i-section': {
        const H = model.totalHeight;
        const B = model.flangeWidth;
        const tf = model.flangeThickness;
        const tw = model.webThickness;
        const hw = H - 2 * tf;
        const xWebL = (B - tw) / 2;
        const xWebR = (B + tw) / 2;

        const pts = [
          toSVG(0, 0),
          toSVG(B, 0),
          toSVG(B, tf),
          toSVG(xWebR, tf),
          toSVG(xWebR, tf + hw),
          toSVG(B, tf + hw),
          toSVG(B, H),
          toSVG(0, H),
          toSVG(0, tf + hw),
          toSVG(xWebL, tf + hw),
          toSVG(xWebL, tf),
          toSVG(0, tf)
        ].map(p => `${p.x},${p.y}`).join(' ');

        return <polygon points={pts} fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="2" />;
      }
      case 'composite': {
        return (
          <g>
            {model.rectangles.map(r => {
              const p = toSVG(r.x, r.y + r.height);
              return (
                <rect
                  key={r.id}
                  x={p.x}
                  y={p.y}
                  width={r.width * scale}
                  height={r.height * scale}
                  fill="rgba(56, 189, 248, 0.18)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        );
      }
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-200">
          Cross-Section Geometry & Centroid Plot
        </h3>
        <span className="text-[11px] font-mono text-sky-400">
          Scale: 1:{(1 / scale).toFixed(2)} | Dimensions in {dispUnit}
        </span>
      </div>

      <div className="flex justify-center items-center py-2">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[440px] h-auto font-mono text-[10px]">
          {/* Background grid */}
          <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#090d16" rx="8" />

          {/* Render Shape */}
          {renderShapePath()}

          {/* Centroidal Axes (X-X and Y-Y) */}
          <line
            x1={15}
            y1={centroidSVG.y}
            x2={svgWidth - 15}
            y2={centroidSVG.y}
            stroke="#e0f2fe"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text x={svgWidth - 25} y={centroidSVG.y - 5} fill="#7dd3fc" fontWeight="bold">X</text>
          <text x={20} y={centroidSVG.y - 5} fill="#7dd3fc" fontWeight="bold">X</text>

          <line
            x1={centroidSVG.x}
            y1={15}
            x2={centroidSVG.x}
            y2={svgHeight - 15}
            stroke="#e0f2fe"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text x={centroidSVG.x + 5} y={25} fill="#7dd3fc" fontWeight="bold">Y</text>
          <text x={centroidSVG.x + 5} y={svgHeight - 20} fill="#7dd3fc" fontWeight="bold">Y</text>

          {/* Centroid Marker (Crosshair & circle) */}
          <circle cx={centroidSVG.x} cy={centroidSVG.y} r="5" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
          <text x={centroidSVG.x + 8} y={centroidSVG.y - 8} fill="#fda4af" fontWeight="bold" fontSize="11">
            C (ȳ = {(result.centroid.y * dimMultiplier).toFixed(1)} {dispUnit})
          </text>

          {/* Overall Dimensions Annotations */}
          {/* Horizontal Width Dimension */}
          <line x1={cxSVG - (totalW / 2) * scale} y1={svgHeight - 22} x2={cxSVG + (totalW / 2) * scale} y2={svgHeight - 22} stroke="#94a3b8" strokeWidth="1" />
          <text x={cxSVG} y={svgHeight - 10} textAnchor="middle" fill="#cbd5e1">
            W = {(totalW * dimMultiplier).toFixed(1)} {dispUnit}
          </text>

          {/* Vertical Height Dimension */}
          <line x1={22} y1={cySVG - (totalH / 2) * scale} x2={22} y2={cySVG + (totalH / 2) * scale} stroke="#94a3b8" strokeWidth="1" />
          <text x={12} y={cySVG} textAnchor="middle" fill="#cbd5e1" transform={`rotate(-90 12 ${cySVG})`}>
            H = {(totalH * dimMultiplier).toFixed(1)} {dispUnit}
          </text>
        </svg>
      </div>
    </div>
  );
};
