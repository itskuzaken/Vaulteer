import { getDashboardMenu } from '../dashboardNavigationConfig';

test('volunteer menu contains achievements entry', () => {
  const menu = getDashboardMenu('volunteer');
  expect(menu).toHaveProperty('achievements');
  expect(menu.achievements.label).toBe('Achievements');
});
