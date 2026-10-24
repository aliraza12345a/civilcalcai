import { BeamModel } from './types';
import { solveBeamReactions } from './reactions';

export interface DeflectionParameters {
  E: number; // Modulus of Elasticity in Pa (e.g. 200e9 for 200 GPa)
  I: number; // Second moment of area in m^4 (e.g. 1e-4)
}

export interface MaterialPreset {
  id: string;
  name: string;
  E: number; // in Pa
  I: number; // in m^4
  description: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { 
    id: 'steel', 
    name: 'Structural Steel', 
    E: 200e9, 
    I: 1e-4, 
    description: 'E = 200 GPa, I = 100,000,000 mm⁴ (Typical Universal Beam)' 
  },
  { 
    id: 'concrete', 
    name: 'Reinforced Concrete', 
    E: 25e9, 
    I: 3e-3, 
    description: 'E = 25 GPa, typical 300 × 500 mm rectangular beam' 
  },
  { 
    id: 'timber', 
    name: 'Structural Timber', 
    E: 12e9, 
    I: 5e-4, 
    description: 'E = 12 GPa, typical heavy glued-laminated timber' 
  },
  { 
    id: 'aluminium', 
    name: 'Aluminium Alloy (6061-T6)', 
    E: 70e9, 
    I: 1e-4, 
    description: 'E = 70 GPa, lightweight structural extrusion' 
  },
];

export interface StandardCaseResult {
  caseType: string;
  maxDeflectionMagnitude: number; // in meters
  maxSlopeMagnitude: number;      // in radians
  formulaDeflection: string;
  formulaSlope: string;
}

/**
 * Standard closed-form formulas for canonical benchmark cases.
 */
export function solveStandardDeflection(
  caseType: 'ss-central-point' | 'ss-full-udl' | 'cantilever-end-point' | 'cantilever-full-udl' | 'cantilever-end-moment',
  args: { L: number; P?: number; w?: number; M?: number; E: number; I: number }
): StandardCaseResult {
  const { L, E, I } = args;
  const EI = E * I;

  switch (caseType) {
    case 'ss-central-point': {
      const P = args.P ?? 0;
      return {
        caseType,
        maxDeflectionMagnitude: (P * Math.pow(L, 3)) / (48 * EI),
        maxSlopeMagnitude: (P * Math.pow(L, 2)) / (16 * EI),
        formulaDeflection: 'P · L³ / (48 · E · I)',
        formulaSlope: 'P · L² / (16 · E · I)'
      };
    }
    case 'ss-full-udl': {
      const w = args.w ?? 0;
      return {
        caseType,
        maxDeflectionMagnitude: (5 * w * Math.pow(L, 4)) / (384 * EI),
        maxSlopeMagnitude: (w * Math.pow(L, 3)) / (24 * EI),
        formulaDeflection: '5 · w · L⁴ / (384 · E · I)',
        formulaSlope: 'w · L³ / (24 · E · I)'
      };
    }
    case 'cantilever-end-point': {
      const P = args.P ?? 0;
      return {
        caseType,
        maxDeflectionMagnitude: (P * Math.pow(L, 3)) / (3 * EI),
        maxSlopeMagnitude: (P * Math.pow(L, 2)) / (2 * EI),
        formulaDeflection: 'P · L³ / (3 · E · I)',
        formulaSlope: 'P · L² / (2 · E · I)'
      };
    }
    case 'cantilever-full-udl': {
      const w = args.w ?? 0;
      return {
        caseType,
        maxDeflectionMagnitude: (w * Math.pow(L, 4)) / (8 * EI),
        maxSlopeMagnitude: (w * Math.pow(L, 3)) / (6 * EI),
        formulaDeflection: 'w · L⁴ / (8 · E · I)',
        formulaSlope: 'w · L³ / (6 · E · I)'
      };
    }
    case 'cantilever-end-moment': {
      const M = args.M ?? 0;
      return {
        caseType,
        maxDeflectionMagnitude: (M * Math.pow(L, 2)) / (2 * EI),
        maxSlopeMagnitude: (M * L) / EI,
        formulaDeflection: 'M · L² / (2 · E · I)',
        formulaSlope: 'M · L / (E · I)'
      };
    }
  }
}

export interface DeflectionPoint {
  x: number;          // in meters
  deflection: number; // in meters (upward positive, downward negative)
  slope: number;      // in radians (counterclockwise positive)
  moment: number;     // in N*m (sagging positive)
}

