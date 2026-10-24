import { describe, it, expect } from 'vitest';
import { 
  calculateSectionProperties,
  RectangleSection,
  CircleSection,
  TSection,
  HollowRectangleSection,
  HollowCircleSection,
  ISection,
  CompositeSection
} from '../engine/sections';

describe('Cross-Section Properties Engine (Milestone 6)', () => {
  describe('Benchmark Test 1: Solid Rectangle (200 mm wide x 400 mm deep)', () => {
    // b = 200 mm, h = 400 mm
    // Expected hand calculations:
    // A = b * h = 80,000 mm^2
    // Ix = b * h^3 / 12 = 200 * (400)^3 / 12 = 1.066667e9 mm^4 (1.0667e9 mm^4)
    // Iy = h * b^3 / 12 = 400 * (200)^3 / 12 = 2.666667e8 mm^4
    // Sx = b * h^2 / 6 = 200 * 160000 / 6 = 5.333333e6 mm^3 (5.333e6 mm^3)
    // rx = sqrt(Ix / A) = 400 / sqrt(12) = 115.47005 mm (115.47 mm)
    // ry = sqrt(Iy / A) = 200 / sqrt(12) = 57.7350 mm
    it('matches textbook properties for solid rectangle', () => {
      const section: RectangleSection = {
        type: 'rectangle',
        width: 0.200, // 200 mm in meters
        height: 0.400 // 400 mm in meters
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);

      // Area in mm^2 (1 m^2 = 1e6 mm^2)
      const area_mm2 = res.area * 1e6;
      expect(area_mm2).toBeCloseTo(80000, 1);

      // Ix in mm^4 (1 m^4 = 1e12 mm^4)
      const Ix_mm4 = res.Ix * 1e12;
      expect(Ix_mm4).toBeCloseTo(1.066667e9, -4);
      expect(Ix_mm4 / 1e9).toBeCloseTo(1.0667, 3);

      // Sx in mm^3 (1 m^3 = 1e9 mm^3)
      const Sx_mm3 = res.Sx.top * 1e9;
      expect(Sx_mm3).toBeCloseTo(5.333333e6, -2);
      expect(Sx_mm3 / 1e6).toBeCloseTo(5.333, 2);

      // rx in mm (1 m = 1e3 mm)
      const rx_mm = res.rx * 1e3;
      expect(rx_mm).toBeCloseTo(115.47, 1);

      // Centroid
      expect(res.centroid.y * 1e3).toBeCloseTo(200, 1);
      expect(res.centroid.x * 1e3).toBeCloseTo(100, 1);
    });
  });

  describe('Benchmark Test 2: Solid Circle (Diameter 300 mm)', () => {
    // d = 300 mm (r = 150 mm)
    // Expected hand calculations:
    // A = pi * d^2 / 4 = 70,685.83 mm^2 (70,686 mm^2)
    // Ix = Iy = pi * d^4 / 64 = 3.976078e8 mm^4 (3.976e8 mm^4)
    // Sx = Sy = pi * d^3 / 32 = 2.650719e6 mm^3
    // rx = ry = d / 4 = 75.0 mm
    it('matches textbook properties for solid circle', () => {
      const section: CircleSection = {
        type: 'circle',
        diameter: 0.300 // 300 mm
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);

      const area_mm2 = res.area * 1e6;
      expect(area_mm2).toBeCloseTo(70685.83, 1);
      expect(Math.round(area_mm2)).toBe(70686);

      const Ix_mm4 = res.Ix * 1e12;
      expect(Ix_mm4 / 1e8).toBeCloseTo(3.976, 2);

      const rx_mm = res.rx * 1e3;
      expect(rx_mm).toBeCloseTo(75.0, 2);
    });
  });

  describe('Benchmark Test 3: T-section (300 x 50 mm flange on 50 x 250 mm web)', () => {
    // Web: 50 mm wide x 250 mm deep (from y=0 to y=250 mm)
    // Flange: 300 mm wide x 50 mm deep (from y=250 to y=300 mm)
    // Total height = 300 mm
    // Hand calculation:
    // A_w = 12500 mm^2, y_w = 125 mm
    // A_f = 15000 mm^2, y_f = 275 mm
    // Total A = 27,500 mm^2
    // y_bar = (12500*125 + 15000*275)/27500 = 5687500 / 27500 = 206.818 mm (206.8 mm from bottom)
    // Ix about centroid: 2.21638e8 mm^4 (2.216e8 mm^4)
    // y_top = 300 - 206.818 = 93.182 mm
    // y_bottom = 206.818 mm
    // Sx_top = Ix / y_top = 2.378e6 mm^3
    // Sx_bottom = Ix / y_bottom = 1.072e6 mm^3
    it('matches textbook parallel axis theorem values for T-section', () => {
      const section: TSection = {
        type: 't-section',
        flangeWidth: 0.300, // 300 mm
        flangeThickness: 0.050, // 50 mm
        webHeight: 0.250, // 250 mm
        webThickness: 0.050 // 50 mm
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);

      const area_mm2 = res.area * 1e6;
      expect(area_mm2).toBeCloseTo(27500, 1);

      // Centroid from bottom
      const y_bar_mm = res.centroid.y * 1e3;
      expect(y_bar_mm).toBeCloseTo(206.818, 2);
      expect(y_bar_mm).toBeCloseTo(206.8, 1);

      // Ix about centroidal axis
      const Ix_mm4 = res.Ix * 1e12;
      expect(Ix_mm4 / 1e8).toBeCloseTo(2.216, 2);

      // Top and bottom section modulus differ
      expect(res.Sx.top).not.toBeCloseTo(res.Sx.bottom, 6);
      expect(res.Sx.top * 1e9).toBeCloseTo(2.378e6, -4);
      expect(res.Sx.bottom * 1e9).toBeCloseTo(1.072e6, -4);

      // Step-by-step working verification
      expect(res.steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Benchmark Test 4: Hollow Sections (Outer minus Inner)', () => {
    it('calculates hollow rectangle (outer 200x400 mm, thickness 20 mm)', () => {
      // Outer: B = 200, H = 400 => Ix_out = 200 * 400^3 / 12 = 1.066667e9 mm^4
      // Inner: b = 200 - 40 = 160, h = 400 - 40 = 360 => Ix_in = 160 * 360^3 / 12 = 6.2208e8 mm^4
      // Net A = (200*400) - (160*360) = 80000 - 57600 = 22400 mm^2
      // Net Ix = 1.066667e9 - 6.2208e8 = 4.445867e8 mm^4
      const section: HollowRectangleSection = {
        type: 'hollow-rectangle',
        outerWidth: 0.200,
        outerHeight: 0.400,
        innerWidth: 0.160,
        innerHeight: 0.360
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);
      expect(res.area * 1e6).toBeCloseTo(22400, 1);
      expect((res.Ix * 1e12) / 1e8).toBeCloseTo(4.4459, 2);
    });

    it('calculates hollow circular pipe (OD = 200 mm, ID = 160 mm)', () => {
      // Outer: D = 200 => A_out = pi * 200^2 / 4 = 31415.93 mm^2
      // Inner: d = 160 => A_in = pi * 160^2 / 4 = 20106.19 mm^2
      // Net A = 11309.73 mm^2
      // Ix = pi * (200^4 - 160^4) / 64 = pi * (1.6e9 - 6.5536e8) / 64 = 4.637e7 mm^4
      const section: HollowCircleSection = {
        type: 'hollow-circle',
        outerDiameter: 0.200,
        innerDiameter: 0.160
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);
      expect(res.area * 1e6).toBeCloseTo(11309.73, 1);
      expect((res.Ix * 1e12) / 1e7).toBeCloseTo(4.637, 2);
    });
  });

  describe('Benchmark Test 5: Standard I-Section', () => {
    it('calculates symmetrical I-beam properties', () => {
      // Overall height H = 300 mm, flange width B = 150 mm, flange thickness tf = 15 mm, web tw = 10 mm
      // Web height = 300 - 30 = 270 mm
      // Area = 2 * (150 * 15) + (270 * 10) = 4500 + 2700 = 7200 mm^2
      // Centroid at mid-height y = 150 mm
      // Ix = [150 * 300^3 - (150 - 10) * 270^3] / 12 = [4.05e9 - 140 * 19683000] / 12
      //    = [4.05e9 - 2.75562e9] / 12 = 1.29438e9 / 12 = 1.07865e8 mm^4
      const section: ISection = {
        type: 'i-section',
        totalHeight: 0.300,
        flangeWidth: 0.150,
        flangeThickness: 0.015,
        webThickness: 0.010
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);
      expect(res.area * 1e6).toBeCloseTo(7200, 1);
      expect(res.centroid.y * 1e3).toBeCloseTo(150, 1);
      expect((res.Ix * 1e12) / 1e8).toBeCloseTo(1.07865, 3);
      expect(res.Sx.top).toBeCloseTo(res.Sx.bottom, 6); // Symmetrical top and bottom
    });
  });

  describe('Benchmark Test 6: Arbitrary Composite Section of Rectangles', () => {
    it('applies parallel axis theorem across arbitrary rectangular pieces', () => {
      // Two rectangular pieces:
      // Piece 1: bottom plate 200 x 20 mm (centroid y = 10 mm, A = 4000 mm^2)
      // Piece 2: vertical plate 20 x 180 mm (centroid y = 20 + 90 = 110 mm, A = 3600 mm^2)
      // Total A = 7600 mm^2
      // y_bar = (4000*10 + 3600*110)/7600 = (40000 + 396000)/7600 = 436000 / 7600 = 57.3684 mm
      const section: CompositeSection = {
        type: 'composite',
        rectangles: [
          { id: 'r1', x: 0, y: 0, width: 0.200, height: 0.020 },
          { id: 'r2', x: 0.090, y: 0.020, width: 0.020, height: 0.180 }
        ]
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(true);
      expect(res.area * 1e6).toBeCloseTo(7600, 1);
      expect(res.centroid.y * 1e3).toBeCloseTo(57.3684, 2);
    });
  });

  describe('Input Validation & Error Handling', () => {
    it('rejects hollow rectangle where inner dimension exceeds outer dimension', () => {
      const section: HollowRectangleSection = {
        type: 'hollow-rectangle',
        outerWidth: 0.200,
        outerHeight: 0.300,
        innerWidth: 0.250, // 250 > 200!
        innerHeight: 0.200
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/inner.*outer/i);
    });

    it('rejects zero or negative dimensions', () => {
      const section: RectangleSection = {
        type: 'rectangle',
        width: -0.200,
        height: 0.400
      };

      const res = calculateSectionProperties(section);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/positive/i);
    });
  });
});
