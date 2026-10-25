import { describe, it, expect } from 'vitest';
import { solveBeamReactions } from '../engine/beams/reactions';
import { BeamModel } from '../engine/beams/types';

describe('Beam Reactions Calculator (Milestone 3)', () => {
  describe('Simply Supported Beams (Pin at A, Roller at B)', () => {
    it('Case 1: Central Point Load (P = 10 kN at midspan of L = 6 m)', () => {
      // Hand calculation:
      // ΣM_A = 0 => R_B * 6 - 10 * 3 = 0 => R_B = 30 / 6 = 5.0 kN
      // ΣF_y = 0 => R_A + R_B - 10 = 0 => R_A = 5.0 kN
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6, // meters
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 3, magnitude: 10000 }], // 10,000 N
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.isValid).toBe(true);
      expect(result.reactions.RA.vertical).toBeCloseTo(5000, 4); // 5 kN
      expect(result.reactions.RB.vertical).toBeCloseTo(5000, 4); // 5 kN
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 2: Off-center Point Load (P = 12 kN at a = 2 m, L = 6 m)', () => {
      // Hand calculation:
      // R_B = P * a / L = 12 * 2 / 6 = 4.0 kN
      // R_A = P * (L - a) / L = 12 * 4 / 6 = 8.0 kN
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 2, magnitude: 12000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.RA.vertical).toBeCloseTo(8000, 4);
      expect(result.reactions.RB.vertical).toBeCloseTo(4000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 3: Full-span UDL (w = 4 kN/m over L = 5 m)', () => {
      // Hand calculation:
      // Total load W = 4 * 5 = 20 kN
      // R_A = R_B = W / 2 = 10.0 kN
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 5,
        supportA: { position: 0 },
        supportB: { position: 5 },
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 5, magnitude: 4000 }], // 4 kN/m
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.RA.vertical).toBeCloseTo(10000, 4);
      expect(result.reactions.RB.vertical).toBeCloseTo(10000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
    });

    it('Case 4: Partial-span UDL (w = 6 kN/m from x = 1 m to x = 4 m, L = 6 m)', () => {
      // Hand calculation:
      // Length of UDL = 3 m. Total load W = 6 * 3 = 18 kN.
      // Centroid = 1 + 3/2 = 2.5 m.
      // ΣM_A = 0 => R_B * 6 - 18 * 2.5 = 0 => R_B * 6 = 45 => R_B = 7.5 kN (7500 N)
      // ΣF_y = 0 => R_A = 18 - 7.5 = 10.5 kN (10500 N)
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 1, end: 4, magnitude: 6000 }],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.RA.vertical).toBeCloseTo(10500, 4);
      expect(result.reactions.RB.vertical).toBeCloseTo(7500, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 5: Applied Concentrated CCW Moment (M = +30 kN·m at x = 2 m, L = 6 m)', () => {
      // Hand calculation:
      // Counterclockwise = positive (+30,000 N·m).
      // ΣM_A = 0 => R_B * 6 + 30 = 0 => R_B = -5.0 kN (-5000 N, downward reaction)
      // ΣF_y = 0 => R_A + (-5) = 0 => R_A = +5.0 kN (+5000 N, upward reaction)
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [],
        uniformLoads: [],
        pointMoments: [{ id: 'm1', position: 2, magnitude: 30000 }] // +30 kNm
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.RA.vertical).toBeCloseTo(5000, 4);
      expect(result.reactions.RB.vertical).toBeCloseTo(-5000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 6: Superposition of mixed loads (Point load + Partial UDL + Moment)', () => {
      // Span L = 6 m
      // 1. Point load P = 12 kN at x = 2 m => RA = 8 kN, RB = 4 kN
      // 2. Partial UDL w = 6 kN/m from 1 to 4 m => RA = 10.5 kN, RB = 7.5 kN
      // 3. Moment M = +30 kN·m at x = 2 m => RA = 5 kN, RB = -5 kN
      // Superposition:
      // R_A = 8 + 10.5 + 5 = 23.5 kN (23,500 N)
      // R_B = 4 + 7.5 - 5 = 6.5 kN (6,500 N)
      // Total vertical load = 12 + 18 = 30 kN. RA + RB = 23.5 + 6.5 = 30 kN. Equilibrium exact!
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 6,
        supportA: { position: 0 },
        supportB: { position: 6 },
        pointLoads: [{ id: 'p1', position: 2, magnitude: 12000 }],
        uniformLoads: [{ id: 'u1', start: 1, end: 4, magnitude: 6000 }],
        pointMoments: [{ id: 'm1', position: 2, magnitude: 30000 }]
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.RA.vertical).toBeCloseTo(23500, 4);
      expect(result.reactions.RB.vertical).toBeCloseTo(6500, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 5);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 5);
    });
  });

  describe('Cantilever Beams (Fixed Support & Free End)', () => {
    it('Case 7: Cantilever Fixed at Left (x=0) with End Point Load (P = 15 kN at x = 4 m, L = 4 m)', () => {
      // Hand calculation:
      // ΣF_y = 0 => R_fixed - 15 = 0 => R_fixed = 15.0 kN (+15000 N, upward)
      // ΣM_fixed = 0: Downward load creates clockwise moment -15 * 4 = -60 kN·m.
      // Fixed reaction moment must balance it: M_fixed - 60 = 0 => M_fixed = +60.0 kN·m (CCW, +60000 N·m)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 4,
        fixedEnd: 'left',
        pointLoads: [{ id: 'p1', position: 4, magnitude: 15000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.Rfixed.vertical).toBeCloseTo(15000, 4);
      expect(result.reactions.Rfixed.moment).toBeCloseTo(60000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 8: Cantilever Fixed at Left with Full-span UDL (w = 5 kN/m, L = 4 m)', () => {
      // Hand calculation:
      // Total load W = 5 * 4 = 20 kN.
      // R_fixed = 20.0 kN (+20000 N)
      // M_fixed = W * (L/2) = 20 * 2 = +40.0 kN·m (CCW, +40000 N·m)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 4,
        fixedEnd: 'left',
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 4, magnitude: 5000 }],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.Rfixed.vertical).toBeCloseTo(20000, 4);
      expect(result.reactions.Rfixed.moment).toBeCloseTo(40000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 9: Cantilever Fixed at Left with End CCW Moment (M = +25 kN·m at x = 4 m)', () => {
      // Hand calculation:
      // Vertical forces: None => R_fixed = 0 N.
      // Moment equilibrium: M_fixed + M_applied = 0 => M_fixed + 25 = 0 => M_fixed = -25.0 kN·m (CW, -25000 N·m)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 4,
        fixedEnd: 'left',
        pointLoads: [],
        uniformLoads: [],
        pointMoments: [{ id: 'm1', position: 4, magnitude: 25000 }]
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.Rfixed.vertical).toBeCloseTo(0, 6);
      expect(result.reactions.Rfixed.moment).toBeCloseTo(-25000, 4);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });

    it('Case 10: Cantilever Fixed at Right (x=4 m, free at x=0) with Tip Load (P = 10 kN at x = 0)', () => {
      // Hand calculation:
      // Fixed support at x = 4 m.
      // ΣF_y = 0 => R_fixed = 10.0 kN
      // Moment about fixed support at x = 4:
      // Downward load at x = 0 is 4 m to the left of support.
      // Moment of load about x=4: -10 kN * (-4 m) = +40 kN·m (counterclockwise).
      // Fixed reaction moment: M_fixed + 40 = 0 => M_fixed = -40.0 kN·m (CW, -40000 N·m)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 4,
        fixedEnd: 'right',
        pointLoads: [{ id: 'p1', position: 0, magnitude: 10000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.reactions.Rfixed.vertical).toBeCloseTo(10000, 4);
      expect(result.reactions.Rfixed.moment).toBeCloseTo(-40000, 4);
      expect(result.equilibrium.sumFy).toBeCloseTo(0, 6);
      expect(result.equilibrium.sumM).toBeCloseTo(0, 6);
    });
  });

  describe('Input Validation & Error Handling', () => {
    it('rejects non-positive span lengths', () => {
      const beam: BeamModel = {
        type: 'simply-supported',
        span: -5,
        supportA: { position: 0 },
        supportB: { position: -5 },
        pointLoads: [],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toMatch(/span.*positive/i);
    });

    it('rejects loads positioned outside beam span', () => {
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 5,
        supportA: { position: 0 },
        supportB: { position: 5 },
        pointLoads: [{ id: 'p1', position: 7, magnitude: 1000 }], // 7 > 5
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveBeamReactions(beam);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toMatch(/position.*span/i);
    });

    it('rejects reversed supports and non-finite numeric inputs', () => {
      const reversed: BeamModel = {
        type: 'simply-supported', span: 5,
        supportA: { position: 4 }, supportB: { position: 1 },
        pointLoads: [], uniformLoads: [], pointMoments: []
      };
      expect(solveBeamReactions(reversed).isValid).toBe(false);

      const infiniteLoad: BeamModel = {
        type: 'simply-supported', span: 5,
        pointLoads: [{ id: 'p1', position: 2, magnitude: Number.POSITIVE_INFINITY }],
        uniformLoads: [], pointMoments: []
      };
      expect(solveBeamReactions(infiniteLoad).isValid).toBe(false);

      const infiniteSpan: BeamModel = {
        type: 'cantilever', span: Number.POSITIVE_INFINITY, fixedEnd: 'left',
        pointLoads: [], uniformLoads: [], pointMoments: []
      };
      expect(solveBeamReactions(infiniteSpan).isValid).toBe(false);
    });
  });
});
