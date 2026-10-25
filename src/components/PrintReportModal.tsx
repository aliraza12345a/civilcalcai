import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { BeamModel, BeamReactionsResult } from '../engine/beams/types';
import { BeamDiagramsResult } from '../engine/beams/diagrams';
import { GeneralDeflectionResult } from '../engine/beams/deflection';
import { LengthUnit, ForceUnit, DistributedLoadUnit, MomentUnit, StressUnit, convertUnit } from '../engine/units';
import { generateBeamJSON, generateDiagramsCSV, downloadFile } from '../engine/export/exporter';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  beamModel: BeamModel;
  reactionsResult: BeamReactionsResult;
  diagramsResult: BeamDiagramsResult;
  deflectionResult: GeneralDeflectionResult;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  distLoadUnit: DistributedLoadUnit;
  momentUnit: MomentUnit;
  eValue: number;
  eUnit: StressUnit;
  iValue: number;
  iUnit: string;
  projectTitle?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  beamModel,
  reactionsResult,
  diagramsResult,
  deflectionResult,
  lengthUnit,
  forceUnit,
  distLoadUnit,
  momentUnit,
  eValue,
  eUnit,
  iValue,
  iUnit,
  projectTitle = 'Beam Calculation Report',
}) => {
  const reportRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const jsonStr = generateBeamJSON(beamModel, reactionsResult, diagramsResult, deflectionResult, {
      length: lengthUnit,
      force: forceUnit,
      moment: momentUnit,
    });
    downloadFile(jsonStr, `CivilCalc_${beamModel.type}_${Date.now()}.json`, 'application/json');
  };

  const handleDownloadCSV = () => {
    const csvStr = generateDiagramsCSV(diagramsResult, deflectionResult, {
      length: lengthUnit,
      force: forceUnit,
      moment: momentUnit,
    });
    downloadFile(csvStr, `CivilCalc_DiagramData_${Date.now()}.csv`, 'text/csv');
  };

  const dispDeflUnit = lengthUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;

  const spanDisp = convertUnit(beamModel.span, 'm', lengthUnit).toFixed(2);
  const maxDeflDisp = (deflectionResult.maxDeflection.value * deflMultiplier).toFixed(3);
  const maxDeflLocDisp = convertUnit(deflectionResult.maxDeflection.location, 'm', lengthUnit).toFixed(2);
  const maxMDisp = convertUnit(diagramsResult.maxMoment.value, 'N*m', momentUnit).toFixed(2);
  const maxMLocDisp = convertUnit(diagramsResult.maxMoment.location, 'm', lengthUnit).toFixed(2);
  const minMDisp = convertUnit(diagramsResult.minMoment.value, 'N*m', momentUnit).toFixed(2);
  const minMLocDisp = convertUnit(diagramsResult.minMoment.location, 'm', lengthUnit).toFixed(2);
  const maxVDisp = convertUnit(diagramsResult.maxShear.value, 'N', forceUnit).toFixed(2);
  const minVDisp = convertUnit(diagramsResult.minShear.value, 'N', forceUnit).toFixed(2);
  const maxVLocDisp = convertUnit(diagramsResult.maxShear.location, 'm', lengthUnit).toFixed(2);
  const minVLocDisp = convertUnit(diagramsResult.minShear.location, 'm', lengthUnit).toFixed(2);
  const maxSlopeDisp = (deflectionResult.maxSlope.magnitude * 1000).toFixed(3);

  const renderPlot = (title: string, values: { x: number; value: number }[], unit: string, color: string) => {
    const width = 760;
    const height = 150;
    const pad = 12;
    const limit = Math.max(...values.map((point) => Math.abs(point.value)), 1e-12);
    const path = values.map((point, index) => {
      const x = pad + (point.x / beamModel.span) * (width - 2 * pad);
      const y = height / 2 - (point.value / limit) * (height / 2 - pad);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
    return (
      <div className="rounded border border-slate-200 p-3 break-inside-avoid">
        <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-700"><span>{title}</span><span>{unit}</span></div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="w-full h-auto">
          <title>{title}</title>
          <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke="#94a3b8" strokeDasharray="4 4" />
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-[9px] text-slate-500"><span>0 {lengthUnit}</span><span>{spanDisp} {lengthUnit}</span></div>
      </div>
    );
  };

  return (
    <div className="report-print-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="report-print-card w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[92vh]">
        {/* Modal Controls Toolbar (Hidden in print) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-bold text-white text-sm">{projectTitle}</h2>
              <p className="text-[11px] text-slate-400">Complete formal calculation sheet ready for PDF export</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Print document or Save to PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center space-x-1.5 transition-colors"
              title="Download structured JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center space-x-1.5 transition-colors"
              title="Download tabulated CSV diagram points"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close report"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div 
          ref={reportRef}
          className="report-print-content p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible print:bg-white"
        >
          {/* Report Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">CivilCalc AI</div>
              <div className="text-sm font-semibold text-sky-700 uppercase tracking-wider">
                Structural Engineering Calculation Sheet
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Analytical Beam Solver • Euler-Bernoulli Mechanics & Macaulay Deflection
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-600 space-y-1">
              <div><strong>App Version:</strong> 0.1.0</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              <div><strong>Status:</strong> {reactionsResult.equilibrium.isEquilibrium ? 'Equilibrium residuals within tolerance' : 'Equilibrium residuals exceed tolerance'}</div>
            </div>
          </div>

          {/* Mandatory Limitations Notice */}
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs mb-6 space-y-1">
            <div className="font-bold flex items-center space-x-1.5 uppercase tracking-wide text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Mandatory Educational Limitations Notice</span>
            </div>
            <p className="leading-relaxed">
              CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer. Do not use these results as the only basis for the design or construction of any structure.
            </p>
          </div>

          {/* 1. Geometry & Support Configuration */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              1. Geometry & Support Configuration
            </h3>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-medium text-slate-600 w-1/3">Beam Support Type:</td>
                  <td className="py-1.5 font-bold capitalize text-slate-900">
                    {beamModel.type.replace('-', ' ')} {beamModel.type === 'cantilever' ? `(Fixed at ${beamModel.fixedEnd})` : '(Pin at A, Roller at B)'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-medium text-slate-600">Clear Span (L):</td>
                  <td className="py-1.5 font-mono font-bold text-slate-900">{spanDisp} {lengthUnit}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-medium text-slate-600">Modulus of Elasticity (E):</td>
                  <td className="py-1.5 font-mono text-slate-900">{eValue} {eUnit}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-medium text-slate-600">Second Moment of Area (I):</td>
                  <td className="py-1.5 font-mono text-slate-900">{iValue} {iUnit}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium text-slate-600">Flexural Rigidity (EI):</td>
                  <td className="py-1.5 font-mono font-bold text-sky-800">
                    {(deflectionResult.EI / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kN·m²
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Applied Loads Table */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              2. Applied Loading Schedule
            </h3>
            <table className="w-full text-xs border border-slate-200 text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Load ID</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Location (x)</th>
                  <th className="p-2">Magnitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {beamModel.pointLoads.map((pl, idx) => (
                  <tr key={pl.id}>
                    <td className="p-2 font-mono font-bold">P{idx + 1}</td>
                    <td className="p-2">Concentrated Point Load</td>
                    <td className="p-2 font-mono">{convertUnit(pl.position, 'm', lengthUnit).toFixed(2)} {lengthUnit}</td>
                    <td className="p-2 font-mono font-bold text-rose-700">{Math.abs(convertUnit(pl.magnitude, 'N', forceUnit)).toFixed(2)} {forceUnit} {pl.magnitude >= 0 ? '↓ (down)' : '↑ (up)'}</td>
                  </tr>
                ))}
                {beamModel.uniformLoads.map((ul, idx) => (
                  <tr key={ul.id}>
                    <td className="p-2 font-mono font-bold">UDL{idx + 1}</td>
                    <td className="p-2">Uniformly Distributed Load</td>
                    <td className="p-2 font-mono">
                      {convertUnit(ul.start, 'm', lengthUnit).toFixed(2)} to {convertUnit(ul.end, 'm', lengthUnit).toFixed(2)} {lengthUnit}
                    </td>
                    <td className="p-2 font-mono font-bold text-sky-700">{Math.abs(convertUnit(ul.magnitude, 'N/m', distLoadUnit)).toFixed(2)} {distLoadUnit} {ul.magnitude >= 0 ? '↓ (down)' : '↑ (up)'}</td>
                  </tr>
                ))}
                {beamModel.pointMoments.map((pm, idx) => (
                  <tr key={pm.id}>
                    <td className="p-2 font-mono font-bold">M{idx + 1}</td>
                    <td className="p-2">Concentrated Moment</td>
                    <td className="p-2 font-mono">{convertUnit(pm.position, 'm', lengthUnit).toFixed(2)} {lengthUnit}</td>
                    <td className="p-2 font-mono font-bold text-amber-700">{Math.abs(convertUnit(pm.magnitude, 'N*m', momentUnit)).toFixed(2)} {momentUnit} ({pm.magnitude >= 0 ? 'CCW' : 'CW'})</td>
                  </tr>
                ))}
                {beamModel.pointLoads.length === 0 && beamModel.uniformLoads.length === 0 && beamModel.pointMoments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500 italic">No loads applied</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3. Support Reactions & Static Equilibrium Balance */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              3. Support Reactions & Static Equilibrium Verification
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-700">Calculated Reactions:</div>
                {beamModel.type === 'simply-supported' ? (
                  <ul className="space-y-0.5 font-mono">
                    <li>R_A (at x = 0): <strong>{Math.abs(convertUnit(reactionsResult.reactions.RA.vertical, 'N', forceUnit)).toFixed(3)} {forceUnit}</strong> ({reactionsResult.reactions.RA.vertical >= 0 ? 'Upward' : 'Downward'})</li>
                    <li>R_B (at x = L): <strong>{Math.abs(convertUnit(reactionsResult.reactions.RB.vertical, 'N', forceUnit)).toFixed(3)} {forceUnit}</strong> ({reactionsResult.reactions.RB.vertical >= 0 ? 'Upward' : 'Downward'})</li>
                  </ul>
                ) : (
                  <ul className="space-y-0.5 font-mono">
                    <li>R_fixed (Vertical): <strong>{convertUnit(reactionsResult.reactions.Rfixed.vertical, 'N', forceUnit).toFixed(3)} {forceUnit}</strong></li>
                    <li>M_fixed (Reaction Moment): <strong>{convertUnit(reactionsResult.reactions.Rfixed.moment, 'N*m', momentUnit).toFixed(3)} {momentUnit}</strong></li>
                  </ul>
                )}
              </div>

              <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reactionsResult.equilibrium.isEquilibrium ? 'text-emerald-600' : 'text-red-600'}`} />
                  <span>Equilibrium Verification:</span>
                </div>
                <div className="font-mono text-[11px] space-y-0.5">
                  <div>ΣF_y Residual: {reactionsResult.equilibrium.sumFy.toExponential(3)} N (tolerance {reactionsResult.equilibrium.tolerance} N)</div>
                  <div>ΣM Residual: {reactionsResult.equilibrium.sumM.toExponential(3)} N·m (same numeric tolerance)</div>
                  <div className={`font-bold pt-0.5 ${reactionsResult.equilibrium.isEquilibrium ? 'text-emerald-700' : 'text-red-700'}`}>
                    {reactionsResult.equilibrium.isEquilibrium ? 'Equilibrium residuals are within tolerance' : 'Equilibrium residuals exceed tolerance'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Critical Engineering Values */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              4. Critical Design Extremum Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Maximum Bending Moment</span>
                <span className="font-bold text-sm text-emerald-700">{maxMDisp} / {minMDisp} {momentUnit}</span>
                <span className="text-[10px] text-slate-500 block">max at x = {maxMLocDisp}; min at x = {minMLocDisp} {lengthUnit}</span>
              </div>

              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Max / Min Shear Force</span>
                <span className="font-bold text-sm text-sky-700">{maxVDisp} / {minVDisp} {forceUnit}</span>
                <span className="text-[10px] text-slate-500 block">max at x = {maxVLocDisp}; min at x = {minVLocDisp} {lengthUnit}</span>
              </div>

              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Maximum Deflection</span>
                <span className="font-bold text-sm text-indigo-700">{maxDeflDisp} {dispDeflUnit}</span>
                <span className="text-[10px] text-slate-500 block">at x = {maxDeflLocDisp} {lengthUnit}</span>
                <span className="text-[10px] text-slate-500 block">Max slope magnitude: {maxSlopeDisp} mrad</span>
              </div>
            </div>
          </div>

          {/* 5. Assumptions */}
          <div className="mb-6 space-y-2 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">5. Analysis Assumptions</h3>
            <ul className="list-disc pl-5 text-[11px] text-slate-700 space-y-1">
              {deflectionResult.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
              <li>Beam is prismatic with constant E and I; only bending deformation is included.</li>
              <li>Loads and supports are as entered above; point loads exactly at a support are retained at that station.</li>
            </ul>
          </div>

          {/* 6. Analysis Diagrams */}
          <div className="mb-6 space-y-2 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">6. Analysis Diagrams</h3>
            <p className="text-[10px] text-slate-600">Sign convention: positive x rightward; upward shear and sagging moment positive; upward deflection positive.</p>
            <div className="grid grid-cols-1 gap-3">
              {renderPlot('Shear Force Diagram', diagramsResult.points.map(({ x, shear }) => ({ x, value: convertUnit(shear, 'N', forceUnit) })), forceUnit, '#0284c7')}
              {renderPlot('Bending Moment Diagram', diagramsResult.points.map(({ x, moment }) => ({ x, value: convertUnit(moment, 'N*m', momentUnit) })), momentUnit, '#059669')}
              {renderPlot('Deflected Shape', deflectionResult.points.map(({ x, deflection }) => ({ x, value: deflection * deflMultiplier })), dispDeflUnit, '#4f46e5')}
            </div>
          </div>

          {/* 7. Step-by-Step Worked Solutions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              7. Governing Equations & Step-by-Step Derivations
            </h3>
            <div className="space-y-2">
              {reactionsResult.steps.map((step, idx) => (
                <div key={idx} className="p-3 rounded border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="font-bold text-slate-800">{step.title}</div>
                  <div className="font-mono text-slate-700 text-[11px] bg-white p-2 rounded border border-slate-200 space-y-0.5">
                    <div className="text-sky-800 font-semibold">{step.equation}</div>
                    <div>{step.substitution}</div>
                    <div className="font-bold text-emerald-800 pt-0.5">{step.result}</div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{step.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Report Footer */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono">
            Generated by CivilCalc AI • Open Source Structural Engineering Suite • Not a substitute for licensed PE review
          </div>
        </div>
      </div>
    </div>
  );
};
