import { describe, it, expect } from 'vitest';
import { 
  solveStandardDeflection, 
  solveGeneralDeflection,
  DeflectionParameters
} from '../engine/beams/deflection';
import { BeamModel } from '../engine/beams/types';

/** Small independent Euler-Bernoulli FE model used only to cross-check the solver. */
function femNodalDeflections(EI: number, span: number, elements: number, loads: Array<{ node: number; force: number }>, support: 'simple' | 'cantilever'): number[] {
  const nodeCount = elements + 1;
  const dofCount = nodeCount * 2;
  const stiffness = Array.from({ length: dofCount }, () => Array(dofCount).fill(0));
  const force = Array(dofCount).fill(0);
  const elementLength = span / elements;
  const kFactor = EI / elementLength ** 3;
  const local = [
    [12, 6 * elementLength, -12, 6 * elementLength],
    [6 * elementLength, 4 * elementLength ** 2, -6 * elementLength, 2 * elementLength ** 2],
    [-12, -6 * elementLength, 12, -6 * elementLength],
    [6 * elementLength, 2 * elementLength ** 2, -6 * elementLength, 4 * elementLength ** 2],
  ];

  for (let element = 0; element < elements; element++) {
    const dofs = [2 * element, 2 * element + 1, 2 * (element + 1), 2 * (element + 1) + 1];
    dofs.forEach((row, i) => dofs.forEach((column, j) => { stiffness[row][column] += kFactor * local[i][j]; }));
  }
  loads.forEach(load => { force[2 * load.node] += load.force; });

  const restrained = support === 'cantilever' ? [0, 1] : [0, 2 * (nodeCount - 1)];
  const free = Array.from({ length: dofCount }, (_, i) => i).filter(i => !restrained.includes(i));
  const matrix = free.map(row => [...free.map(column => stiffness[row][column]), force[row]]);

  for (let pivot = 0; pivot < free.length; pivot++) {
    const divisor = matrix[pivot][pivot];
    for (let column = pivot; column <= free.length; column++) matrix[pivot][column] /= divisor;
    for (let row = 0; row < free.length; row++) {
      if (row === pivot) continue;
      const factor = matrix[row][pivot];
      for (let column = pivot; column <= free.length; column++) matrix[row][column] -= factor * matrix[pivot][column];
    }
  }

  const displacement = Array(dofCount).fill(0);
  free.forEach((dof, i) => { displacement[dof] = matrix[i][free.length]; });
  return Array.from({ length: nodeCount }, (_, node) => displacement[2 * node]);
}

