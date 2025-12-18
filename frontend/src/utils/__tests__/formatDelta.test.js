import { computeDelta } from '../formatDelta';

describe('computeDelta', () => {
  it('returns server numeric delta when provided', () => {
    expect(computeDelta({ serverDelta: '12.345', current: 10, previous: 8 })).toBe('12.3');
  });

  it('returns "new" when previous is zero and current > 0', () => {
    expect(computeDelta({ serverDelta: null, current: 5, previous: 0 })).toBe('new');
  });

  it('returns null when previous and current are zero', () => {
    expect(computeDelta({ serverDelta: null, current: 0, previous: 0 })).toBeNull();
  });

  it('computes percent when previous non-zero', () => {
    expect(computeDelta({ serverDelta: null, current: 20, previous: 10 })).toBe('100.0');
  });

  it('returns null when values are invalid', () => {
    expect(computeDelta({ serverDelta: undefined, current: null, previous: null })).toBeNull();
  });
});
