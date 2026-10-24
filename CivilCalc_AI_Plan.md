# CivilCalc AI: Project Plan and Build Instructions

You are working as three people at once: a **senior frontend engineer**, a **structural engineering software developer**, and a **software tester**. Read this whole file before writing any code. Follow it in order.

---

## 1. Goal

Build a free, responsive web app called **CivilCalc AI** for civil engineering students and junior engineers.

It must give:

- Correct numerical results
- The formulas used, with substituted values and units
- Step-by-step worked solutions
- Clear engineering diagrams
- Reliable unit handling (metric and imperial)
- Simple explanations in plain English

It is an **educational and preliminary calculation tool**. It is NOT a replacement for a licensed engineer or for independent verification. This must be shown clearly in the app (footer, reports, and an "About / Limitations" page).

---

## 2. Technology

| Part | Choice |
|---|---|
| Framework | React + TypeScript (strict mode) |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Tests | Vitest (and React Testing Library for UI) |
| Diagrams | SVG written by hand, or one well-known plotting library |
| Calculations | Run in the browser (no backend in Phase 1) |
| Hosting | GitHub Pages, deployed by GitHub Actions |

Rules:

- Pin dependency versions and commit the lockfile. Use `npm ci` in CI.
- Do not add a library unless it is really needed. Say why you added it.

---

## 3. Important rules (never break these)

1. **Calculation logic is separate from React.** All engineering code lives in `src/engine/` as pure TypeScript functions with no UI imports.
2. **AI is never the calculation engine.** All numbers come from tested code.
3. **Never show "safe", "OK to build", or "approved"** just because a calculation finished. Only show the numbers, and clearly labelled checks against limits the user entered.
4. **Never invent** a formula, a design-code clause, or a number. If something is not implemented, say it is not supported.
5. **Unsupported cases must be rejected clearly** (for example, a beam configuration the engine cannot solve). Never return a misleading answer.
6. **Validate every input**: positive lengths, load positions inside the span, valid material values, valid units, no empty or non-numeric fields.
7. **Do not say a feature works until its tests pass AND you have checked it in the running app.**
8. **No secrets in the frontend.** No API keys in source code, in the repo, or in the built files.

---

## 4. Units and sign conventions

### Units
- The engine works **internally in SI only** (N, m, Pa, kg, and so on).
- Convert at the edges: input converts to SI, output converts to the chosen display units.
- Support metric and imperial. Also support kN, kN/m, kN·m, MPa, GPa, mm, cm, m, in, ft, kip, psi, ksi, lb/ft.
- Every number on screen shows its unit.
- Conversion has unit tests with known values (for example 1 in = 0.0254 m exactly, 1 kip = 4448.2216 N).

### Sign conventions (write these in `docs/sign-conventions.md` and show them in the app next to every diagram)
- x axis: positive to the right, starting at the left end of the beam.
- Downward loads are entered as positive "load magnitude" and applied downward.
- Upward reactions are positive.
- Applied point moments and reaction moments: **counterclockwise = positive** (standard equilibrium convention: upward and counterclockwise are positive).
- Shear force V: positive when the left face of a cut section moves up relative to the right face.
- Bending moment M: **sagging (tension at the bottom) = positive**.
- Deflection y: positive upward, so a normal downward deflection is negative.

If any rule above must change, change it in one place and update the docs, tests, and diagrams together.

---

## 5. Phase 1 scope: Structural analysis (build ONLY this first)

### 5.1 Beam types supported in Phase 1
- Simply supported beam (pin at one end, roller at the other)
- Cantilever beam (fixed at one end, free at the other)
- Simply supported beam with overhangs (optional, only if all tests pass first)

All of these are **statically determinate**. Statically indeterminate beams (fixed-fixed, propped cantilever, continuous beams) are **not supported** in Phase 1. The app must say so clearly if the user tries to create one.

### 5.2 Loads
- Point loads (any position)
- Uniformly distributed loads (full span or partial span)
- Applied point moments
- Multiple loads at the same time (superposition)
- Optional later: triangular and trapezoidal distributed loads

### 5.3 Outputs
1. Support reactions (forces and moment for the fixed support)
2. Shear force diagram (SFD)
3. Bending moment diagram (BMD)
4. Maximum and minimum shear and moment, with their locations
5. Slope and deflection (see 5.4)
6. Cross-section properties (see 5.5)
7. Step-by-step worked solution
8. Equilibrium check shown to the user (sum of vertical forces and sum of moments, with residual values)

### 5.4 Slope and deflection
Standard cases first (with closed-form formulas, each covered by tests). Let `E` be the elastic modulus, `I` the second moment of area, `L` the span:

