// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in focus

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
// Note: This config is loaded from /api/firebase-config which generates it from env variables
let firebaseConfig = null;

// Try to load config from the API endpoint
try {
  importScripts('/api/firebase-config');
  // The API returns JavaScript that sets self.firebaseConfig
  firebaseConfig = self.firebaseConfig;
} catch (e) {
  console.error('[firebase-messaging-sw.js] Failed to load firebase config from API:', e);
  
  // Fallback: Try to use hardcoded config (not recommended for production)
  // You MUST set proper values in your environment variables:
  // - NEXT_PUBLIC_FIREBASE_API_KEY
  // - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  // - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  // - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  // - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  // - NEXT_PUBLIC_FIREBASE_APP_ID
  firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  console.warn('[firebase-messaging-sw.js] Using fallback config. Please set Firebase environment variables.');
}

if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.error('[firebase-messaging-sw.js] Firebase config is missing or invalid. Please set environment variables.');
  throw new Error('Firebase configuration is required for push notifications. Set NEXT_PUBLIC_FIREBASE_* environment variables.');
}

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { title, body, icon, image } = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = title || 'Vaulteer Notification';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: icon || '/icon-192x192.png',
    badge: '/icon-96x96.png',
    image: image || null,
    data: {
      url: data.clickAction || data.actionUrl || '/dashboard',
      ...data,
    },
    tag: data.source_type || 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          // Navigate to the URL and focus
          client.focus();
          return client.navigate(urlToOpen);
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});
