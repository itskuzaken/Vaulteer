/**
 * Real-time Stats Grid Component
 * Container for real-time statistics cards with automatic updates
 */

import React from "react";
import { IoPulseOutline } from "react-icons/io5";
import StatsCard from "./StatsCard";
import DonutKPI from "./DonutKPI";
import DashboardSectionCard from "./DashboardSectionCard";
import { useRealtimeStats } from "../../hooks/useRealtimeStats";
import useWindowSize from "../../hooks/useWindowSize";
// Comparison / delta calculation removed — no computeDelta import
// breakdowns are provided by the parent `fetchCallback` and available via `data`

const GRID_COL_CLASS = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Stats Grid with real-time updates
 * @param {object} props - Component props
 * @param {array} props.statsConfig - Array of stat configurations
 * @param {function} props.fetchCallback - Function to fetch all stats
 * @param {number} props.updateInterval - Update interval in ms (default: 15000)
 * @param {string} props.channel - Channel name for realtime service
 */
export default function RealtimeStatsGrid({
  statsConfig = [],
  fetchCallback,
  updateInterval = 120000,
  channel = "stats",
  gridCols = 4,
  onStatsUpdate = null,
  title = "Overview",
  subtitle = "Real-time stats",
  icon = IoPulseOutline,
  action = null,
  className = "",
}) {
  // Time range selector & comparison removed — grid always shows current period

  // Memoize the fetch callback so the hook only re-subscribes when relevant params change.
  const fetchWithRange = React.useCallback(() => {
    // Simplified: always call fetchCallback with no comparison options
    if (typeof fetchCallback !== 'function') return Promise.resolve(null);
    return fetchCallback();
  }, [fetchCallback]);

  const {
    data,
    loading,
    error,
    changedFields = [],
    refresh,
  } = useRealtimeStats(fetchWithRange, {
    channel,
    interval: updateInterval,
    enableAnimations: true,
    onUpdate: onStatsUpdate,
  });

  // Ensure an initial fetch happens on mount so tests and consumers get immediate data
  React.useEffect(() => {
    // fire and forget; use safeFetchCallback pattern in hook for errors
    fetchWithRange().catch(() => {});
  }, [fetchWithRange]);
  // derive breakdowns from central `data` returned by fetchCallback
  const [localFlash, setLocalFlash] = React.useState(false);

  const { width: windowWidth } = useWindowSize();

  // Responsive settings
  const donutSize = windowWidth && windowWidth < 640 ? 56 : windowWidth && windowWidth < 1024 ? 64 : 72;
  const kpiPositionResolved = windowWidth && windowWidth < 640 ? "bottom" : "right";

  // Avoid rendering a 3-column layout. Choose column counts that exclude 3.
  const columns = React.useMemo(() => {
    if (!windowWidth) return Math.min(4, gridCols);
    // Large screens -> up to 4 columns
    if (windowWidth >= 1200) return Math.min(2, gridCols);
    // Medium screens -> 2 columns
    if (windowWidth >= 900) return Math.min(2, gridCols);
    // Small tablets / large phones -> 2 columns
    if (windowWidth >= 640) return Math.min(2, gridCols);
    // Mobile -> 2 columns (requested behavior)
    return Math.min(2, gridCols);
  }, [windowWidth, gridCols]);

  const IconComponent = icon || IoPulseOutline;
  // Date range UI removed — KPI always reflects current totals


  // Refresh handled by realtime hook; keep localFlash behavior on manual refresh if used
  React.useEffect(() => {
    if (typeof refresh !== "function") return;
  }, [refresh]);

  // Analytics for range changes removed (no selector)

  return (
    <DashboardSectionCard
      title={title}
      subtitle={subtitle}
      icon={IconComponent}
      className={className}
      action={
        <div className="flex items-center gap-2">
          {action}
        </div>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          Failed to load statistics. Please try again.
        </div>
      ) : (
        <div
          className={`grid gap-3 sm:gap-4`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {statsConfig
            .filter((c) => c.key !== 'recent_activity') // Filter out recent_activity
            .map((config, index) => {
              const value = data ? data[config.key] : 0;
              const isChanged = changedFields.includes(config.key) || localFlash;

              // Get breakdown data if specified
              const breakdown = data && config.breakdownKey ? data[config.breakdownKey] : null;

              // Comparison removed — no delta provided
              const delta = null;

              // Build DonutKPI node if breakdown exists
              const kpiNode = breakdown ? (
                <DonutKPI
                  title={null}
                  value={value}
                  breakdown={breakdown}
                  size={donutSize}
                  subtitle={null}
                  hoverLegend={true}
                  position="overlay"
                />
              ) : null;

              // Determine if this stat should render a 'New' badge (previous was 0 and current > 0)
              const isNew = Boolean(data && data.previous && typeof data.previous[config.key] !== 'undefined' && Number(data.previous[config.key]) === 0 && Number(value) > 0);

              return (
                <StatsCard
                  key={config.key || index}
                  title={config.title}
                  value={value}
                  icon={config.icon}
                  color={config.color || "gray"}
                  subtitle={config.subtitle}
                  isChanged={isChanged}
                  trend={config.trend}
                  trendValue={config.trendValue}
                  delta={delta}
                  loading={loading && !data}
                  animationDuration={config.animationDuration || 1000}
                  onClick={config.onClick}
                  showRealtimeIndicator={config.showRealtimeIndicator || false}
                  showNewIndicator={isNew}
                  kpi={kpiNode}
                  kpiPosition={kpiPositionResolved}
                />
              );
            })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
