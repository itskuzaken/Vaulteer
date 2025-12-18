import * as svc from '../achievementService';
import { apiCall } from '../../utils/apiUtils';

jest.mock('../../utils/apiUtils');

describe('achievementService', () => {
  beforeEach(() => jest.resetAllMocks());

  test('createAchievement posts data', async () => {
    apiCall.mockResolvedValue({ data: { achievement_id: 1, achievement_name: 'A' } });
    const res = await svc.createAchievement({ achievement_name: 'A' });
    expect(res).toBeDefined();
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  test('updateAchievement patches data', async () => {
    apiCall.mockResolvedValue({ data: { achievement_id: 1, achievement_name: 'B' } });
    const res = await svc.updateAchievement(1, { achievement_name: 'B' });
    expect(res.achievement_name).toBe('B');
  });

  test('presignBadgeUpload returns presign data', async () => {
    apiCall.mockResolvedValue({ data: { uploadUrl: 'https://s3', s3Key: 'badges/1/a.png' } });
    const data = await svc.presignBadgeUpload(1, 'image/png');
    expect(data.s3Key).toMatch(/badges/);
    expect(apiCall).toHaveBeenCalled();
  });
});