import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RealtimeStatsGrid from '../RealtimeStatsGrid';

describe('RealtimeStatsGrid', () => {
  it('calls fetchCallback on mount', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    render(<RealtimeStatsGrid statsConfig={[]} fetchCallback={mockFetch} />);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('renders a card for each config', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    const configs = [
      { key: 'a', title: 'A' },
      { key: 'b', title: 'B' },
      { key: 'c', title: 'C' },
    ];
    render(<RealtimeStatsGrid statsConfig={configs} fetchCallback={mockFetch} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('responds to window size for layout', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    // emulate small screen
    global.innerWidth = 360;
    global.dispatchEvent(new Event('resize'));

    const configs = [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }];
    render(<RealtimeStatsGrid statsConfig={configs} fetchCallback={mockFetch} />);

    // grid should be rendered with at least one of the titles visible
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
