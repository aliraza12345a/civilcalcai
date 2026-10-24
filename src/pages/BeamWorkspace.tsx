import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  Info,
  Layers,
  Scale,
  Calculator,
  Compass
} from 'lucide-react';
import { 
  BeamModel, 
  PointLoad, 
  UniformLoad, 
  PointMoment, 
  BeamType 
} from '../engine/beams/types';
import { solveBeamReactions } from '../engine/beams/reactions';
import { 
  solveGeneralDeflection, 
  solveStandardDeflection,
  MATERIAL_PRESETS 
} from '../engine/beams/deflection';
import { 
  convertUnit, 
  formatQuantity, 
  LengthUnit, 
  ForceUnit, 
  DistributedLoadUnit, 
  MomentUnit,
  StressUnit,
  InertiaUnit
} from '../engine/units';
import { DeflectionDiagram } from '../components/DeflectionDiagram';

interface BeamWorkspaceProps {
  onBack: () => void;
  initialIx?: number;
  onOpenSectionCalculator?: () => void;
}

export const BeamWorkspace: React.FC<BeamWorkspaceProps> = ({ 
  onBack, 
  initialIx,
  onOpenSectionCalculator 
}) => {
  // Unit System
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const lengthUnit: LengthUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const forceUnit: ForceUnit = unitSystem === 'metric' ? 'kN' : 'kip';
  const distLoadUnit: DistributedLoadUnit = unitSystem === 'metric' ? 'kN/m' : 'kip/ft';
  const momentUnit: MomentUnit = unitSystem === 'metric' ? 'kN*m' : 'kip*ft';

  // Beam Parameters (in display units)
  const [beamType, setBeamType] = useState<BeamType>('simply-supported');
  const [fixedEnd, setFixedEnd] = useState<'left' | 'right'>('left');
  const [spanInput, setSpanInput] = useState<number>(6.0); // 6 m or 20 ft

  // Material & Section Rigidity Parameters (E and I)
  const [selectedPreset, setSelectedPreset] = useState<string>(initialIx ? 'custom' : 'steel');
  const [eValue, setEValue] = useState<number>(200); // 200 GPa or ~29000 ksi
  const [eUnit, setEUnit] = useState<StressUnit>('GPa');
  const [iValue, setIValue] = useState<number>(initialIx ?? 0.0001);
  const [iUnit, setIUnit] = useState<InertiaUnit>('m^4');

  // Handle Preset Selection
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = MATERIAL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      if (unitSystem === 'metric') {
        setEValue(convertUnit(preset.E, 'Pa', 'GPa'));
        setEUnit('GPa');
        setIValue(convertUnit(preset.I, 'm^4', 'm^4'));
        setIUnit('m^4');
      } else {
        setEValue(convertUnit(preset.E, 'Pa', 'ksi'));
        setEUnit('ksi');
        setIValue(convertUnit(preset.I, 'm^4', 'in^4'));
        setIUnit('in^4');
      }
    }
  };

  // Loads (in display units)
  const [pointLoads, setPointLoads] = useState<Array<{ id: string; position: number; magnitude: number }>>([
    { id: 'p1', position: 3.0, magnitude: 10.0 } // 10 kN or kip
  ]);
  const [uniformLoads, setUniformLoads] = useState<Array<{ id: string; start: number; end: number; magnitude: number }>>([]);
  const [pointMoments, setPointMoments] = useState<Array<{ id: string; position: number; magnitude: number }>>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'reactions' | 'deflection' | 'equations' | 'diagrams'>('reactions');

  // Convert inputs into Base SI for the pure calculation engine
  const siBeamModel = useMemo<BeamModel>(() => {
    const spanSI = convertUnit(spanInput, lengthUnit, 'm');

    const pointLoadsSI: PointLoad[] = pointLoads.map((pl) => ({
      id: pl.id,
      position: convertUnit(pl.position, lengthUnit, 'm'),
      magnitude: convertUnit(pl.magnitude, forceUnit, 'N')
    }));

    const uniformLoadsSI: UniformLoad[] = uniformLoads.map((ul) => ({
      id: ul.id,
      start: convertUnit(ul.start, lengthUnit, 'm'),
      end: convertUnit(ul.end, lengthUnit, 'm'),
      magnitude: convertUnit(ul.magnitude, distLoadUnit, 'N/m')
    }));

    const pointMomentsSI: PointMoment[] = pointMoments.map((pm) => ({
      id: pm.id,
      position: convertUnit(pm.position, lengthUnit, 'm'),
      magnitude: convertUnit(pm.magnitude, momentUnit, 'N*m')
    }));

    if (beamType === 'simply-supported') {
      return {
        type: 'simply-supported',
        span: spanSI,
        supportA: { position: 0 },
        supportB: { position: spanSI },
        pointLoads: pointLoadsSI,
        uniformLoads: uniformLoadsSI,
        pointMoments: pointMomentsSI
      };
    } else {
      return {
        type: 'cantilever',
        span: spanSI,
        fixedEnd,
        pointLoads: pointLoadsSI,
        uniformLoads: uniformLoadsSI,
        pointMoments: pointMomentsSI
      };
    }
  }, [beamType, fixedEnd, spanInput, pointLoads, uniformLoads, pointMoments, lengthUnit, forceUnit, distLoadUnit, momentUnit]);

  // Modulus of Elasticity and Second Moment of Area in Base SI
  const eInPa = useMemo(() => convertUnit(eValue, eUnit, 'Pa'), [eValue, eUnit]);
  const iInM4 = useMemo(() => convertUnit(iValue, iUnit, 'm^4'), [iValue, iUnit]);

  // Run analytical reactions solver
  const results = useMemo(() => {
    return solveBeamReactions(siBeamModel);
  }, [siBeamModel]);

  // Run general deflection solver
  const deflectionResult = useMemo(() => {
    return solveGeneralDeflection(siBeamModel, { E: eInPa, I: iInM4 });
  }, [siBeamModel, eInPa, iInM4]);

  // Check if current beam matches a standard canonical case for benchmark validation
  const standardCaseBenchmark = useMemo(() => {
    if (!results.isValid || !deflectionResult.isValid) return null;
    const L = siBeamModel.span;

    if (siBeamModel.type === 'simply-supported') {
      // Case 1: Central Point Load only
      if (
        siBeamModel.pointLoads.length === 1 &&
        siBeamModel.uniformLoads.length === 0 &&
        siBeamModel.pointMoments.length === 0 &&
        Math.abs(siBeamModel.pointLoads[0].position - L / 2) < 1e-4
      ) {
        const std = solveStandardDeflection('ss-central-point', {
          L,
          P: siBeamModel.pointLoads[0].magnitude,
          E: eInPa,
          I: iInM4
        });
        return {
          name: 'Simply Supported Central Point Load (P at midspan)',
          formulaDeflection: std.formulaDeflection,
          formulaSlope: std.formulaSlope,
          stdDeflection: std.maxDeflectionMagnitude,
          stdSlope: std.maxSlopeMagnitude,
        };
      }

      // Case 2: Full Span UDL only
      if (
        siBeamModel.pointLoads.length === 0 &&
        siBeamModel.uniformLoads.length === 1 &&
        siBeamModel.pointMoments.length === 0 &&
        Math.abs(siBeamModel.uniformLoads[0].start) < 1e-4 &&
        Math.abs(siBeamModel.uniformLoads[0].end - L) < 1e-4
      ) {
        const std = solveStandardDeflection('ss-full-udl', {
          L,
          w: siBeamModel.uniformLoads[0].magnitude,
          E: eInPa,
          I: iInM4
        });
        return {
          name: 'Simply Supported Full-Span UDL (w over entire span)',
          formulaDeflection: std.formulaDeflection,
          formulaSlope: std.formulaSlope,
          stdDeflection: std.maxDeflectionMagnitude,
          stdSlope: std.maxSlopeMagnitude,
        };
      }
    } else if (siBeamModel.type === 'cantilever' && siBeamModel.fixedEnd === 'left') {
      // Case 3: Cantilever End Point Load
      if (
        siBeamModel.pointLoads.length === 1 &&
        siBeamModel.uniformLoads.length === 0 &&
        siBeamModel.pointMoments.length === 0 &&
        Math.abs(siBeamModel.pointLoads[0].position - L) < 1e-4
      ) {
        const std = solveStandardDeflection('cantilever-end-point', {
          L,
          P: siBeamModel.pointLoads[0].magnitude,
          E: eInPa,
          I: iInM4
        });
        return {
          name: 'Cantilever with End Point Load (P at tip)',
          formulaDeflection: std.formulaDeflection,
          formulaSlope: std.formulaSlope,
          stdDeflection: std.maxDeflectionMagnitude,
          stdSlope: std.maxSlopeMagnitude,
        };
      }

      // Case 4: Cantilever Full UDL
      if (
        siBeamModel.pointLoads.length === 0 &&
        siBeamModel.uniformLoads.length === 1 &&
        siBeamModel.pointMoments.length === 0 &&
        Math.abs(siBeamModel.uniformLoads[0].start) < 1e-4 &&
        Math.abs(siBeamModel.uniformLoads[0].end - L) < 1e-4
      ) {
        const std = solveStandardDeflection('cantilever-full-udl', {
          L,
          w: siBeamModel.uniformLoads[0].magnitude,
          E: eInPa,
          I: iInM4
        });
        return {
          name: 'Cantilever with Full-Span UDL (w over entire span)',
          formulaDeflection: std.formulaDeflection,
          formulaSlope: std.formulaSlope,
          stdDeflection: std.maxDeflectionMagnitude,
          stdSlope: std.maxSlopeMagnitude,
        };
      }

      // Case 5: Cantilever End Moment
      if (
        siBeamModel.pointLoads.length === 0 &&
        siBeamModel.uniformLoads.length === 0 &&
        siBeamModel.pointMoments.length === 1 &&
        Math.abs(siBeamModel.pointMoments[0].position - L) < 1e-4
      ) {
        const std = solveStandardDeflection('cantilever-end-moment', {
          L,
          M: Math.abs(siBeamModel.pointMoments[0].magnitude),
          E: eInPa,
          I: iInM4
        });
        return {
          name: 'Cantilever with End Moment (M at tip)',
          formulaDeflection: std.formulaDeflection,
          formulaSlope: std.formulaSlope,
          stdDeflection: std.maxDeflectionMagnitude,
          stdSlope: std.maxSlopeMagnitude,
        };
      }
    }

    return null;
  }, [siBeamModel, results.isValid, deflectionResult.isValid, eInPa, iInM4]);

  // Load Helpers
  const addPointLoad = () => {
    const newId = `p-${Date.now()}`;
    setPointLoads([...pointLoads, { id: newId, position: Math.round((spanInput / 2) * 10) / 10, magnitude: 5.0 }]);
  };

  const removePointLoad = (id: string) => {
    setPointLoads(pointLoads.filter(p => p.id !== id));
  };

  const addUniformLoad = () => {
    const newId = `u-${Date.now()}`;
    setUniformLoads([...uniformLoads, { id: newId, start: 0, end: spanInput, magnitude: 2.0 }]);
  };

  const removeUniformLoad = (id: string) => {
    setUniformLoads(uniformLoads.filter(u => u.id !== id));
  };

  const addPointMoment = () => {
    const newId = `m-${Date.now()}`;
    setPointMoments([...pointMoments, { id: newId, position: Math.round((spanInput / 2) * 10) / 10, magnitude: 15.0 }]);
  };

  const removePointMoment = (id: string) => {
    setPointMoments(pointMoments.filter(m => m.id !== id));
  };

  // Units for deflection display
  const dispDeflUnit = lengthUnit === 'm' ? 'mm' : 'in';
  const deflMultiplier = dispDeflUnit === 'mm' ? 1000 : 1 / 0.0254;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 engineering-grid">
      {/* Top Header */}
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
                  Statically Determinate Beam Analyzer
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/50">
                  M5 Deflection Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Pure Analytical Structural Mechanics & Macaulay Deflection</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => {
                setUnitSystem('metric');
                setEUnit('GPa');
                setIUnit('m^4');
              }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'metric'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Metric (SI)
            </button>
            <button
              onClick={() => {
                setUnitSystem('imperial');
                setEUnit('ksi');
                setIUnit('in^4');
              }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'imperial'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Imperial (US)
            </button>
          </div>
        </div>
      </header>

      {/* Mandatory Limitations Notice */}
      <section className="bg-amber-950/30 border-b border-amber-500/20 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center space-x-2.5 text-xs text-amber-200/90">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Educational Notice:</strong> CivilCalc AI provides preliminary verified deflection under Euler-Bernoulli assumptions. Does not replace independent engineer verification.
          </span>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Geometry, Stiffness & Loads (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Beam Geometry Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-400">
                <Layers className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Beam Geometry & Supports
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Units: {lengthUnit}, {forceUnit}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Beam Support Configuration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBeamType('simply-supported')}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      beamType === 'simply-supported'
                        ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>Simply Supported</div>
                    <div className="text-[10px] text-slate-500 font-normal">Pin at A, Roller at B</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBeamType('cantilever')}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                      beamType === 'cantilever'
                        ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>Cantilever</div>
                    <div className="text-[10px] text-slate-500 font-normal">Fixed at one end, free other</div>
                  </button>
                </div>
              </div>

              {beamType === 'cantilever' && (
                <div>
                  <label className="block text-slate-400 mb-1">Fixed End Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFixedEnd('left')}
                      className={`py-1.5 px-3 rounded-lg border text-xs text-center ${
                        fixedEnd === 'left'
                          ? 'bg-sky-900/50 border-sky-500 text-sky-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Fixed at Left (x = 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedEnd('right')}
                      className={`py-1.5 px-3 rounded-lg border text-xs text-center ${
                        fixedEnd === 'right'
                          ? 'bg-sky-900/50 border-sky-500 text-sky-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Fixed at Right (x = L)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Total Span Length (L)</label>
                <div className="flex rounded-lg shadow-sm">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={spanInput}
                    onChange={(e) => setSpanInput(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-l-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-800 bg-slate-800/80 text-xs text-slate-300 font-mono">
                    {lengthUnit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Material & Flexural Rigidity (E & I) Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-400">
                <Compass className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Flexural Rigidity (E · I)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                EI = {(deflectionResult.EI / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kN·m²
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Material Presets (Typical Values)</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {MATERIAL_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.description})</option>
                  ))}
                  <option value="custom">Custom Values</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Preset values are typical preliminary guides. Always verify against design codes and specification sheets.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Modulus of Elasticity E */}
                <div>
                  <label className="block text-slate-400 mb-1">Elastic Modulus (E)</label>
                  <div className="flex rounded-md shadow-sm">
                    <input
                      type="number"
                      step="any"
                      value={eValue}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setEValue(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-l-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    <select
                      value={eUnit}
                      onChange={(e) => setEUnit(e.target.value as StressUnit)}
                      className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-md px-2 py-1 text-[11px] text-slate-300 font-mono"
                    >
                      <option value="GPa">GPa</option>
                      <option value="MPa">MPa</option>
                      <option value="ksi">ksi</option>
                      <option value="psi">psi</option>
                    </select>
                  </div>
                </div>

                {/* Second Moment of Area I */}
                <div>
                  <label className="block text-slate-400 mb-1">Moment of Inertia (I)</label>
                  <div className="flex rounded-md shadow-sm">
                    <input
                      type="number"
                      step="any"
                      value={iValue}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setIValue(parseFloat(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-l-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    <select
                      value={iUnit}
                      onChange={(e) => setIUnit(e.target.value as InertiaUnit)}
                      className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-md px-2 py-1 text-[11px] text-slate-300 font-mono"
                    >
                      <option value="m^4">m⁴</option>
                      <option value="mm^4">mm⁴</option>
                      <option value="cm^4">cm⁴</option>
                      <option value="in^4">in⁴</option>
                    </select>
                  </div>
                </div>
              </div>

              {onOpenSectionCalculator && (
                <button
                  type="button"
                  onClick={onOpenSectionCalculator}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-xs font-medium flex items-center justify-center space-x-1.5 border border-slate-700/80 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Calculate Ix from Custom Cross-Section...</span>
                </button>
              )}
            </div>
          </div>

          {/* Loads Manager Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-400">
                <Scale className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Applied External Loads
                </h2>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={addPointLoad}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Point Load</span>
                </button>
                <button
                  onClick={addUniformLoad}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>UDL</span>
                </button>
                <button
                  onClick={addPointMoment}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Moment</span>
                </button>
              </div>
            </div>

            {/* Point Loads List */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Concentrated Point Loads (P, downward)
              </div>
              {pointLoads.length === 0 ? (
                <div className="text-slate-500 italic py-1 text-center bg-slate-950/40 rounded border border-slate-900">
                  No point loads applied
                </div>
              ) : (
                pointLoads.map((pl, idx) => (
                  <div key={pl.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
                    <span className="font-mono text-sky-400 font-bold w-6">P{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Position (x)</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            value={pl.position}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPointLoads(pointLoads.map(p => p.id === pl.id ? { ...p, position: val } : p));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <span className="ml-1 text-[10px] font-mono text-slate-500">{lengthUnit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Magnitude (P)</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            value={pl.magnitude}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPointLoads(pointLoads.map(p => p.id === pl.id ? { ...p, magnitude: val } : p));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <span className="ml-1 text-[10px] font-mono text-slate-500">{forceUnit}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removePointLoad(pl.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove load"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Uniform Loads List */}
            <div className="space-y-2 text-xs pt-1">
              <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Uniformly Distributed Loads (w, downward)
              </div>
              {uniformLoads.length === 0 ? (
                <div className="text-slate-500 italic py-1 text-center bg-slate-950/40 rounded border border-slate-900">
                  No uniform loads applied
                </div>
              ) : (
                uniformLoads.map((ul, idx) => (
                  <div key={ul.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sky-400 font-bold">UDL {idx + 1}</span>
                      <button
                        onClick={() => removeUniformLoad(ul.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove load"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Start (x)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ul.start}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setUniformLoads(uniformLoads.map(u => u.id === ul.id ? { ...u, start: val } : u));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">End (x)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ul.end}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setUniformLoads(uniformLoads.map(u => u.id === ul.id ? { ...u, end: val } : u));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Load (w)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ul.magnitude}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setUniformLoads(uniformLoads.map(u => u.id === ul.id ? { ...u, magnitude: val } : u));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Point Moments List */}
            <div className="space-y-2 text-xs pt-1">
              <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Concentrated Moments (M, CCW = positive)
              </div>
              {pointMoments.length === 0 ? (
                <div className="text-slate-500 italic py-1 text-center bg-slate-950/40 rounded border border-slate-900">
                  No applied moments
                </div>
              ) : (
                pointMoments.map((pm, idx) => (
                  <div key={pm.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
                    <span className="font-mono text-sky-400 font-bold w-6">M{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Position (x)</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            value={pm.position}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPointMoments(pointMoments.map(m => m.id === pm.id ? { ...m, position: val } : m));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <span className="ml-1 text-[10px] font-mono text-slate-500">{lengthUnit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Moment (M)</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            value={pm.magnitude}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPointMoments(pointMoments.map(m => m.id === pm.id ? { ...m, magnitude: val } : m));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <span className="ml-1 text-[10px] font-mono text-slate-500">{momentUnit}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removePointMoment(pm.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove moment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Output Tabs & Diagrams (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Workspace Tabs Header */}
          <div className="flex items-center space-x-1 border-b border-slate-800 pb-2 text-xs font-medium">
            <button
              onClick={() => setActiveTab('deflection')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'deflection'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Slope & Deflection</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">M5</span>
            </button>

            <button
              onClick={() => setActiveTab('reactions')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'reactions'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Reactions & Equilibrium</span>
            </button>

            <button
              onClick={() => setActiveTab('equations')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'equations'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Worked Equations</span>
            </button>

            <button
              onClick={() => setActiveTab('diagrams')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'diagrams'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>Diagrams (SFD / BMD)</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">M4</span>
            </button>
          </div>

          {/* Validation Error Banner */}
          {!results.isValid && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start space-x-3 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300">Input Validation Error:</span> {results.errorMessage}
              </div>
            </div>
          )}

          {/* TAB: Slope & Deflection (M5 Active) */}
          {activeTab === 'deflection' && results.isValid && deflectionResult.isValid && (
            <div className="space-y-5">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/40 shadow-lg shadow-sky-950/30 space-y-1">
                  <div className="text-[11px] font-mono text-sky-400 uppercase">Maximum Deflection (y_max)</div>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight">
                    {(deflectionResult.maxDeflection.value * deflMultiplier).toFixed(3)} {dispDeflUnit}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Location: x = {deflectionResult.maxDeflection.location.toFixed(2)} {lengthUnit} {deflectionResult.maxDeflection.value < 0 ? '(Downward, -)' : '(Upward, +)'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Maximum Slope (θ_max)</div>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight">
                    {(deflectionResult.maxSlope.magnitude * 1000).toFixed(3)} mrad
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Location: x = {deflectionResult.maxSlope.location.toFixed(2)} {lengthUnit} ({deflectionResult.maxSlope.magnitude.toFixed(6)} rad)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Flexural Rigidity (EI)</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                    {(deflectionResult.EI / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kN·m²
                  </div>
                  <div className="text-[11px] text-slate-400">
                    E = {eValue} {eUnit}, I = {iValue} {iUnit}
                  </div>
                </div>
              </div>

              {/* Standard Case Comparison Badge (if canonical loading matches) */}
              {standardCaseBenchmark && (
                <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-300">
                      Canonical Standard Case Detected: {standardCaseBenchmark.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Exact Closed-Form Match
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                    <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">Closed-Form Deflection Formula:</div>
                      <div className="text-sky-300 mt-0.5">{standardCaseBenchmark.formulaDeflection}</div>
                      <div className="text-emerald-400 mt-0.5">
                        δ_std = {(standardCaseBenchmark.stdDeflection * deflMultiplier).toFixed(3)} {dispDeflUnit} (matches Macaulay)
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">Closed-Form Slope Formula:</div>
                      <div className="text-sky-300 mt-0.5">{standardCaseBenchmark.formulaSlope}</div>
                      <div className="text-emerald-400 mt-0.5">
                        θ_std = {(standardCaseBenchmark.stdSlope * 1000).toFixed(3)} mrad (matches Macaulay)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aligned Diagrams: BMD and Deflected Curve on same x-axis */}
              <DeflectionDiagram
                deflectionResult={deflectionResult}
                span={spanInput}
                lengthUnit={lengthUnit}
                forceUnit={forceUnit}
                momentUnit={momentUnit}
              />
            </div>
          )}

          {/* TAB: Reactions & Equilibrium */}
          {activeTab === 'reactions' && results.isValid && (
            <div className="space-y-4">
              {/* Primary Reaction Result Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.beamType === 'simply-supported' ? (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/30 space-y-1">
                      <div className="text-xs font-mono text-sky-400 uppercase">Support A Reaction (x = 0)</div>
                      <div className="text-2xl font-bold font-mono text-white tracking-tight">
                        {formatQuantity(convertUnit(results.reactions.RA.vertical, 'N', forceUnit), forceUnit, 3)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Base SI: {results.reactions.RA.vertical.toFixed(1)} N {results.reactions.RA.vertical >= 0 ? '(Upward, +)' : '(Downward, -)'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/30 space-y-1">
                      <div className="text-xs font-mono text-sky-400 uppercase">Support B Reaction (x = L)</div>
                      <div className="text-2xl font-bold font-mono text-white tracking-tight">
                        {formatQuantity(convertUnit(results.reactions.RB.vertical, 'N', forceUnit), forceUnit, 3)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Base SI: {results.reactions.RB.vertical.toFixed(1)} N {results.reactions.RB.vertical >= 0 ? '(Upward, +)' : '(Downward, -)'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/30 space-y-1">
                      <div className="text-xs font-mono text-sky-400 uppercase">Fixed Vertical Shear (R_fixed)</div>
                      <div className="text-2xl font-bold font-mono text-white tracking-tight">
                        {formatQuantity(convertUnit(results.reactions.Rfixed.vertical, 'N', forceUnit), forceUnit, 3)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Base SI: {results.reactions.Rfixed.vertical.toFixed(1)} N (Upward)
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/30 space-y-1">
                      <div className="text-xs font-mono text-sky-400 uppercase">Fixed Reaction Moment (M_fixed)</div>
                      <div className="text-2xl font-bold font-mono text-white tracking-tight">
                        {formatQuantity(convertUnit(results.reactions.Rfixed.moment, 'N*m', momentUnit), momentUnit, 3)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Base SI: {results.reactions.Rfixed.moment.toFixed(1)} N·m {results.reactions.Rfixed.moment >= 0 ? '(Counterclockwise, +)' : '(Clockwise, -)'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Independent Equilibrium Check */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Independent Static Equilibrium Verification</span>
                  </div>
                  <span className="flex items-center space-x-1 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Equilibrium Satisfied</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Vertical Force Balance (ΣFy = 0)</div>
                    <div className="text-white mt-1">Residual ΔFy = {results.equilibrium.sumFy.toExponential(3)} N</div>
                    <div className="text-[10px] text-emerald-400/90 mt-0.5">Tolerance: &lt; {results.equilibrium.tolerance} N</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Moment Balance (ΣM = 0)</div>
                    <div className="text-white mt-1">Residual ΔM = {results.equilibrium.sumM.toExponential(3)} N·m</div>
                    <div className="text-[10px] text-emerald-400/90 mt-0.5">Tolerance: &lt; {results.equilibrium.tolerance} N·m</div>
                  </div>
                </div>
              </div>

              {/* Total Applied Loads Summary */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs space-y-2">
                <div className="text-slate-400 font-semibold uppercase text-[11px]">Load Superposition Summary</div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Total Vertical Applied Force:</span>
                  <span className="font-mono font-semibold text-white">
                    {formatQuantity(convertUnit(results.totalDownwardForce, 'N', forceUnit), forceUnit, 3)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Worked Equations & Steps */}
          {activeTab === 'equations' && results.isValid && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs text-sky-400">
                <Info className="w-4 h-4" />
                <span>Analytical Governing Equations with Explicit Numerical Substitutions</span>
              </div>

              <div className="space-y-3">
                {results.steps.map((step, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <h3 className="font-semibold text-xs text-sky-300 uppercase tracking-wide">
                      {step.title}
                    </h3>
                    <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800/80 space-y-1">
                      <div className="text-sky-400/90">{step.equation}</div>
                      <div className="text-slate-300">{step.substitution}</div>
                      <div className="text-emerald-400 font-bold pt-1">{step.result}</div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {step.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Diagrams Placeholder (M4 Roadmap) */}
          {activeTab === 'diagrams' && (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">
                Dedicated Standalone SFD & BMD Interactive Diagrams
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Per the project plan roadmap, the standalone interactive SFD / BMD suite is slated for <strong>Milestone 4</strong>. (The aligned BMD is already visible in the <strong>Slope & Deflection</strong> tab).
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
