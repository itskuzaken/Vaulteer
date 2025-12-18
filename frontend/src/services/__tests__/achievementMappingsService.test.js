import * as svc from '../achievementMappingsService';
import { apiCall } from '../../utils/apiUtils';
import { API_BASE } from '../../config/config';

jest.mock('../../utils/apiUtils');

describe('achievementMappingsService', () => {
  beforeEach(() => jest.resetAllMocks());

  test('fetchAchievementMappings uses API_BASE', async () => {
    apiCall.mockResolvedValue({ data: [] });
    await svc.fetchAchievementMappings({ eventType: 'community_meeting' });
    expect(apiCall).toHaveBeenCalled();
    const calledUrl = apiCall.mock.calls[0][0];
    expect(calledUrl.startsWith(`${API_BASE}/gamification/admin/achievement-mappings`)).toBe(true);
  });
});
