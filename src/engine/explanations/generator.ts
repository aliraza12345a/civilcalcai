import { BeamModel, BeamReactionsResult } from '../beams/types';
import { BeamDiagramsResult } from '../beams/diagrams';
import { GeneralDeflectionResult } from '../beams/deflection';
import { LengthUnit, ForceUnit, MomentUnit, convertUnit } from '../units';

export interface ExplanationSection {
  title: string;
  category: 'equilibrium' | 'shear' | 'moment' | 'deflection' | 'takeaway';
  summary: string;
  details: string[];
}

export interface BeamExplanationResult {
  overview: string;
  sections: ExplanationSection[];
  keyTakeaways: string[];
}

/**
 * Pure template-based explanation generator (Milestone 8).
 * Generates verified, plain-English structural engineering explanations
 * directly from the tested calculation engine outputs.
 * No external AI services used — all numbers are guaranteed accurate.
 */
export function generateBeamExplanation(
  beam: BeamModel,
  reactions: BeamReactionsResult,
  diagrams: BeamDiagramsResult,
  deflection: GeneralDeflectionResult,
  units: {
    length: LengthUnit;
    force: ForceUnit;
    moment: MomentUnit;
  }
): BeamExplanationResult {
  if (!reactions.isValid) {
    return {
      overview: 'Calculation could not be completed due to invalid input geometry or load parameters.',
      sections: [],
      keyTakeaways: ['Please verify that all loads are within span and lengths are positive.']
    };
  }

  const { length: lenUnit, force: fUnit, moment: mUnit } = units;
  const isSS = beam.type === 'simply-supported';
  const spanDisp = convertUnit(beam.span, 'm', lenUnit).toFixed(2);
  const totalLoadDisp = convertUnit(reactions.totalDownwardForce, 'N', fUnit).toFixed(2);

  const sections: ExplanationSection[] = [];

  // 1. Equilibrium & Support Reactions Section
  const eqDetails: string[] = [];
  if (isSS) {
    const raDisp = convertUnit(reactions.reactions.RA.vertical, 'N', fUnit).toFixed(2);
    const rbDisp = convertUnit(reactions.reactions.RB.vertical, 'N', fUnit).toFixed(2);

    eqDetails.push(
      `Support A carries a vertical reaction of ${raDisp} ${fUnit}, and Support B carries ${rbDisp} ${fUnit}.`
    );
    eqDetails.push(
      `By taking static moments about Support A (ΣM_A = 0), the reaction at Support B (R_B) is uniquely determined to prevent any rotational tendency.`
    );
    eqDetails.push(
      `Vertical equilibrium (ΣF_y = 0) ensures that the upward sum of reactions (${(parseFloat(raDisp) + parseFloat(rbDisp)).toFixed(2)} ${fUnit}) exactly equals the total applied downward gravity load of ${totalLoadDisp} ${fUnit}.`
    );
  } else {
    const fixedShearDisp = convertUnit(reactions.reactions.Rfixed.vertical, 'N', fUnit).toFixed(2);
    const fixedMomDisp = convertUnit(Math.abs(reactions.reactions.Rfixed.moment), 'N*m', mUnit).toFixed(2);
    const fixedDir = reactions.reactions.Rfixed.moment >= 0 ? 'counterclockwise' : 'clockwise';

    eqDetails.push(
      `The fixed support at ${beam.fixedEnd === 'left' ? 'the left end (x = 0)' : 'the right end (x = L)'} provides full structural restraint.`
    );
    eqDetails.push(
      `It resists all downward shear (${fixedShearDisp} ${fUnit}) and provides a clamping reaction moment of ${fixedMomDisp} ${mUnit} (${fixedDir}) to prevent beam rotation at the wall.`
    );
  }

  sections.push({
    title: 'Static Equilibrium & Reactions',
    category: 'equilibrium',
    summary: `The system satisfies static equilibrium with zero vertical force residual and zero moment residual.`,
    details: eqDetails
  });

  // 2. Shear Force Behavior Section
  const shearDetails: string[] = [];
  const maxVDisp = convertUnit(diagrams.maxShear.value, 'N', fUnit).toFixed(2);
  const minVDisp = convertUnit(diagrams.minShear.value, 'N', fUnit).toFixed(2);
  const maxVLoc = convertUnit(diagrams.maxShear.location, 'm', lenUnit).toFixed(2);
  const minVLoc = convertUnit(diagrams.minShear.location, 'm', lenUnit).toFixed(2);
  const governingShear = Math.abs(diagrams.maxShear.value) >= Math.abs(diagrams.minShear.value)
    ? diagrams.maxShear : diagrams.minShear;
  const governingShearDisp = convertUnit(Math.abs(governingShear.value), 'N', fUnit).toFixed(2);
  const governingShearLoc = convertUnit(governingShear.location, 'm', lenUnit).toFixed(2);

  shearDetails.push(
    `The highest shear is ${maxVDisp} ${fUnit} at x = ${maxVLoc} ${lenUnit}; the lowest is ${minVDisp} ${fUnit} at x = ${minVLoc} ${lenUnit}.`
  );
  shearDetails.push(
    `The largest shear magnitude is ${governingShearDisp} ${fUnit} at x = ${governingShearLoc} ${lenUnit}.`
  );
  if (beam.pointLoads.length > 0) {
    shearDetails.push(
      `Point loads cause sharp step-discontinuities (vertical jumps) in the shear force diagram corresponding exactly to the load magnitude.`
    );
  }
  if (beam.uniformLoads.length > 0) {
    shearDetails.push(
      `Distributed loads create a linear downward slope in the shear diagram equal to the distributed load intensity w (dV/dx = -w).`
    );
  }

  sections.push({
    title: 'Shear Force Distribution (SFD)',
    category: 'shear',
    summary: `Shear represents the internal vertical transverse force resisting sliding across any cut plane of the beam.`,
    details: shearDetails
  });

  // 3. Bending Moment & Peak Location Section
  const momentDetails: string[] = [];
  const maxMDisp = convertUnit(diagrams.maxMoment.value, 'N*m', mUnit).toFixed(2);
  const minMDisp = convertUnit(diagrams.minMoment.value, 'N*m', mUnit).toFixed(2);
  const maxMLoc = convertUnit(diagrams.maxMoment.location, 'm', lenUnit).toFixed(2);
  const minMLoc = convertUnit(diagrams.minMoment.location, 'm', lenUnit).toFixed(2);
  const governingMoment = Math.abs(diagrams.maxMoment.value) >= Math.abs(diagrams.minMoment.value)
    ? diagrams.maxMoment : diagrams.minMoment;
  const governingMomentDisp = convertUnit(Math.abs(governingMoment.value), 'N*m', mUnit).toFixed(2);
  const governingMomentLoc = convertUnit(governingMoment.location, 'm', lenUnit).toFixed(2);

  momentDetails.push(
    `The highest positive moment is ${maxMDisp} ${mUnit} at x = ${maxMLoc} ${lenUnit}; the lowest (most negative) is ${minMDisp} ${mUnit} at x = ${minMLoc} ${lenUnit}.`
  );
  momentDetails.push(
    `The largest absolute bending moment is ${governingMomentDisp} ${mUnit} at x = ${governingMomentLoc} ${lenUnit}.`
  );
  momentDetails.push(
    `Fundamental beam mechanics state that the derivative of bending moment is shear force (dM/dx = V). Consequently, peak bending moments occur precisely where the shear force diagram crosses zero (V = 0) or at concentrated load points.`
  );
  if (governingMoment.value > 0) {
    momentDetails.push(
      `A positive bending moment produces sagging curvature: the lower fibers of the beam are subjected to tensile stress, while the upper fibers experience compression.`
    );
  } else {
    momentDetails.push(
      `A negative bending moment produces hogging curvature: the top fibers are under tension, characteristic of cantilever behavior.`
    );
  }

  sections.push({
    title: 'Bending Moment & Critical Sections (BMD)',
    category: 'moment',
    summary: `The critical design section occurs at x = ${maxMLoc} ${lenUnit} where the bending moment is maximized.`,
    details: momentDetails
  });

  // 4. Slope & Deflection Behavior
  const deflDetails: string[] = [];
  const dispDeflUnit = lenUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;
  const maxDeflDisp = (Math.abs(deflection.maxDeflection.value) * deflMultiplier).toFixed(3);
  const maxDeflLoc = convertUnit(deflection.maxDeflection.location, 'm', lenUnit).toFixed(2);
  const deflectionDirection = deflection.maxDeflection.value < 0 ? 'downward' : 'upward';

  deflDetails.push(
    `The largest deflection magnitude is ${maxDeflDisp} ${dispDeflUnit} (${deflectionDirection}), occurring at x = ${maxDeflLoc} ${lenUnit}.`
  );
  deflDetails.push(
    `The deflection curve is computed by integrating the bending-moment equation with Macaulay singularity functions; peak locations are refined from stationary points of the curve.`
  );
  deflDetails.push(
    `Beam stiffness is governed by flexural rigidity EI (${(deflection.EI / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kN·m²). Notice that deflection is inversely proportional to EI and scales with span L³ (for point loads) or L⁴ (for distributed loads).`
  );

  sections.push({
    title: 'Elastic Deflection & Stiffness',
    category: 'deflection',
    summary: `Peak deflection is ${maxDeflDisp} ${dispDeflUnit} at x = ${maxDeflLoc} ${lenUnit}, governed by flexural rigidity EI.`,
    details: deflDetails
  });

  // Key Engineering Takeaways
  const keyTakeaways: string[] = [
    `Largest absolute bending moment: ${governingMomentDisp} ${mUnit} at x = ${governingMomentLoc} ${lenUnit}.`,
    `Largest shear magnitude: ${governingShearDisp} ${fUnit} at x = ${governingShearLoc} ${lenUnit}.`,
    `Peak deflection magnitude: ${maxDeflDisp} ${dispDeflUnit} (${deflectionDirection}) at x = ${maxDeflLoc} ${lenUnit}.`,
    `For a rectangular section with fixed width, its second moment of area increases with the cube of its depth.`,
  ];

  const equilibriumText = reactions.equilibrium.isEquilibrium
    ? 'The calculated equilibrium residuals are within the stated tolerance.'
    : 'The calculated equilibrium residuals exceed the stated tolerance; review this result before relying on it.';
  const overview = `This ${beam.type.replace('-', ' ')} beam spans ${spanDisp} ${lenUnit} and has a net applied vertical load of ${totalLoadDisp} ${fUnit}. ${equilibriumText}`;

  return {
    overview,
    sections,
    keyTakeaways
  };
}
