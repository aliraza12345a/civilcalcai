import React, { useState } from 'react';
import { 
  Compass, 
  Search, 
  ShieldAlert, 
  BookOpen, 
  Layers, 
  Activity, 
  CheckCircle2, 
  ChevronRight,
  GitBranch,
  Info
} from 'lucide-react';

interface CalculatorItem {
  id: string;
  title: string;
  category: 'structural' | 'concrete' | 'geotech' | 'hydraulics' | 'materials';
  phase: string;
  status: 'active' | 'coming-soon';
  description: string;
  tags: string[];
}

const CALCULATORS: CalculatorItem[] = [
  {
    id: 'structural-beams',
    title: 'Statically Determinate Beam Analyzer',
    category: 'structural',
    phase: 'Phase 1 (Milestone 2+)',
    status: 'active',
    description: 'Simply supported and cantilever beam solver with exact reactions, SFD, BMD, slope, deflection, and worked equilibrium solutions.',
    tags: ['Reactions', 'SFD & BMD', 'Macaulay Deflection', 'SI / Imperial']
  },
  {
    id: 'cross-sections',
    title: 'Cross-Section Properties Calculator',
    category: 'structural',
    phase: 'Phase 1 (Milestone 6)',
    status: 'active',
    description: 'Calculates area, centroid (x̄, ȳ), moment of inertia (Ix, Iy), section modulus, and parallel axis theorem steps for composite shapes.',
    tags: ['Centroid', 'Moments of Inertia', 'Composite Sections', 'Steel Shapes']
  },
  {
    id: 'rc-beam-design',
    title: 'Reinforced Concrete Beam Capacity',
    category: 'concrete',
    phase: 'Phase 2',
    status: 'coming-soon',
    description: 'Flexural and shear capacity verification for singly and doubly reinforced rectangular and T-beams with verified code clauses.',
    tags: ['ACI 318', 'Ultimate Moment', 'Shear Stirrups', 'Code Checks']
  },
  {
    id: 'concrete-mix',
    title: 'Concrete Mix Design & Rebar Estimator',
    category: 'materials',
    phase: 'Phase 3',
    status: 'coming-soon',
    description: 'Target strength mix proportioning (IS/ACI methods), bar bending schedules (BBS), and unit weight calculations.',
    tags: ['Mix Design', 'Bar Bending Schedule', 'Quantity Estimating']
  },
  {
    id: 'open-channel-flow',
    title: 'Manning’s Open Channel Flow',
    category: 'hydraulics',
    phase: 'Phase 4',
    status: 'coming-soon',
    description: 'Normal depth, critical depth, flow velocity, and discharge for rectangular, trapezoidal, and circular channels.',
    tags: ['Manning Equation', 'Hydraulic Radius', 'Specific Energy']
  },
  {
    id: 'shallow-foundations',
    title: 'Shallow Foundation Bearing Capacity',
    category: 'geotech',
    phase: 'Phase 5',
    status: 'coming-soon',
    description: 'Terzaghi and Meyerhof ultimate and allowable bearing capacity checks for strip, square, and rectangular footings.',
    tags: ['Terzaghi', 'Meyerhof', 'Bearing Capacity', 'Soil Mechanics']
  }
];

