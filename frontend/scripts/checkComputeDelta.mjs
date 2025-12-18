import { computeDelta } from '../src/utils/formatDelta.js';

const cases = [
  { serverDelta: '12.345', current: 10, previous: 8, expect: '12.3' },
  { serverDelta: null, current: 5, previous: 0, expect: 'new' },
  { serverDelta: null, current: 0, previous: 0, expect: null },
  { serverDelta: null, current: 20, previous: 10, expect: '100.0' },
  { serverDelta: undefined, current: null, previous: null, expect: null },
];

for (const c of cases) {
  const out = computeDelta(c);
  console.log(JSON.stringify({ input: c, out, ok: out === c.expect }));
}
