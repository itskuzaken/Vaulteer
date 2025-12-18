import React from 'react';
import { render, screen } from '@testing-library/react';
import GamificationSettings from '../GamificationSettings';

jest.mock('../useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: [
      { setting_id: 1, category: 'gamification', key: 'enable_badges', value: 'false', data_type: 'boolean', parsedValue: false }
    ],
    loading: false,
    error: null,
    saving: false,
    updateSetting: jest.fn(),
    resetToDefault: jest.fn(),
    resetCategoryToDefaults: jest.fn()
  })
}));

test('shows banner when badges disabled and hides achievement lists', async () => {
  render(<GamificationSettings />);

  expect(await screen.findByText(/Badges are currently disabled/i)).toBeTruthy();
  // Achievement list header should not be present
  expect(screen.queryByText(/Achievements/)).toBeNull();
});
