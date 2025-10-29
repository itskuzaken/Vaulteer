/**
 * Real-time Stats Grid Component
 * Container for real-time statistics cards with automatic updates
 */

import React from "react";
import StatsCard from "../ui/StatsCard";
import { useRealtimeStats } from "../../hooks/useRealtimeStats";

/**
 * Stats Grid with real-time updates
 * @param {object} props - Component props
 * @param {array} props.statsConfig - Array of stat configurations
 * @param {function} props.fetchCallback - Function to fetch all stats
 * @param {number} props.updateInterval - Update interval in ms (default: 15000)
 * @param {string} props.channel - Channel name for realtime service
 * @param {boolean} props.showLiveIndicator - Show live update indicator
 */
export default function RealtimeStatsGrid({
  statsConfig = [],
  fetchCallback,
  updateInterval = 15000,
  channel = "stats",
  showLiveIndicator = true,
  gridCols = 4,
  onStatsUpdate = null,
}) {
  const { data, loading, error, changedFields } = useRealtimeStats(
    fetchCallback,
    {
      channel,
      interval: updateInterval,
      enableAnimations: true,
      onUpdate: onStatsUpdate,
    }
  );

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
        <p className="text-red-600 dark:text-red-400">
          Failed to load statistics. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stats Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${gridCols} gap-4`}
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
    </div>
  );
}