export interface GeneralDeflectionResult {
  isValid: boolean;
  errorMessage?: string;
  EI: number;
  deflectionAt: (x: number) => number;
  slopeAt: (x: number) => number;
  momentAt: (x: number) => number;
  points: DeflectionPoint[];
  maxDeflection: {
    value: number;    // signed value in meters
    magnitude: number; // absolute value in meters
    location: number; // x location in meters
  };
  maxSlope: {
    value: number;
    magnitude: number;
    location: number;
  };
  assumptions: string[];
}

/**
 * Macaulay singularity bracket <x - a>^n: returns (x - a)^n if x >= a, else 0.
 */
function macaulay(x: number, a: number, n: number): number {
  if (x < a) return 0;
  if (n === 0) return 1;
  return Math.pow(x - a, n);
}

/**
 * General beam deflection solver using exact piece-wise integration (Macaulay's Method).
 * Governing equation: EI * d²y/dx² = M(x)
 * Sign conventions:
 * - x starts at 0 at left tip, positive to right.
 * - y is positive upward, so gravity downward deflection is NEGATIVE.
 * - M(x) is sagging positive (tension bottom, compression top).
 */
export function solveGeneralDeflection(
  beam: BeamModel,
  params: DeflectionParameters
): GeneralDeflectionResult {
  const reactionResult = solveBeamReactions(beam);
  if (!reactionResult.isValid) {
    return {
      isValid: false,
      errorMessage: reactionResult.errorMessage,
      EI: params.E * params.I,
      deflectionAt: () => 0,
      slopeAt: () => 0,
      momentAt: () => 0,
      points: [],
      maxDeflection: { value: 0, magnitude: 0, location: 0 },
      maxSlope: { value: 0, magnitude: 0, location: 0 },
      assumptions: []
    };
  }

  if (params.E <= 0 || params.I <= 0) {
    return {
      isValid: false,
      errorMessage: 'Modulus of Elasticity (E) and Second Moment of Area (I) must be strictly positive numbers.',
      EI: 0,
      deflectionAt: () => 0,
      slopeAt: () => 0,
      momentAt: () => 0,
      points: [],
      maxDeflection: { value: 0, magnitude: 0, location: 0 },
      maxSlope: { value: 0, magnitude: 0, location: 0 },
      assumptions: []
    };
  }

  const EI = params.E * params.I;
  const L = beam.span;

  let C1 = 0;
  let C2 = 0;

  if (beam.type === 'simply-supported') {
    const RA = reactionResult.reactions.RA.vertical;
    const xA = beam.supportA?.position ?? 0;
    const xB = beam.supportB?.position ?? L;

    // Deflection integral function without integration constants
    const rawDeflectionIntegral = (x: number): number => {
      let sum = (RA / 6) * macaulay(x, xA, 3);

      for (const pl of beam.pointLoads) {
        sum -= (pl.magnitude / 6) * macaulay(x, pl.position, 3);
      }

      for (const ul of beam.uniformLoads) {
        sum -= (ul.magnitude / 24) * macaulay(x, ul.start, 4);
        sum += (ul.magnitude / 24) * macaulay(x, ul.end, 4);
      }

      for (const pm of beam.pointMoments) {
        sum += (pm.magnitude / 2) * macaulay(x, pm.position, 2);
      }

      return sum;
    };

    // Boundary conditions:
    // y(xA) = 0 => rawDefl(xA) + C1*xA + C2 = 0
    // y(xB) = 0 => rawDefl(xB) + C1*xB + C2 = 0
    // If xA = 0 => C2 = -rawDefl(0) = 0.
    // In general: C1 = (rawDefl(xA) - rawDefl(xB)) / (xB - xA)
    // C2 = -rawDefl(xA) - C1 * xA
    const deflA = rawDeflectionIntegral(xA);
    const deflB = rawDeflectionIntegral(xB);
    C1 = (deflA - deflB) / (xB - xA);
    C2 = -deflA - C1 * xA;

    const momentAt = (x: number): number => {
      let M = RA * macaulay(x, xA, 1);
      for (const pl of beam.pointLoads) {
        M -= pl.magnitude * macaulay(x, pl.position, 1);
      }
      for (const ul of beam.uniformLoads) {
        M -= (ul.magnitude / 2) * macaulay(x, ul.start, 2);
        M += (ul.magnitude / 2) * macaulay(x, ul.end, 2);
      }
      for (const pm of beam.pointMoments) {
        M += pm.magnitude * macaulay(x, pm.position, 0);
      }
      return M;
    };

    const slopeAt = (x: number): number => {
      let sum = (RA / 2) * macaulay(x, xA, 2);
      for (const pl of beam.pointLoads) {
        sum -= (pl.magnitude / 2) * macaulay(x, pl.position, 2);
      }
      for (const ul of beam.uniformLoads) {
        sum -= (ul.magnitude / 6) * macaulay(x, ul.start, 3);
        sum += (ul.magnitude / 6) * macaulay(x, ul.end, 3);
      }
      for (const pm of beam.pointMoments) {
        sum += pm.magnitude * macaulay(x, pm.position, 1);
      }
      return (sum + C1) / EI;
    };

    const deflectionAt = (x: number): number => {
      return (rawDeflectionIntegral(x) + C1 * x + C2) / EI;
    };

    return generateDeflectionResult(L, EI, momentAt, slopeAt, deflectionAt);
  } else {
    // Cantilever Beam
    const isLeft = beam.fixedEnd === 'left';
    const Rfixed = reactionResult.reactions.Rfixed.vertical;
    const Mfixed = reactionResult.reactions.Rfixed.moment;

    if (isLeft) {
      // Fixed at x = 0.
      // At cut section x > 0 looking left:
      // Internal bending moment M(x) = -Mfixed + Rfixed*x - sum(loads)
      const rawDeflectionIntegral = (x: number): number => {
        let sum = -(Mfixed / 2) * Math.pow(x, 2) + (Rfixed / 6) * Math.pow(x, 3);
        for (const pl of beam.pointLoads) {
          sum -= (pl.magnitude / 6) * macaulay(x, pl.position, 3);
        }
        for (const ul of beam.uniformLoads) {
          sum -= (ul.magnitude / 24) * macaulay(x, ul.start, 4);
          sum += (ul.magnitude / 24) * macaulay(x, ul.end, 4);
        }
        for (const pm of beam.pointMoments) {
          sum += (pm.magnitude / 2) * macaulay(x, pm.position, 2);
        }
        return sum;
      };

      // Boundary conditions at x = 0: slope(0) = 0 => C1 = 0; y(0) = 0 => C2 = 0
      C1 = 0;
      C2 = 0;

      const momentAt = (x: number): number => {
        let M = -Mfixed + Rfixed * x;
        for (const pl of beam.pointLoads) {
          M -= pl.magnitude * macaulay(x, pl.position, 1);
        }
        for (const ul of beam.uniformLoads) {
          M -= (ul.magnitude / 2) * macaulay(x, ul.start, 2);
          M += (ul.magnitude / 2) * macaulay(x, ul.end, 2);
        }
        for (const pm of beam.pointMoments) {
          M += pm.magnitude * macaulay(x, pm.position, 0);
        }
        return M;
      };

      const slopeAt = (x: number): number => {
        let sum = -Mfixed * x + (Rfixed / 2) * Math.pow(x, 2);
        for (const pl of beam.pointLoads) {
          sum -= (pl.magnitude / 2) * macaulay(x, pl.position, 2);
        }
        for (const ul of beam.uniformLoads) {
          sum -= (ul.magnitude / 6) * macaulay(x, ul.start, 3);
          sum += (ul.magnitude / 6) * macaulay(x, ul.end, 3);
        }
        for (const pm of beam.pointMoments) {
          sum += pm.magnitude * macaulay(x, pm.position, 1);
        }
        return (sum + C1) / EI;
      };

      const deflectionAt = (x: number): number => {
        return (rawDeflectionIntegral(x) + C1 * x + C2) / EI;
      };

      return generateDeflectionResult(L, EI, momentAt, slopeAt, deflectionAt);
    } else {
      // Fixed at Right (x = L). Free at x = 0.
      // Looking from left (x = 0): no support at x = 0
      const rawSlopeIntegral = (x: number): number => {
        let sum = 0;
        for (const pl of beam.pointLoads) {
          sum -= (pl.magnitude / 2) * macaulay(x, pl.position, 2);
        }
        for (const ul of beam.uniformLoads) {
          sum -= (ul.magnitude / 6) * macaulay(x, ul.start, 3);
          sum += (ul.magnitude / 6) * macaulay(x, ul.end, 3);
        }
        for (const pm of beam.pointMoments) {
          sum += pm.magnitude * macaulay(x, pm.position, 1);
        }
        return sum;
      };

      const rawDeflectionIntegral = (x: number): number => {
        let sum = 0;
        for (const pl of beam.pointLoads) {
          sum -= (pl.magnitude / 6) * macaulay(x, pl.position, 3);
        }
        for (const ul of beam.uniformLoads) {
          sum -= (ul.magnitude / 24) * macaulay(x, ul.start, 4);
          sum += (ul.magnitude / 24) * macaulay(x, ul.end, 4);
        }
        for (const pm of beam.pointMoments) {
          sum += (pm.magnitude / 2) * macaulay(x, pm.position, 2);
        }
        return sum;
      };

      // Boundary conditions at x = L:
      // slope(L) = 0 => rawSlope(L) + C1 = 0 => C1 = -rawSlope(L)
      // defl(L) = 0 => rawDefl(L) + C1*L + C2 = 0 => C2 = -rawDefl(L) - C1*L
      C1 = -rawSlopeIntegral(L);
      C2 = -rawDeflectionIntegral(L) - C1 * L;

      const momentAt = (x: number): number => {
        let M = 0;
        for (const pl of beam.pointLoads) {
          M -= pl.magnitude * macaulay(x, pl.position, 1);
        }
        for (const ul of beam.uniformLoads) {
          M -= (ul.magnitude / 2) * macaulay(x, ul.start, 2);
          M += (ul.magnitude / 2) * macaulay(x, ul.end, 2);
        }
        for (const pm of beam.pointMoments) {
          M += pm.magnitude * macaulay(x, pm.position, 0);
        }
        return M;
      };

      const slopeAt = (x: number): number => {
        return (rawSlopeIntegral(x) + C1) / EI;
      };

      const deflectionAt = (x: number): number => {
        return (rawDeflectionIntegral(x) + C1 * x + C2) / EI;
      };

      return generateDeflectionResult(L, EI, momentAt, slopeAt, deflectionAt);
    }
  }
}