| Case | Max deflection | Max slope |
|---|---|---|
| Simply supported, central point load P | `P L^3 / (48 E I)` | `P L^2 / (16 E I)` |
| Simply supported, full-span UDL w | `5 w L^4 / (384 E I)` | `w L^3 / (24 E I)` |
| Cantilever, end point load P | `P L^3 / (3 E I)` | `P L^2 / (2 E I)` |
| Cantilever, full-span UDL w | `w L^4 / (8 E I)` | `w L^3 / (6 E I)` |
| Cantilever, end moment M | `M L^2 / (2 E I)` | `M L / (E I)` |

Then, for **general loading** on the supported beam types, compute deflection by integrating the bending moment equation exactly (piecewise polynomials, for example the Macaulay method) and applying boundary conditions. Do not use curve fitting or AI for this.

The deflection result must show: `E`, `I`, the method used, and the assumptions (linear elastic, small deflection, prismatic beam, bending deformation only).

### 5.5 Cross-section properties
Shapes: rectangle, circle, hollow rectangle, hollow circle, I-section, T-section, and a **composite section** built from rectangles.

For each shape, show:
- Area `A`
- Centroid (`x̄`, `ȳ`)
- Second moment of area (`Ix`, `Iy`) about the centroidal axes
- Section modulus (`Sx`, `Sy`, top and bottom where they differ)
- Radius of gyration (`rx`, `ry`)
- Parallel axis theorem steps for composite sections

### 5.6 Material helper (optional but useful)
- Preset values for `E` (steel, concrete, timber, aluminium) that the user can edit
- Clear label: "typical value, check your design code and material data"

---

## 6. Calculation requirements

- Show for every calculation: assumptions, the governing equations, substituted values with units, and the final result.
- Check force equilibrium and moment equilibrium **independently** of the solving method.
- Floating-point tolerance: tests compare with a relative tolerance (for example `1e-9` for closed-form results) and an absolute tolerance near zero.
- Handle edge cases: load at a support, load at the free end, zero loads, loads that cancel each other, very small or very large values, and invalid positions.
- Decide and document how the app handles a load that is exactly on a support.

---

## 7. Benchmark tests (write these BEFORE the implementation of each feature)

Use hand calculations and published textbook cases. At minimum:

**Reactions and diagrams**
- Simply supported, central point load P: `R_A = R_B = P/2`, `M_max = P L / 4` at midspan.
- Simply supported, full-span UDL w: `R_A = R_B = w L / 2`, `M_max = w L^2 / 8` at midspan.
- Simply supported, point load at distance `a` from A: `R_A = P (L - a) / L`, `R_B = P a / L`.
- Cantilever, end point load P: `V = P`, `M_fixed = P L`.
- Cantilever, full-span UDL w: `V = w L`, `M_fixed = w L^2 / 2`.
- Applied moment cases, partial UDL cases, and mixed loading (compare against hand calculation and superposition).

**Deflection**
- All five cases in the table in section 5.4.
- General-load solver must reproduce the closed-form values for those same cases.
- Cross-check against an independent numerical method (for example a simple finite-element beam model used **only in tests**).

**Other tests**
- Equilibrium residuals are near zero for random valid loadings (property-style tests).
- Unit conversions in both directions.
- Sign conventions (upward/downward, clockwise/anticlockwise, sagging/hogging).
- Section properties against known values (for example rectangle `I = b h^3 / 12`, circle `I = π d^4 / 64`).
- Input validation and rejection of unsupported configurations.

---

## 8. User interface

- Dashboard with a **searchable calculator library**. At first only Structural Analysis is active; show future calculators as "Coming soon" cards.
- **Beam editor:** editable supports, span, and loads, with a live drawing of the beam.
- **Tabs:** Inputs, Results, Equations, Diagrams.
- Clear forms with units next to every field, and helpful error messages next to the wrong field.
- **Calculation history** saved locally in the browser (localStorage). Every history item can be reopened, renamed, and deleted. Add a "clear all history" button. Handle storage errors without crashing.
- **Export:** JSON (calculation data), CSV (diagram data), and a **printable report** (print-friendly page that can be saved as PDF).
- Reports include: inputs, assumptions, equations, step-by-step working, results, diagrams, the date, the app version, and the limitations notice.
- **Responsive** for mobile and desktop (many users will use a phone).
- **Accessible:** labels on all inputs, keyboard navigation, visible focus, enough colour contrast, and diagrams with text descriptions.
- Light and dark mode are welcome but not required.
- Language: English first. Keep all text in one place (a simple translations file) so Urdu can be added later.

---

## 9. Explanations and AI

### In Phase 1 (no AI service)
Add an **"Explain this result"** feature that is **template-based**: it builds plain-English explanations from the engine's actual output (for example, "The maximum bending moment is X at Y because ..."). No external service is needed.

