import { BeamType } from '../beams/types';
import { LengthUnit, ForceUnit, DistributedLoadUnit, MomentUnit, StressUnit, InertiaUnit } from '../units';

export interface SavedBeamCalculation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  unitSystem: 'metric' | 'imperial';
  beamType: BeamType;
  fixedEnd: 'left' | 'right';
  spanInput: number;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  distLoadUnit: DistributedLoadUnit;
  momentUnit: MomentUnit;
  selectedPreset: string;
  eValue: number;
  eUnit: StressUnit;
  iValue: number;
  iUnit: InertiaUnit;
  pointLoads: Array<{ id: string; position: number; magnitude: number }>;
  uniformLoads: Array<{ id: string; start: number; end: number; magnitude: number }>;
  pointMoments: Array<{ id: string; position: number; magnitude: number }>;
}

const STORAGE_KEY = 'civilcalc_beam_history_v1';

export function getSavedBeamCalculations(): SavedBeamCalculation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn('Failed to read from localStorage:', err);
    return [];
  }
}

export function saveBeamCalculation(
  data: Omit<SavedBeamCalculation, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): SavedBeamCalculation | null {
  try {
    const list = getSavedBeamCalculations();
    const now = Date.now();

    if (existingId) {
      const idx = list.findIndex(c => c.id === existingId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...data,
          updatedAt: now
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return list[idx];
      }
    }

    const newItem: SavedBeamCalculation = {
      ...data,
      id: `calc-${now}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return newItem;
  } catch (err) {
    console.warn('Failed to save calculation to localStorage:', err);
    return null;
  }
}

export function renameSavedBeamCalculation(id: string, newTitle: string): boolean {
  try {
    const list = getSavedBeamCalculations();
    const item = list.find(c => c.id === id);
    if (!item) return false;
    item.title = newTitle.trim() || item.title;
    item.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn('Failed to rename calculation in localStorage:', err);
    return false;
  }
}

export function deleteSavedBeamCalculation(id: string): boolean {
  try {
    const list = getSavedBeamCalculations();
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.warn('Failed to delete calculation from localStorage:', err);
    return false;
  }
}

export function clearAllBeamCalculations(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('Failed to clear calculations from localStorage:', err);
    return false;
  }
}
