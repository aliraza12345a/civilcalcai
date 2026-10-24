import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BeamWorkspace } from '../pages/BeamWorkspace';

describe('BeamWorkspace Component (Milestone 2 & 3)', () => {
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
    expect(screen.getByText('Equilibrium Satisfied')).toBeInTheDocument();
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

  it('calls onBack when back arrow button is clicked', () => {
    const handleBack = vi.fn();
    render(<BeamWorkspace onBack={handleBack} />);

    const backBtn = screen.getByTitle('Return to Library');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
