/**
 * useRealtimeStats Hook - Lifecycle & Error Handling Tests
 * Tests for mount/unmount, animation timing, error handling, and polling changes
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeStats, useAnimatedCounter } from '../useRealtimeStats';

// Mock the realtimeService
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockRefresh = jest.fn();
const mockGetConnectionState = jest.fn();
const mockInitialize = jest.fn();

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    subscribe: (...args) => mockSubscribe(...args),
    unsubscribe: (...args) => mockUnsubscribe(...args),
    refresh: (...args) => mockRefresh(...args),
    getConnectionState: () => mockGetConnectionState(),
    initialize: (...args) => mockInitialize(...args),
  },
}));

describe('useRealtimeStats', () => {
  let mockFetchCallback;
  let mockUpdateCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockFetchCallback = jest.fn().mockResolvedValue({ count: 5, status: 'ok' });
    mockUpdateCallback = null;
    
    // Default: already connected
    mockGetConnectionState.mockReturnValue('connected');
    mockInitialize.mockResolvedValue(undefined);
    
    // Subscribe captures the updateCallback and triggers it
    mockSubscribe.mockImplementation((channel, fetchCb, updateCb, interval) => {
      mockUpdateCallback = updateCb;
      // Simulate async fetch and update
      Promise.resolve()
        .then(() => fetchCb())
        .then((data) => {
          if (updateCb) updateCb(data, []);
        })
        .catch(() => {});
      return `sub-${channel}`;
    });
    
    mockRefresh.mockResolvedValue(undefined);
    mockUnsubscribe.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Lifecycle - Mount & Unmount', () => {
    it('subscribes on mount', async () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        'stats',
        expect.any(Function),
        expect.any(Function),
        120000
      );
    });

    it('unsubscribes on unmount', async () => {
      const { unmount } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalledWith('sub-stats');
    });

    it('initializes realtimeService if disconnected', async () => {
      mockGetConnectionState.mockReturnValue('disconnected');
      
      renderHook(() => useRealtimeStats(mockFetchCallback, { interval: 60000 }));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      expect(mockInitialize).toHaveBeenCalledWith(null, {
        pollingInterval: 60000,
        enableActivityLog: true,
      });
    });

    it('does not reinitialize if already connected', async () => {
      mockGetConnectionState.mockReturnValue('connected');
      
      renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      expect(mockInitialize).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('returns loading=true initially', () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      expect(result.current.loading).toBe(true);
    });

    it('sets loading=false after data arrives', async () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('updates data when new data arrives', async () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(result.current.data).toEqual({ count: 5, status: 'ok' });
      });
    });
  });

  describe('Changed Fields & Animation', () => {
    it('sets changedFields when update includes changed array', async () => {
      const { result } = renderHook(() => 
        useRealtimeStats(mockFetchCallback, { enableAnimations: true })
      );
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      // Simulate an update with changed fields
      await act(async () => {
        if (mockUpdateCallback) {
          mockUpdateCallback({ count: 10 }, ['count']);
        }
      });
      
      expect(result.current.changedFields).toEqual(['count']);
    });

    it('clears changedFields after 2000ms when animations enabled', async () => {
      const { result } = renderHook(() => 
        useRealtimeStats(mockFetchCallback, { enableAnimations: true })
      );
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      // Simulate an update with changed fields
      await act(async () => {
        if (mockUpdateCallback) {
          mockUpdateCallback({ count: 10 }, ['count']);
        }
      });
      
      expect(result.current.changedFields).toEqual(['count']);
      
      // Advance time by 2000ms
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      expect(result.current.changedFields).toEqual([]);
    });

    it('does not clear changedFields when animations disabled', async () => {
      const { result } = renderHook(() => 
        useRealtimeStats(mockFetchCallback, { enableAnimations: false })
      );
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      // Simulate an update with changed fields
      await act(async () => {
        if (mockUpdateCallback) {
          mockUpdateCallback({ count: 10 }, ['count']);
        }
      });
      
      // changedFields should be set but no timeout to clear
      expect(result.current.changedFields).toEqual(['count']);
      
      // Advance time - should still have changedFields
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      
      // When animations disabled, no clearing happens
      expect(result.current.changedFields).toEqual(['count']);
    });
  });

  describe('Error Handling', () => {
    it('sets error when fetch fails', async () => {
      const failingFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      mockSubscribe.mockImplementation((channel, fetchCb, updateCb, interval) => {
        Promise.resolve()
          .then(() => fetchCb())
          .catch(() => {});
        return `sub-${channel}`;
      });
      
      const { result } = renderHook(() => useRealtimeStats(failingFetch));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error.message).toBe('Network error');
      });
    });

    it('sets loading=false on error', async () => {
      const failingFetch = jest.fn().mockRejectedValue(new Error('API error'));
      
      mockSubscribe.mockImplementation((channel, fetchCb, updateCb, interval) => {
        Promise.resolve()
          .then(() => fetchCb())
          .catch(() => {});
        return `sub-${channel}`;
      });
      
      const { result } = renderHook(() => useRealtimeStats(failingFetch));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('clears error on successful update', async () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeDefined();
      });
    });
  });

  describe('Refresh Function', () => {
    it('calls realtimeService.refresh on manual refresh', async () => {
      const { result } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await act(async () => {
        await result.current.refresh();
      });
      
      expect(mockRefresh).toHaveBeenCalledWith('stats');
    });

    it('uses custom channel for refresh', async () => {
      const { result } = renderHook(() => 
        useRealtimeStats(mockFetchCallback, { channel: 'custom-stats' })
      );
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await act(async () => {
        await result.current.refresh();
      });
      
      expect(mockRefresh).toHaveBeenCalledWith('custom-stats');
    });
  });

  describe('Options', () => {
    it('uses custom channel name', async () => {
      renderHook(() => useRealtimeStats(mockFetchCallback, { channel: 'dashboard' }));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      expect(mockSubscribe).toHaveBeenCalledWith(
        'dashboard',
        expect.any(Function),
        expect.any(Function),
        120000
      );
    });

    it('uses custom interval', async () => {
      renderHook(() => useRealtimeStats(mockFetchCallback, { interval: 30000 }));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      expect(mockSubscribe).toHaveBeenCalledWith(
        'stats',
        expect.any(Function),
        expect.any(Function),
        30000
      );
    });

    it('calls onUpdate callback when provided', async () => {
      const onUpdate = jest.fn();
      
      renderHook(() => useRealtimeStats(mockFetchCallback, { onUpdate }));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          { count: 5, status: 'ok' },
          []
        );
      });
    });
  });

  describe('Prevent Updates After Unmount', () => {
    it('does not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useRealtimeStats(mockFetchCallback));
      
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      
      unmount();
      
      // Try to trigger update after unmount - should not throw
      expect(() => {
        if (mockUpdateCallback) {
          mockUpdateCallback({ count: 999 }, ['count']);
        }
      }).not.toThrow();
    });
  });
});

describe('useAnimatedCounter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useAnimatedCounter(100));
    expect(result.current).toBe(100);
  });

  it('animates to new target value', async () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedCounter(target),
      { initialProps: { target: 0 } }
    );
    
    expect(result.current).toBe(0);
    
    // Change target
    rerender({ target: 100 });
    
    // Advance animation frames
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    // Value should be between 0 and 100 (animating)
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThanOrEqual(100);
  });

  it('reaches target value after duration', async () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedCounter(target, 1000),
      { initialProps: { target: 0 } }
    );
    
    rerender({ target: 50 });
    
    // Advance past full duration
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });
    
    expect(result.current).toBe(50);
  });
});
