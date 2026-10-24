import { 
  SectionModel, 
  SectionResult, 
  WorkedStepSection 
} from './types';

/**
 * Calculates geometric and inertial cross-section properties in base SI units.
 * All computations are analytical and strictly deterministic.
 */
export function calculateSectionProperties(model: SectionModel): SectionResult {
  switch (model.type) {
    case 'rectangle':
      return solveRectangle(model.width, model.height);
    case 'circle':
      return solveCircle(model.diameter);
    case 'hollow-rectangle':
      return solveHollowRectangle(model.outerWidth, model.outerHeight, model.innerWidth, model.innerHeight);
    case 'hollow-circle':
      return solveHollowCircle(model.outerDiameter, model.innerDiameter);
    case 'i-section':
      return solveISection(model.totalHeight, model.flangeWidth, model.flangeThickness, model.webThickness);
    case 't-section':
      return solveTSection(model.flangeWidth, model.flangeThickness, model.webHeight, model.webThickness);
    case 'composite':
      return solveComposite(model.rectangles);
  }
}

function errorResult(sectionType: string, msg: string): SectionResult {
  return {
    isValid: false,
    errorMessage: msg,
    sectionType,
    area: 0,
    centroid: { x: 0, y: 0 },
    Ix: 0,
    Iy: 0,
    Sx: { top: 0, bottom: 0 },
    Sy: { left: 0, right: 0 },
    rx: 0,
    ry: 0,
    totalWidth: 0,
    totalHeight: 0,
    steps: []
  };
}

