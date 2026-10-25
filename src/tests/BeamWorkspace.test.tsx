import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BeamWorkspace } from '../pages/BeamWorkspace';

describe('BeamWorkspace Component (Milestone 2 & 3)', () => {
  beforeEach(() => localStorage.clear());

  it('renders beam workspace and calculates default simply supported reactions', () => {
    const handleBack = vi.fn();
    render(<BeamWorkspace onBack={handleBack} />);

    // Header title
    expect(screen.getByText('Statically Determinate Beam Analyzer')).toBeInTheDocument();
    
    // Default: L = 6 m, P = 10 kN at midspan (3 m) => RA = 5 kN, RB = 5 kN
    expect(screen.getByText('Support A Reaction (x = 0)')).toBeInTheDocument();
    expect(screen.getByText('Support B Reaction (x = L)')).toBeInTheDocument();
    expect(screen.getAllByText('5.000 kN').length).toBe(2);

    // Static Equilibrium badge
    expect(screen.getByText('Residuals within tolerance')).toBeInTheDocument();
  });

  it('switches between Metric and Imperial units dynamically', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);

    const imperialBtn = screen.getByRole('button', { name: /imperial \(us\)/i });
    fireEvent.click(imperialBtn);

    // Units label should now reflect Imperial (ft, kip)
    expect(screen.getByText(/Units: ft, kip/i)).toBeInTheDocument();
  });

  it('switches between Simply Supported and Cantilever beam types', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);

    const cantileverBtn = screen.getByRole('button', { name: /cantilever/i });
    fireEvent.click(cantileverBtn);

    // Cantilever reactions header
    expect(screen.getByText('Fixed Vertical Shear (R_fixed)')).toBeInTheDocument();
    expect(screen.getByText('Fixed Reaction Moment (M_fixed)')).toBeInTheDocument();
  });

  it('switches to Worked Equations tab and displays governing equations', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);

    const equationsTab = screen.getByRole('button', { name: /worked equations/i });
    fireEvent.click(equationsTab);

    expect(screen.getByText(/Moment Equilibrium about Support A/i)).toBeInTheDocument();
    expect(screen.getByText(/Vertical Force Equilibrium/i)).toBeInTheDocument();
  });

  it('switches to Slope & Deflection tab and displays max deflection and diagrams', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);

    const deflectionTab = screen.getByRole('button', { name: /slope & deflection/i });
    fireEvent.click(deflectionTab);

    expect(screen.getByText(/Maximum Deflection \(y_max\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum Slope \(θ_max\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Bending Moment Diagram \(BMD\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Deflected Elastic Curve \(y vs x\)/i)).toBeInTheDocument();
  });

  it('loads a sample problem and shows interactive SFD and BMD graphs', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/try an example problem/i), { target: { value: 'cantilever-point' } });

    expect(screen.getByText(/interactive precision probe/i)).toBeInTheDocument();
    expect(screen.getByText(/Shear Force Diagram/i)).toBeInTheDocument();
    expect(screen.getByText(/Bending Moment Diagram/i)).toBeInTheDocument();
    expect(screen.getAllByText(/cantilever/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('slider', { name: /probe location along beam/i })).toBeInTheDocument();
    expect(screen.queryByText(/Bending Stress/i)).not.toBeInTheDocument();
  });

  it('shows the template-based plain-English explanation', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /plain english/i }));
    expect(screen.getByRole('heading', { name: /what these results mean/i })).toBeInTheDocument();
    expect(screen.getByText(/system satisfies static equilibrium/i)).toBeInTheDocument();
    expect(screen.getByText(/Key points/i)).toBeInTheDocument();
  });

  it('saves a calculation and can reopen it from browser history', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save calculation/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/saved in this browser/i);

    fireEvent.click(screen.getByRole('button', { name: /saved calculations/i }));
    expect(screen.getByRole('heading', { name: /calculation history/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }));
    expect(screen.queryByRole('heading', { name: /calculation history/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loaded saved calculation/i);
  });

  it('opens the report and export actions for valid inputs', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /report \/ export/i }));
    expect(screen.getByRole('heading', { name: /beam calculation report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ save as pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^json$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^csv$/i })).toBeInTheDocument();
    expect(screen.getByText(/Analysis Assumptions/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Shear Force Diagram' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bending Moment Diagram' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Deflected Shape' })).toBeInTheDocument();
  });

  it('reports a negative point load as upward in the printable schedule', () => {
    render(<BeamWorkspace onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /point load 1 magnitude/i }), { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: /report \/ export/i }));
    expect(screen.getByText(/10\.00 kN ↑ \(up\)/i)).toBeInTheDocument();
  });

  it('calls onBack when back arrow button is clicked', () => {
    const handleBack = vi.fn();
    render(<BeamWorkspace onBack={handleBack} />);

    const backBtn = screen.getByTitle('Return to Library');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
