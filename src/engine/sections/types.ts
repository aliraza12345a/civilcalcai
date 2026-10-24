/**
 * CivilCalc AI - Cross-Section Engine Types
 * Pure TypeScript (No UI dependencies)
 * All internal dimensions and properties are in base SI units:
 * - Dimensions: meters (m)
 * - Area: m²
 * - Second Moment of Area (I): m⁴
 * - Section Modulus (S): m³
 * - Radius of Gyration (r): m
 */

export interface RectangleSection {
  type: 'rectangle';
  width: number;  // b (m)
  height: number; // h (m)
}

export interface CircleSection {
  type: 'circle';
  diameter: number; // d (m)
}

export interface HollowRectangleSection {
  type: 'hollow-rectangle';
  outerWidth: number;  // B (m)
  outerHeight: number; // H (m)
  innerWidth: number;  // b (m)
  innerHeight: number; // h (m)
}

export interface HollowCircleSection {
  type: 'hollow-circle';
  outerDiameter: number; // D (m)
  innerDiameter: number; // d (m)
}

export interface ISection {
  type: 'i-section';
  totalHeight: number;     // H (m)
  flangeWidth: number;     // B (m)
  flangeThickness: number; // tf (m)
  webThickness: number;    // tw (m)
}

export interface TSection {
  type: 't-section';
  flangeWidth: number;     // bf (m)
  flangeThickness: number; // tf (m)
  webHeight: number;       // hw (m) - height of web beneath flange
  webThickness: number;    // tw (m)
}

export interface CompositeRectanglePiece {
  id: string;
  x: number;      // origin x of bottom-left corner (m)
  y: number;      // origin y of bottom-left corner (m)
  width: number;  // (m)
  height: number; // (m)
}

export interface CompositeSection {
  type: 'composite';
  rectangles: CompositeRectanglePiece[];
}

export type SectionModel = 
  | RectangleSection 
  | CircleSection 
  | HollowRectangleSection 
  | HollowCircleSection 
  | ISection 
  | TSection 
  | CompositeSection;

export interface WorkedStepSection {
  title: string;
  equation: string;
  substitution: string;
  result: string;
  explanation: string;
}

export interface SectionResult {
  isValid: boolean;
  errorMessage?: string;
  sectionType: string;
  area: number; // m²
  centroid: {
    x: number;  // m from bottom-left origin
    y: number;  // m from bottom-left origin
  };
  Ix: number; // m⁴ about centroidal horizontal axis
  Iy: number; // m⁴ about centroidal vertical axis
  Sx: {
    top: number;    // m³
    bottom: number; // m³
  };
  Sy: {
    left: number;  // m³
    right: number; // m³
  };
  rx: number; // m radius of gyration sqrt(Ix/A)
  ry: number; // m radius of gyration sqrt(Iy/A)
  totalWidth: number;  // m
  totalHeight: number; // m
  steps: WorkedStepSection[];
}
