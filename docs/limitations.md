# CivilCalc AI - Limitations & Educational Disclaimer

## Official Notice

> **CivilCalc AI is an educational and preliminary calculation tool. Results depend on the inputs and assumptions shown. It does not replace independent verification, the applicable design codes, or the judgement of a licensed engineer. Do not use these results as the only basis for the design or construction of any structure.**

---

## Phase 1 Assumptions & Scope Boundaries

1. **Statical Determinacy**:
   - Only statically determinate beams are solved in Phase 1 (simply supported beams and cantilevers).
   - Statically indeterminate configurations (propped cantilevers, fixed-fixed beams, continuous multi-span beams) are explicitly rejected with an explanatory message.

2. **Structural Mechanics Assumptions**:
   - **Euler-Bernoulli Beam Theory**: Plane sections remain plane and normal to the longitudinal axis during bending (shear deformation is neglected; valid for slender beams where $L/h \ge 10$).
   - **Linear Elastic Behavior**: Material obeys Hooke's Law ($\sigma = E \epsilon$), with homogeneous and isotropic properties throughout the member.
   - **Small Deflections**: Slope and deflections are small such that $\cos(\theta) \approx 1$ and curvature $\kappa \approx \frac{d^2 y}{dx^2}$.
   - **Prismatic Cross-Sections**: Constant cross-sectional properties ($A$, $I$, $S$) along the length of the span.
   - **No Buckling or Lateral-Torsional Instability**: Deflections are assumed strictly planar in the principal bending plane.

3. **Validation & Checks**:
   - The engine validates numerical inputs: span lengths must be strictly positive, load coordinates must remain within span bounds, and stiffness values ($E, I$) must be non-zero positive numbers.
   - Static equilibrium checks ($\Sigma F_y \approx 0$, $\Sigma M \approx 0$) are performed and reported with numerical residuals.
