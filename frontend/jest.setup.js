import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Ensure Firebase env var is set for tests to avoid initialization errors
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-firebase-api-key';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Lightweight mock of realtimeService to avoid test warnings from external updates
import realtimeService from './src/services/realtimeService';

// Make initialize a no-op
jest.spyOn(realtimeService, 'initialize').mockImplementation(async () => {});
// Pretend we're already connected
jest.spyOn(realtimeService, 'getConnectionState').mockImplementation(() => 'connected');
// Ensure subscribe calls the fetchCallback (so tests counting fetch calls still pass) but do NOT invoke updateCallback to avoid setState outside act
jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, fetchCallback, updateCallback) => {
  try {
    // Trigger fetch and call updateCallback asynchronously to avoid React act warnings in tests
    Promise.resolve()
      .then(() => fetchCallback())
      .then((data) => {
        if (updateCallback) {
          try {
            setTimeout(() => {
              try { updateCallback(data, []); } catch (e) {}
            }, 0);
          } catch (e) {}
        }
      })
      .catch(() => {});
  } catch (e) {
    // swallow
  }
  return `mock-sub-${channel}`;
});
// Make unsubscribe a no-op
jest.spyOn(realtimeService, 'unsubscribe').mockImplementation(() => true);

// Mock firebase/auth methods used by components
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn((app) => ({ currentUser: null })),
  onAuthStateChanged: (auth, cb) => {
    // Immediately invoke callback with null user to signal not signed in
    setTimeout(() => cb(null), 0);
    return () => {};
  },
  signInWithPopup: jest.fn(() => Promise.resolve()),
  GoogleAuthProvider: jest.fn(),
}));

// Provide a test-friendly getIdToken implementation so components that call
// fetchWithAuth don't immediately throw 'Not authenticated' in tests where we
// don't care about auth flows.
jest.mock('./src/services/firebase', () => ({
  getIdToken: jest.fn().mockResolvedValue('test-token'),
}));

// Simple global fetch mock that returns canned responses for known admin endpoints
const defaultFetchImpl = async (url, opts) => {
  const u = (url || '').toString();
  // Admin achievements
  if (u.includes('/gamification/admin/achievements')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    };
  }
  if (u.includes('/gamification/admin/achievement-mappings')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    };
  }

  // Default event attendance
  if (u.includes('/events/') && u.includes('/attendance')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { participants: [{ participant_id: 1, name: 'Alice', attendance_status: 'present' }], attendance_grace_mins: 10, checkin_window_mins: 15 } }),
    };
  }

  // Fallback safe response
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  };
};

// Ensure fetch is a mock function and reapply default implementation before each test
global.fetch = jest.fn(defaultFetchImpl);
beforeEach(() => {
  global.fetch.mockImplementation(defaultFetchImpl);

  // Reapply getIdToken resolved value so tests using jest.resetAllMocks() don't
  // end up with a no-op mock that returns undefined and cause "Not authenticated"
  // errors in fetchWithAuth.
  try {
    // eslint-disable-next-line global-require
    const firebaseSvc = require('./src/services/firebase');
    if (firebaseSvc && firebaseSvc.getIdToken && firebaseSvc.getIdToken.mockResolvedValue) {
      firebaseSvc.getIdToken.mockResolvedValue('test-token');
    }
  } catch (e) {
    // ignore if module isn't loaded yet
  }

  // Provide a safe default `apiCall` mock so components that call admin endpoints
  // can render without dealing with auth noise. Tests that need to assert on
  // apiCall can still override this mock.
  try {
    const apiUtils = require('./src/utils/apiUtils');
    if (apiUtils && apiUtils.apiCall && apiUtils.apiCall.mockImplementation === undefined) {
      // if apiCall is not yet a mock, replace with Jest mock fn
      apiUtils.apiCall = jest.fn(async (url, opts) => {
        const u = (url || '').toString();
        if (u.includes('/gamification/admin/achievements')) {
          return { data: [] };
        }
        if (u.includes('/gamification/admin/achievement-mappings')) {
          return { data: [] };
        }
        // default
        return {};
      });
    } else if (apiUtils && apiUtils.apiCall && apiUtils.apiCall.mockImplementation) {
      // ensure mock implementation exists
      apiUtils.apiCall.mockImplementation(async (url, opts) => {
        const u = (url || '').toString();
        if (u.includes('/gamification/admin/achievements')) return { data: [] };
        if (u.includes('/gamification/admin/achievement-mappings')) return { data: [] };
        return {};
      });
    }
  } catch (e) {
    // ignore
  }
});

