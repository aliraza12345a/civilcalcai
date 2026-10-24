/**
 * CivilCalc AI - Unit Conversion Engine
 * 
 * ARCHITECTURAL RULE:
 * 1. Pure TypeScript only (no UI/React imports).
 * 2. Internal engine works strictly in Base SI (m, N, N/m, N*m, Pa).
 * 3. Conversions happen only at input/output boundaries.
 */

export type UnitCategory = 'length' | 'force' | 'distributedLoad' | 'moment' | 'stress' | 'inertia';

export type LengthUnit = 'm' | 'mm' | 'cm' | 'in' | 'ft';
export type ForceUnit = 'N' | 'kN' | 'lbf' | 'kip';
export type DistributedLoadUnit = 'N/m' | 'kN/m' | 'lb/ft' | 'kip/ft';
export type MomentUnit = 'N*m' | 'kN*m' | 'lb*ft' | 'kip*ft' | 'lb*in' | 'kip*in';
export type StressUnit = 'Pa' | 'kPa' | 'MPa' | 'GPa' | 'psi' | 'ksi';
export type InertiaUnit = 'm^4' | 'mm^4' | 'cm^4' | 'in^4';

export type EngineeringUnit = LengthUnit | ForceUnit | DistributedLoadUnit | MomentUnit | StressUnit | InertiaUnit;

export interface UnitInfo {
  category: UnitCategory;
  name: string;
  symbol: string;
  /** Multiplier to convert 1 unit of this into base SI */
  toBaseSI: number;
  system: 'metric' | 'imperial';
}

export const UNIT_DEFINITIONS: Record<EngineeringUnit, UnitInfo> = {
  // Length (Base SI: meter)
  'm': { category: 'length', name: 'Meter', symbol: 'm', toBaseSI: 1, system: 'metric' },
  'mm': { category: 'length', name: 'Millimeter', symbol: 'mm', toBaseSI: 0.001, system: 'metric' },
  'cm': { category: 'length', name: 'Centimeter', symbol: 'cm', toBaseSI: 0.01, system: 'metric' },
  'in': { category: 'length', name: 'Inch', symbol: 'in', toBaseSI: 0.0254, system: 'imperial' },
  'ft': { category: 'length', name: 'Foot', symbol: 'ft', toBaseSI: 0.3048, system: 'imperial' },

  // Force (Base SI: Newton)
  'N': { category: 'force', name: 'Newton', symbol: 'N', toBaseSI: 1, system: 'metric' },
  'kN': { category: 'force', name: 'Kilonewton', symbol: 'kN', toBaseSI: 1000, system: 'metric' },
  'lbf': { category: 'force', name: 'Pound-force', symbol: 'lbf', toBaseSI: 4.4482216152605, system: 'imperial' },
  'kip': { category: 'force', name: 'Kip', symbol: 'kip', toBaseSI: 4448.2216152605, system: 'imperial' },

  // Distributed Load (Base SI: N/m)
  'N/m': { category: 'distributedLoad', name: 'Newton per meter', symbol: 'N/m', toBaseSI: 1, system: 'metric' },
  'kN/m': { category: 'distributedLoad', name: 'Kilonewton per meter', symbol: 'kN/m', toBaseSI: 1000, system: 'metric' },
  'lb/ft': { category: 'distributedLoad', name: 'Pound per foot', symbol: 'lb/ft', toBaseSI: 4.4482216152605 / 0.3048, system: 'imperial' },
  'kip/ft': { category: 'distributedLoad', name: 'Kip per foot', symbol: 'kip/ft', toBaseSI: 4448.2216152605 / 0.3048, system: 'imperial' },

  // Moment (Base SI: N*m)
  'N*m': { category: 'moment', name: 'Newton-meter', symbol: 'N·m', toBaseSI: 1, system: 'metric' },
  'kN*m': { category: 'moment', name: 'Kilonewton-meter', symbol: 'kN·m', toBaseSI: 1000, system: 'metric' },
  'lb*ft': { category: 'moment', name: 'Pound-foot', symbol: 'lb·ft', toBaseSI: 4.4482216152605 * 0.3048, system: 'imperial' },
  'kip*ft': { category: 'moment', name: 'Kip-foot', symbol: 'kip·ft', toBaseSI: 4448.2216152605 * 0.3048, system: 'imperial' },
  'lb*in': { category: 'moment', name: 'Pound-inch', symbol: 'lb·in', toBaseSI: 4.4482216152605 * 0.0254, system: 'imperial' },
  'kip*in': { category: 'moment', name: 'Kip-inch', symbol: 'kip·in', toBaseSI: 4448.2216152605 * 0.0254, system: 'imperial' },

  // Stress / Pressure (Base SI: Pascal)
  'Pa': { category: 'stress', name: 'Pascal', symbol: 'Pa', toBaseSI: 1, system: 'metric' },
  'kPa': { category: 'stress', name: 'Kilopascal', symbol: 'kPa', toBaseSI: 1000, system: 'metric' },
  'MPa': { category: 'stress', name: 'Megapascal', symbol: 'MPa', toBaseSI: 1e6, system: 'metric' },
  'GPa': { category: 'stress', name: 'Gigapascal', symbol: 'GPa', toBaseSI: 1e9, system: 'metric' },
  'psi': { category: 'stress', name: 'Pounds per square inch', symbol: 'psi', toBaseSI: 6894.757293168361, system: 'imperial' },
  'ksi': { category: 'stress', name: 'Kips per square inch', symbol: 'ksi', toBaseSI: 6894757.293168361, system: 'imperial' },

  // Second Moment of Area / Inertia (Base SI: m^4)
  'm^4': { category: 'inertia', name: 'Meter to the fourth', symbol: 'm⁴', toBaseSI: 1, system: 'metric' },
  'mm^4': { category: 'inertia', name: 'Millimeter to the fourth', symbol: 'mm⁴', toBaseSI: 1e-12, system: 'metric' },
  'cm^4': { category: 'inertia', name: 'Centimeter to the fourth', symbol: 'cm⁴', toBaseSI: 1e-8, system: 'metric' },
  'in^4': { category: 'inertia', name: 'Inch to the fourth', symbol: 'in⁴', toBaseSI: 4.162314256e-7, system: 'imperial' },
};

