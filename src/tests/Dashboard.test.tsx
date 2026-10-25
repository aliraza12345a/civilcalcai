import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Dashboard } from '../pages/Dashboard';

describe('Dashboard Component (Milestone 1)', () => {
  it('renders the CivilCalc AI brand and Milestone 1 badge', () => {
    render(<Dashboard />);
    const brandElements = screen.getAllByText('CivilCalc AI');
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
  });

  it('renders the mandatory limitations and educational disclaimer notice', () => {
    render(<Dashboard />);
    expect(
      screen.getByText(/CivilCalc AI is an educational and preliminary calculation tool/i)
    ).toBeInTheDocument();
  });

  it('renders the calculator library and shows active milestone for structural beams and cross-sections', () => {
    render(<Dashboard />);
    expect(
      screen.getByText('Statically Determinate Beam Analyzer')
    ).toBeInTheDocument();
    expect(screen.getByText('Active (M2 - M5)')).toBeInTheDocument();
    expect(screen.getByText('Cross-Section Properties Calculator')).toBeInTheDocument();
    expect(screen.getByText('Active (M6)')).toBeInTheDocument();
  });

  it('opens and closes the sign conventions panel with exact sign rules', () => {
    render(<Dashboard />);
    const signConventionsBtn = screen.getByRole('button', { name: /sign conventions/i });
    expect(signConventionsBtn).toBeInTheDocument();

    // Click to open drawer
    fireEvent.click(signConventionsBtn);
    expect(
      screen.getByText(/Exact Structural Sign Conventions/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sagging moment \(tension at bottom, compression at top\) is POSITIVE \(\+M\)/i)
    ).toBeInTheDocument();

    // Click Close
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByText(/Exact Structural Sign Conventions/i)
    ).not.toBeInTheDocument();
  });

  it('filters calculator cards based on search input', () => {
    render(<Dashboard />);
    const searchInput = screen.getByPlaceholderText(/search calculators/i);
    fireEvent.change(searchInput, { target: { value: 'Manning' } });

    expect(screen.getByText(/Manning’s Open Channel Flow/i)).toBeInTheDocument();
    expect(
      screen.queryByText('Statically Determinate Beam Analyzer')
    ).not.toBeInTheDocument();
  });
});
