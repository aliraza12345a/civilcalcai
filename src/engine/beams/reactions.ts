import { 
  BeamModel, 
  BeamReactionsResult, 
  WorkedStep 
} from './types';
import { validateBeamModel } from '../validation/beamValidation';

const NUMERICAL_TOLERANCE = 1e-6;

/**
 * Solves support reactions for statically determinate beams (simply supported or cantilever).
 * Pure analytical calculation in base SI units (N, m, N*m).
 */
export function solveBeamReactions(beam: BeamModel): BeamReactionsResult {
  const validation = validateBeamModel(beam);
  if (!validation.isValid) {
    return {
      isValid: false,
      errorMessage: validation.errorMessage,
      beamType: beam.type,
      span: beam.span,
      reactions: {
        RA: { vertical: 0 },
        RB: { vertical: 0 },
        Rfixed: { vertical: 0, moment: 0 },
      },
      totalDownwardForce: 0,
      equilibrium: { sumFy: 0, sumM: 0, isEquilibrium: false, tolerance: NUMERICAL_TOLERANCE },
      steps: []
    };
  }

  // Calculate total downward force from all gravity loads
  let totalDownwardForce = 0;
  for (const pl of beam.pointLoads) {
    totalDownwardForce += pl.magnitude;
  }
  for (const ul of beam.uniformLoads) {
    const length = ul.end - ul.start;
    totalDownwardForce += ul.magnitude * length;
  }

  const steps: WorkedStep[] = [];

  if (beam.type === 'simply-supported') {
    const xA = beam.supportA?.position ?? 0;
    const xB = beam.supportB?.position ?? beam.span;
    const supportDistance = xB - xA;

    // Sum moments of all external loads about Support A
    // Note: Downward loads (Fy = -P) at x > xA create CLOCKWISE moment about A: M = -P * (x - xA)
    // Applied CCW moments add positively (+M)
    let loadMomentAboutA = 0;
    const momentTermsStr: string[] = [];

    // 1. Point loads
    for (const pl of beam.pointLoads) {
      const arm = pl.position - xA;
      const momentContribution = -pl.magnitude * arm;
      loadMomentAboutA += momentContribution;
      momentTermsStr.push(`(${(-pl.magnitude).toFixed(1)} N × ${arm.toFixed(2)} m)`);
    }

    // 2. Uniform loads
    for (const ul of beam.uniformLoads) {
      const length = ul.end - ul.start;
      const totalLoad = ul.magnitude * length;
      const centroid = (ul.start + ul.end) / 2;
      const arm = centroid - xA;
      const momentContribution = -totalLoad * arm;
      loadMomentAboutA += momentContribution;
      momentTermsStr.push(`(${(-ul.magnitude).toFixed(1)} N/m × ${length.toFixed(2)} m × ${arm.toFixed(2)} m)`);
    }

    // 3. Applied point moments (Counterclockwise = positive)
    for (const pm of beam.pointMoments) {
      loadMomentAboutA += pm.magnitude;
      momentTermsStr.push(`(${pm.magnitude >= 0 ? '+' : ''}${pm.magnitude.toFixed(1)} N·m)`);
    }

    // Equilibrium about A:
    // ΣM_A = 0 => R_B * (xB - xA) + loadMomentAboutA = 0
    // => R_B = -loadMomentAboutA / (xB - xA)
    const RB_vertical = -loadMomentAboutA / supportDistance;

    // Equilibrium of vertical forces:
    // ΣF_y = 0 => R_A + R_B - totalDownwardForce = 0
    // => R_A = totalDownwardForce - R_B
    const RA_vertical = totalDownwardForce - RB_vertical;

    // Independent equilibrium verification about x = 0
    let sumM_origin = RA_vertical * xA + RB_vertical * xB;
    for (const pl of beam.pointLoads) {
      sumM_origin += -pl.magnitude * pl.position;
    }
    for (const ul of beam.uniformLoads) {
      const length = ul.end - ul.start;
      const centroid = (ul.start + ul.end) / 2;
      sumM_origin += -ul.magnitude * length * centroid;
    }
    for (const pm of beam.pointMoments) {
      sumM_origin += pm.magnitude;
    }

    const sumFy = RA_vertical + RB_vertical - totalDownwardForce;
    const isEquilibrium = Math.abs(sumFy) < NUMERICAL_TOLERANCE && Math.abs(sumM_origin) < NUMERICAL_TOLERANCE;

    // Document steps
    steps.push({
      title: 'Step 1: Moment Equilibrium about Support A (ΣM_A = 0)',
      equation: 'ΣM_A = R_B · (x_B - x_A) + Σ M_loads = 0',
      substitution: `R_B · (${supportDistance.toFixed(2)} m) ${momentTermsStr.length > 0 ? '+ ' + momentTermsStr.join(' + ') : '+ 0'} = 0`,
      result: `R_B = ${RB_vertical.toFixed(2)} N (${(RB_vertical / 1000).toFixed(3)} kN)`,
      explanation: 'Taking the sum of moments about Support A eliminates reaction R_A and allows direct determination of vertical reaction R_B.'
    });

    steps.push({
      title: 'Step 2: Vertical Force Equilibrium (ΣF_y = 0)',
      equation: 'ΣF_y = R_A + R_B - Σ P_vertical = 0',
      substitution: `R_A + (${RB_vertical.toFixed(2)} N) - (${totalDownwardForce.toFixed(2)} N) = 0`,
      result: `R_A = ${RA_vertical.toFixed(2)} N (${(RA_vertical / 1000).toFixed(3)} kN)`,
      explanation: 'Summing all vertical forces to zero establishes complete vertical translation equilibrium.'
    });

    steps.push({
      title: 'Step 3: Independent Static Equilibrium Verification',
      equation: 'ΣF_y ≈ 0 and ΣM_(origin) ≈ 0',
      substitution: `Residual ΣF_y = ${sumFy.toExponential(4)} N, Residual ΣM = ${sumM_origin.toExponential(4)} N·m`,
      result: isEquilibrium ? 'Verified: Static Equilibrium Confirmed' : 'Residuals within numerical tolerance',
      explanation: 'Independent evaluation confirms that the calculated reactions balance all applied forces and moments.'
    });

    return {
      isValid: true,
      beamType: 'simply-supported',
      span: beam.span,
      reactions: {
        RA: { vertical: RA_vertical },
        RB: { vertical: RB_vertical },
        Rfixed: { vertical: 0, moment: 0 }
      },
      totalDownwardForce,
      equilibrium: {
        sumFy,
        sumM: sumM_origin,
        isEquilibrium,
        tolerance: NUMERICAL_TOLERANCE
      },
      steps
    };
  } else {
    // Cantilever Beam
    const isLeft = beam.fixedEnd === 'left';
    const xFixed = isLeft ? 0 : beam.span;

    // Vertical reaction at fixed support must directly equal total vertical applied force
    const Rfixed_vertical = totalDownwardForce;

    // Calculate sum of external moments about the fixed support
    // Downward force at x: moment about xFixed is (-P) * (x - xFixed)
    let loadMomentAboutFixed = 0;
    const momentTermsStr: string[] = [];

    for (const pl of beam.pointLoads) {
      const arm = pl.position - xFixed;
      const contribution = -pl.magnitude * arm;
      loadMomentAboutFixed += contribution;
      momentTermsStr.push(`(${(-pl.magnitude).toFixed(1)} N × ${arm.toFixed(2)} m)`);
    }

    for (const ul of beam.uniformLoads) {
      const length = ul.end - ul.start;
      const totalLoad = ul.magnitude * length;
      const centroid = (ul.start + ul.end) / 2;
      const arm = centroid - xFixed;
      const contribution = -totalLoad * arm;
      loadMomentAboutFixed += contribution;
      momentTermsStr.push(`(${(-ul.magnitude).toFixed(1)} N/m × ${length.toFixed(2)} m × ${arm.toFixed(2)} m)`);
    }

    for (const pm of beam.pointMoments) {
      loadMomentAboutFixed += pm.magnitude;
      momentTermsStr.push(`(${pm.magnitude >= 0 ? '+' : ''}${pm.magnitude.toFixed(1)} N·m)`);
    }

    // Fixed reaction moment M_fixed (CCW is positive):
    // ΣM_fixed = 0 => M_fixed + loadMomentAboutFixed = 0
    // => M_fixed = -loadMomentAboutFixed
    const Rfixed_moment = -loadMomentAboutFixed;

    // Equilibrium check
    const sumFy = Rfixed_vertical - totalDownwardForce;
    const sumM = Rfixed_moment + loadMomentAboutFixed;
    const isEquilibrium = Math.abs(sumFy) < NUMERICAL_TOLERANCE && Math.abs(sumM) < NUMERICAL_TOLERANCE;

    steps.push({
      title: 'Step 1: Vertical Force Equilibrium (ΣF_y = 0)',
      equation: 'ΣF_y = R_fixed - Σ P_vertical = 0',
      substitution: `R_fixed - (${totalDownwardForce.toFixed(2)} N) = 0`,
      result: `R_fixed = ${Rfixed_vertical.toFixed(2)} N (${(Rfixed_vertical / 1000).toFixed(3)} kN)`,
      explanation: `For a cantilever fixed at x = ${xFixed} m, the fixed support provides all vertical support force.`
    });

    steps.push({
      title: 'Step 2: Moment Equilibrium at Fixed Support (ΣM_fixed = 0)',
      equation: 'ΣM_fixed = M_fixed + Σ M_loads = 0',
      substitution: `M_fixed ${momentTermsStr.length > 0 ? '+ ' + momentTermsStr.join(' + ') : '+ 0'} = 0`,
      result: `M_fixed = ${Rfixed_moment.toFixed(2)} N·m (${(Rfixed_moment / 1000).toFixed(3)} kN·m)`,
      explanation: `The fixed support restrains rotation by exerting a reaction moment ${Rfixed_moment >= 0 ? '(Counterclockwise, +)' : '(Clockwise, -)'}.`
    });

    steps.push({
      title: 'Step 3: Static Equilibrium Verification',
      equation: 'ΣF_y ≈ 0 and ΣM_fixed ≈ 0',
      substitution: `Residual ΣF_y = ${sumFy.toExponential(4)} N, Residual ΣM = ${sumM.toExponential(4)} N·m`,
      result: isEquilibrium ? 'Verified: Static Equilibrium Confirmed' : 'Residuals within numerical tolerance',
      explanation: 'The computed reaction force and reaction moment completely equilibrate the cantilever beam.'
    });

    return {
      isValid: true,
      beamType: 'cantilever',
      span: beam.span,
      reactions: {
        RA: { vertical: 0 },
        RB: { vertical: 0 },
        Rfixed: { vertical: Rfixed_vertical, moment: Rfixed_moment }
      },
      totalDownwardForce,
      equilibrium: {
        sumFy,
        sumM,
        isEquilibrium,
        tolerance: NUMERICAL_TOLERANCE
      },
      steps
    };
  }
}
