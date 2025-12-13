import React from "react";

/**
 * DonutKPI
 * props:
 * - title: label shown above
 * - value: primary value shown in center
 * - breakdown: object { label: value }
 * - size: diameter in px (default 80)
 * - colors: object mapping labels -> color (optional)
 * - subtitle: small subtitle
 * - trend: array of {date, count} for sparkline
 */
export default function DonutKPI({
  title,
  value = 0,
  breakdown = {},
  size = 80,
  colors = {},
  subtitle = null,
  trend = [],
}) {
  const total = Object.values(breakdown || {}).reduce((a, b) => a + (b || 0), 0);
  const radius = (size / 2) - 8; // padding
  const circumference = 2 * Math.PI * radius;

  // Default color palette (keeps consistent with Tailwind tokens)
  const defaultColors = ["#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#10b981", "#7c3aed"];

  // Build segments for SVG
  let offset = 0;
  const segments = Object.entries(breakdown || {}).map(([label, count], idx) => {
    const percent = total > 0 ? (count / total) : 0;
    const dash = percent * circumference;
    const color = colors[label] || defaultColors[idx % defaultColors.length];
    const seg = {
      label,
      count,
      color,
      percent,
      dash,
      offset,
    };
    offset += dash;
    return seg;
  });

  // Sparkline polyline for trend
  const sparkline = (() => {
    if (!trend || !trend.length) return null;
    const max = Math.max(...trend.map((t) => t.count || 0), 1);
    const min = Math.min(...trend.map((t) => t.count || 0), 0);
    const width = 120;
    const height = 28;
    const step = width / Math.max(1, trend.length - 1);
    const points = trend.map((t, i) => {
      const x = i * step;
      const y = height - ((t.count - min) / Math.max(1, max - min)) * height;
      return `${x},${y}`;
    });
    return { points: points.join(" "), width, height };
  })();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] sm:text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {Number(value || 0).toLocaleString()}
          </div>
          {subtitle && (
            <p className="mt-1 text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Donut */}
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(${size/2}, ${size/2})`}> 
              <circle r={radius} cx={0} cy={0} fill="transparent" strokeWidth={12} stroke="#e6e6e6" />
              {segments.map((s, idx) => (
                <circle
                  key={s.label}
                  r={radius}
                  cx={0}
                  cy={0}
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={12}
                  strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                  strokeDashoffset={-s.offset}
                  strokeLinecap="butt"
                  transform="rotate(-90)"
                />
              ))}
            </g>
          </svg>

          {/* Legend */}
          <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            {segments.slice(0,4).map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }}></span>
                <span className="text-xs">{s.label}:</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {sparkline && (
        <div className="mt-3">
          <svg width={sparkline.width} height={sparkline.height}>
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              points={sparkline.points}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
