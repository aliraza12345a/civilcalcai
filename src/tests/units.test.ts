import { describe, it, expect } from 'vitest';
import { 
  convertUnit, 
  toSI, 
  fromSI, 
  formatQuantity 
} from '../engine/units';

describe('Unit Conversion System (Milestone 2)', () => {
  describe('Length conversions with exact standard values', () => {
    it('converts inches to meters (1 in = 0.0254 m exactly)', () => {
      // Hand-calculated exact definition
      expect(convertUnit(1, 'in', 'm')).toBeCloseTo(0.0254, 9);
      expect(convertUnit(12, 'in', 'ft')).toBeCloseTo(1.0, 9);
    });

    it('converts feet to meters (1 ft = 0.3048 m exactly)', () => {
      expect(convertUnit(1, 'ft', 'm')).toBeCloseTo(0.3048, 9);
      expect(convertUnit(10, 'ft', 'm')).toBeCloseTo(3.048, 9);
    });

    it('converts metric length subdivisions (mm, cm, m)', () => {
      expect(convertUnit(1000, 'mm', 'm')).toBeCloseTo(1.0, 9);
      expect(convertUnit(100, 'cm', 'm')).toBeCloseTo(1.0, 9);
      expect(convertUnit(5.5, 'm', 'mm')).toBeCloseTo(5500, 9);
    });
  });

  describe('Force conversions with standard engineering values', () => {
    it('converts kilonewtons to newtons (1 kN = 1000 N)', () => {
      expect(convertUnit(1, 'kN', 'N')).toBe(1000);
      expect(convertUnit(25.5, 'kN', 'N')).toBe(25500);
    });

    it('converts US customary force (lbf, kip to N)', () => {
      // 1 lbf = 4.4482216152605 N
      expect(convertUnit(1, 'lbf', 'N')).toBeCloseTo(4.4482216, 4);
      // 1 kip = 1000 lbf = 4448.2216152605 N
      expect(convertUnit(1, 'kip', 'N')).toBeCloseTo(4448.2216, 4);
      expect(convertUnit(10, 'kip', 'kN')).toBeCloseTo(44.482216, 4);
    });
  });

  describe('Distributed Load conversions (w)', () => {
    it('converts kN/m to N/m and lb/ft to N/m', () => {
      // 1 kN/m = 1000 N/m
      expect(convertUnit(1, 'kN/m', 'N/m')).toBe(1000);
      // 1 lb/ft = 4.4482216152605 N / 0.3048 m = 14.5939029 N/m
      expect(convertUnit(1, 'lb/ft', 'N/m')).toBeCloseTo(14.5939, 4);
      // 1 kip/ft = 1000 lb/ft = 14.5939029 kN/m
      expect(convertUnit(1, 'kip/ft', 'kN/m')).toBeCloseTo(14.5939, 4);
    });
  });

  describe('Bending Moment conversions (M)', () => {
    it('converts kN·m, N·m, kip·ft, and lb·ft', () => {
      expect(convertUnit(1, 'kN*m', 'N*m')).toBe(1000);
      // 1 lb*ft = 1 lbf * 1 ft = 4.4482216152605 * 0.3048 = 1.3558179483 N*m
      expect(convertUnit(1, 'lb*ft', 'N*m')).toBeCloseTo(1.355818, 5);
      // 1 kip*ft = 1000 lb*ft = 1.3558179483 kN*m
      expect(convertUnit(1, 'kip*ft', 'kN*m')).toBeCloseTo(1.355818, 5);
    });
  });

  describe('Stress and Pressure conversions', () => {
    it('converts Pa, kPa, MPa, GPa, psi, ksi', () => {
      expect(convertUnit(1, 'MPa', 'Pa')).toBe(1e6);
      expect(convertUnit(1, 'GPa', 'MPa')).toBe(1000);
      // 1 psi = 6894.757293168 Pa
      expect(convertUnit(1, 'psi', 'Pa')).toBeCloseTo(6894.757, 2);
      // 1 ksi = 1000 psi = 6.894757 MPa
      expect(convertUnit(1, 'ksi', 'MPa')).toBeCloseTo(6.894757, 4);
    });
  });

  describe('Round-trip and toSI / fromSI helpers', () => {
    it('ensures round-trip precision is preserved within 1e-9 relative tolerance', () => {
      const originalValue = 18.75; // e.g. 18.75 kip
      const siValue = toSI(originalValue, 'kip');
      const roundTrip = fromSI(siValue, 'kip');
      expect(roundTrip).toBeCloseTo(originalValue, 9);
    });

    it('formats numbers with engineering precision and unit labels', () => {
      expect(formatQuantity(12.34567, 'kN', 2)).toBe('12.35 kN');
      expect(formatQuantity(0.0001, 'm', 3)).toBe('0.000 m');
    });
  });
});