interface DashboardProps {
  onSelectCalculator?: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCalculator }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSignConventions, setShowSignConventions] = useState(false);

  const filteredCalculators = CALCULATORS.filter((calc) => {
    const matchesSearch = calc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || calc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 engineering-grid">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-300 bg-clip-text text-transparent">
                  CivilCalc AI
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/50">
                  Phase 1
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Structural & Civil Engineering Analysis Suite</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setShowSignConventions(!showSignConventions)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Sign Conventions</span>
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-800 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span>CI/CD Pages</span>
            </a>
          </div>
        </div>
      </header>

      {/* Prominent Educational Limitations Banner */}
      <section className="bg-amber-950/30 border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-start space-x-3 text-xs text-amber-200/90 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 mr-1.5">Educational & Preliminary Tool Notice:</span>
            CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer. Do not use these results as the only basis for the design or construction of any structure.
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Sign Conventions Drawer / Panel */}
        {showSignConventions && (
          <div className="p-5 rounded-xl bg-slate-900/90 border border-sky-500/30 shadow-xl shadow-sky-950/40 animate-in fade-in duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-400">
                <Info className="w-5 h-5" />
                <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-200">
                  Exact Structural Sign Conventions (SI & Imperial)
                </h2>
              </div>
              <button
                onClick={() => setShowSignConventions(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">1. Coordinates & Span</div>
                <p>x-axis starts at left beam tip (x = 0) and is positive to the right. y-axis is positive upward.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">2. External Loads</div>
                <p>Downward gravity loads (P, w) entered as positive magnitudes, acting in -y direction. Applied CCW moments are positive (+M).</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">3. Support Reactions</div>
                <p>Upward vertical reactions are positive (+R). Counterclockwise reaction moments at fixed supports are positive (+M).</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">4. Internal Shear Force (V)</div>
                <p>Positive shear: Left segment shears upward relative to the right segment (ΣF_y on left = +V).</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">5. Internal Bending Moment (M)</div>
                <p>Sagging moment (tension at bottom, compression at top) is POSITIVE (+M). Hogging moment is negative (-M).</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-sky-300">6. Deflection & Slope</div>
                <p>Upward displacement is positive (+y). Downward deflection is negative (-y). EI · (d²y/dx²) = M(x).</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-sky-400">
            <Activity className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            <span>Phase 1 In Progress: Structural Engineering Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-3xl">
            Verified Civil Engineering Calculations with Step-by-Step Rigor.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Pure TypeScript calculation core with zero AI hallucination. Every result includes explicit governing equations, substituted values, equilibrium balance, and unit conversions.
          </p>
        </section>

        {/* Search & Filter Toolbar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search calculators (e.g. beam, moment, shear, deflection)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'structural', label: 'Structural' },
              { id: 'concrete', label: 'Concrete' },
              { id: 'materials', label: 'Materials' },
              { id: 'hydraulics', label: 'Hydraulics' },
              { id: 'geotech', label: 'Geotech' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === tab.id
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Calculators Library Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCalculators.map((calc) => {
            const isClickable = calc.status === 'active' && !!onSelectCalculator;
            return (
              <div
                key={calc.id}
                onClick={() => {
                  if (isClickable) {
                    onSelectCalculator(calc.id);
                  }
                }}
                className={`flex flex-col justify-between rounded-xl p-5 border transition-all duration-200 ${
                  calc.status === 'active'
                    ? 'bg-gradient-to-b from-slate-900 to-slate-900/90 border-sky-500/50 shadow-lg shadow-sky-950/50 hover:border-sky-400 cursor-pointer hover:scale-[1.01]'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      calc.status === 'active'
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600/40'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/40'
                    }`}>
                      {calc.phase}
                    </span>
                    {calc.status === 'active' ? (
                      <span className="flex items-center space-x-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{calc.id === 'cross-sections' ? 'Active (M6)' : 'Active (M2 - M5)'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-slate-100 flex items-center group">
                      <span>{calc.title}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {calc.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {calc.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/60 text-slate-400 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  {calc.status === 'active' ? (
                    <div className="flex items-center justify-between w-full text-sky-400 font-medium group-hover:text-sky-300">
                      <span>Open Reactions Analyzer</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Scheduled per roadmap</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Milestone 1 Architecture Checklist */}
        <section className="rounded-xl p-5 bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Milestone 1 Architecture & Quality Control Invariants
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="font-semibold text-sky-300">Engine Isolation</div>
              <p className="text-slate-400 mt-1">All engineering calculations are isolated in pure TypeScript files in <code className="text-sky-300 font-mono">src/engine/</code>.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="font-semibold text-sky-300">Deterministic Calculations</div>
              <p className="text-slate-400 mt-1">Zero AI dependency for math. All calculations use verifiable formulas, equilibrium checks, and tolerance assertions.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="font-semibold text-sky-300">Internal SI Units</div>
              <p className="text-slate-400 mt-1">Engine calculates strictly in base SI (N, m, Pa, kg). Converts at boundaries to user-selected metric and imperial units.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <div className="font-semibold text-sky-300">Static Pages CI/CD</div>
              <p className="text-slate-400 mt-1">Built with Vite relative asset paths and tested automatically via GitHub Actions prior to deployment.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 text-xs text-slate-400 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-200">CivilCalc AI</span> &bull; Educational Civil Engineering Calculation Platform
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <a href="#sign-conventions" onClick={(e) => { e.preventDefault(); setShowSignConventions(true); }} className="hover:text-sky-300 transition-colors">
              Sign Conventions
            </a>
            <span className="text-slate-700">&bull;</span>
            <span className="text-slate-500">Milestone 1 Completed</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