describe('Beam Slope and Deflection Engine (Milestone 5)', () => {
  // Common material properties: E = 200 GPa, I = 1e-4 m^4 => EI = 20,000 kN*m^2 = 2e7 N*m^2
  const params: DeflectionParameters = {
    E: 200e9, // 200 GPa in Pa
    I: 1e-4   // 1e-4 m^4
  };

  describe('Standard Case Closed-Form Formulas', () => {
    it('Case 1: SS, L = 4 m, central P = 20 kN -> max deflection 1.333 mm, end slope 0.001 rad', () => {
      // Standard formula: delta_max = P*L^3 / (48*E*I), theta_end = P*L^2 / (16*E*I)
      // Expected hand-calculated values:
      // delta_max = 20000 * 64 / (48 * 2e7) = 1.333333e-3 m = 1.333 mm
      // theta_end = 20000 * 16 / (16 * 2e7) = 0.001 rad
      const result = solveStandardDeflection('ss-central-point', {
        L: 4,
        P: 20000,
        ...params
      });

      expect(result.maxDeflectionMagnitude).toBeCloseTo(0.001333333, 6);
      expect(result.maxDeflectionMagnitude * 1000).toBeCloseTo(1.333, 2);
      expect(result.maxSlopeMagnitude).toBeCloseTo(0.001, 6);
    });

    it('Case 2: SS, L = 4 m, full-span UDL w = 10 kN/m -> max deflection 1.667 mm, end slope 0.001333 rad', () => {
      // Standard formula: delta_max = 5*w*L^4 / (384*E*I), theta_end = w*L^3 / (24*E*I)
      // Expected hand-calculated values:
      // delta_max = 5 * 10000 * 256 / (384 * 2e7) = 1.666667e-3 m = 1.667 mm
      // theta_end = 10000 * 64 / (24 * 2e7) = 0.001333333 rad
      const result = solveStandardDeflection('ss-full-udl', {
        L: 4,
        w: 10000,
        ...params
      });

      expect(result.maxDeflectionMagnitude).toBeCloseTo(0.001666667, 6);
      expect(result.maxDeflectionMagnitude * 1000).toBeCloseTo(1.667, 2);
      expect(result.maxSlopeMagnitude).toBeCloseTo(0.001333333, 6);
    });

    it('Case 3: Cantilever, L = 3 m, end point load P = 10 kN -> tip deflection 4.5 mm, tip slope 0.00225 rad', () => {
      // Standard formula: delta_tip = P*L^3 / (3*E*I), theta_tip = P*L^2 / (2*E*I)
      // Expected hand-calculated values:
      // delta_tip = 10000 * 27 / (3 * 2e7) = 0.0045 m = 4.5 mm
      // theta_tip = 10000 * 9 / (2 * 2e7) = 0.00225 rad
      const result = solveStandardDeflection('cantilever-end-point', {
        L: 3,
        P: 10000,
        ...params
      });

      expect(result.maxDeflectionMagnitude).toBeCloseTo(0.0045, 6);
      expect(result.maxDeflectionMagnitude * 1000).toBeCloseTo(4.5, 3);
      expect(result.maxSlopeMagnitude).toBeCloseTo(0.00225, 6);
    });

    it('Case 4: Cantilever, L = 3 m, full-span UDL w = 10 kN/m -> tip deflection 5.0625 mm, tip slope 0.00225 rad', () => {
      // Standard formula: delta_tip = w*L^4 / (8*E*I), theta_tip = w*L^3 / (6*E*I)
      // Expected hand-calculated values:
      // delta_tip = 10000 * 81 / (8 * 2e7) = 0.0050625 m = 5.0625 mm
      // theta_tip = 10000 * 27 / (6 * 2e7) = 0.00225 rad
      const result = solveStandardDeflection('cantilever-full-udl', {
        L: 3,
        w: 10000,
        ...params
      });

      expect(result.maxDeflectionMagnitude).toBeCloseTo(0.0050625, 7);
      expect(result.maxDeflectionMagnitude * 1000).toBeCloseTo(5.0625, 4);
      expect(result.maxSlopeMagnitude).toBeCloseTo(0.00225, 6);
    });

    it('Case 5: Cantilever, L = 3 m, end moment M = 10 kN·m -> tip deflection 2.25 mm, tip slope 0.0015 rad', () => {
      // Standard formula: delta_tip = M*L^2 / (2*E*I), theta_tip = M*L / (E*I)
      // Expected hand-calculated values:
      // delta_tip = 10000 * 9 / (2 * 2e7) = 0.00225 m = 2.25 mm
      // theta_tip = 10000 * 3 / (2e7) = 0.0015 rad
      const result = solveStandardDeflection('cantilever-end-moment', {
        L: 3,
        M: 10000,
        ...params
      });

      expect(result.maxDeflectionMagnitude).toBeCloseTo(0.00225, 6);
      expect(result.maxDeflectionMagnitude * 1000).toBeCloseTo(2.25, 3);
      expect(result.maxSlopeMagnitude).toBeCloseTo(0.0015, 6);
    });
  });

  describe('General Exact Integration (Macaulay Method) vs Standard Formulas', () => {
    it('cross-checks nodal deflections against an independent two-element beam FEM', () => {
      const EI = params.E * params.I;
      const span = 4;
      const load = 20000;
      const ssBeam: BeamModel = {
        type: 'simply-supported', span,
        supportA: { position: 0 }, supportB: { position: span },
        pointLoads: [{ id: 'p1', position: span / 2, magnitude: load }],
        uniformLoads: [], pointMoments: [],
      };
      const cantileverBeam: BeamModel = {
        type: 'cantilever', span, fixedEnd: 'left',
        pointLoads: [{ id: 'p1', position: span, magnitude: load }],
        uniformLoads: [], pointMoments: [],
      };

      const ssFem = femNodalDeflections(EI, span, 2, [{ node: 1, force: -load }], 'simple');
      const cantileverFem = femNodalDeflections(EI, span, 2, [{ node: 2, force: -load }], 'cantilever');
      expect(solveGeneralDeflection(ssBeam, params).deflectionAt(span / 2)).toBeCloseTo(ssFem[1], 11);
      expect(solveGeneralDeflection(cantileverBeam, params).deflectionAt(span)).toBeCloseTo(cantileverFem[2], 11);
    });

    it('reproduces SS central point load benchmark exactly (L = 4 m, P = 20 kN)', () => {
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 4,
        supportA: { position: 0 },
        supportB: { position: 4 },
        pointLoads: [{ id: 'p1', position: 2, magnitude: 20000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveGeneralDeflection(beam, params);
      expect(result.isValid).toBe(true);

      // Deflection at midspan (x = 2 m): downward is negative => -1.333333 mm
      const yMid = result.deflectionAt(2);
      expect(yMid).toBeCloseTo(-0.001333333, 6);
      expect(Math.abs(yMid) * 1000).toBeCloseTo(1.333, 2);

      // Max deflection location
      expect(result.maxDeflection.location).toBeCloseTo(2.0, 3);
      expect(result.maxDeflection.value).toBeCloseTo(-0.001333333, 6);

      // Slope at end x = 0
      const theta0 = result.slopeAt(0);
      expect(Math.abs(theta0)).toBeCloseTo(0.001, 6);

      // Boundary condition checks: deflection is zero at supports
      expect(result.deflectionAt(0)).toBeCloseTo(0, 8);
      expect(result.deflectionAt(4)).toBeCloseTo(0, 8);
    });

    it('refines an off-center point-load peak to the stationary point of the integrated curve', () => {
      const beam: BeamModel = {
        type: 'simply-supported', span: 4,
        supportA: { position: 0 }, supportB: { position: 4 },
        pointLoads: [{ id: 'p1', position: 1, magnitude: 20000 }],
        uniformLoads: [], pointMoments: [],
      };
      const result = solveGeneralDeflection(beam, params);
      const expectedLocation = 4 - Math.sqrt(5);
      const expectedValue = (
        2500 * expectedLocation ** 3
        - (20000 / 6) * (expectedLocation - 1) ** 3
        - 17500 * expectedLocation
      ) / (params.E * params.I);

      expect(result.maxDeflection.location).toBeCloseTo(expectedLocation, 10);
      expect(result.maxDeflection.value).toBeCloseTo(expectedValue, 10);
    });

    it('handles a right-fixed cantilever peak at its free end', () => {
      const beam: BeamModel = {
        type: 'cantilever', span: 3, fixedEnd: 'right',
        pointLoads: [{ id: 'p1', position: 0, magnitude: 10000 }],
        uniformLoads: [], pointMoments: [],
      };
      const result = solveGeneralDeflection(beam, params);
      expect(result.isValid).toBe(true);
      expect(result.maxDeflection.location).toBeCloseTo(0, 10);
      expect(result.maxDeflection.value).toBeCloseTo(-0.0045, 8);
      expect(result.deflectionAt(3)).toBeCloseTo(0, 10);
      expect(result.slopeAt(3)).toBeCloseTo(0, 10);
    });

    it('reproduces SS full UDL benchmark exactly (L = 4 m, w = 10 kN/m)', () => {
      const beam: BeamModel = {
        type: 'simply-supported',
        span: 4,
        supportA: { position: 0 },
        supportB: { position: 4 },
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 4, magnitude: 10000 }],
        pointMoments: []
      };

      const result = solveGeneralDeflection(beam, params);
      const yMid = result.deflectionAt(2);
      expect(yMid).toBeCloseTo(-0.001666667, 6);
      expect(Math.abs(yMid) * 1000).toBeCloseTo(1.667, 2);

      expect(Math.abs(result.slopeAt(0))).toBeCloseTo(0.001333333, 6);

      // Boundary conditions: zero at pin and roller
      expect(result.deflectionAt(0)).toBeCloseTo(0, 8);
      expect(result.deflectionAt(4)).toBeCloseTo(0, 8);
    });

    it('reproduces Cantilever end point load benchmark exactly (L = 3 m, P = 10 kN)', () => {
      const beam: BeamModel = {
        type: 'cantilever',
        span: 3,
        fixedEnd: 'left',
        pointLoads: [{ id: 'p1', position: 3, magnitude: 10000 }],
        uniformLoads: [],
        pointMoments: []
      };

      const result = solveGeneralDeflection(beam, params);
      
      // Tip deflection at x = 3 m: downward is negative => -4.5 mm
      const yTip = result.deflectionAt(3);
      expect(yTip).toBeCloseTo(-0.0045, 6);
      expect(Math.abs(yTip) * 1000).toBeCloseTo(4.5, 3);

      // Tip slope at x = 3 m
      expect(Math.abs(result.slopeAt(3))).toBeCloseTo(0.00225, 6);

      // Boundary conditions at fixed support (x = 0): y(0) = 0 and theta(0) = 0
      expect(result.deflectionAt(0)).toBeCloseTo(0, 9);
      expect(result.slopeAt(0)).toBeCloseTo(0, 9);
    });

    it('reproduces Cantilever full UDL benchmark exactly (L = 3 m, w = 10 kN/m)', () => {
      const beam: BeamModel = {
        type: 'cantilever',
        span: 3,
        fixedEnd: 'left',
        pointLoads: [],
        uniformLoads: [{ id: 'u1', start: 0, end: 3, magnitude: 10000 }],
        pointMoments: []
      };

      const result = solveGeneralDeflection(beam, params);
      const yTip = result.deflectionAt(3);
      expect(yTip).toBeCloseTo(-0.0050625, 7);
      expect(Math.abs(yTip) * 1000).toBeCloseTo(5.0625, 4);

      expect(Math.abs(result.slopeAt(3))).toBeCloseTo(0.00225, 6);

      // Boundary conditions at fixed end
      expect(result.deflectionAt(0)).toBeCloseTo(0, 9);
      expect(result.slopeAt(0)).toBeCloseTo(0, 9);
    });

    it('reproduces Cantilever end moment benchmark exactly (L = 3 m, M = 10 kN·m clockwise / causing downward tip)', () => {
      // Note: A clockwise moment at the free tip of a cantilever fixed at left causes negative curvature
      // M_applied = -10,000 N*m (Clockwise)
      const beam: BeamModel = {
        type: 'cantilever',
        span: 3,
        fixedEnd: 'left',
        pointLoads: [],
        uniformLoads: [],
        pointMoments: [{ id: 'm1', position: 3, magnitude: -10000 }] // Clockwise
      };

      const result = solveGeneralDeflection(beam, params);
      const yTip = result.deflectionAt(3);
      expect(yTip).toBeCloseTo(-0.00225, 6);
      expect(Math.abs(yTip) * 1000).toBeCloseTo(2.25, 3);
      expect(Math.abs(result.slopeAt(3))).toBeCloseTo(0.0015, 6);

      expect(result.deflectionAt(0)).toBeCloseTo(0, 9);
      expect(result.slopeAt(0)).toBeCloseTo(0, 9);
    });

    it('verifies Superposition principle for combined loading', () => {
      // Beam with BOTH point load (P=20 kN) AND UDL (w=10 kN/m) on L = 4 m
      // By superposition:
      // delta_mid = delta_point + delta_udl = -1.333333 mm + (-1.666667 mm) = -3.000000 mm
      // theta_end = theta_point + theta_udl = 0.001 + 0.001333333 = 0.002333333 rad
      const combinedBeam: BeamModel = {
        type: 'simply-supported',
        span: 4,
        supportA: { position: 0 },
        supportB: { position: 4 },
        pointLoads: [{ id: 'p1', position: 2, magnitude: 20000 }],
        uniformLoads: [{ id: 'u1', start: 0, end: 4, magnitude: 10000 }],
        pointMoments: []
      };

      const result = solveGeneralDeflection(combinedBeam, params);
      const yMid = result.deflectionAt(2);
      expect(yMid).toBeCloseTo(-0.003, 6); // exactly -3.0 mm
      expect(Math.abs(yMid) * 1000).toBeCloseTo(3.0, 3);
      expect(Math.abs(result.slopeAt(0))).toBeCloseTo(0.002333333, 6);

      // Boundary conditions at supports
      expect(result.deflectionAt(0)).toBeCloseTo(0, 8);
      expect(result.deflectionAt(4)).toBeCloseTo(0, 8);
    });
  });
});