/**
 * Samples the analytical curves and calculates maximum deflection and slope with locations.
 */
function generateDeflectionResult(
  L: number,
  EI: number,
  momentAt: (x: number) => number,
  slopeAt: (x: number) => number,
  deflectionAt: (x: number) => number
): GeneralDeflectionResult {
  const SAMPLES = 100;
  const points: DeflectionPoint[] = [];

  let maxDeflMag = -1;
  let maxDeflVal = 0;
  let maxDeflLoc = 0;

  let maxSlopeMag = -1;
  let maxSlopeVal = 0;
  let maxSlopeLoc = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const x = (i / SAMPLES) * L;
    const y = deflectionAt(x);
    const theta = slopeAt(x);
    const M = momentAt(x);

    points.push({ x, deflection: y, slope: theta, moment: M });

    const yMag = Math.abs(y);
    if (yMag > maxDeflMag) {
      maxDeflMag = yMag;
      maxDeflVal = y;
      maxDeflLoc = x;
    }

    const thetaMag = Math.abs(theta);
    if (thetaMag > maxSlopeMag) {
      maxSlopeMag = thetaMag;
      maxSlopeVal = theta;
      maxSlopeLoc = x;
    }
  }

  // Refine maximum deflection location using fine sampling around maxDeflLoc
  const fineStep = L / 1000;
  const searchStart = Math.max(0, maxDeflLoc - fineStep * 10);
  const searchEnd = Math.min(L, maxDeflLoc + fineStep * 10);

  for (let x = searchStart; x <= searchEnd; x += fineStep / 10) {
    const y = deflectionAt(x);
    const yMag = Math.abs(y);
    if (yMag > maxDeflMag) {
      maxDeflMag = yMag;
      maxDeflVal = y;
      maxDeflLoc = x;
    }
  }

  const assumptions = [
    'Euler-Bernoulli Beam Theory (plane sections remain plane and normal to the axis)',
    'Linear Elastic material behavior (Hooke’s Law: σ = E·ε)',
    'Small deflections and small slopes (cos θ ≈ 1, curvature κ ≈ d²y/dx²)',
    'Prismatic member with constant flexural rigidity (constant E·I along span)',
    'Bending deformation only (shear deformation is neglected; valid for slender beams L/h ≥ 10)'
  ];

  return {
    isValid: true,
    EI,
    deflectionAt,
    slopeAt,
    momentAt,
    points,
    maxDeflection: {
      value: maxDeflVal,
      magnitude: maxDeflMag,
      location: maxDeflLoc
    },
    maxSlope: {
      value: maxSlopeVal,
      magnitude: maxSlopeMag,
      location: maxSlopeLoc
    },
    assumptions
  };
}
