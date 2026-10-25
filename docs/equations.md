# Equations and calculation methods

CivilCalc AI calculates internally in SI units. Display units are converted at the input and output boundaries. Downward point loads and distributed loads use positive magnitudes; applied moments are signed, with counterclockwise positive.

## Beam reactions

For a simply supported beam with supports at $x_A$ and $x_B$:

$$R_B = -\frac{\sum M_A^{\text{loads}}}{x_B-x_A}, \qquad R_A = W-R_B$$

Here $W$ is the algebraic total of the entered vertical load magnitudes. A downward point load contributes $-P(x-x_A)$ to the moment sum about A; an applied counterclockwise moment contributes $+M$.

For a cantilever with a fixed point at $x_f$:

$$R_f = W, \qquad M_f=-\sum M_{x_f}^{\text{loads}}$$

The engine independently recomputes vertical-force and moment residuals and compares them with its stated absolute tolerance.

## Shear and bending moment

The diagrams are evaluated from the support reactions and applied loads. Between concentrated events, an active uniform load changes shear linearly; moment changes according to the integrated shear. Point forces create shear jumps, and applied point moments create moment jumps.

Reported shear extrema are evaluated at beam ends and load/support stations. Moment extrema are evaluated at those stations and at zero-shear locations inside distributed-load intervals. Plot samples are used to draw the curves, not to estimate the reported moment peak.

## Slope and deflection

For constant flexural rigidity $EI$:

$$EI\,y''(x)=M(x), \qquad \theta(x)=y'(x)$$

The general solver integrates the piecewise bending-moment expression with Macaulay singularity functions, then applies the support boundary conditions. Peak deflection locations are found from roots of the slope; peak slope candidates are found from roots of moment and load-event stations. Root locations are numerically refined within each load interval.

Assumptions are linear elastic response, small deflection and slope, a prismatic member with constant $E$ and $I$, and bending deformation only. Shear deformation and axial deformation are not included.

## Cross-section properties

The section calculator uses analytical formulas for rectangles, circles, hollow rectangles, hollow circles, symmetric I sections, T sections, and additive composites made from rectangles. Composite sections use area-weighted centroids and the parallel axis theorem:

$$\bar{x}=\frac{\sum A_i x_i}{\sum A_i}, \qquad \bar{y}=\frac{\sum A_i y_i}{\sum A_i}$$

$$I_x=\sum\left(I_{x,i}+A_i(y_i-\bar{y})^2\right), \qquad I_y=\sum\left(I_{y,i}+A_i(x_i-\bar{x})^2\right)$$

These geometric properties do not constitute a strength or code-compliance check.
