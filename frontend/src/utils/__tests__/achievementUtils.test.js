import { computeProgressPercent, selectBadgeUrl } from '../achievementUtils';

test('computeProgressPercent with thresholds', () => {
  const achievement = { thresholds: { bronze: 5, silver: 10, gold: 20 } };
  const userProgress = { current_count: 3, earned: false };
  expect(computeProgressPercent(achievement, userProgress)).toBe(Math.round((3/5)*100));
});

test('computeProgressPercent with threshold_value', () => {
  const achievement = { threshold_value: 10 };
  const userProgress = { current_count: 4 };
  expect(computeProgressPercent(achievement, userProgress)).toBe(40);
});

test('selectBadgeUrl picks exact level or fallback', () => {
  const achievement = { badge_s3_url_map: { bronze: 'b', single: 's' } };
  expect(selectBadgeUrl(achievement, 'bronze')).toBe('b');
  expect(selectBadgeUrl(achievement, 'unknown')).toBe('s');
});
