# CivilCalc AI

An educational and preliminary structural and civil engineering calculation suite designed for students and junior engineers.

CivilCalc AI delivers deterministic, verified numerical solutions with step-by-step working, governing formulas, equilibrium checks, and interactive diagrams.

---

## ⚠️ Limitations & Educational Disclaimer

> **CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer. Do not use these results as the only basis for the design or construction of any structure.**

See [docs/limitations.md](docs/limitations.md), [docs/sign-conventions.md](docs/sign-conventions.md), and [docs/equations.md](docs/equations.md) for the supported cases, assumptions, equations, and sign conventions.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript (Strict Mode)
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS
- **Testing**: Vitest with React Testing Library and JSDOM
- **Hosting**: GitHub Pages via GitHub Actions CI/CD
- **Engine**: Pure TypeScript functions in `src/engine/` with zero UI coupling and 100% deterministic arithmetic (no AI math).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Running Tests
```bash
npm run test
```

### Type Checking & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```

---

## 🌐 Deployment to GitHub Pages

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`):
1. In your GitHub repository settings, navigate to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main` or `master` branch. The workflow will:
   - Run type checks (`npm run lint`)
   - Execute all Vitest benchmark suites (`npm run test`)
   - Build production assets (`npm run build`)
   - Deploy artifacts to GitHub Pages (deployment fails if any test fails)

---

## 📐 Sign Conventions Summary

- **x-axis**: Positive to the right, originating at the left beam support ($x = 0$).
- **Loads**: Downward gravity loads entered with positive magnitude acting downward ($-y$).
- **Moments**: Counterclockwise (CCW) is positive.
- **Shear Force ($V$)**: Positive when left cut segment shears upward relative to right.
- **Bending Moment ($M$)**: Sagging (tension at bottom fibers) is **positive** ($+M$).
- **Deflection ($y$)**: Upward displacement is positive ($+y$); downward gravity deflection is negative ($-y$).
