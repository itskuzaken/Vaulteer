import React from 'react';
import { render, screen } from '@testing-library/react';
import DonutKPI from '../DonutKPI';

describe('DonutKPI', () => {
  it('renders positive delta chip when delta provided', () => {
    render(<DonutKPI value={10} breakdown={{ a: 6, b: 4 }} size={80} hoverLegend={false} delta={'12.3'} position="inline" />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
    expect(screen.getByText(/12.3%/)).toBeInTheDocument();
    expect(screen.getByLabelText(/change/i)).toHaveAttribute('aria-label', expect.stringContaining('+12.3%'));
  });

  it('renders negative delta chip when delta negative', () => {
    render(<DonutKPI value={5} breakdown={{ a: 2, b: 3 }} size={80} hoverLegend={false} delta={'-5.0'} position="inline" />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    expect(screen.getByText(/5.0%/)).toBeInTheDocument();
    expect(screen.getByLabelText(/change/i)).toHaveAttribute('aria-label', expect.stringContaining('-5.0%'));
  });

  it('does not render chip for "new" delta', () => {
    render(<DonutKPI value={5} breakdown={{ a: 5 }} size={80} hoverLegend={false} delta={'new'} position="inline" />);
    expect(screen.queryByText(/New/)).toBeNull();
    // Also ensure no change aria exists
    expect(screen.queryByLabelText(/change/i)).toBeNull();
  });
});
