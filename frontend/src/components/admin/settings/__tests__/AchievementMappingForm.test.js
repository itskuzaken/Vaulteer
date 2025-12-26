// Mock the achievement service before importing the component
jest.mock('../../../../services/achievementService', () => ({
  fetchAchievements: jest.fn(),
  getBadgePreviewUrl: jest.fn(),
  createAchievement: jest.fn(),
  updateAchievement: jest.fn(),
  presignBadgeUpload: jest.fn(),
  validateBadgeUpload: jest.fn(),
}));

jest.mock('../../../../services/achievementMappingsService', () => ({
  createAchievementMapping: jest.fn(),
  updateAchievementMapping: jest.fn(),
  fetchAchievementMappings: jest.fn(),
  deleteAchievementMapping: jest.fn(),
}));

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AchievementMappingForm from '../AchievementMappingForm';
import * as achSvc from '../../../../services/achievementService';
import * as mapSvc from '../../../../services/achievementMappingsService';

describe('AchievementMappingForm', () => {
  beforeEach(() => jest.resetAllMocks());

  test('renders form and validates required fields', async () => {
    achSvc.fetchAchievements.mockResolvedValue([{ achievement_id: 1, achievement_name: 'A', badge_code: 'A' }]);
    // confirm that the mock is in place
    expect(jest.isMockFunction(achSvc.fetchAchievements)).toBe(true);

    // prevent create from throwing
    mapSvc.createAchievementMapping.mockResolvedValue({ mapping_id: 1 });
    const onSaved = jest.fn();
    const onClose = jest.fn();

    render(<AchievementMappingForm onSaved={onSaved} onClose={onClose} />);

    await waitFor(() => screen.getByText(/Create mapping/i));

    // The achievements select should be present (options may populate asynchronously)
    const select = screen.getAllByRole('combobox')[0];
    expect(select).toBeInTheDocument();

    // Simulate selecting the first achievement id
    fireEvent.change(select, { target: { value: '1' } });

    // Save should now be enabled
    const saveBtn = screen.getByText(/Save/i);
    expect(saveBtn).toBeEnabled();

  });
});