/**
 * Converts a quantity from its specified engineering unit into standard base SI.
 */
export function toSI(value: number, fromUnit: EngineeringUnit): number {
  const def = UNIT_DEFINITIONS[fromUnit];
  if (!def) {
    throw new Error(`Unsupported unit: ${fromUnit}`);
  }
  return value * def.toBaseSI;
}

/**
 * Converts a quantity from base SI into the chosen display unit.
 */
export function fromSI(valueInSI: number, toUnit: EngineeringUnit): number {
  const def = UNIT_DEFINITIONS[toUnit];
  if (!def) {
    throw new Error(`Unsupported unit: ${toUnit}`);
  }
  return valueInSI / def.toBaseSI;
}

/**
 * Converts a value from one unit to another within the same physical category.
 */
export function convertUnit(value: number, fromUnit: EngineeringUnit, toUnit: EngineeringUnit): number {
  const fromDef = UNIT_DEFINITIONS[fromUnit];
  const toDef = UNIT_DEFINITIONS[toUnit];

  if (!fromDef || !toDef) {
    throw new Error(`Invalid unit conversion between "${fromUnit}" and "${toUnit}"`);
  }

  if (fromDef.category !== toDef.category) {
    throw new Error(
      `Dimension mismatch: Cannot convert "${fromUnit}" (${fromDef.category}) to "${toUnit}" (${toDef.category})`
    );
  }

  // Convert to SI base, then to target unit
  const baseValue = value * fromDef.toBaseSI;
  return baseValue / toDef.toBaseSI;
}

/**
 * Format a number with standard engineering decimal places and its unit symbol.
 */
export function formatQuantity(value: number, unit: EngineeringUnit, decimals: number = 2): string {
  const def = UNIT_DEFINITIONS[unit];
  const symbol = def ? def.symbol : unit;
  return `${value.toFixed(decimals)} ${symbol}`;
}
