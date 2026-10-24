import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SectionWorkspace } from '../pages/SectionWorkspace';

describe('SectionWorkspace Component (Milestone 6)', () => {
  it('renders section workspace and calculates default solid rectangle properties', () => {
    const handleBack = vi.fn();
    render(<SectionWorkspace onBack={handleBack} />);

    expect(screen.getByText('Cross-Section Properties Calculator')).toBeInTheDocument();
    expect(screen.getByText('Milestone 6 Active')).toBeInTheDocument();

    // Default: 200 x 400 mm rectangle => A = 80,000 mm^2
    expect(screen.getByText('80,000')).toBeInTheDocument();
    expect(screen.getByText('1.0667e+9')).toBeInTheDocument();

    // Centroid at 200 mm
    expect(screen.getByText('200.0')).toBeInTheDocument();
  });

  it('switches between shapes: Circle, T-Section, and Hollow Rect', () => {
    render(<SectionWorkspace onBack={vi.fn()} />);

    // Click Solid Circle
    const circleBtn = screen.getByRole('button', { name: /solid circle/i });
    fireEvent.click(circleBtn);
    expect(screen.getByText(/Diameter \(d\)/i)).toBeInTheDocument();
    // Default circle d = 300 mm => A = 70,686 mm^2
    expect(screen.getByText('70,685.8')).toBeInTheDocument();

    // Click T-Section
    const tBtn = screen.getByRole('button', { name: /t-section/i });
    fireEvent.click(tBtn);
    expect(screen.getByText(/Flange Width \(bf\)/i)).toBeInTheDocument();
    // T-section with 300x50 flange & 50x250 web => y_bar = 206.8 mm
    expect(screen.getByText('206.8')).toBeInTheDocument();
  });

  it('calls onSendIxToBeam when clicking "Send Ix to Beam Solver"', () => {
    const handleSend = vi.fn();
    render(<SectionWorkspace onBack={vi.fn()} onSendIxToBeam={handleSend} />);

    const sendBtn = screen.getByRole('button', { name: /send ix to beam solver/i });
    expect(sendBtn).toBeInTheDocument();

    fireEvent.click(sendBtn);
    expect(handleSend).toHaveBeenCalledTimes(1);
    // Transferred Ix should be positive and in m^4 (1.066667e-3 m^4 for 200x400 mm)
    expect(handleSend.mock.calls[0][0]).toBeCloseTo(0.001066667, 7);
  });

  it('navigates back when back arrow is clicked', () => {
    const handleBack = vi.fn();
    render(<SectionWorkspace onBack={handleBack} />);

    const backBtn = screen.getByTitle('Return to Library');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
