import { render, screen, waitFor, fireEvent } from '@testing-library/react';
// Mock mappings service BEFORE importing component
jest.mock('../../../services/achievementMappingsService');
import AchievementMappingList from '../AchievementMappingList';
import * as svc from '../../../services/achievementMappingsService';

describe('AchievementMappingList', () => {
  beforeEach(() => jest.resetAllMocks());

  test('renders mappings and can open form', async () => {
    svc.fetchAchievementMappings.mockResolvedValue([
      { mapping_id: 1, achievement_name: 'First Attend', badge_code: 'FIRST_ATTEND', trigger_action: 'EVENT_ATTEND', target_role: 'volunteer', event_type: 'community_meeting' }
    ]);

    render(<AchievementMappingList />);

    expect(await screen.findByText('First Attend')).toBeInTheDocument();

    const addBtn = screen.getByText(/Add mapping/i);
    fireEvent.click(addBtn);
    await waitFor(() => expect(screen.getByText(/Create mapping/i)).toBeTruthy());
  });

  test('shows sign-in prompt when API returns 401', async () => {
    const err = new Error('Not authenticated — please sign in to continue.');
    err.status = 401;
    svc.fetchAchievementMappings.mockRejectedValue(err);

    render(<AchievementMappingList />);

    expect(await screen.findByText(/You must be signed in as an administrator/i)).toBeInTheDocument();
  });
});