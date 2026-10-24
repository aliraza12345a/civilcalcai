import { BeamModel } from './types';
import { solveBeamReactions } from './reactions';

export interface DiagramPoint {
  x: number;          // Position along beam in meters
  shear: number;      // Shear force in N
  moment: number;     // Bending moment in N*m (sagging positive)
}

export interface DiagramExtremum {
  value: number;      // Extreme value in N or N*m
  location: number;   // x location in meters
}

export interface BeamDiagramsResult {
  isValid: boolean;
  errorMessage?: string;
  points: DiagramPoint[];
  // Continuous or piecewise analytical evaluators
  shearAt: (x: number) => { left: number; right: number };
  momentAt: (x: number) => number;
  momentEvaluatedAt: (x: number) => { left: number; right: number };
  // Extremum values
  maxShear: DiagramExtremum;
  minShear: DiagramExtremum;
  maxMoment: DiagramExtremum;
  minMoment: DiagramExtremum;
  zeroShearLocations: number[];
  inflectionPoints: number[]; // Where moment crosses zero
}

const EPS = 1e-9;

/**
 * Solves analytical Shear Force Diagram (SFD) and Bending Moment Diagram (BMD)
 * for statically determinate beams.
 * 
 * Sign Conventions:
 * - Origin x = 0 at left tip, x positive to the right.
 * - Shear Force V(x): Upward forces to the left of the cut section produce positive shear (+V).
 * - Bending Moment M(x): Sagging (tension at the bottom, compression at the top) is positive (+M).
 * - Counterclockwise applied moments create a negative step (-M_applied) in bending moment.
 */
