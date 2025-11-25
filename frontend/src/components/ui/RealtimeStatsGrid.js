/**
 * Real-time Stats Grid Component
 * Container for real-time statistics cards with automatic updates
 */

import React from "react";
import { IoPulseOutline } from "react-icons/io5";
import StatsCard from "./StatsCard";
import DashboardSectionCard from "./DashboardSectionCard";
import { useRealtimeStats } from "../../hooks/useRealtimeStats";

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
  const {
    data,
    loading,
    error,
    changedFields = [],
  } = useRealtimeStats(fetchCallback, {
    channel,
    interval: updateInterval,
    enableAnimations: true,
    onUpdate: onStatsUpdate,
  });

  const lgColsClass = GRID_COL_CLASS[gridCols] || GRID_COL_CLASS[4];
  const IconComponent = icon || IoPulseOutline;

  return (
    <DashboardSectionCard
      title={title}
      subtitle={subtitle}
      icon={IconComponent}
      action={action}
      className={className}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          Failed to load statistics. Please try again.
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 ${lgColsClass} gap-3 sm:gap-4`}
        >
          {statsConfig.map((config, index) => {
            const value = data ? data[config.key] : 0;
            const isChanged = changedFields.includes(config.key);

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
                loading={loading && !data}
                animationDuration={config.animationDuration || 1000}
                onClick={config.onClick}
              />
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