### Later (optional, after Phase 1 is finished and tested)
Design an optional AI assistant that can:
- Explain verified numerical results in simple English.
- Explain engineering formulas in simple English.
- Help students understand mistakes in their working.
- Read an uploaded problem image **only after the user confirms** the extracted geometry, loads, and supports in an editable form.

Rules for the AI assistant:
- The numbers always come from the calculation engine. The AI only explains them.
- It must never invent a formula, a design-code clause, or a number.
- **GitHub Pages is static hosting, so API keys cannot be hidden in the frontend.** The AI feature therefore needs either:
  (a) a small serverless proxy (for example a Cloudflare Worker or similar) that holds the key and has rate limits, or
  (b) "bring your own key", where the user types their own key, stored only in their browser, with a clear warning.
- Do not build the AI feature until the plan for the key is agreed with the project owner.
- Show a label "AI explanation, verify with the numerical results" next to AI text.

---

## 10. Project structure (suggested)

```
civilcalc-ai/
├─ .github/workflows/deploy.yml
├─ docs/
│  ├─ sign-conventions.md
│  ├─ equations.md
│  └─ limitations.md
├─ src/
│  ├─ engine/
│  │  ├─ units/
│  │  ├─ beams/
│  │  ├─ sections/
│  │  └─ validation/
│  ├─ components/
│  ├─ pages/
│  ├─ hooks/
│  ├─ reports/
│  └─ main.tsx
├─ tests/ (or tests beside each module)
├─ index.html
├─ package.json
├─ vite.config.ts
└─ README.md
```

---

## 11. Deployment to GitHub Pages (common problems to handle)

- Set Vite `base` to `'/<repository-name>/'` (or read it from an environment variable). Without this the site shows a blank page.
- Use a router mode that works on static hosting (hash routing, or a `404.html` fallback), so refreshing a page does not give "404".
- GitHub Actions workflow: install with `npm ci`, run lint, run type check, run tests, build, upload the `dist` folder, and deploy to Pages. **Deployment must fail if any test fails.**
- Tell the project owner to set the repository's Pages source to **GitHub Actions** in the repository settings.
- Confirm the live URL works on desktop and on a phone.

---

## 12. Development process (build in this order)

After **each milestone**: run the tests, check the feature in the running app, then **stop and give a short summary** (what was built, what was tested, what is not done, any problems). Wait for approval before the next milestone.

1. Create the project structure, tooling, lint, type checking, and the basic interface shell.
2. Implement the **unit system** with tests.
3. Implement **beam reactions** (explain equations and assumptions first, write tests, then implement).
4. Add **shear force and bending moment diagrams**.
5. Add **slope and deflection** (standard cases first, then general loading).
6. Add **cross-section properties**.
7. Add **reports, exports, and local calculation history**.
8. Add the **template-based "Explain this result"** feature.
9. Run the full test suite, fix errors, review accessibility and mobile layout.
10. Configure and verify **GitHub Pages deployment**.
11. (Optional, only after approval) Add AI integration with the agreed key strategy.

Before implementing each calculation: **explain the equations and assumptions, then write the tests, then implement.**

---

## 13. Definition of done for Phase 1

- [ ] All benchmark tests pass.
- [ ] Equilibrium checks pass for all supported loadings.
- [ ] Unsupported beam types are rejected with a clear message.
- [ ] Diagrams match hand calculations for at least five different loadings (checked by eye in the running app).
- [ ] Units work in metric and imperial, and results match.
- [ ] Reports print correctly and include the limitations notice.
- [ ] The app works on a phone-sized screen.
- [ ] The live GitHub Pages site loads without errors.
- [ ] `README.md` explains how to run, test, and deploy, and lists the limitations.
- [ ] No API keys or secrets exist anywhere in the repository.

---

## 14. Future roadmap (do NOT build now)

- **Phase 2: Reinforced concrete.** Beam, slab, column, and footing design checks. The design code must be chosen by the project owner (for example ACI 318, and the Building Code of Pakistan where applicable). Never invent clause numbers; use only verified references.
- **Phase 3: Materials and estimating.** Concrete mix design, steel bar weight and cutting length, and a quantity and cost estimator with editable local rates (PKR) and local land units (marla, kanal).
- **Phase 4: Hydraulics and hydrology.** Manning's equation, pipe flow, rainfall intensity.
- **Phase 5: Surveying and geotechnical.** Levelling, coordinate area, bearing capacity.
- **Extras:** shareable links that keep inputs, offline use (PWA), Urdu interface, and statically indeterminate beams.

---

## 15. Limitations notice (use this text in the app and in reports)

> CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer. Do not use these results as the only basis for the design or construction of any structure.

---

## 16. First instruction to the agent

Start with **Milestone 1 only**. Before writing code, show a short implementation plan (file structure, libraries, and the order of work) and the exact sign conventions you will use. Then build, test, and stop for review.
