#!/usr/bin/env node

/**
 * Test script to verify computeDelta works correctly with various inputs
 */

// Simulate the computeDelta function
function computeDelta({ serverDelta, current, previous }) {
  // serverDelta may be a numeric string, number, or 'new'
  if (serverDelta === 'new') return 'new';
  if (serverDelta !== null && serverDelta !== undefined) {
    const n = Number(serverDelta);
    if (!isNaN(n)) return n.toFixed(1); // Returns string like "12.3"
  }

  const curr = Number(current || 0);
  const prev = Number(previous || 0);

  if (!isNaN(prev) && prev === 0) {
    if (!isNaN(curr) && curr > 0) return 'new';
    return null;
  }

  if (!isNaN(prev) && !isNaN(curr) && prev !== 0) {
    const percentChange = ((curr - prev) / prev) * 100;
    return percentChange.toFixed(1); // Returns string like "12.3" or "-12.3"
  }

  return null;
}

// Test the StatsCard rendering logic
function testDeltaRendering(delta) {
  console.log(`\nTesting delta: ${JSON.stringify(delta)}`);
  
  if (delta == null || delta === undefined) {
    console.log('  → No indicator (null/undefined)');
    return;
  }
  
  if (delta === 'new') {
    console.log('  → Shows: "New" badge (emerald)');
    return;
  }
  
  const numericDelta = Number(delta);
  if (isNaN(numericDelta)) {
    console.log('  → No indicator (not a valid number)');
    return;
  }
  
  const isPositive = numericDelta >= 0;
  const absValue = Math.abs(numericDelta);
  const displayValue = absValue.toFixed(1);
  const arrow = isPositive ? '▲' : '▼';
  const sign = isPositive ? '+' : '-';
  const color = isPositive ? 'emerald' : 'rose';
  
  console.log(`  → Shows: ${arrow} ${displayValue}% (${color})`);
  console.log(`  → aria-label: "Change: ${sign}${displayValue}%"`);
}

console.log('=== computeDelta Output Tests ===');

const testCases = [
  { name: 'Server returns numeric delta', input: { serverDelta: 15.5, current: 100, previous: 80 }, expected: '15.5' },
  { name: 'Server returns negative delta', input: { serverDelta: -10.2, current: 80, previous: 90 }, expected: '-10.2' },
  { name: 'Server returns null, previous=0, current>0', input: { serverDelta: null, current: 5, previous: 0 }, expected: 'new' },
  { name: 'Server returns null, calculate positive change', input: { serverDelta: null, current: 120, previous: 100 }, expected: '20.0' },
  { name: 'Server returns null, calculate negative change', input: { serverDelta: null, current: 80, previous: 100 }, expected: '-20.0' },
  { name: 'No change', input: { serverDelta: null, current: 100, previous: 100 }, expected: '0.0' },
  { name: 'Previous is null/undefined', input: { serverDelta: null, current: 50, previous: undefined }, expected: 'new' },
  { name: 'Both zero', input: { serverDelta: null, current: 0, previous: 0 }, expected: null },
];

testCases.forEach(({ name, input, expected }) => {
  const result = computeDelta(input);
  const pass = result === expected ? '✓' : '✗';
  console.log(`\n${pass} ${name}`);
  console.log(`  Input: serverDelta=${input.serverDelta}, current=${input.current}, previous=${input.previous}`);
  console.log(`  Expected: ${JSON.stringify(expected)}`);
  console.log(`  Got: ${JSON.stringify(result)}`);
  console.log(`  Match: ${result === expected}`);
});

console.log('\n\n=== StatsCard Rendering Tests ===');

const renderCases = [
  'new',
  '20.0',
  '-15.5',
  '0.0',
  '100.0',
  '-100.0',
  null,
  undefined,
  'invalid',
  '',
];

renderCases.forEach(testDeltaRendering);

console.log('\n\n=== End-to-End Scenarios ===');

const scenarios = [
  { desc: 'First time data (yesterday: 0 → today: 5)', serverDelta: null, current: 5, previous: 0 },
  { desc: 'Growth (last week: 100 → this week: 120)', serverDelta: null, current: 120, previous: 100 },
  { desc: 'Decline (last month: 50 → this month: 45)', serverDelta: null, current: 45, previous: 50 },
  { desc: 'Server provides delta directly', serverDelta: 25.5, current: 100, previous: 80 },
  { desc: 'No previous data', serverDelta: null, current: 10, previous: undefined },
];

scenarios.forEach(({ desc, serverDelta, current, previous }) => {
  console.log(`\n${desc}:`);
  const delta = computeDelta({ serverDelta, current, previous });
  testDeltaRendering(delta);
});

console.log('\n\n✅ All tests completed!\n');
