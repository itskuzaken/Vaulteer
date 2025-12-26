import React from 'react';
import { render, screen, act } from '@testing-library/react';
import RealtimeStatsGrid from '../RealtimeStatsGrid';

jest.mock('../../../hooks/useRealtimeStats', () => ({
  useRealtimeStats: (fetchCb) => {
    const data = {
      range: 'last7',
      total_applicants: 4,
      previous: { total_applicants: 0 },
      deltas: { total_applicants: null },
    };
    return { data, loading: false, error: null, changedFields: [], refresh: () => {} };
  },
  useAnimatedCounter: (value) => value,
}));

const mockConfig = [
  { key: 'total_applicants', title: 'Applications', breakdownKey: 'applications_breakdown' }
];

describe('RealtimeStatsGrid integration', () => {
  it('renders New indicator when previous is 0 and current > 0 (integration)', () => {
    render(<RealtimeStatsGrid statsConfig={mockConfig} fetchCallback={() => Promise.resolve({})} />);
    const newEl = screen.getByText(/New/);
    expect(newEl).toBeInTheDocument();
  });
});
