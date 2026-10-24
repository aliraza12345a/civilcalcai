import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Layers, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Plus, 
  Trash2,
  Info
} from 'lucide-react';
import { 
  SectionModel, 
  calculateSectionProperties,
  CompositeRectanglePiece
} from '../engine/sections';
import { SectionViewer } from '../components/SectionViewer';
import { LengthUnit } from '../engine/units';

interface SectionWorkspaceProps {
  onBack: () => void;
  onSendIxToBeam?: (ixInM4: number) => void;
}

export const SectionWorkspace: React.FC<SectionWorkspaceProps> = ({ onBack, onSendIxToBeam }) => {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const lengthUnit: LengthUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const dimUnit = unitSystem === 'metric' ? 'mm' : 'in';

  // Selected Shape
  const [shapeType, setShapeType] = useState<
    'rectangle' | 'circle' | 'hollow-rectangle' | 'hollow-circle' | 't-section' | 'i-section' | 'composite'
  >('rectangle');

  // Input states in display units (mm or in)
  // Rectangle
  const [rectW, setRectW] = useState<number>(200);
  const [rectH, setRectH] = useState<number>(400);

  // Circle
  const [circleD, setCircleD] = useState<number>(300);

  // Hollow Rectangle
  const [hRectB, setHRectB] = useState<number>(200);
  const [hRectH, setHRectH] = useState<number>(400);
  const [hRectb, setHRectb] = useState<number>(160);
  const [hRecth, setHRecth] = useState<number>(360);

  // Hollow Circle
  const [hCircD, setHCircD] = useState<number>(200);
  const [hCircd, setHCircd] = useState<number>(160);

  // T-Section
  const [tBf, setTBf] = useState<number>(300);
  const [tTf, setTTf] = useState<number>(50);
  const [tHw, setTHw] = useState<number>(250);
  const [tTw, setTTw] = useState<number>(50);

  // I-Section
  const [iH, setIH] = useState<number>(300);
  const [iB, setIB] = useState<number>(150);
  const [iTf, setITf] = useState<number>(15);
  const [iTw, setITw] = useState<number>(10);

  // Composite Rectangles
  const [compositePieces, setCompositePieces] = useState<CompositeRectanglePiece[]>([
    { id: 'c1', x: 0, y: 0, width: 0.200, height: 0.020 },
    { id: 'c2', x: 0.090, y: 0.020, width: 0.020, height: 0.180 }
  ]);

  // Conversion helper: display unit (mm or in) to meters
  const toMeters = (val: number): number => {
    return unitSystem === 'metric' ? val / 1000 : val * 0.0254;
  };

  // Build SectionModel in base SI (meters)
  const sectionModel = useMemo<SectionModel>(() => {
    switch (shapeType) {
      case 'rectangle':
        return {
          type: 'rectangle',
          width: toMeters(rectW),
          height: toMeters(rectH)
        };
      case 'circle':
        return {
          type: 'circle',
          diameter: toMeters(circleD)
        };
      case 'hollow-rectangle':
        return {
          type: 'hollow-rectangle',
          outerWidth: toMeters(hRectB),
          outerHeight: toMeters(hRectH),
          innerWidth: toMeters(hRectb),
          innerHeight: toMeters(hRecth)
        };
      case 'hollow-circle':
        return {
          type: 'hollow-circle',
          outerDiameter: toMeters(hCircD),
          innerDiameter: toMeters(hCircd)
        };
      case 't-section':
        return {
          type: 't-section',
          flangeWidth: toMeters(tBf),
          flangeThickness: toMeters(tTf),
          webHeight: toMeters(tHw),
          webThickness: toMeters(tTw)
        };
      case 'i-section':
        return {
          type: 'i-section',
          totalHeight: toMeters(iH),
          flangeWidth: toMeters(iB),
          flangeThickness: toMeters(iTf),
          webThickness: toMeters(iTw)
        };
      case 'composite':
        return {
          type: 'composite',
          rectangles: compositePieces
        };
    }
  }, [shapeType, rectW, rectH, circleD, hRectB, hRectH, hRectb, hRecth, hCircD, hCircd, tBf, tTf, tHw, tTw, iH, iB, iTf, iTw, compositePieces, unitSystem]);

  // Calculate section properties
  const results = useMemo(() => {
    return calculateSectionProperties(sectionModel);
  }, [sectionModel]);

  // Unit display conversions
  const areaUnitStr = unitSystem === 'metric' ? 'mm²' : 'in²';
  const areaMultiplier = unitSystem === 'metric' ? 1e6 : 1 / Math.pow(0.0254, 2);

  const inertiaUnitStr = unitSystem === 'metric' ? 'mm⁴' : 'in⁴';
  const inertiaMultiplier = unitSystem === 'metric' ? 1e12 : 1 / 4.162314256e-7;

  const modulusUnitStr = unitSystem === 'metric' ? 'mm³' : 'in³';
  const modulusMultiplier = unitSystem === 'metric' ? 1e9 : 1 / Math.pow(0.0254, 3);

  const radiusMultiplier = unitSystem === 'metric' ? 1000 : 1 / 0.0254;

  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSendToBeam = () => {
    if (results.isValid && onSendIxToBeam) {
      onSendIxToBeam(results.Ix);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 2500);
    }
  };

  const addCompositePiece = () => {
    const newId = `c-${Date.now()}`;
    setCompositePieces([
      ...compositePieces,
      { id: newId, x: 0, y: toMeters(100), width: toMeters(150), height: toMeters(30) }
    ]);
  };

  const removeCompositePiece = (id: string) => {
    setCompositePieces(compositePieces.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 engineering-grid">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Return to Library"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Cross-Section Properties Calculator
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                  Milestone 6 Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Centroids, Moments of Inertia & Parallel Axis Theorem</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setUnitSystem('metric')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'metric'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Metric (mm)
            </button>
            <button
              onClick={() => setUnitSystem('imperial')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'imperial'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Imperial (in)
            </button>
          </div>
        </div>
      </header>

      {/* Limitations Notice */}
      <section className="bg-amber-950/30 border-b border-amber-500/20 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center space-x-2.5 text-xs text-amber-200/90">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Educational Notice:</strong> Evaluates geometric and centroidal section properties under linear elastic mechanics. Always check design codes for local buckling and effective section classes.
          </span>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Shape Selection & Parameter Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Shape Selector Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-sky-400 border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Cross-Section Shape
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'rectangle', label: 'Solid Rectangle' },
                { id: 'circle', label: 'Solid Circle' },
                { id: 'hollow-rectangle', label: 'Hollow Rect (Tube)' },
                { id: 'hollow-circle', label: 'Hollow Circle (Pipe)' },
                { id: 't-section', label: 'T-Section' },
                { id: 'i-section', label: 'I-Section' },
                { id: 'composite', label: 'Composite Plates' },
              ].map(shape => (
                <button
                  key={shape.id}
                  onClick={() => setShapeType(shape.id as any)}
                  className={`p-2 rounded-lg border text-left font-medium transition-all ${
                    shapeType === shape.id
                      ? 'bg-sky-950/70 border-sky-500 text-sky-200 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Inputs Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Geometric Dimensions ({dimUnit})
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {shapeType === 'rectangle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Width (b)</label>
                    <input
                      type="number"
                      step="1"
                      value={rectW}
                      onChange={(e) => setRectW(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Depth / Height (h)</label>
                    <input
                      type="number"
                      step="1"
                      value={rectH}
                      onChange={(e) => setRectH(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {shapeType === 'circle' && (
                <div>
                  <label className="block text-slate-400 mb-1">Diameter (d)</label>
                  <input
                    type="number"
                    step="1"
                    value={circleD}
                    onChange={(e) => setCircleD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}

              {shapeType === 'hollow-rectangle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Outer Width (B)</label>
                    <input
                      type="number"
                      step="1"
                      value={hRectB}
                      onChange={(e) => setHRectB(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Outer Height (H)</label>
                    <input
                      type="number"
                      step="1"
                      value={hRectH}
                      onChange={(e) => setHRectH(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Inner Width (b)</label>
                    <input
                      type="number"
                      step="1"
                      value={hRectb}
                      onChange={(e) => setHRectb(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Inner Height (h)</label>
                    <input
                      type="number"
                      step="1"
                      value={hRecth}
                      onChange={(e) => setHRecth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {shapeType === 'hollow-circle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Outer Diameter (D)</label>
                    <input
                      type="number"
                      step="1"
                      value={hCircD}
                      onChange={(e) => setHCircD(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Inner Diameter (d)</label>
                    <input
                      type="number"
                      step="1"
                      value={hCircd}
                      onChange={(e) => setHCircd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {shapeType === 't-section' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Flange Width (bf)</label>
                    <input
                      type="number"
                      step="1"
                      value={tBf}
                      onChange={(e) => setTBf(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Flange Thickness (tf)</label>
                    <input
                      type="number"
                      step="1"
                      value={tTf}
                      onChange={(e) => setTTf(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Web Height (hw)</label>
                    <input
                      type="number"
                      step="1"
                      value={tHw}
                      onChange={(e) => setTHw(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Web Thickness (tw)</label>
                    <input
                      type="number"
                      step="1"
                      value={tTw}
                      onChange={(e) => setTTw(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {shapeType === 'i-section' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Total Height (H)</label>
                    <input
                      type="number"
                      step="1"
                      value={iH}
                      onChange={(e) => setIH(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Flange Width (B)</label>
                    <input
                      type="number"
                      step="1"
                      value={iB}
                      onChange={(e) => setIB(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Flange Thickness (tf)</label>
                    <input
                      type="number"
                      step="1"
                      value={iTf}
                      onChange={(e) => setITf(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Web Thickness (tw)</label>
                    <input
                      type="number"
                      step="1"
                      value={iTw}
                      onChange={(e) => setITw(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {shapeType === 'composite' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] uppercase">Composite Rectangles</span>
                    <button
                      onClick={addCompositePiece}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Plate</span>
                    </button>
                  </div>

                  {compositePieces.map((p, idx) => (
                    <div key={p.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sky-400 font-bold">Plate #{idx + 1}</span>
                        {compositePieces.length > 1 && (
                          <button
                            onClick={() => removeCompositePiece(p.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <label className="text-slate-400 block text-[10px]">x (orig)</label>
                          <input
                            type="number"
                            step="0.005"
                            value={p.x * 1000}
                            onChange={(e) => {
                              const v = (parseFloat(e.target.value) || 0) / 1000;
                              setCompositePieces(compositePieces.map(item => item.id === p.id ? { ...item, x: v } : item));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block text-[10px]">y (orig)</label>
                          <input
                            type="number"
                            step="0.005"
                            value={p.y * 1000}
                            onChange={(e) => {
                              const v = (parseFloat(e.target.value) || 0) / 1000;
                              setCompositePieces(compositePieces.map(item => item.id === p.id ? { ...item, y: v } : item));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block text-[10px]">Width</label>
                          <input
                            type="number"
                            step="0.005"
                            value={p.width * 1000}
                            onChange={(e) => {
                              const v = (parseFloat(e.target.value) || 0) / 1000;
                              setCompositePieces(compositePieces.map(item => item.id === p.id ? { ...item, width: v } : item));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block text-[10px]">Height</label>
                          <input
                            type="number"
                            step="0.005"
                            value={p.height * 1000}
                            onChange={(e) => {
                              const v = (parseFloat(e.target.value) || 0) / 1000;
                              setCompositePieces(compositePieces.map(item => item.id === p.id ? { ...item, height: v } : item));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Integration Action: Send Ix to Beam Calculator */}
          {results.isValid && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-sky-200">Export Ix to Beam Deflection</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ix = {(results.Ix * inertiaMultiplier).toExponential(4)} {inertiaUnitStr}
                  </div>
                </div>
                <button
                  onClick={handleSendToBeam}
                  className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Ix to Beam Solver</span>
                </button>
              </div>
              {sendSuccess && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Transferred Ix into Beam Flexural Rigidity parameters!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Visualization & Worked Results (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Validation Error Banner */}
          {!results.isValid && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start space-x-3 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300">Section Geometry Error:</span> {results.errorMessage}
              </div>
            </div>
          )}

          {/* Section Geometry Diagram Plot */}
          <SectionViewer model={sectionModel} result={results} lengthUnit={lengthUnit} />

          {/* Property Output Metric Cards */}
          {results.isValid && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">Area (A)</div>
                <div className="text-lg font-bold font-mono text-white">
                  {(results.area * areaMultiplier).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </div>
                <div className="text-[10px] text-slate-400">{areaUnitStr}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-sky-400">Centroid (ȳ)</div>
                <div className="text-lg font-bold font-mono text-white">
                  {(results.centroid.y * radiusMultiplier).toFixed(1)}
                </div>
                <div className="text-[10px] text-slate-400">{dimUnit} from bottom</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-sky-500/40 space-y-1 shadow-md shadow-sky-950/30">
                <div className="text-[10px] font-mono uppercase text-sky-300">Moment of Inertia (Ix)</div>
                <div className="text-base font-bold font-mono text-emerald-400 truncate">
                  {(results.Ix * inertiaMultiplier).toExponential(4)}
                </div>
                <div className="text-[10px] text-slate-400">{inertiaUnitStr} (Centroidal)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">Moment of Inertia (Iy)</div>
                <div className="text-base font-bold font-mono text-white truncate">
                  {(results.Iy * inertiaMultiplier).toExponential(4)}
                </div>
                <div className="text-[10px] text-slate-400">{inertiaUnitStr} (Centroidal)</div>
              </div>
            </div>
          )}

          {/* Section Modulus & Radius of Gyration Details */}
          {results.isValid && (
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs font-mono">
              <div className="font-semibold text-slate-300 uppercase text-[11px] tracking-wider font-sans flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Section Modulus & Radii of Gyration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Section Modulus (Sx)</div>
                  <div>Top (Sx,top): <span className="text-sky-300 font-bold">{(results.Sx.top * modulusMultiplier).toExponential(3)} {modulusUnitStr}</span></div>
                  <div>Bottom (Sx,bot): <span className="text-sky-300 font-bold">{(results.Sx.bottom * modulusMultiplier).toExponential(3)} {modulusUnitStr}</span></div>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Section Modulus (Sy)</div>
                  <div>Left (Sy,left): <span className="text-sky-300 font-bold">{(results.Sy.left * modulusMultiplier).toExponential(3)} {modulusUnitStr}</span></div>
                  <div>Right (Sy,right): <span className="text-sky-300 font-bold">{(results.Sy.right * modulusMultiplier).toExponential(3)} {modulusUnitStr}</span></div>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Radius of Gyration (r = √(I/A))</div>
                  <div>Major Axis (rx): <span className="text-emerald-300 font-bold">{(results.rx * radiusMultiplier).toFixed(2)} {dimUnit}</span></div>
                  <div>Minor Axis (ry): <span className="text-emerald-300 font-bold">{(results.ry * radiusMultiplier).toFixed(2)} {dimUnit}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-Step Worked Working (Parallel Axis Theorem) */}
          {results.isValid && results.steps.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-sky-400 uppercase tracking-wider font-sans">
                Analytical Step-by-Step Derivations & Parallel Axis Theorem
              </h3>
              {results.steps.map((st, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-semibold text-xs text-sky-300 uppercase">{st.title}</div>
                  <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800/80 space-y-1">
                    <div className="text-sky-400">{st.equation}</div>
                    <div className="text-slate-300 text-[11px] overflow-x-auto">{st.substitution}</div>
                    <div className="text-emerald-400 font-bold pt-1">{st.result}</div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{st.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
