import React from 'react';
import { render, screen } from '@testing-library/react';
import AchievementCard from '../AchievementCard';

test('renders achievement card with progress and alt text', () => {
  const ach = { achievement_id: 1, achievement_name: 'Test Badge', achievement_description: 'Desc', current_count: 2, thresholds: { bronze: 5 }, badge_s3_url_map: { single: 'https://example.com/x.png' }, earned: false };
  render(<AchievementCard achievement={ach} />);

  expect(screen.getByText(/Test Badge/)).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringContaining('Test Badge'));
  expect(screen.getByText(/%/)).toBeInTheDocument();
});
