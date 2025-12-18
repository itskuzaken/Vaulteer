import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
// Mock service BEFORE importing the component so module-level imports are replaced
jest.mock('../../../../services/achievementService', () => ({
  __esModule: true,
  fetchAchievements: jest.fn(() => Promise.resolve([])),
  getBadgePreviewUrl: jest.fn(() => Promise.resolve({ url: null })),
  deleteAchievement: jest.fn(() => Promise.resolve(true)),
}));
// Ensure apiCall returns a predictable shape so fetchAchievements succeeds when the real
// implementation is used by other tests that don't override fetchAchievements directly
jest.mock('../../../../utils/apiUtils', () => ({ __esModule: true, apiCall: jest.fn(() => Promise.resolve({ data: [] })) }));
import AchievementList from '../AchievementList';
import * as achSvc from '../../../../services/achievementService';

// Mock Firebase token so `fetchWithAuth` doesn't throw in tests
jest.mock('../../../../services/firebase', () => ({ __esModule: true, getIdToken: jest.fn(() => Promise.resolve('test-token')) }));

// Provide a simple matchMedia mock for JSDOM tests that rely on it
// Ensure `window.matchMedia` is a function that returns an object with `matches` —
// some JSDOM environments may provide a non-callable or partial implementation.
if (typeof window !== 'undefined') {
  window.matchMedia = function () {
    return {
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    };
  };
}

describe('AchievementList', () => {
  beforeEach(() => jest.resetAllMocks());

  test('renders achievements and opens editor on edit/create', async () => {
    // Provide mock that includes three tiers
    achSvc.fetchAchievements.mockResolvedValue([{ achievement_id: 1, achievement_name: 'A', badge_code: 'A', achievement_points: 10, tier_points: { bronze: 5, silver: 10, gold: 20 }, badge_s3_keys: { bronze: 'achievement_badges/A/bronze.png', silver: 'achievement_badges/A/silver.png', gold: 'achievement_badges/A/gold.png' } }]);
    // Ensure any underlying fetch calls also return the expected JSON shape
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [{ achievement_id: 1, achievement_name: 'A', badge_code: 'A', achievement_points: 10, tier_points: { bronze: 5, silver: 10, gold: 20 } }] }) }));
    achSvc.getBadgePreviewUrl = jest.fn().mockImplementation((id, tier) => Promise.resolve({ url: `https://example.com/${tier}.png`, s3Key: `achievement_badges/A/${tier}.png` }));

    // Ensure the mock is in place and will be called
    expect(jest.isMockFunction(achSvc.fetchAchievements)).toBe(true);

    const { findByText, findAllByText, findByAltText, findAllByAltText } = render(<AchievementList />);

    // Wait for the heading to appear and ensure fetchAchievements was called
    expect(await findByText('Achievements')).toBeTruthy();
    expect(achSvc.fetchAchievements).toHaveBeenCalled();

    // The achievement row should appear (name and/or code both contain 'A')
    const nameMatches = await findAllByText('A');
    expect(nameMatches.length).toBeGreaterThanOrEqual(1);

    // All three tier previews should appear
    const imgs = await findAllByAltText(/badge preview/);
    expect(imgs.length).toBeGreaterThanOrEqual(3);

    // Points column should show per-tier mapping (allow for whitespace/newlines between parts)
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText((_, node) => /bronze[\s\S]*5[\s\S]*silver[\s\S]*10[\s\S]*gold[\s\S]*20/i.test(node.textContent)).length).toBeGreaterThanOrEqual(1);

    // Click edit
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText(/Edit Achievement/i)).toBeTruthy());

    // Close editor by clicking cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Create new
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(screen.getByText(/Create Achievement/i)).toBeTruthy());
  });

  test('delete achievement calls service', async () => {
    achSvc.fetchAchievements.mockResolvedValue([{ achievement_id: 2, achievement_name: 'B', badge_code: 'B' }]);
    // Ensure fetch returns expected shape if used by the service
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [{ achievement_id: 2, achievement_name: 'B', badge_code: 'B' }] }) }));
    achSvc.deleteAchievement.mockResolvedValue(true);

    const { findAllByText } = render(<AchievementList />);
    expect((await findAllByText('B')).length).toBeGreaterThanOrEqual(1);

    // Mock confirm to auto-accept
    global.confirm = jest.fn(() => true);

    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(achSvc.deleteAchievement).toHaveBeenCalledWith(2));
  });
});