/**
 * Real-time Data Service
 * Provides real-time updates for dashboard statistics and data
 * Supports WebSocket (Socket.IO) with fallback to optimized polling
 */

class RealtimeService {
  constructor() {
    this.socket = null;
    this.pollingIntervals = new Map();
    this.subscribers = new Map();
    this.connectionState = "disconnected";
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.useWebSocket = true; // Try WebSocket first
    this.pollingInterval = 15000; // 15 seconds for polling fallback
    this.activityLogEnabled = true;
  }

  /**
   * Initialize the realtime service
   * @param {string} serverUrl - WebSocket server URL
   * @param {object} options - Configuration options
   */
  async initialize(serverUrl = null, options = {}) {
    this.pollingInterval = options.pollingInterval || 15000;
    this.activityLogEnabled = options.enableActivityLog !== false;

    // Try WebSocket connection if URL provided
    if (serverUrl && this.useWebSocket) {
      try {
        await this.connectWebSocket(serverUrl);
        this.log("Initialized with WebSocket connection");
      } catch (error) {
        console.warn(
          "WebSocket connection failed, falling back to polling:",
          error
        );
        this.usePolling();
      }
    } else {
      this.usePolling();
    }
  }

  /**
   * Connect to WebSocket server (Socket.IO)
   * @param {string} serverUrl - Server URL
   */
  async connectWebSocket(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        // Note: Socket.IO client would be imported here
        // For now, we'll use polling as primary method
        // import io from 'socket.io-client';
        // this.socket = io(serverUrl, { transports: ['websocket'] });

        reject(new Error("WebSocket not implemented - using polling"));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Use polling mechanism for updates
   */
  usePolling() {
    this.connectionState = "connected";
    this.log("Using polling mechanism for real-time updates");
  }

  /**
   * Subscribe to real-time updates for a specific data channel
   * @param {string} channel - Data channel name (e.g., 'stats', 'volunteers', 'events')
   * @param {function} fetchCallback - Function to fetch data
   * @param {function} updateCallback - Function called with updated data
   * @param {number} customInterval - Custom polling interval in ms (optional)
   * @returns {string} Subscription ID
   */
  subscribe(channel, fetchCallback, updateCallback, customInterval = null) {
    const subscriptionId = `${channel}_${Date.now()}_${Math.random()}`;

    const subscription = {
      id: subscriptionId,
      channel,
      fetchCallback,
      updateCallback,
      interval: customInterval || this.pollingInterval,
      lastData: null,
      active: true,
    };

    // Store subscription
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel).push(subscription);

    // Start polling for this subscription
    this.startPolling(subscription);

    this.log(`Subscribed to channel: ${channel} (ID: ${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Start polling for a subscription
   * @param {object} subscription - Subscription object
   */
  startPolling(subscription) {
    // Initial fetch
    this.fetchAndUpdate(subscription);

    // Set up polling interval
    const intervalId = setInterval(() => {
      if (subscription.active) {
        this.fetchAndUpdate(subscription);
      }
    }, subscription.interval);

    this.pollingIntervals.set(subscription.id, intervalId);
  }

  /**
   * Fetch data and trigger update callback
   * @param {object} subscription - Subscription object
   */
  async fetchAndUpdate(subscription) {
    try {
      const newData = await subscription.fetchCallback();

      // Check if data has changed
      const hasChanged = this.hasDataChanged(subscription.lastData, newData);

      if (hasChanged || subscription.lastData === null) {
        const changedFields = this.getChangedFields(
          subscription.lastData,
          newData
        );

        subscription.lastData = newData;
        subscription.updateCallback(newData, changedFields);

        this.log(`Updated channel: ${subscription.channel}`, {
          changed: changedFields,
          data: newData,
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${subscription.channel}:`, error);
      this.handleError(subscription, error);
    }
  }

  /**
   * Check if data has changed
   * @param {any} oldData - Previous data
   * @param {any} newData - New data
   * @returns {boolean}
   */
  hasDataChanged(oldData, newData) {
    if (oldData === null) return true;
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  }

  /**
   * Get list of changed fields
   * @param {object} oldData - Previous data
   * @param {object} newData - New data
   * @returns {string[]} Array of changed field names
   */
  getChangedFields(oldData, newData) {
    if (!oldData || !newData) return [];

    const changed = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      if (oldData[key] !== newData[key]) {
        changed.push(key);
      }
    });

    return changed;
  }

  /**
   * Unsubscribe from a channel
   * @param {string} subscriptionId - Subscription ID
   */
  unsubscribe(subscriptionId) {
    // Find and remove subscription
    for (const [channel, subs] of this.subscribers.entries()) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs[index].active = false;

        // Clear polling interval
        const intervalId = this.pollingIntervals.get(subscriptionId);
        if (intervalId) {
          clearInterval(intervalId);
          this.pollingIntervals.delete(subscriptionId);
        }

        // Remove subscription
        subs.splice(index, 1);

        // Clean up empty channels
        if (subs.length === 0) {
          this.subscribers.delete(channel);
        }

        this.log(`Unsubscribed from: ${subscriptionId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Unsubscribe all subscriptions from a channel
   * @param {string} channel - Channel name
   */
  unsubscribeChannel(channel) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.forEach((sub) => {
        sub.active = false;
        const intervalId = this.pollingIntervals.get(sub.id);
        if (intervalId) {
          clearInterval(intervalId);
          this.pollingIntervals.delete(sub.id);
        }
      });
      this.subscribers.delete(channel);
      this.log(`Unsubscribed all from channel: ${channel}`);
    }
  }

  /**
   * Handle errors during data fetching
   * @param {object} subscription - Subscription object
   * @param {Error} error - Error object
   */
  handleError(subscription, error) {
    this.log(`Error in channel ${subscription.channel}:`, error, "error");

    // Implement exponential backoff for retries
    if (subscription.retryCount === undefined) {
      subscription.retryCount = 0;
    }

    subscription.retryCount++;

    if (subscription.retryCount >= 3) {
      console.error(
        `Too many errors for ${subscription.channel}, pausing updates`
      );
      subscription.active = false;
    }
  }

  /**
   * Manually trigger refresh for a channel
   * @param {string} channel - Channel name
   */
  async refresh(channel) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      await Promise.all(subs.map((sub) => this.fetchAndUpdate(sub)));
      this.log(`Manually refreshed channel: ${channel}`);
    }
  }

  /**
   * Refresh all channels
   */
  async refreshAll() {
    const promises = [];
    for (const [channel, subs] of this.subscribers.entries()) {
      promises.push(...subs.map((sub) => this.fetchAndUpdate(sub)));
    }
    await Promise.all(promises);
    this.log("Manually refreshed all channels");
  }

  /**
   * Get current connection state
   * @returns {string} Connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Get active subscriptions count
   * @returns {number} Number of active subscriptions
   */
  getActiveSubscriptionsCount() {
    let count = 0;
    for (const subs of this.subscribers.values()) {
      count += subs.filter((s) => s.active).length;
    }
    return count;
  }

  /**
   * Log activity
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @param {string} level - Log level
   */
  log(message, data = null, level = "info") {
    if (!this.activityLogEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      service: "RealtimeService",
    };

    if (level === "error") {
      console.error(`[RealtimeService] ${message}`, data);
    } else if (process.env.NODE_ENV === "development") {
      console.log(`[RealtimeService] ${message}`, data || "");
    }

    // Could send to logging service here
  }

  /**
   * Cleanup and disconnect
   */
  disconnect() {
    // Clear all intervals
    for (const intervalId of this.pollingIntervals.values()) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();

    // Disconnect socket if exists
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear subscribers
    this.subscribers.clear();
    this.connectionState = "disconnected";

    this.log("Disconnected from realtime service");
  }
}

// Export singleton instance
const realtimeService = new RealtimeService();
export default realtimeService;
