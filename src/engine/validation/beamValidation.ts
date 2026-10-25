import { BeamModel } from '../beams/types';

export interface ValidationOutput {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates beam geometry, supports, and load coordinates.
 */
export function validateBeamModel(beam: BeamModel): ValidationOutput {
  if (!Number.isFinite(beam.span) || beam.span <= 0) {
    return {
      isValid: false,
      errorMessage: 'Beam span must be a strictly positive number greater than zero.'
    };
  }

  if (beam.type === 'simply-supported') {
    const posA = beam.supportA?.position ?? 0;
    const posB = beam.supportB?.position ?? beam.span;

    if (!Number.isFinite(posA) || !Number.isFinite(posB) || posA < 0 || posA > beam.span || posB < 0 || posB > beam.span) {
      return {
        isValid: false,
        errorMessage: 'Supports must be positioned within the beam span [0, L].'
      };
    }

    if (posB <= posA || Math.abs(posA - posB) < 1e-9) {
      return {
        isValid: false,
        errorMessage: 'Support B must be positioned to the right of Support A, with a non-zero distance between them.'
      };
    }
  }

  // Validate Point Loads
  for (const pl of beam.pointLoads) {
    if (!Number.isFinite(pl.position) || pl.position < 0 || pl.position > beam.span) {
      return {
        isValid: false,
        errorMessage: `Point load position (${pl.position} m) must be within beam span [0, ${beam.span} m].`
      };
    }
    if (!Number.isFinite(pl.magnitude)) {
      return {
        isValid: false,
        errorMessage: 'Point load magnitude must be a valid number.'
      };
    }
  }

  // Validate Uniform Loads
  for (const ul of beam.uniformLoads) {
    if (!Number.isFinite(ul.start) || ul.start < 0 || ul.start > beam.span) {
      return {
        isValid: false,
        errorMessage: `Uniform load start position (${ul.start} m) must be within span [0, ${beam.span} m].`
      };
    }
    if (!Number.isFinite(ul.end) || ul.end < 0 || ul.end > beam.span) {
      return {
        isValid: false,
        errorMessage: `Uniform load end position (${ul.end} m) must be within span [0, ${beam.span} m].`
      };
    }
    if (ul.end <= ul.start) {
      return {
        isValid: false,
        errorMessage: `Uniform load end position (${ul.end} m) must be strictly greater than start position (${ul.start} m).`
      };
    }
    if (!Number.isFinite(ul.magnitude)) {
      return {
        isValid: false,
        errorMessage: 'Uniform load magnitude must be a valid number.'
      };
    }
  }

  // Validate Point Moments
  for (const pm of beam.pointMoments) {
    if (!Number.isFinite(pm.position) || pm.position < 0 || pm.position > beam.span) {
      return {
        isValid: false,
        errorMessage: `Applied moment position (${pm.position} m) must be within span [0, ${beam.span} m].`
      };
    }
    if (!Number.isFinite(pm.magnitude)) {
      return {
        isValid: false,
        errorMessage: 'Applied moment magnitude must be a valid number.'
      };
    }
  }

  return { isValid: true };
}
