import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
 * - hoverLegend: boolean - enable hover tooltips (default false)
 * - position: "inline" | "overlay" - layout mode (default "inline")
 */
export default function DonutKPI({
  title,
  value = 0,
  breakdown = {},
  size = 80,
  colors = {},
  subtitle = null,
  trend = [],
  hoverLegend = false,
  position = "inline",
  delta = null,
}) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const svgRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const total = Object.values(breakdown || {}).reduce((a, b) => a + (b || 0), 0);
  const radius = (size / 2) - 8; // padding
  const circumference = 2 * Math.PI * radius;

  // Default color palette (keeps consistent with Tailwind tokens)
  const defaultColors = ["#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#10b981", "#7c3aed"];

  // Common status -> color mapping (borrowed from UserCard `statusStyles` design)
  const statusColors = {
    active: "#10b981", // emerald-500
    inactive: "#9CA3AF", // gray-400
    deactivated: "#111827", // gray-900
    pending: "#f59e0b", // amber-500
    approved: "#10b981", // emerald-500
    rejected: "#ef4444", // red-500
    registered: "#3b82f6", // blue-500
    attended: "#10b981",
    cancelled: "#ef4444",
    waitlisted: "#f59e0b",
    "no-show": "#f59e0b",
    noshow: "#f59e0b",
    // New statuses
    underreview: "#6366f1", // indigo-500
    "under_review": "#6366f1",
    "under review": "#6366f1",
    interviewscheduled: "#3b82f6", // blue-500 (interview scheduled)
    "interview_scheduled": "#3b82f6",
    "interview scheduled": "#3b82f6",
    interview: "#3b82f6",
  };

  const normalizeKey = (k = "") => k.toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

  // Build segments for SVG
  let offset = 0;
  // Sort breakdown entries so 'active' appears first and 'deactivated' last.
  const entries = Object.entries(breakdown || {});
  const entriesSorted = entries.sort(([a], [b]) => {
    const na = normalizeKey(a);
    const nb = normalizeKey(b);
    if (na === "active" && nb !== "active") return -1;
    if (nb === "active" && na !== "active") return 1;
    if (na === "deactivated" && nb !== "deactivated") return 1;
    if (nb === "deactivated" && na !== "deactivated") return -1;
    return na.localeCompare(nb);
  });

  const segments = entriesSorted.map(([label, count], idx) => {
    const percent = total > 0 ? (count / total) : 0;
    const dash = percent * circumference;
    const normalized = normalizeKey(label);
    const color =
      colors[label] || // explicit colors prop by exact label
      colors[normalized] || // colors prop by normalized key
      statusColors[normalized] || // statusColors mapping
      defaultColors[idx % defaultColors.length];

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

  const containerClass = position === "inline" 
    ? "rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 shadow-sm"
    : "";

  // Tooltip positioning
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const portalRef = useRef(null);

  const updateTooltipPos = () => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    let top = rect.top + rect.height / 2;

    // Respect header (if present) by ensuring center is below header + margin
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom || 0;
    const margin = 8;

    // If portal element already mounted, clamp using its height
    const portalEl = portalRef.current;
    if (portalEl) {
      const halfH = portalEl.offsetHeight / 2;
      top = Math.max(top, headerBottom + margin + halfH);
      top = Math.min(top, window.innerHeight - margin - halfH);
    } else {
      // If not mounted yet, at least ensure top isn't above header
      top = Math.max(top, headerBottom + margin + 24); // approximate
    }

    setTooltipPos({ top, left });
  };

  useEffect(() => {
    if (!isHovering) return;
    // initial update and attach listeners
    updateTooltipPos();
    const onScroll = () => updateTooltipPos();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHovering]);

  // Re-measure portal after it mounts so we can clamp correctly
  useEffect(() => {
    if (!isHovering) return;
    const t = setTimeout(() => {
      updateTooltipPos();
    }, 0);
    return () => clearTimeout(t);
  }, [isHovering, hoveredSegment]);

  return (
    <div className={`relative ${containerClass}`}>
      {/* Delta chip: inline next to donut when position="inline", overlay when position="overlay" */}
      {delta != null && delta !== 'new' && position === 'overlay' && (() => {
        const n = Number(delta);
        if (isNaN(n)) return null;
        const isPositive = n >= 0;
        const display = Math.abs(n).toFixed(1);
        const arrow = isPositive ? '▲' : '▼';

        return (
          <div className="absolute top-1 right-1">
            <span
              aria-label={`Change: ${isPositive ? '+' : '-'}${display}%`}
              title={`${isPositive ? '+' : '-'}${display}%`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}
            >
              {arrow} {display}%
            </span>
          </div>
        );
      })()}
      {/* Title and Value (only shown in inline mode) */}
      {position === "inline" && title && (
        <>
          <p className="text-[0.65rem] sm:text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {Number(value || 0).toLocaleString()}
          </div>
          {subtitle && (
            <p className="mt-1 text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className={position === "inline" ? "flex items-center gap-3" : ""}>
          {/* Donut */}
<svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} onMouseEnter={() => { if (hoverLegend) { clearTimeout(hoverTimeoutRef.current); setIsHovering(true); updateTooltipPos(); } }} onMouseLeave={() => { if (hoverLegend) { hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 120); } }}>
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
                  onMouseEnter={() => {
                    if (hoverLegend) {
                      clearTimeout(hoverTimeoutRef.current);
                      setHoveredSegment(s);
                      setIsHovering(true);
                      updateTooltipPos();
                    }
                  }}
                  onMouseLeave={() => {
                    if (hoverLegend) {
                      setHoveredSegment(null);
                      hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 120);
                    }
                  }}
                  style={{ cursor: hoverLegend ? "pointer" : "default" }}
                  className={hoverLegend ? "transition-opacity duration-200 hover:opacity-80" : ""}
                />
              ))}
            </g>
          </svg>

          {/* Inline delta chip (next to donut) */}
          {position === 'inline' && delta != null && delta !== 'new' && (() => {
            const n = Number(delta);
            if (isNaN(n)) return null;
            const isPositive = n >= 0;
            const display = Math.abs(n).toFixed(1);
            const arrow = isPositive ? '▲' : '▼';

            return (
              <div className="flex-shrink-0">
                <span
                  aria-label={`Change: ${isPositive ? '+' : '-'}${display}%`}
                  title={`${isPositive ? '+' : '-'}${display}%`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}
                >
                  {arrow} {display}%
                </span>
              </div>
            );
          })()}

          {/* Legend (shown when position="inline" and not using hover) */}
          {position === "inline" && !hoverLegend && (
            <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
              {segments.slice(0,4).map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }}></span>
                  <span className="text-xs">{s.label}:</span>
                  <span className="font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoverLegend && isHovering && svgRef.current && createPortal(
        <div
          ref={portalRef}
          role="dialog"
          aria-label={title || "Breakdown"}
          onMouseEnter={() => { clearTimeout(hoverTimeoutRef.current); setIsHovering(true); }}
          onMouseLeave={() => { hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 120); }}
          style={{ position: "fixed", top: tooltipPos.top, left: tooltipPos.left, transform: "translate(-50%, -50%)", zIndex: 9999 }}
        >
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="font-semibold mb-1 text-gray-900 dark:text-white">{title || "Breakdown"} — Total: {Number(total).toLocaleString()}</div>
            <div className="flex flex-col gap-1">
              {segments.map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 px-1 py-0.5 rounded ${hoveredSegment?.label === s.label ? "bg-gray-100/60 dark:bg-white/10" : ""}`}
                  onMouseEnter={() => setHoveredSegment(s)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                  <div className="flex-1 text-xs text-left">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{s.count.toLocaleString()} ({(s.percent * 100).toFixed(1)}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sparkline */}
      {sparkline && position === "inline" && (
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