export function solveBeamDiagrams(beam: BeamModel): BeamDiagramsResult {
  const reactionsResult = solveBeamReactions(beam);
  if (!reactionsResult.isValid) {
    const zeroExtremum: DiagramExtremum = { value: 0, location: 0 };
    return {
      isValid: false,
      errorMessage: reactionsResult.errorMessage,
      points: [],
      shearAt: () => ({ left: 0, right: 0 }),
      momentAt: () => 0,
      momentEvaluatedAt: () => ({ left: 0, right: 0 }),
      maxShear: zeroExtremum,
      minShear: zeroExtremum,
      maxMoment: zeroExtremum,
      minMoment: zeroExtremum,
      zeroShearLocations: [],
      inflectionPoints: []
    };
  }

  const L = beam.span;
  const isSS = beam.type === 'simply-supported';
  const xA = isSS ? (beam.supportA?.position ?? 0) : (beam.fixedEnd === 'left' ? 0 : L);
  const xB = isSS ? (beam.supportB?.position ?? L) : -1;
  const RA = isSS ? reactionsResult.reactions.RA.vertical : (beam.fixedEnd === 'left' ? reactionsResult.reactions.Rfixed.vertical : 0);
  const RB = isSS ? reactionsResult.reactions.RB.vertical : 0;
  const Mfixed = !isSS && beam.fixedEnd === 'left' ? reactionsResult.reactions.Rfixed.moment : 0;

  /**
   * Internal shear force evaluator at x.
   * side: 'left' evaluates limit as t -> x from left (t < x)
   * side: 'right' evaluates limit as t -> x from right (t > x)
   */
  const evaluateShear = (x: number, side: 'left' | 'right'): number => {
    let V = 0;
    const thresh = side === 'left' ? x - EPS : x + EPS;

    // Support reactions
    if (isSS) {
      if (thresh > xA) V += RA;
      if (thresh > xB) V += RB;
    } else {
      if (beam.fixedEnd === 'left' && thresh > 0) {
        V += RA;
      }
    }

    // Concentrated point loads (downward = negative shear)
    for (const pl of beam.pointLoads) {
      if (thresh > pl.position) {
        V -= pl.magnitude;
      }
    }

    // Uniform distributed loads
    for (const ul of beam.uniformLoads) {
      if (x <= ul.start) {
        continue;
      } else if (x >= ul.end) {
        V -= ul.magnitude * (ul.end - ul.start);
      } else {
        V -= ul.magnitude * (x - ul.start);
      }
    }

    return Math.abs(V) < EPS ? 0 : V;
  };

  /**
   * Internal bending moment evaluator at x.
   */
  const evaluateMoment = (x: number, side: 'left' | 'right' = 'right'): number => {
    let M = 0;
    const thresh = side === 'left' ? x - EPS : x + EPS;

    // Fixed support reaction moment at left (CCW external = negative step in internal sagging moment)
    if (!isSS && beam.fixedEnd === 'left') {
      M -= Mfixed;
      if (x > 0) {
        M += RA * x;
      }
    }

    // Support reactions in Simply Supported
    if (isSS) {
      if (x > xA) M += RA * (x - xA);
      if (x > xB) M += RB * (x - xB);
    }

    // Concentrated point loads (downward = negative moment)
    for (const pl of beam.pointLoads) {
      if (x > pl.position) {
        M -= pl.magnitude * (x - pl.position);
      }
    }

    // Uniform distributed loads
    for (const ul of beam.uniformLoads) {
      if (x <= ul.start) {
        continue;
      } else if (x >= ul.end) {
        const len = ul.end - ul.start;
        const centroid = (ul.start + ul.end) / 2;
        M -= ul.magnitude * len * (x - centroid);
      } else {
        const len = x - ul.start;
        const centroid = (ul.start + x) / 2;
        M -= ul.magnitude * len * (x - centroid);
      }
    }

    // Applied concentrated moments (Counterclockwise = positive applied moment => step drop of -M)
    for (const pm of beam.pointMoments) {
      if (thresh > pm.position) {
        M -= pm.magnitude;
      }
    }

    return Math.abs(M) < EPS ? 0 : M;
  };

  // Find all critical stations along the span (discontinuities, supports, load edges)
  const criticalStations = new Set<number>();
  criticalStations.add(0);
  criticalStations.add(L);

  if (isSS) {
    criticalStations.add(xA);
    criticalStations.add(xB);
  } else {
    criticalStations.add(beam.fixedEnd === 'left' ? 0 : L);
  }

  for (const pl of beam.pointLoads) {
    if (pl.position >= 0 && pl.position <= L) criticalStations.add(pl.position);
  }
  for (const ul of beam.uniformLoads) {
    if (ul.start >= 0 && ul.start <= L) criticalStations.add(ul.start);
    if (ul.end >= 0 && ul.end <= L) criticalStations.add(ul.end);
  }
  for (const pm of beam.pointMoments) {
    if (pm.position >= 0 && pm.position <= L) criticalStations.add(pm.position);
  }

  // Find locations of zero shear (inside UDLs)
  const zeroShearLocations: number[] = [];
  for (const ul of beam.uniformLoads) {
    if (ul.magnitude > 0) {
      const vStart = evaluateShear(ul.start, 'right');
      const vEnd = evaluateShear(ul.end, 'left');
      if (vStart * vEnd <= 0 && Math.abs(vStart - vEnd) > EPS) {
        // Linear shear: V(x) = vStart - w*(x - ul.start) = 0 => x = ul.start + vStart / w
        const xZero = ul.start + vStart / ul.magnitude;
        if (xZero >= ul.start - EPS && xZero <= ul.end + EPS) {
          const clamped = Math.max(0, Math.min(L, xZero));
          zeroShearLocations.push(clamped);
          criticalStations.add(clamped);
        }
      }
    }
  }

  const sortedStations = Array.from(criticalStations).sort((a, b) => a - b);

  // Generate detailed plotting points across the span
  const numSampleIntervals = 200;
  const dx = L / numSampleIntervals;
  const samplePointsSet = new Set<number>();

  for (let i = 0; i <= numSampleIntervals; i++) {
    samplePointsSet.add(Math.round((i * dx) * 1e6) / 1e6);
  }
  for (const s of sortedStations) {
    samplePointsSet.add(Math.round(s * 1e6) / 1e6);
  }

  const sortedSampleX = Array.from(samplePointsSet).sort((a, b) => a - b);

  const points: DiagramPoint[] = [];

  // Build points with left and right evaluation at discontinuities for clean square jumps
  for (let i = 0; i < sortedSampleX.length; i++) {
    const x = sortedSampleX[i];
    const isCritical = sortedStations.some(cs => Math.abs(cs - x) < 1e-5);

    if (isCritical && x > 0 && x < L) {
      const vLeft = evaluateShear(x, 'left');
      const mLeft = evaluateMoment(x, 'left');
      const vRight = evaluateShear(x, 'right');
      const mRight = evaluateMoment(x, 'right');

      points.push({ x: x - EPS, shear: vLeft, moment: mLeft });
      points.push({ x: x + EPS, shear: vRight, moment: mRight });
    } else {
      const v = evaluateShear(x, x === 0 ? 'right' : 'left');
      const m = evaluateMoment(x, x === 0 ? 'right' : 'left');
      points.push({ x, shear: v, moment: m });
    }
  }

  // Calculate extreme values
  let maxV = -Infinity;
  let locMaxV = 0;
  let minV = Infinity;
  let locMinV = 0;

  let maxM = -Infinity;
  let locMaxM = 0;
  let minM = Infinity;
  let locMinM = 0;

  const testExtremumAt = (x: number) => {
    let vCand: number[];
    let mCand: number[];

    if (x <= EPS) {
      // At left boundary of beam, internal face (right)
      vCand = [evaluateShear(x, 'right')];
      mCand = [evaluateMoment(x, 'right')];
    } else if (x >= L - EPS) {
      // At right boundary of beam, internal face (left)
      vCand = [evaluateShear(x, 'left')];
      mCand = [evaluateMoment(x, 'left')];
    } else {
      vCand = [evaluateShear(x, 'left'), evaluateShear(x, 'right')];
      mCand = [evaluateMoment(x, 'left'), evaluateMoment(x, 'right')];
    }

    for (const v of vCand) {
      if (v > maxV) { maxV = v; locMaxV = x; }
      if (v < minV) { minV = v; locMinV = x; }
    }

    for (const m of mCand) {
      if (m > maxM) { maxM = m; locMaxM = x; }
      if (m < minM) { minM = m; locMinM = x; }
    }
  };

  for (const st of sortedStations) {
    testExtremumAt(st);
  }
  for (let i = 0; i <= numSampleIntervals; i++) {
    testExtremumAt(i * dx);
  }

  // Detect inflection points where moment crosses zero
  const inflectionPoints: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1.moment * p2.moment < 0 && Math.abs(p2.x - p1.x) > 1e-4) {
      // Linear interpolation for zero crossing
      const xZero = p1.x + (-p1.moment / (p2.moment - p1.moment)) * (p2.x - p1.x);
      inflectionPoints.push(Math.round(xZero * 1000) / 1000);
    }
  }

  return {
    isValid: true,
    points,
    shearAt: (x: number) => ({
      left: evaluateShear(x, 'left'),
      right: evaluateShear(x, 'right')
    }),
    momentAt: (x: number) => evaluateMoment(x, 'right'),
    momentEvaluatedAt: (x: number) => ({
      left: evaluateMoment(x, 'left'),
      right: evaluateMoment(x, 'right')
    }),
    maxShear: { value: maxV, location: locMaxV },
    minShear: { value: minV, location: locMinV },
    maxMoment: { value: maxM, location: locMaxM },
    minMoment: { value: minM, location: locMinM },
    zeroShearLocations,
    inflectionPoints
  };
}
