# CivilCalc AI - Engineering Sign Conventions

This document establishes the official coordinate system and sign conventions used throughout **CivilCalc AI** in accordance with standard structural engineering theory.

All calculation engine modules in `src/engine/`, diagram renderers, tabular outputs, and unit tests strictly adhere to these conventions.

---

## 1. Coordinate System
- **Origin ($x = 0$)**: Located at the extreme left end of the beam span.
- **$x$-axis (Longitudinal)**: Positive horizontally to the **right** ($x \ge 0$).
- **$y$-axis (Transverse / Vertical)**: Positive **upward** ($+y$).

---

## 2. External Loads
- **Concentrated (Point) Loads ($P$)**:
  - Downward gravity point loads are entered with positive magnitude ($P > 0$) and act in the **$-y$ direction** (downward).
  - An upward load acts in the **$+y$ direction**.
- **Uniformly Distributed Loads ($w$)**:
  - Downward distributed loads are entered with positive magnitude ($w > 0$) and act in the **$-y$ direction** (downward).
- **Concentrated Moments ($M_{applied}$)**:
  - **Counterclockwise (CCW)** moments are **positive** ($+M$).
  - **Clockwise (CW)** moments are **negative** ($-M$).
  - *(Standard Cartesian right-hand rule about the $z$-axis).*

---

## 3. Support Reactions
- **Vertical Support Reactions ($R_y$)**:
  - Upward reactions are **positive** ($+R_y$).
  - Downward reactions are **negative** ($-R_y$).
- **Rotational Reactions at Fixed Supports ($M_R$)**:
  - Counterclockwise reaction moments are **positive** ($+M_R$).
  - Clockwise reaction moments are **negative** ($-M_R$).

---

## 4. Internal Shear Force ($V$)
- Follows the standard mechanics of materials convention:
  - **Positive Shear ($+V$)**: Shearing action where the portion of the beam to the **left** of the cross-section moves **upward** relative to the right portion.
  - Equivalently:
    $$\Sigma F_{y, \text{left}} - V(x) = 0 \implies V(x) = \Sigma F_{y, \text{left}}$$
    Upward forces to the left of the cut section cause positive shear.

---

## 5. Internal Bending Moment ($M$)
- Standard structural beam convention (**Sagging = Positive**):
  - **Positive Bending Moment ($+M$, Sagging)**:
    - Causes tension in the bottom fibers and compression in the top fibers.
    - Concave upward curvature ($d^2y/dx^2 > 0$).
  - **Negative Bending Moment ($-M$, Hogging)**:
    - Causes tension in the top fibers and compression in the bottom fibers.
    - Concave downward curvature ($d^2y/dx^2 < 0$).

---

## 6. Beam Slope ($\theta$) and Deflection ($y$)
- **Deflection ($y(x)$)**:
  - Displacements directed **upward** are **positive** ($+y$).
  - Displacements directed **downward** are **negative** ($-y$).
  - Under downward gravity loads, typical deflections will have a **negative sign** ($y < 0$).
- **Slope ($\theta(x) = \frac{dy}{dx}$)**:
  - Counterclockwise rotation of the beam's elastic curve relative to the horizontal is **positive** ($+\theta$).
- **Governing Differential Equation**:
  $$E I \frac{d^2 y}{dx^2} = M(x)$$
  Under this convention, sagging moment ($M > 0$) produces positive curvature ($d^2y/dx^2 > 0$).

---

## 7. Display Rule
In every engineering diagram view within CivilCalc AI, a concise sign convention badge or toggle legend must be rendered adjacent to the canvas to eliminate ambiguity for students and practicing engineers.
