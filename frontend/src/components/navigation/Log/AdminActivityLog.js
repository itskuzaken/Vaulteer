"use client";

import React, { useState, useEffect } from "react";
import {
  IoTimeOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoDocumentTextOutline,
  IoSettingsOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoDownloadOutline,
  IoFilterOutline,
  IoSearchOutline,
  IoCalendarOutline,
} from "react-icons/io5";
import { useNotify } from "../../ui/NotificationProvider";
import {
  fetchActivityLogs,
  fetchActivityLogStats,
  exportActivityLogs,
} from "../../../services/activityLogService";

const LOG_TYPES = {
  AUTH: {
    label: "Authentication",
    color: "text-purple-600",
    icon: IoShieldCheckmarkOutline,
  },
  VOLUNTEER_MANAGEMENT: {
    label: "Volunteer Management",
    color: "text-red-600",
    icon: IoPersonOutline,
  },
  STAFF_MANAGEMENT: {
    label: "Staff Management",
    color: "text-blue-600",
    icon: IoPersonOutline,
  },
  APPLICATION: {
    label: "Applications",
    color: "text-amber-600",
    icon: IoDocumentTextOutline,
  },
  EVENT: { label: "Events", color: "text-green-600", icon: IoCalendarOutline },
  POST: { label: "Posts", color: "text-indigo-600", icon: IoCreateOutline },
  SETTINGS: {
    label: "Settings",
    color: "text-gray-600",
    icon: IoSettingsOutline,
  },
  SECURITY: {
    label: "Security",
    color: "text-red-700",
    icon: IoShieldCheckmarkOutline,
  },
  BULK_OPERATION: {
    label: "Bulk Operations",
    color: "text-orange-600",
    icon: IoDocumentTextOutline,
  },
  DATA_ACCESS: {
    label: "Data Access",
    color: "text-cyan-600",
    icon: IoDocumentTextOutline,
  },
};

const SEVERITY_COLORS = {
  HIGH: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400",
  MEDIUM:
    "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400",
  LOW: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400",
  INFO: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    high_severity: 0,
    today_count: 0,
    security_events: 0,
  });
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const notify = useNotify();

  // Fetch logs from API on mount
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
  }, [
    isAutoRefreshEnabled,
    searchTerm,
    selectedType,
    selectedSeverity,
    dateRange,
  ]);

  // Apply filters when dependencies change
  useEffect(() => {
    if (!loading) {
      fetchFilteredLogs();
    }
  }, [searchTerm, selectedType, selectedSeverity, dateRange]);

  const fetchLogsAndStats = async () => {
    try {
      setLoading(true);

      // Fetch logs and stats in parallel
      const [logsData, statsData] = await Promise.all([
        fetchActivityLogs({ limit: 100 }),
        fetchActivityLogStats(7),
      ]);

      // Handle response - backend returns { success, data, count }
      const logsArray = Array.isArray(logsData)
        ? logsData
        : logsData.data || logsData.logs || [];

      const statsObj = statsData.data || statsData;

      // Debug: Log sample data to check timestamp format
      if (logsArray.length > 0) {
        console.log("=== TIMESTAMP DEBUG ===");
        console.log("Sample log entry:", logsArray[0]);
        console.log("created_at value:", logsArray[0].created_at);
        console.log("created_at type:", typeof logsArray[0].created_at);
        console.log("metadata value:", logsArray[0].metadata);
        console.log("metadata type:", typeof logsArray[0].metadata);
        if (logsArray[0].metadata) {
          console.log("metadata.timestamp:", logsArray[0].metadata.timestamp);
          console.log("metadata.localTime:", logsArray[0].metadata.localTime);
        }

        // Check timezone information
        const sampleDate = new Date(logsArray[0].created_at);
        const now = new Date();

        console.log("\n--- Database Timestamp ---");
        console.log("Raw value:", logsArray[0].created_at);
        console.log("Parsed Date object:", sampleDate);
        console.log("ISO String (UTC):", sampleDate.toISOString());
        console.log("Local String:", sampleDate.toLocaleString());

        console.log("\n--- Current Time ---");
        console.log("Now (Date object):", now);
        console.log("Now ISO String (UTC):", now.toISOString());
        console.log("Now Local String:", now.toLocaleString());

        console.log("\n--- Time Difference ---");
        const diff = now - sampleDate;
        const minutesDiff = Math.floor(diff / 60000);
        const hoursDiff = Math.floor(diff / 3600000);
        console.log("Difference (ms):", diff);
        console.log("Difference (minutes):", minutesDiff);
        console.log("Difference (hours):", hoursDiff);

        console.log("\n--- Timezone Info ---");
        console.log(
          "Timezone offset (minutes):",
          sampleDate.getTimezoneOffset()
        );
        console.log(
          "User's timezone:",
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        console.log("======================\n");
      }

      setLogs(logsArray);
      setFilteredLogs(logsArray);
      setStats({
        total: parseInt(statsObj.total || 0),
        high_severity: parseInt(statsObj.high_severity || 0),
        today_count: parseInt(statsObj.today_count || 0),
        security_events: parseInt(statsObj.security_events || 0),
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
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
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
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
      if (searchTerm) params.searchTerm = searchTerm;
      if (dateRange.start)
        params.startDate = new Date(dateRange.start).toISOString();
      if (dateRange.end) params.endDate = new Date(dateRange.end).toISOString();

      await exportActivityLogs(params);
      notify?.push("Logs exported successfully", "success");
    } catch (error) {
      console.error("Error exporting logs:", error);
      notify?.push("Failed to export logs", "error");
    }
  };

  const formatTimestamp = (timestamp, metadata = null) => {
    if (!timestamp) return "Unknown";

    try {
      // If metadata.localTime exists, use it for the base calculation
      // This ensures we're working with the correct local time
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
      // If metadata.localTime exists, show it; otherwise format the date
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
            Monitor all system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <IoDownloadOutline className="w-5 h-5" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, action, or type..."
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
            {showFilters && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Log Type
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
                Severity
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="flex-1 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Logs
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            High Severity
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {stats.high_severity}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Today's Activity
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.today_count}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Security Events
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.security_events}
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <IoDocumentTextOutline className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No logs found matching your filters
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
                      {/* Icon */}
                      <div
                        className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${
                          LOG_TYPES[log.type]?.color || "text-gray-600"
                        }`}
                      >
                        {getLogIcon(log.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {log.action}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                SEVERITY_COLORS[log.severity]
                              }`}
                            >
                              {log.severity}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              {LOG_TYPES[log.type]?.label}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatTimestamp(log.created_at, log.metadata)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {log.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <IoPersonOutline className="w-4 h-4" />
                            {log.performed_by_name} ({log.performed_by_role})
                          </span>
                          {log.ip_address && (
                            <span className="flex items-center gap-1">
                              IP: {log.ip_address}
                            </span>
                          )}
                          {log.metadata &&
                            typeof log.metadata === "object" &&
                            log.metadata.localTime && (
                              <span className="flex items-center gap-1">
                                <IoTimeOutline className="w-4 h-4" />
                                {log.metadata.localTime}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