function solveRectangle(b: number, h: number): SectionResult {
  if (b <= 0 || h <= 0 || isNaN(b) || isNaN(h)) {
    return errorResult('rectangle', 'Width and height must be strictly positive numbers.');
  }

  const A = b * h;
  const cx = b / 2;
  const cy = h / 2;
  const Ix = (b * Math.pow(h, 3)) / 12;
  const Iy = (h * Math.pow(b, 3)) / 12;
  const Sx_val = (b * Math.pow(h, 2)) / 6;
  const Sy_val = (h * Math.pow(b, 2)) / 6;
  const rx = Math.sqrt(Ix / A);
  const ry = Math.sqrt(Iy / A);

  const steps: WorkedStepSection[] = [
    {
      title: '1. Cross-Sectional Area (A)',
      equation: 'A = b · h',
      substitution: `A = ${(b * 1000).toFixed(1)} mm × ${(h * 1000).toFixed(1)} mm`,
      result: `A = ${(A * 1e6).toFixed(1)} mm² (${A.toExponential(4)} m²)`,
      explanation: 'Area is the product of width and height.'
    },
    {
      title: '2. Centroid Coordinates (x̄, ȳ)',
      equation: 'x̄ = b / 2, ȳ = h / 2',
      substitution: `x̄ = ${(b * 1000).toFixed(1)} / 2 mm, ȳ = ${(h * 1000).toFixed(1)} / 2 mm`,
      result: `x̄ = ${(cx * 1000).toFixed(1)} mm, ȳ = ${(cy * 1000).toFixed(1)} mm`,
      explanation: 'Centroid lies at the geometric center of symmetry.'
    },
    {
      title: '3. Second Moment of Area (Ix, Iy)',
      equation: 'Ix = b · h³ / 12, Iy = h · b³ / 12',
      substitution: `Ix = ${(b * 1000).toFixed(1)} × (${(h * 1000).toFixed(1)})³ / 12, Iy = ${(h * 1000).toFixed(1)} × (${(b * 1000).toFixed(1)})³ / 12`,
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴, Iy = ${(Iy * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Moments of inertia about principal centroidal axes.'
    },
    {
      title: '4. Section Modulus & Radius of Gyration',
      equation: 'Sx = Ix / (h/2), rx = √(Ix / A)',
      substitution: `Sx = (${(Ix * 1e12).toExponential(3)}) / ${(cy * 1000).toFixed(1)} mm, rx = √(${(Ix * 1e12).toExponential(3)} / ${(A * 1e6).toFixed(1)})`,
      result: `Sx = ${(Sx_val * 1e9).toExponential(4)} mm³, rx = ${(rx * 1000).toFixed(2)} mm`,
      explanation: 'Section modulus governs elastic bending stress (σ = M / S).'
    }
  ];

  return {
    isValid: true,
    sectionType: 'rectangle',
    area: A,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: Sx_val, bottom: Sx_val },
    Sy: { left: Sy_val, right: Sy_val },
    rx,
    ry,
    totalWidth: b,
    totalHeight: h,
    steps
  };
}

function solveCircle(d: number): SectionResult {
  if (d <= 0 || isNaN(d)) {
    return errorResult('circle', 'Diameter must be a strictly positive number.');
  }

  const A = (Math.PI * Math.pow(d, 2)) / 4;
  const cx = d / 2;
  const cy = d / 2;
  const Ix = (Math.PI * Math.pow(d, 4)) / 64;
  const Iy = Ix;
  const S_val = (Math.PI * Math.pow(d, 3)) / 32;
  const r_val = d / 4;

  const steps: WorkedStepSection[] = [
    {
      title: '1. Area (A)',
      equation: 'A = π · d² / 4',
      substitution: `A = π × (${(d * 1000).toFixed(1)} mm)² / 4`,
      result: `A = ${(A * 1e6).toFixed(1)} mm²`,
      explanation: 'Cross-sectional area of a circular section.'
    },
    {
      title: '2. Centroidal Moment of Inertia (Ix = Iy)',
      equation: 'Ix = Iy = π · d⁴ / 64',
      substitution: `Ix = π × (${(d * 1000).toFixed(1)})⁴ / 64`,
      result: `Ix = Iy = ${(Ix * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Polar symmetry produces equal moments of inertia about any centroidal axis.'
    },
    {
      title: '3. Section Modulus & Radius of Gyration',
      equation: 'S = π · d³ / 32, r = d / 4',
      substitution: `S = π × (${(d * 1000).toFixed(1)})³ / 32, r = ${(d * 1000).toFixed(1)} / 4`,
      result: `S = ${(S_val * 1e9).toExponential(4)} mm³, r = ${(r_val * 1000).toFixed(2)} mm`,
      explanation: 'Elastic section modulus and radius of gyration.'
    }
  ];

  return {
    isValid: true,
    sectionType: 'circle',
    area: A,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: S_val, bottom: S_val },
    Sy: { left: S_val, right: S_val },
    rx: r_val,
    ry: r_val,
    totalWidth: d,
    totalHeight: d,
    steps
  };
}

function solveHollowRectangle(B: number, H: number, b: number, h: number): SectionResult {
  if (B <= 0 || H <= 0 || b <= 0 || h <= 0) {
    return errorResult('hollow-rectangle', 'All outer and inner dimensions must be strictly positive numbers.');
  }
  if (b >= B || h >= H) {
    return errorResult('hollow-rectangle', 'Inner dimensions (b, h) must be strictly smaller than outer dimensions (B, H).');
  }

  const A = B * H - b * h;
  const cx = B / 2;
  const cy = H / 2;
  const Ix = (B * Math.pow(H, 3) - b * Math.pow(h, 3)) / 12;
  const Iy = (H * Math.pow(B, 3) - h * Math.pow(b, 3)) / 12;
  const Sx_val = Ix / (H / 2);
  const Sy_val = Iy / (B / 2);
  const rx = Math.sqrt(Ix / A);
  const ry = Math.sqrt(Iy / A);

  const steps: WorkedStepSection[] = [
    {
      title: '1. Net Area (A = A_outer - A_inner)',
      equation: 'A = B · H - b · h',
      substitution: `A = (${(B * 1000).toFixed(1)} × ${(H * 1000).toFixed(1)}) - (${(b * 1000).toFixed(1)} × ${(h * 1000).toFixed(1)})`,
      result: `A = ${(A * 1e6).toFixed(1)} mm²`,
      explanation: 'Area is obtained by subtracting the inner core void from the outer bounding rectangle.'
    },
    {
      title: '2. Centroidal Moment of Inertia (Ix, Iy)',
      equation: 'Ix = (B · H³ - b · h³) / 12',
      substitution: `Ix = [${(B * 1000).toFixed(1)} × (${(H * 1000).toFixed(1)})³ - ${(b * 1000).toFixed(1)} × (${(h * 1000).toFixed(1)})³] / 12`,
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴, Iy = ${(Iy * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Since the void shares the centroid of symmetry, moments of inertia subtract directly.'
    }
  ];

  return {
    isValid: true,
    sectionType: 'hollow-rectangle',
    area: A,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: Sx_val, bottom: Sx_val },
    Sy: { left: Sy_val, right: Sy_val },
    rx,
    ry,
    totalWidth: B,
    totalHeight: H,
    steps
  };
}

function solveHollowCircle(D: number, d: number): SectionResult {
  if (D <= 0 || d <= 0) {
    return errorResult('hollow-circle', 'Outer and inner diameters must be strictly positive numbers.');
  }
  if (d >= D) {
    return errorResult('hollow-circle', 'Inner diameter (d) must be strictly smaller than outer diameter (D).');
  }

  const A = (Math.PI * (Math.pow(D, 2) - Math.pow(d, 2))) / 4;
  const cx = D / 2;
  const cy = D / 2;
  const Ix = (Math.PI * (Math.pow(D, 4) - Math.pow(d, 4))) / 64;
  const Iy = Ix;
  const S_val = Ix / (D / 2);
  const rx = Math.sqrt(Ix / A);
  const ry = rx;

  const steps: WorkedStepSection[] = [
    {
      title: '1. Net Area (A)',
      equation: 'A = π · (D² - d²) / 4',
      substitution: `A = π × [(${(D * 1000).toFixed(1)})² - (${(d * 1000).toFixed(1)})²] / 4`,
      result: `A = ${(A * 1e6).toFixed(1)} mm²`,
      explanation: 'Annular cross-sectional area.'
    },
    {
      title: '2. Centroidal Moment of Inertia (Ix = Iy)',
      equation: 'Ix = π · (D⁴ - d⁴) / 64',
      substitution: `Ix = π × [(${(D * 1000).toFixed(1)})⁴ - (${(d * 1000).toFixed(1)})⁴] / 64`,
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Moment of inertia for a pipe cross-section.'
    }
  ];

  return {
    isValid: true,
    sectionType: 'hollow-circle',
    area: A,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: S_val, bottom: S_val },
    Sy: { left: S_val, right: S_val },
    rx,
    ry,
    totalWidth: D,
    totalHeight: D,
    steps
  };
}

function solveTSection(bf: number, tf: number, hw: number, tw: number): SectionResult {
  if (bf <= 0 || tf <= 0 || hw <= 0 || tw <= 0) {
    return errorResult('t-section', 'All T-section dimensions must be strictly positive numbers.');
  }
  if (tw > bf) {
    return errorResult('t-section', 'Web thickness cannot exceed flange width.');
  }

  // Decompose into:
  // Part 1: Web: width tw, height hw, from y = 0 to y = hw
  // Part 2: Flange: width bf, height tf, from y = hw to y = hw + tf
  const Aw = tw * hw;
  const yw = hw / 2;

  const Af = bf * tf;
  const yf = hw + tf / 2;

  const totalA = Aw + Af;
  const cy = (Aw * yw + Af * yf) / totalA;
  const cx = bf / 2; // Symmetrical along width

  // Parallel Axis Theorem for Ix:
  // I_total = sum(I_local + A * d²)
  const I_local_w = (tw * Math.pow(hw, 3)) / 12;
  const dw = cy - yw;
  const Iw_x = I_local_w + Aw * Math.pow(dw, 2);

  const I_local_f = (bf * Math.pow(tf, 3)) / 12;
  const df = yf - cy;
  const If_x = I_local_f + Af * Math.pow(df, 2);

  const Ix = Iw_x + If_x;

  // Iy about vertical centerline:
  const Iy_w = (hw * Math.pow(tw, 3)) / 12;
  const Iy_f = (tf * Math.pow(bf, 3)) / 12;
  const Iy = Iy_w + Iy_f;

  const totalH = hw + tf;
  const yTop = totalH - cy;
  const yBottom = cy;

  const Sx_top = Ix / yTop;
  const Sx_bottom = Ix / yBottom;

  const Sy_val = Iy / (bf / 2);

  const rx = Math.sqrt(Ix / totalA);
  const ry = Math.sqrt(Iy / totalA);

  const steps: WorkedStepSection[] = [
    {
      title: '1. Area Decomposition',
      equation: 'A = A_web + A_flange',
      substitution: `A = (${(tw * 1000).toFixed(1)} × ${(hw * 1000).toFixed(1)}) + (${(bf * 1000).toFixed(1)} × ${(tf * 1000).toFixed(1)}) = ${(Aw * 1e6).toFixed(1)} + ${(Af * 1e6).toFixed(1)}`,
      result: `A = ${(totalA * 1e6).toFixed(1)} mm²`,
      explanation: 'The T-section is partitioned into rectangular web and flange segments.'
    },
    {
      title: '2. Centroid Location (ȳ from bottom)',
      equation: 'ȳ = Σ (A_i · y_i) / Σ A_i',
      substitution: `ȳ = [(${(Aw * 1e6).toFixed(1)} × ${(yw * 1000).toFixed(1)}) + (${(Af * 1e6).toFixed(1)} × ${(yf * 1000).toFixed(1)})] / ${(totalA * 1e6).toFixed(1)}`,
      result: `ȳ = ${(cy * 1000).toFixed(2)} mm (from bottom fiber)`,
      explanation: 'First moment of area about the base reference line.'
    },
    {
      title: '3. Parallel Axis Theorem for Ix (Σ [I_local + A·d²])',
      equation: 'Ix = (I_web + A_w · d_w²) + (I_flange + A_f · d_f²)',
      substitution: `Web: [${(I_local_w * 1e12).toExponential(3)} + ${(Aw * 1e6).toFixed(1)} × (${(dw * 1000).toFixed(2)})²] + Flange: [${(I_local_f * 1e12).toExponential(3)} + ${(Af * 1e6).toFixed(1)} × (${(df * 1000).toFixed(2)})²]`,
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Parallel axis theorem transfers local rectangular moments of inertia to the common centroidal axis.'
    },
    {
      title: '4. Asymmetric Section Modulus (Sx,top vs Sx,bottom)',
      equation: 'Sx,top = Ix / y_top, Sx,bottom = Ix / y_bottom',
      substitution: `Sx,top = ${(Ix * 1e12).toExponential(3)} / ${(yTop * 1000).toFixed(2)} mm, Sx,bottom = ${(Ix * 1e12).toExponential(3)} / ${(yBottom * 1000).toFixed(2)} mm`,
      result: `Sx,top = ${(Sx_top * 1e9).toExponential(3)} mm³, Sx,bottom = ${(Sx_bottom * 1e9).toExponential(3)} mm³`,
      explanation: 'Because the centroid is asymmetric, the top and bottom extreme fibers have different section moduli.'
    }
  ];

  return {
    isValid: true,
    sectionType: 't-section',
    area: totalA,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: Sx_top, bottom: Sx_bottom },
    Sy: { left: Sy_val, right: Sy_val },
    rx,
    ry,
    totalWidth: bf,
    totalHeight: totalH,
    steps
  };
}

function solveISection(H: number, B: number, tf: number, tw: number): SectionResult {
  if (H <= 0 || B <= 0 || tf <= 0 || tw <= 0) {
    return errorResult('i-section', 'All I-section dimensions must be strictly positive numbers.');
  }
  if (2 * tf >= H) {
    return errorResult('i-section', 'Combined flange thicknesses (2 · tf) cannot exceed or equal total height (H).');
  }
  if (tw >= B) {
    return errorResult('i-section', 'Web thickness cannot exceed flange width.');
  }

  const hw = H - 2 * tf;
  const A = 2 * (B * tf) + hw * tw;
  const cx = B / 2;
  const cy = H / 2;

  // Ix using subtraction of two voids from bounding box:
  // Ix = (B · H³ - (B - tw) · hw³) / 12
  const Ix = (B * Math.pow(H, 3) - (B - tw) * Math.pow(hw, 3)) / 12;

  // Iy: two flanges plus web
  const Iy_flanges = 2 * ((tf * Math.pow(B, 3)) / 12);
  const Iy_web = (hw * Math.pow(tw, 3)) / 12;
  const Iy = Iy_flanges + Iy_web;

  const Sx_val = Ix / (H / 2);
  const Sy_val = Iy / (B / 2);

  const rx = Math.sqrt(Ix / A);
  const ry = Math.sqrt(Iy / A);

  const steps: WorkedStepSection[] = [
    {
      title: '1. Area Decomposition',
      equation: 'A = 2 · (B · tf) + (H - 2·tf) · tw',
      substitution: `A = 2 × (${(B * 1000).toFixed(1)} × ${(tf * 1000).toFixed(1)}) + ${(hw * 1000).toFixed(1)} × ${(tw * 1000).toFixed(1)}`,
      result: `A = ${(A * 1e6).toFixed(1)} mm²`,
      explanation: 'Total cross-sectional area of standard symmetrical I-beam.'
    },
    {
      title: '2. Centroidal Moment of Inertia (Ix)',
      equation: 'Ix = [B · H³ - (B - tw) · hw³] / 12',
      substitution: `Ix = [${(B * 1000).toFixed(1)} × (${(H * 1000).toFixed(1)})³ - ${((B - tw) * 1000).toFixed(1)} × (${(hw * 1000).toFixed(1)})³] / 12`,
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Major bending axis moment of inertia.'
    },
    {
      title: '3. Minor Axis Moment of Inertia (Iy)',
      equation: 'Iy = 2 · [tf · B³ / 12] + hw · tw³ / 12',
      substitution: `Iy = 2 × [${(tf * 1000).toFixed(1)} × (${(B * 1000).toFixed(1)})³ / 12] + ${(hw * 1000).toFixed(1)} × (${(tw * 1000).toFixed(1)})³ / 12`,
      result: `Iy = ${(Iy * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Minor axis moment of inertia governed predominantly by the wide flanges.'
    }
  ];

  return {
    isValid: true,
    sectionType: 'i-section',
    area: A,
    centroid: { x: cx, y: cy },
    Ix,
    Iy,
    Sx: { top: Sx_val, bottom: Sx_val },
    Sy: { left: Sy_val, right: Sy_val },
    rx,
    ry,
    totalWidth: B,
    totalHeight: H,
    steps
  };
}

function solveComposite(rects: { id: string; x: number; y: number; width: number; height: number }[]): SectionResult {
  if (!rects || rects.length === 0) {
    return errorResult('composite', 'At least one rectangular piece must be provided.');
  }

  for (const r of rects) {
    if (r.width <= 0 || r.height <= 0 || isNaN(r.width) || isNaN(r.height)) {
      return errorResult('composite', 'All rectangle dimensions must be strictly positive numbers.');
    }
  }

  let totalA = 0;
  let sumAx = 0;
  let sumAy = 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const pieceData = rects.map((r, i) => {
    const area = r.width * r.height;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;

    totalA += area;
    sumAx += area * cx;
    sumAy += area * cy;

    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.width);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y + r.height);

    return { id: r.id, index: i + 1, width: r.width, height: r.height, area, cx, cy };
  });

  const barX = sumAx / totalA;
  const barY = sumAy / totalA;

  let Ix = 0;
  let Iy = 0;

  const parallelAxisBreakdown: string[] = [];

  pieceData.forEach(p => {
    const I_local_x = (p.width * Math.pow(p.height, 3)) / 12;
    const dy = barY - p.cy;
    const I_transfer_x = I_local_x + p.area * Math.pow(dy, 2);
    Ix += I_transfer_x;

    const I_local_y = (p.height * Math.pow(p.width, 3)) / 12;
    const dx = barX - p.cx;
    const I_transfer_y = I_local_y + p.area * Math.pow(dx, 2);
    Iy += I_transfer_y;

    parallelAxisBreakdown.push(
      `Piece ${p.index}: I_loc = ${(I_local_x * 1e12).toExponential(2)} mm⁴, d = ${(Math.abs(dy) * 1000).toFixed(1)} mm => I_total = ${(I_transfer_x * 1e12).toExponential(2)} mm⁴`
    );
  });

  const yTop = maxY - barY;
  const yBottom = barY - minY;
  const xLeft = barX - minX;
  const xRight = maxX - barX;

  const Sx_top = Ix / yTop;
  const Sx_bottom = Ix / yBottom;
  const Sy_left = Iy / xLeft;
  const Sy_right = Iy / xRight;

  const rx = Math.sqrt(Ix / totalA);
  const ry = Math.sqrt(Iy / totalA);

  const steps: WorkedStepSection[] = [
    {
      title: '1. Total Area & Centroid Location',
      equation: 'A = Σ A_i, x̄ = Σ(A_i·x_i)/A, ȳ = Σ(A_i·y_i)/A',
      substitution: `A = ${(totalA * 1e6).toFixed(1)} mm², x̄ = ${(barX * 1000).toFixed(2)} mm, ȳ = ${(barY * 1000).toFixed(2)} mm`,
      result: `Centroid at (${(barX * 1000).toFixed(1)}, ${(barY * 1000).toFixed(1)}) mm`,
      explanation: 'Composite summation over all user-defined rectangular plates.'
    },
    {
      title: '2. Parallel Axis Theorem Steps (Ix = Σ [I_local + A·d²])',
      equation: 'Ix = Σ [ (b_i · h_i³ / 12) + A_i · (ȳ - y_i)² ]',
      substitution: parallelAxisBreakdown.join(' | '),
      result: `Ix = ${(Ix * 1e12).toExponential(4)} mm⁴, Iy = ${(Iy * 1e12).toExponential(4)} mm⁴`,
      explanation: 'Every piece is transformed to the global centroid using the parallel axis theorem.'
    }
  ];

  return {
    isValid: true,
    sectionType: 'composite',
    area: totalA,
    centroid: { x: barX, y: barY },
    Ix,
    Iy,
    Sx: { top: Sx_top, bottom: Sx_bottom },
    Sy: { left: Sy_left, right: Sy_right },
    rx,
    ry,
    totalWidth: maxX - minX,
    totalHeight: maxY - minY,
    steps
  };
}
