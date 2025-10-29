"use client";

import React, { useState, useEffect } from "react";
import {
  IoTimeOutline,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoDownloadOutline,
  IoFilterOutline,
  IoSearchOutline,
  IoMailOutline,
} from "react-icons/io5";
import { useNotify } from "../../ui/NotificationProvider";
import {
  fetchActivityLogs,
  fetchActivityLogStats,
  exportActivityLogs,
} from "../../../services/activityLogService";
import { getAuth } from "firebase/auth";

const LOG_TYPES = {
  VOLUNTEER_MANAGEMENT: {
    label: "Volunteer Management",
    color: "text-red-600",
    icon: IoPersonOutline,
  },
  APPLICATION: {
    label: "Applications",
    color: "text-amber-600",
    icon: IoDocumentTextOutline,
  },
  EVENT: { label: "Events", color: "text-green-600", icon: IoCalendarOutline },
  POST: { label: "Posts", color: "text-indigo-600", icon: IoCreateOutline },
  COMMUNICATION: {
    label: "Communication",
    color: "text-blue-600",
    icon: IoMailOutline,
  },
  DATA_ACCESS: {
    label: "Data Access",
    color: "text-cyan-600",
    icon: IoDocumentTextOutline,
  },
};

export default function StaffActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today_count: 0,
    period_count: 0,
  });
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    fetchLogsAndStats();
  }, []);

  // Auto-refresh logs every 10 seconds
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const intervalId = setInterval(() => {
      fetchFilteredLogs();
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [isAutoRefreshEnabled, searchTerm, selectedType, dateRange]);

  useEffect(() => {
    if (!loading) {
      fetchFilteredLogs();
    }
  }, [searchTerm, selectedType, dateRange]);

  const fetchLogsAndStats = async () => {
    try {
      setLoading(true);

      // Fetch logs and stats for current staff member
      const [logsData, statsData] = await Promise.all([
        fetchActivityLogs({ limit: 100 }),
        fetchActivityLogStats(7),
      ]);

      // Handle response - backend returns { success, data, count }
      const logsArray = Array.isArray(logsData)
        ? logsData
        : logsData.data || logsData.logs || [];

      const statsObj = statsData.data || statsData;

      setLogs(logsArray);
      setFilteredLogs(logsArray);
      setStats({
        total: parseInt(statsObj.total || 0),
        today_count: parseInt(statsObj.today_count || 0),
        period_count: parseInt(statsObj.period_count || 0),
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      notify?.push("Failed to load activity logs", "error");
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredLogs = async () => {
    try {
      const params = {
        limit: 100,
      };

      if (selectedType !== "ALL") params.type = selectedType;
      if (searchTerm) params.searchTerm = searchTerm;
      if (dateRange.start)
        params.startDate = new Date(dateRange.start).toISOString();
      if (dateRange.end) params.endDate = new Date(dateRange.end).toISOString();

      const logsData = await fetchActivityLogs(params);

      // Handle response - backend returns { success, data, count }
      const logsArray = Array.isArray(logsData)
        ? logsData
        : logsData.data || logsData.logs || [];

      setFilteredLogs(logsArray);
    } catch (error) {
      console.error("Error fetching filtered logs:", error);
      notify?.push("Failed to apply filters", "error");
      setFilteredLogs([]);
    }
  };

  const handleExportLogs = async () => {
    try {
      const params = {};
      if (selectedType !== "ALL") params.type = selectedType;
      if (searchTerm) params.searchTerm = searchTerm;
      if (dateRange.start)
        params.startDate = new Date(dateRange.start).toISOString();
      if (dateRange.end) params.endDate = new Date(dateRange.end).toISOString();

      await exportActivityLogs(params);
      notify?.push("Activity log exported successfully", "success");
    } catch (error) {
      console.error("Error exporting logs:", error);
      notify?.push("Failed to export logs", "error");
    }
  };

  const formatTimestamp = (timestamp, metadata = null) => {
    if (!timestamp) return "Unknown";

    try {
      // If metadata.timestamp exists, use it for the base calculation
      const dateString = metadata?.timestamp || timestamp;
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) return "Invalid date";

      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      // For older dates, show full timestamp
      if (metadata?.localTime) {
        return metadata.localTime;
      }

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return "Invalid date";
    }
  };

  const getLogIcon = (type) => {
    const LogIcon = LOG_TYPES[type]?.icon || IoDocumentTextOutline;
    return <LogIcon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your actions and activities in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <IoDownloadOutline className="w-5 h-5" />
            Export Activity
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <IoFilterOutline className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Types</option>
                {Object.entries(LOG_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Activities
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {stats.today_count}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            This Week
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats.period_count}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <IoDocumentTextOutline className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No activities found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <div
                key={log.log_id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${
                      LOG_TYPES[log.type]?.color || "text-gray-600"
                    }`}
                  >
                    {getLogIcon(log.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {LOG_TYPES[log.type]?.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.created_at, log.metadata)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {log.description}
                    </p>

                    {log.metadata && typeof log.metadata === "object" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
