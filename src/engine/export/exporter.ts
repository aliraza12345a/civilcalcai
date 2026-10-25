import { BeamModel, BeamReactionsResult } from '../beams/types';
import { BeamDiagramsResult } from '../beams/diagrams';
import { GeneralDeflectionResult } from '../beams/deflection';
import { LengthUnit, ForceUnit, MomentUnit, convertUnit } from '../units';

export interface BeamExportData {
  appName: string;
  version: string;
  timestamp: string;
  disclaimer: string;
  beamModel: BeamModel;
  units: {
    length: LengthUnit;
    force: ForceUnit;
    moment: MomentUnit;
  };
  reactions: BeamReactionsResult;
  criticalValues: {
    maxShear: { value: number; location: number };
    minShear: { value: number; location: number };
    maxMoment: { value: number; location: number };
    minMoment: { value: number; location: number };
    maxDeflection: { value: number; location: number };
    maxSlope: { value: number; location: number };
  };
  equilibriumCheck: {
    sumFyResidual: number;
    sumMResidual: number;
    isSatisfied: boolean;
  };
}

export function generateBeamJSON(
  beam: BeamModel,
  reactions: BeamReactionsResult,
  diagrams: BeamDiagramsResult,
  deflection: GeneralDeflectionResult,
  units: { length: LengthUnit; force: ForceUnit; moment: MomentUnit }
): string {
  const exportObject: BeamExportData = {
    appName: 'CivilCalc AI',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    disclaimer:
      'CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer.',
    beamModel: beam,
    units,
    reactions,
    criticalValues: {
      maxShear: diagrams.maxShear,
      minShear: diagrams.minShear,
      maxMoment: diagrams.maxMoment,
      minMoment: diagrams.minMoment,
      maxDeflection: deflection.maxDeflection,
      maxSlope: deflection.maxSlope,
    },
    equilibriumCheck: {
      sumFyResidual: reactions.equilibrium.sumFy,
      sumMResidual: reactions.equilibrium.sumM,
      isSatisfied: reactions.equilibrium.isEquilibrium,
    },
  };

  return JSON.stringify(exportObject, null, 2);
}

export function generateDiagramsCSV(
  diagrams: BeamDiagramsResult,
  deflection: GeneralDeflectionResult,
  units: { length: LengthUnit; force: ForceUnit; moment: MomentUnit }
): string {
  const { length: lenUnit, force: fUnit, moment: mUnit } = units;
  const dispDeflUnit = lenUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;

  const headers = [
    `x (m)`,
    `x (${lenUnit})`,
    `Shear_V (N)`,
    `Shear_V (${fUnit})`,
    `Moment_M (N*m)`,
    `Moment_M (${mUnit})`,
    `Slope_theta (rad)`,
    `Slope_theta (mrad)`,
    `Deflection_y (m)`,
    `Deflection_y (${dispDeflUnit})`
  ];

  const rows: string[] = [headers.join(',')];

  // Merge points from deflection result
  for (const pt of deflection.points) {
    const xSI = pt.x;
    const xDisp = convertUnit(xSI, 'm', lenUnit).toFixed(4);

    const shearPt = diagrams.shearAt(xSI);
    const shearValSI = Math.abs(shearPt.right - shearPt.left) > 1e-4 ? shearPt.right : pt.moment !== undefined ? shearPt.right : 0;
    const shearDisp = convertUnit(shearValSI, 'N', fUnit).toFixed(4);

    const momentSI = pt.moment;
    const momentDisp = convertUnit(momentSI, 'N*m', mUnit).toFixed(4);

    const slopeSI = pt.slope;
    const slopeMrad = (slopeSI * 1000).toFixed(4);

    const deflSI = pt.deflection;
    const deflDisp = (deflSI * deflMultiplier).toFixed(4);

    rows.push([
      xSI.toFixed(4),
      xDisp,
      shearValSI.toFixed(2),
      shearDisp,
      momentSI.toFixed(2),
      momentDisp,
      slopeSI.toFixed(6),
      slopeMrad,
      deflSI.toFixed(6),
      deflDisp
    ].join(','));
  }

  return rows.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
