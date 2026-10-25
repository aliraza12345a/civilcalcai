import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Sliders,
} from 'lucide-react';
import { BeamModel } from '../engine/beams/types';
import { GeneralDeflectionResult } from '../engine/beams/deflection';
import { LengthUnit, ForceUnit, MomentUnit, convertUnit } from '../engine/units';

interface Beam3DViewerProps {
  beamModel: BeamModel;
  deflectionResult: GeneralDeflectionResult;
  lengthUnit: LengthUnit;
  forceUnit: ForceUnit;
  momentUnit: MomentUnit;
  sectionShape?: 'i-beam' | 'rectangle' | 'box' | 'circle';
  depth?: number; // Section depth in meters (default 0.3)
  width?: number; // Section width in meters (default 0.15)
}

// 3D Vector & Math Helpers
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Polygon3D {
  points: Vec3[];
  color: string;
  depthZ: number; // for painter's algorithm depth sorting
  wireframeOnly?: boolean;
}

export const Beam3DViewer: React.FC<Beam3DViewerProps> = ({
  beamModel,
  deflectionResult,
  lengthUnit,
  forceUnit,
  sectionShape = 'i-beam',
  depth = 0.35,
  width = 0.18,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D Camera / Orbit State
  const [rotX, setRotX] = useState<number>(24 * (Math.PI / 180)); // Pitch
  const [rotY, setRotY] = useState<number>(-35 * (Math.PI / 180)); // Yaw
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Viewer Controls State
  const [exaggeration, setExaggeration] = useState<number>(25); // Exaggeration factor
  const [isAnimated, setIsAnimated] = useState<boolean>(false);
  const [animPhase, setAnimPhase] = useState<number>(0);
  const [activeShape, setActiveShape] = useState<'i-beam' | 'rectangle' | 'box' | 'circle'>(sectionShape);
  const [showStressContour, setShowStressContour] = useState<boolean>(true);
  const showLoads = true;
  const showSupports = true;
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Animation Loop for Dynamic Load Flex
  useEffect(() => {
    if (!isAnimated) return;
    let animFrameId: number;
    const animate = () => {
      setAnimPhase((prev) => (prev + 0.04) % (2 * Math.PI));
      animFrameId = requestAnimationFrame(animate);
    };
    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, [isAnimated]);

  // Color Mapping Helper (Jet / Turbo FEA Stress Colormap: Blue -> Cyan -> Green -> Yellow -> Red)
  const getStressColor = useCallback((stressNorm: number): string => {
    const t = Math.max(0, Math.min(1, stressNorm));
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.25) {
      r = 0;
      g = Math.floor(4 * t * 255);
      b = 255;
    } else if (t < 0.5) {
      r = 0;
      g = 255;
      b = Math.floor((1 - 4 * (t - 0.25)) * 255);
    } else if (t < 0.75) {
      r = Math.floor(4 * (t - 0.5) * 255);
      g = 255;
      b = 0;
    } else {
      r = 255;
      g = Math.floor((1 - 4 * (t - 0.75)) * 255);
      b = 0;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  // Preset Views
  const setViewPreset = (preset: 'iso' | 'front' | 'top' | 'side') => {
    switch (preset) {
      case 'iso':
        setRotX(25 * (Math.PI / 180));
        setRotY(-35 * (Math.PI / 180));
        setPan({ x: 0, y: 0 });
        break;
      case 'front':
        setRotX(0);
        setRotY(0);
        setPan({ x: 0, y: 0 });
        break;
      case 'top':
        setRotX(89.9 * (Math.PI / 180));
        setRotY(0);
        setPan({ x: 0, y: 0 });
        break;
      case 'side':
        setRotX(0);
        setRotY(90 * (Math.PI / 180));
        setPan({ x: 0, y: 0 });
        break;
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Main Render Function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear Background with sleek dark engineering vignette
    const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    const L = beamModel.span;
    if (L <= 0) return;

    // Camera 3D Transform
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    const cx = w / 2 + pan.x;
    const cy = h / 2 + pan.y;
    const baseScale = Math.min(w / (L * 1.3), h / 1.6) * zoom;

    // Project 3D Point to 2D Screen
    const project = (pt: Vec3): { sx: number; sy: number; sz: number } => {
      // Rotate around Y axis (yaw)
      const x1 = pt.x * cosY + pt.z * sinY;
      const y1 = pt.y;
      const z1 = -pt.x * sinY + pt.z * cosY;

      // Rotate around X axis (pitch)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Weak perspective projection
      const cameraDistance = 12;
      const perspective = cameraDistance / (cameraDistance - z2 / baseScale);
      const sx = cx + x2 * baseScale * perspective;
      const sy = cy - y2 * baseScale * perspective; // Invert y for screen coords

      return { sx, sy, sz: z2 };
    };

    // Draw Ground Grid Plane
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    const gridSpan = L * 1.4;
    const gridStep = L / 10;
    const gridY = -depth * 1.5;

    for (let x = -gridSpan / 2; x <= gridSpan / 2; x += gridStep) {
      const p1 = project({ x, y: gridY, z: -gridSpan / 2 });
      const p2 = project({ x, y: gridY, z: gridSpan / 2 });
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    for (let z = -gridSpan / 2; z <= gridSpan / 2; z += gridStep) {
      const p1 = project({ x: -gridSpan / 2, y: gridY, z });
      const p2 = project({ x: gridSpan / 2, y: gridY, z });
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Geometry Generation for the 3D Beam
    const polygons: Polygon3D[] = [];
    const segments = 60; // Along beam length
    const dx = L / segments;

    // Center beam around x = 0 for balanced 3D rotation
    const xOffset = -L / 2;

    // Amplitude scale for dynamic animation
    const animFactor = isAnimated ? Math.sin(animPhase) : 1;
    const scaleFactor = exaggeration * animFactor;

    // Maximum moment for stress normalization
    let maxAbsM = 1e-5;
    if (deflectionResult.points && deflectionResult.points.length > 0) {
      for (const pt of deflectionResult.points) {
        if (Math.abs(pt.moment) > maxAbsM) maxAbsM = Math.abs(pt.moment);
      }
    }

    // Build Cross-Section Profile Slices along length
    // For each segment index i from 0 to segments:
    const slices: Vec3[][] = [];
    const sliceStresses: number[] = [];

    const b = width;
    const sectionHeight = depth;

    for (let i = 0; i <= segments; i++) {
      const xBeam = i * dx;
      const xWorld = xBeam + xOffset;
      const defl = deflectionResult.deflectionAt(xBeam) * scaleFactor;
      const moment = deflectionResult.momentAt(xBeam);
      const stressRatio = Math.min(1, Math.abs(moment) / maxAbsM);
      sliceStresses.push(stressRatio);

      // Section geometry vertices in local (Y, Z) coords relative to deformed centerline
      let sectionPts: { y: number; z: number }[] = [];

      if (activeShape === 'rectangle' || activeShape === 'box') {
        sectionPts = [
          { y: sectionHeight / 2, z: -b / 2 },
          { y: sectionHeight / 2, z: b / 2 },
          { y: -sectionHeight / 2, z: b / 2 },
          { y: -sectionHeight / 2, z: -b / 2 },
        ];
      } else if (activeShape === 'i-beam') {
        const tf = sectionHeight * 0.15; // Flange thickness
        const tw = b * 0.25; // Web thickness
        sectionPts = [
          { y: sectionHeight / 2, z: -b / 2 },
          { y: sectionHeight / 2, z: b / 2 },
          { y: sectionHeight / 2 - tf, z: b / 2 },
          { y: sectionHeight / 2 - tf, z: tw / 2 },
          { y: -sectionHeight / 2 + tf, z: tw / 2 },
          { y: -sectionHeight / 2 + tf, z: b / 2 },
          { y: -sectionHeight / 2, z: b / 2 },
          { y: -sectionHeight / 2, z: -b / 2 },
          { y: -sectionHeight / 2 + tf, z: -b / 2 },
          { y: -sectionHeight / 2 + tf, z: -tw / 2 },
          { y: sectionHeight / 2 - tf, z: -tw / 2 },
          { y: sectionHeight / 2 - tf, z: -b / 2 },
        ];
      } else if (activeShape === 'circle') {
        const r = sectionHeight / 2;
        const numSides = 12;
        for (let k = 0; k < numSides; k++) {
          const ang = (k / numSides) * 2 * Math.PI;
          sectionPts.push({ y: r * Math.sin(ang), z: (b / 2) * Math.cos(ang) });
        }
      }

      // Transform local profile to 3D world coords
      const slice3D: Vec3[] = sectionPts.map((pt) => ({
        x: xWorld,
        y: pt.y + defl,
        z: pt.z,
      }));

      slices.push(slice3D);
    }

    // Connect adjacent slices to create quad polygons
    for (let i = 0; i < segments; i++) {
      const s1 = slices[i];
      const s2 = slices[i + 1];
      const stressAvg = (sliceStresses[i] + sliceStresses[i + 1]) / 2;
      const baseColor = showStressContour
        ? getStressColor(stressAvg)
        : 'rgb(56, 189, 248)';

      const nVerts = s1.length;
      for (let j = 0; j < nVerts; j++) {
        const nextJ = (j + 1) % nVerts;
        const p1 = s1[j];
        const p2 = s1[nextJ];
        const p3 = s2[nextJ];
        const p4 = s2[j];

        // Compute average Z depth for painter's depth sort
        const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
        const avgX = (p1.x + p2.x + p3.x + p4.x) / 4;
        const rotatedZ = -avgX * sinY + avgZ * cosY;

        polygons.push({
          points: [p1, p2, p3, p4],
          color: baseColor,
          depthZ: rotatedZ,
        });
      }
    }

    // End Cap Polygons (Left tip at x = 0, Right tip at x = L)
    const leftCap = slices[0];
    const rightCap = slices[segments];
    const leftZ = -leftCap[0].x * sinY + leftCap[0].z * cosY;
    const rightZ = -rightCap[0].x * sinY + rightCap[0].z * cosY;

    polygons.push({
      points: [...leftCap].reverse(),
      color: showStressContour ? getStressColor(sliceStresses[0]) : 'rgb(14, 116, 144)',
      depthZ: leftZ,
    });
    polygons.push({
      points: rightCap,
      color: showStressContour ? getStressColor(sliceStresses[segments]) : 'rgb(14, 116, 144)',
      depthZ: rightZ,
    });

    // 3D Supports Generation
    if (showSupports) {
      const isSS = beamModel.type === 'simply-supported';
      const xA_3D = -L / 2;
      const xB_3D = isSS ? L / 2 : (beamModel.fixedEnd === 'left' ? -L / 2 : L / 2);

      if (isSS) {
        // Pin Support at A (x = 0)
        const deflA = deflectionResult.deflectionAt(0) * scaleFactor;
        const pinBaseY = -depth / 2 + deflA;
        const pinGroundY = pinBaseY - 0.25;

        // Triangular pin stand
        polygons.push({
          points: [
            { x: xA_3D, y: pinBaseY, z: 0 },
            { x: xA_3D - 0.12, y: pinGroundY, z: -0.1 },
            { x: xA_3D + 0.12, y: pinGroundY, z: -0.1 },
          ],
          color: 'rgb(245, 158, 11)',
          depthZ: 10,
        });
        polygons.push({
          points: [
            { x: xA_3D, y: pinBaseY, z: 0 },
            { x: xA_3D - 0.12, y: pinGroundY, z: 0.1 },
            { x: xA_3D + 0.12, y: pinGroundY, z: 0.1 },
          ],
          color: 'rgb(217, 119, 6)',
          depthZ: 10,
        });

        // Roller Support at B (x = L)
        const deflB = deflectionResult.deflectionAt(L) * scaleFactor;
        const rollerBaseY = -depth / 2 + deflB;
        const rollerGroundY = rollerBaseY - 0.25;

        polygons.push({
          points: [
            { x: xB_3D, y: rollerBaseY, z: 0 },
            { x: xB_3D - 0.12, y: rollerGroundY + 0.08, z: -0.1 },
            { x: xB_3D + 0.12, y: rollerGroundY + 0.08, z: -0.1 },
          ],
          color: 'rgb(245, 158, 11)',
          depthZ: 10,
        });
      } else {
        // Fixed Support Wall at clamped end
        const fixedX = beamModel.fixedEnd === 'left' ? xA_3D : xB_3D;
        const wallW = 0.1;
        const wallH = depth * 2.2;
        const wallD = width * 2.2;

        polygons.push({
          points: [
            { x: fixedX - wallW, y: wallH / 2, z: -wallD / 2 },
            { x: fixedX, y: wallH / 2, z: -wallD / 2 },
            { x: fixedX, y: -wallH / 2, z: -wallD / 2 },
            { x: fixedX - wallW, y: -wallH / 2, z: -wallD / 2 },
          ],
          color: 'rgb(100, 116, 139)',
          depthZ: 20,
        });
      }
    }

    // Depth Sorting (Painter's Algorithm)
    polygons.sort((a, b) => b.depthZ - a.depthZ);

    // Draw Polygons with Lighting Shading
    for (const poly of polygons) {
      if (poly.points.length < 3) continue;
      const proj = poly.points.map(project);

      ctx.beginPath();
      ctx.moveTo(proj[0].sx, proj[0].sy);
      for (let k = 1; k < proj.length; k++) {
        ctx.lineTo(proj[k].sx, proj[k].sy);
      }
      ctx.closePath();

      // Shading fill
      ctx.fillStyle = poly.color;
      ctx.fill();

      // Subtle edge stroke for realistic structural look
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Draw 3D Load Arrows (Point Loads & Distributed Loads)
    if (showLoads) {
      ctx.save();
      // Point Loads
      beamModel.pointLoads.forEach((pl, idx) => {
        const xPos = pl.position + xOffset;
        const defl = deflectionResult.deflectionAt(pl.position) * scaleFactor;
        const tipY = depth / 2 + defl;
        const arrowH = 0.4;
        const tailY = tipY + arrowH;

        const pTip = project({ x: xPos, y: tipY, z: 0 });
        const pTail = project({ x: xPos, y: tailY, z: 0 });

        // Draw glowing arrow stem
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(pTail.sx, pTail.sy);
        ctx.lineTo(pTip.sx, pTip.sy);
        ctx.stroke();

        // Arrowhead cone
        const headW = 7;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(pTip.sx, pTip.sy);
        ctx.lineTo(pTip.sx - headW, pTip.sy - 14);
        ctx.lineTo(pTip.sx + headW, pTip.sy - 14);
        ctx.closePath();
        ctx.fill();

        // Label Billboard
        const plDisp = convertUnit(pl.magnitude, 'N', forceUnit).toFixed(1);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ffe4e6';
        ctx.textAlign = 'center';
        ctx.fillText(`P${idx + 1}: ${plDisp} ${forceUnit}`, pTail.sx, pTail.sy - 8);
      });

      // Uniform Distributed Loads
      beamModel.uniformLoads.forEach((ul, idx) => {
        const nArrows = 7;
        const startX = ul.start + xOffset;
        const endX = ul.end + xOffset;
        const uStep = (endX - startX) / (nArrows - 1);
        const ulDisp = convertUnit(ul.magnitude, 'N/m', `${forceUnit}/${lengthUnit}` as any).toFixed(1);

        for (let k = 0; k < nArrows; k++) {
          const arrowX = startX + k * uStep;
          const xBeam = ul.start + k * ((ul.end - ul.start) / (nArrows - 1));
          const defl = deflectionResult.deflectionAt(xBeam) * scaleFactor;
          const tipY = depth / 2 + defl;
          const tailY = tipY + 0.28;

          const pTip = project({ x: arrowX, y: tipY, z: 0 });
          const pTail = project({ x: arrowX, y: tailY, z: 0 });

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pTail.sx, pTail.sy);
          ctx.lineTo(pTip.sx, pTip.sy);
          ctx.stroke();

          // Mini arrow head
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(pTip.sx, pTip.sy);
          ctx.lineTo(pTip.sx - 4, pTip.sy - 8);
          ctx.lineTo(pTip.sx + 4, pTip.sy - 8);
          ctx.closePath();
          ctx.fill();
        }

        // Midpoint Label
        const midX = (startX + endX) / 2;
        const midDefl = deflectionResult.deflectionAt((ul.start + ul.end) / 2) * scaleFactor;
        const pMidTail = project({ x: midX, y: depth / 2 + midDefl + 0.32, z: 0 });
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'center';
        ctx.fillText(`UDL ${idx + 1}: ${ulDisp} ${forceUnit}/${lengthUnit}`, pMidTail.sx, pMidTail.sy - 6);
      });

      ctx.restore();
    }

    // 3D Coordinate Axis Indicator (Bottom Left)
    const axisOrigin = { x: 50, y: h - 50 };
    const axisLen = 30;
    const axX = {
      x: axisOrigin.x + axisLen * cosY,
      y: axisOrigin.y - axisLen * (sinY * sinX),
    };
    const axY = {
      x: axisOrigin.x,
      y: axisOrigin.y - axisLen * cosX,
    };
    const axZ = {
      x: axisOrigin.x - axisLen * sinY,
      y: axisOrigin.y - axisLen * (cosY * sinX),
    };

    // Draw X Axis (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(axisOrigin.x, axisOrigin.y);
    ctx.lineTo(axX.x, axX.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('X (Span)', axX.x + 3, axX.y);

    // Draw Y Axis (Green)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(axisOrigin.x, axisOrigin.y);
    ctx.lineTo(axY.x, axY.y);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y (Defl)', axY.x, axY.y - 4);

    // Draw Z Axis (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(axisOrigin.x, axisOrigin.y);
    ctx.lineTo(axZ.x, axZ.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z (Width)', axZ.x - 12, axZ.y + 12);
  }, [
    beamModel,
    deflectionResult,
    rotX,
    rotY,
    zoom,
    pan,
    exaggeration,
    isAnimated,
    animPhase,
    activeShape,
    showStressContour,
    showLoads,
    showSupports,
    depth,
    width,
    lengthUnit,
    forceUnit,
    getStressColor,
  ]);

  // Mouse Orbit Controls Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setLastMousePos({ x: e.clientX, y: e.clientY });
    if (e.button === 2 || e.shiftKey) {
      setIsPanning(true);
    } else {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && !isPanning) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      setRotY((prev) => prev + dx * 0.008);
      setRotX((prev) => {
        const next = prev + dy * 0.008;
        return Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, next));
      });
    } else if (isPanning) {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.3, Math.min(4.0, prev * factor)));
  };

  // Touch handlers for mobile devices
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    setRotY((prev) => prev + dx * 0.01);
    setRotX((prev) => {
      const next = prev + dy * 0.01;
      return Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, next));
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const dispDeflUnit = lengthUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;
  const maxDeflDisp = (Math.abs(deflectionResult.maxDeflection.value) * deflMultiplier).toFixed(3);

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden select-none flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[540px]'
      }`}
    >
      {/* 3D Viewer Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Section Profile & Visual Toggles */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl pointer-events-auto text-xs">
          <div className="flex items-center space-x-1 pr-2 border-r border-slate-700">
            <span className="text-[10px] uppercase font-mono text-slate-400 pl-1">3D Section:</span>
            <button
              onClick={() => setActiveShape('i-beam')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeShape === 'i-beam' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Wide-Flange I-Beam"
            >
              I-Beam
            </button>
            <button
              onClick={() => setActiveShape('rectangle')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeShape === 'rectangle' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Rectangular Section"
            >
              Rect
            </button>
            <button
              onClick={() => setActiveShape('box')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeShape === 'box' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Box Girder"
            >
              Box
            </button>
            <button
              onClick={() => setActiveShape('circle')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeShape === 'circle' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Circular Pipe"
            >
              Pipe
            </button>
          </div>

          {/* Stress Heatmap Toggle */}
          <button
            onClick={() => setShowStressContour(!showStressContour)}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
              showStressContour ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Bending Stress Contour Color Gradient"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px]">Stress FEA</span>
          </button>

          {/* Dynamic Flex Oscillation */}
          <button
            onClick={() => setIsAnimated(!isAnimated)}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
              isAnimated ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' : 'text-slate-400 hover:text-white'
            }`}
            title="Animate Dynamic Load Flexing"
          >
            {isAnimated ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px]">Dynamic Flex</span>
          </button>
        </div>

        {/* Right: Camera Presets & Fullscreen */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl pointer-events-auto text-xs">
          <button
            onClick={() => setViewPreset('iso')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            title="Isometric 3D Perspective"
          >
            3D Iso
          </button>
          <button
            onClick={() => setViewPreset('front')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            title="Front Elevation View (X-Y)"
          >
            Front
          </button>
          <button
            onClick={() => setViewPreset('top')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            title="Top Plan View (X-Z)"
          >
            Top
          </button>
          <button
            onClick={() => setViewPreset('side')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            title="Side Section View (Y-Z)"
          >
            Side
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setViewPreset('iso');
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            title="Reset View Orientation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive 3D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Deflection Exaggeration Multiplier Slider */}
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-xl pointer-events-auto text-xs">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] text-slate-300 font-mono">Deflection Scale:</span>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={exaggeration}
            onChange={(e) => setExaggeration(Number(e.target.value))}
            className="w-24 sm:w-32 accent-sky-500 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-sky-400 w-10 text-right">
            {exaggeration}×
          </span>
          <span className="text-[10px] text-slate-500">
            (Actual: {maxDeflDisp} {dispDeflUnit})
          </span>
        </div>

        {/* Stress Legend (FEA Colormap Bar) */}
        {showStressContour && (
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-xl pointer-events-auto text-xs">
            <span className="text-[10px] font-mono text-slate-400">Stress:</span>
            <span className="text-[10px] font-mono text-blue-400">0 (Neutral)</span>
            <div className="w-24 sm:w-32 h-2.5 rounded-full overflow-hidden border border-slate-600 bg-gradient-to-r from-blue-500 via-emerald-400 via-yellow-400 to-red-500" />
            <span className="text-[10px] font-mono text-red-400">Peak σ_max</span>
          </div>
        )}

        {/* Orbit Interaction Hint */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-950/70 px-2 py-1 rounded text-[10px] text-slate-400 font-mono border border-slate-800">
          <span>Drag: Orbit 3D</span>
          <span>•</span>
          <span>Shift+Drag: Pan</span>
          <span>•</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>
    </div>
  );
};
