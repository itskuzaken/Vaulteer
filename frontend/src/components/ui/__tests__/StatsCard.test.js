import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';

describe('StatsCard', () => {
  it('shows positive delta with arrow up inline and accessible label', () => {
    render(<StatsCard title="Test" value={100} delta={'12.3'} />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
    expect(screen.getByText(/12.3%/)).toBeInTheDocument();
    expect(screen.getByLabelText(/change/i)).toHaveAttribute('aria-label', expect.stringContaining('+12.3%'));
  });

  it('shows negative delta with arrow down inline and accessible label', () => {
    render(<StatsCard title="Test" value={100} delta={'-5.0'} />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
    expect(screen.getByText(/5.0%/)).toBeInTheDocument();
    expect(screen.getByLabelText(/change/i)).toHaveAttribute('aria-label', expect.stringContaining('-5.0%'));
  });

  it('does not show New indicator when delta is new', () => {
    render(<StatsCard title="Test" value={5} delta={'new'} />);
    expect(screen.queryByText(/New/)).toBeNull();
  });
});
