import { describe, it, expect } from 'vitest';
import { solveBeamDiagrams } from '../engine/beams/diagrams';
import { BeamModel } from '../engine/beams/types';

describe('Shear Force & Bending Moment Diagrams Engine (Milestone 4)', () => {
  describe('Benchmark Cases for Simply Supported Beams', () => {
    it('Benchmark 1: SS Central Point Load (L = 6 m, P = 12 kN at midspan)', () => {
      // Hand calculation:
      // R_A = 6 kN, R_B = 6 kN
      // V(x): 0 <= x < 3: V = +6 kN; 3 < x <= 6: V = -6 kN
      // V_max = +6 kN at x=0; V_min = -6 kN at x=6
      // M(x): linear up to M_max = P*L/4 = 12*6/4 = 18 kN*m at x = 3 m
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 3, magnitude: 12000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);

      // Max/Min Shear Force
      expect(result.maxShear.value).toBeCloseTo(6000, 3);
      expect(result.minShear.value).toBeCloseTo(-6000, 3);

      // Max/Min Moment
      expect(result.maxMoment.value).toBeCloseTo(18000, 3);
      expect(result.maxMoment.location).toBeCloseTo(3.0, 3);
      expect(result.minMoment.value).toBeCloseTo(0, 3);

      // Verify at specific evaluation points
      expect(result.shearAt(1.5).right).toBeCloseTo(6000, 3);
      expect(result.shearAt(4.5).right).toBeCloseTo(-6000, 3);
      expect(result.momentAt(0)).toBeCloseTo(0, 3);
      expect(result.momentAt(3)).toBeCloseTo(18000, 3);
      expect(result.momentAt(6)).toBeCloseTo(0, 3);
    });

    it('Benchmark 2: SS Full-span UDL (L = 6 m, w = 4 kN/m)', () => {
      // Hand calculation:
      // R_A = w*L/2 = 12 kN, R_B = 12 kN
      // V(x) = 12 - 4*x
      // Zero shear at x = 12/4 = 3.0 m (midspan)
      // M_max = w*L^2 / 8 = 4 * 36 / 8 = 18 kN*m at x = 3.0 m
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 6, magnitude: 4000 }],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);

      expect(result.maxShear.value).toBeCloseTo(12000, 3);
      expect(result.minShear.value).toBeCloseTo(-12000, 3);

      expect(result.maxMoment.value).toBeCloseTo(18000, 3);
      expect(result.maxMoment.location).toBeCloseTo(3.0, 3);

      // Midspan moment
      expect(result.momentAt(3.0)).toBeCloseTo(18000, 3);
      // Zero shear points
      const zeroV = result.zeroShearLocations;
      expect(zeroV.some(loc => Math.abs(loc - 3.0) < 0.05)).toBe(true);
    });

    it('Benchmark 3: SS Off-Center Point Load (L = 6 m, P = 12 kN at a = 2 m)', () => {
      // Hand calculation:
      // R_B = 12 * 2 / 6 = 4 kN
      // R_A = 12 * 4 / 6 = 8 kN
      // M_max = P * a * (L - a) / L = 12 * 2 * 4 / 6 = 16 kN*m at x = 2 m
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 2, magnitude: 12000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.maxShear.value).toBeCloseTo(8000, 3);
      expect(result.minShear.value).toBeCloseTo(-4000, 3);
      expect(result.maxMoment.value).toBeCloseTo(16000, 3);
      expect(result.maxMoment.location).toBeCloseTo(2.0, 3);
    });

    it('Benchmark 4: SS Concentrated CCW Moment (L = 6 m, M = +30 kN·m at x = 2 m)', () => {
      // Hand calculation:
      // R_B = -30 / 6 = -5 kN (downward)
      // R_A = +5 kN (upward)
      // For 0 <= x < 2: V = +5 kN, M(x) = 5*x -> at 2^-, M = +10 kN*m
      // At x = 2, CCW applied moment drops internal M by 30 kN*m -> at 2^+, M = -20 kN*m
      // For 2 < x <= 6: V = +5 kN, M(x) = 5*x - 30 -> at x = 6, M = 0
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [],
        uniformLoads: [],
        pointMoments: [{ id: 'm1', position: 2, magnitude: 30000 }]
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.maxShear.value).toBeCloseTo(5000, 3);
      expect(result.minShear.value).toBeCloseTo(5000, 3); // Constant shear

      // Moment jump at x = 2 m
      const evalAt2 = result.momentEvaluatedAt(2);
      expect(evalAt2.left).toBeCloseTo(10000, 3);
      expect(evalAt2.right).toBeCloseTo(-20000, 3);

      expect(result.maxMoment.value).toBeCloseTo(10000, 3);
      expect(result.minMoment.value).toBeCloseTo(-20000, 3);
    });
  });

  describe('Benchmark Cases for Cantilever Beams', () => {
    it('Benchmark 5: Cantilever Fixed at Left with Tip Point Load (L = 3 m, P = 10 kN at tip)', () => {
      // Hand calculation:
      // Fixed at left (x = 0):
      // R_fixed = 10 kN (upward)
      // M_fixed = +30 kN*m (CCW)
      // V(x) = +10 kN throughout (0 <= x < 3)
      // M(x) = -30 + 10*x = -10*(3 - x)
      // M(0) = -30 kN*m (min moment / hogging), M(3) = 0
      const beam: BeamModel = {
        type: 'cantilever',
        span: 3,
        fixedEnd: 'left',
        pointLoads: [{ id: 'p1', position: 3, magnitude: 10000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.maxShear.value).toBeCloseTo(10000, 3);
      expect(result.minMoment.value).toBeCloseTo(-30000, 3);
      expect(result.minMoment.location).toBeCloseTo(0, 3);
      expect(result.maxMoment.value).toBeCloseTo(0, 3);
      expect(result.momentAt(3)).toBeCloseTo(0, 3);
    });

    it('Benchmark 6: Cantilever Fixed at Left with Full-Span UDL (L = 3 m, w = 10 kN/m)', () => {
      // Hand calculation:
      // Total load = 30 kN
      // R_fixed = 30 kN (upward)
      // M_fixed = 10 * 3 * 1.5 = +45 kN*m (CCW)
      // V(x) = 30 - 10*x
      // V(0) = 30 kN, V(3) = 0
      // M(x) = -45 + 30*x - 5*x^2 = -5*(3 - x)^2
      // M(0) = -45 kN*m, M(3) = 0
      const beam: BeamModel = {
        type: 'cantilever',
        span: 3,
        fixedEnd: 'left',
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 3, magnitude: 10000 }],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.maxShear.value).toBeCloseTo(30000, 3);
      expect(result.minShear.value).toBeCloseTo(0, 3);
      expect(result.minMoment.value).toBeCloseTo(-45000, 3);
      expect(result.minMoment.location).toBeCloseTo(0, 3);
      expect(result.maxMoment.value).toBeCloseTo(0, 3);
      expect(result.maxMoment.location).toBeCloseTo(3, 3);
    });

    it('Benchmark 7: Cantilever Fixed at Right with Tip Load at Free End (L = 4 m, P = 8 kN at x = 0)', () => {
      // Fixed at right (x = 4):
      // Free at x = 0.
      // Load P = 8 kN downward at x = 0.
      // For 0 < x <= 4:
      // V(x) = -8 kN (downward force to left of cut section)
      // M(x) = -8 * x
      // At x = 0: M(0) = 0
      // At x = 4: M(4) = -32 kN*m (hogging)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 4,
        fixedEnd: 'right',
        pointLoads: [{ id: 'p1', position: 0, magnitude: 8000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.minShear.value).toBeCloseTo(-8000, 3);
      expect(result.minMoment.value).toBeCloseTo(-32000, 3);
      expect(result.minMoment.location).toBeCloseTo(4, 3);
    });
  });

  describe('Validation & Unsupported Case Rejection', () => {
    it('rejects beam with negative or zero span', () => {
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 0,
        pointLoads: [],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('identifies inflection points (points where bending moment crosses zero)', () => {
      // An overhanging or moment-loaded beam where M crosses zero
      // Cantilever with end moment + counteracting tip load
      // Say L = 4 m, fixed at left. Load P = 10 kN at x = 4 m.
      // Counter-moment M = -60 kN*m applied at x = 0 (or large CW moment).
      // Here let's test simply supported beam with moment at A: M_A = +24 kN*m and central load P = 16 kN
      // M(x) = R_A*x + ...
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 3, magnitude: 16000 }],
        uniformLoads: [],
        pointMoments: [{ id: 'm1', position: 1.5, magnitude: 30000 }]
      };

      const result = solveBeamDiagrams(beam);
      expect(result.isValid).toBe(true);
      expect(result.points.length).toBeGreaterThan(50);
    });
  });
});
