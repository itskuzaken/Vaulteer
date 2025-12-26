import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AchievementCatalog from '../AchievementCatalog';
import * as svc from '../../../services/achievementCatalogService';
import * as userSvc from '../../../services/userService';

jest.mock('../../../services/achievementCatalogService');
jest.mock('../../../services/userService');

test('loads and displays achievements', async () => {
  userSvc.getCurrentUser.mockResolvedValue({ id: 123 });
  svc.getUserAchievementsFull.mockResolvedValue({ data: [{ achievement_id: 1, achievement_name: 'Test', achievement_description: 'd', current_count: 0, badge_s3_url_map: { single: 'https://example.com/x.png' }, progressPercent: 0 }] });

  render(<AchievementCatalog />);
  await waitFor(() => expect(svc.getUserAchievementsFull).toHaveBeenCalled());
  expect(screen.getByText(/Achievements/)).toBeInTheDocument();
  expect(screen.getByText(/Test/)).toBeInTheDocument();
});

test('image load error triggers presign and updates url', async () => {
  userSvc.getCurrentUser.mockResolvedValue({ id: 123 });
  const key = 'achievement_badges/test/single.png';
  svc.getUserAchievementsFull.mockResolvedValue({ data: [{ achievement_id: 2, achievement_name: 'ExpBadge', achievement_description: 'desc', current_count: 0, badge_s3_keys: { single: key }, badge_s3_url_map: { single: 'https://expired.example/old.png' }, progressPercent: 0 }] });
  svc.presignBadgeUrls.mockResolvedValue({ data: { [key]: 'https://presigned.example/new.png' } });

  render(<AchievementCatalog />);
  await waitFor(() => expect(svc.getUserAchievementsFull).toHaveBeenCalled());

  // Wait until image is rendered
  await waitFor(() => expect(screen.getByAltText(/ExpBadge/)).toBeInTheDocument());
  const img = screen.getByAltText(/ExpBadge/);
  expect(img).toBeInTheDocument();

  // Fire error event to simulate expired/failed load
  img.dispatchEvent(new Event('error'));

  // Wait for presign call
  await waitFor(() => expect(svc.presignBadgeUrls).toHaveBeenCalled());

  // After presign resolves, the image src should be updated to the new URL
  await waitFor(() => expect(screen.getByAltText(/ExpBadge/)).toHaveAttribute('src', 'https://presigned.example/new.png'));
});
