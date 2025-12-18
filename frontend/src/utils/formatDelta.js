export function computeDelta({ serverDelta, current, previous }) {
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