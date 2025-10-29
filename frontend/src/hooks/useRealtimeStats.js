/**
 * Custom React Hook for Real-time Statistics
 * Provides real-time updates for dashboard statistics with animations
 */

import { useState, useEffect, useRef, useCallback } from "react";
import realtimeService from "../services/realtimeService";

/**
 * Hook for real-time statistics updates
 * @param {function} fetchCallback - Function to fetch stats data
 * @param {object} options - Configuration options
 * @returns {object} { data, loading, error, changedFields, refresh }
 */
export function useRealtimeStats(fetchCallback, options = {}) {
  const {
    channel = "stats",
    interval = 15000,
    enableAnimations = true,
    onUpdate = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changedFields, setChangedFields] = useState([]);
  const subscriptionIdRef = useRef(null);
  const mountedRef = useRef(true);

  // Fetch callback with error handling
  const safeFetchCallback = useCallback(async () => {
    try {
      const result = await fetchCallback();
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      throw err;
    }
  }, [fetchCallback]);

  // Update callback when new data arrives
  const handleUpdate = useCallback(
    (newData, changed) => {
      if (!mountedRef.current) return;

      setData(newData);
      setLoading(false);
      setError(null);

      if (changed && changed.length > 0) {
        setChangedFields(changed);

        // Clear changed fields after animation duration
        if (enableAnimations) {
          setTimeout(() => {
            if (mountedRef.current) {
              setChangedFields([]);
            }
          }, 2000);
        }
      }

      // Call custom update handler
      if (onUpdate) {
        onUpdate(newData, changed);
      }
    },
    [enableAnimations, onUpdate]
  );

  // Subscribe to realtime updates
  useEffect(() => {
    mountedRef.current = true;

    const subscribe = async () => {
      try {
        // Initialize realtime service if not already initialized
        if (realtimeService.getConnectionState() === "disconnected") {
          await realtimeService.initialize(null, {
            pollingInterval: interval,
            enableActivityLog: true,
          });
        }

        // Subscribe to channel
        const subId = realtimeService.subscribe(
          channel,
          safeFetchCallback,
          handleUpdate,
          interval
        );

        subscriptionIdRef.current = subId;
      } catch (err) {
        console.error("Failed to subscribe to realtime updates:", err);
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
        }
      }
    };

    subscribe();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [channel, interval, safeFetchCallback, handleUpdate]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (subscriptionIdRef.current) {
      await realtimeService.refresh(channel);
    }
  }, [channel]);

  return {
    data,
    loading,
    error,
    changedFields,
    refresh,
  };
}

/**
 * Hook for animated counter effect
 * @param {number} targetValue - Target number to animate to
 * @param {number} duration - Animation duration in ms
 * @returns {number} Current animated value
 */
export function useAnimatedCounter(targetValue, duration = 1000) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef(null);

  useEffect(() => {
    if (displayValue === targetValue) return;

    const startValue = displayValue;
    const difference = targetValue - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + difference * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, displayValue]);

  return displayValue;
}

/**
 * Hook for multiple realtime stats channels
 * @param {object} channels - Object mapping channel names to fetch callbacks
 * @param {object} options - Configuration options
 * @returns {object} Object mapping channel names to their data/state
 */
export function useRealtimeMultiStats(channels, options = {}) {
  const [stats, setStats] = useState({});
  const subscriptionsRef = useRef({});

  useEffect(() => {
    const subscriptions = {};

    Object.entries(channels).forEach(([channelName, fetchCallback]) => {
      const subId = realtimeService.subscribe(
        channelName,
        fetchCallback,
        (newData, changed) => {
          setStats((prev) => ({
            ...prev,
            [channelName]: {
              data: newData,
              changed,
              loading: false,
              error: null,
            },
          }));
        },
        options.interval
      );

      subscriptions[channelName] = subId;
    });

    subscriptionsRef.current = subscriptions;

    return () => {
      Object.values(subscriptions).forEach((subId) => {
        realtimeService.unsubscribe(subId);
      });
    };
  }, [channels, options.interval]);

  return stats;
}

export default useRealtimeStats;
