/**
 * CivilCalc AI - Beam Engine Types
 * Pure TypeScript declarations (No UI dependencies)
 */

export type BeamType = 'simply-supported' | 'cantilever';

export interface PointLoad {
  id: string;
  position: number; // in meters (from left x = 0)
  magnitude: number; // in Newtons (downward is positive magnitude)
  label?: string;
}

export interface UniformLoad {
  id: string;
  start: number; // in meters
  end: number; // in meters
  magnitude: number; // in N/m (downward is positive magnitude)
  label?: string;
}

export interface PointMoment {
  id: string;
  position: number; // in meters
  magnitude: number; // in N*m (Counterclockwise is POSITIVE, Clockwise is NEGATIVE)
  label?: string;
}

export interface SupportLocation {
  position: number; // in meters
}

export interface SimplySupportedBeamModel {
  type: 'simply-supported';
  span: number; // in meters
  supportA?: SupportLocation; // Default x = 0
  supportB?: SupportLocation; // Default x = span
  pointLoads: PointLoad[];
  uniformLoads: UniformLoad[];
  pointMoments: PointMoment[];
}

export interface CantileverBeamModel {
  type: 'cantilever';
  span: number; // in meters
  fixedEnd: 'left' | 'right';
  pointLoads: PointLoad[];
  uniformLoads: UniformLoad[];
  pointMoments: PointMoment[];
}

export type BeamModel = SimplySupportedBeamModel | CantileverBeamModel;

export interface WorkedStep {
  title: string;
  equation: string;
  substitution: string;
  result: string;
  explanation: string;
}

export interface EquilibriumCheck {
  sumFy: number; // residual in N
  sumM: number; // residual in N*m
  isEquilibrium: boolean;
  tolerance: number;
}

export interface BeamReactionsResult {
  isValid: boolean;
  errorMessage?: string;
  beamType: BeamType;
  span: number;
  reactions: {
    RA: { vertical: number };
    RB: { vertical: number };
    Rfixed: { vertical: number; moment: number };
  };
  totalDownwardForce: number; // in N
  equilibrium: EquilibriumCheck;
  steps: WorkedStep[];
}
