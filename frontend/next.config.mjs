/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Compose a single object string for easier access from client code during development
// Without this, developers still use individual NEXT_PUBLIC_* variables. This is
// intended as a convenience for dev-only local setups that prefer a single payload.
const NEXT_PUBLIC_FIREBASE_JSON = isDev
  ? JSON.stringify({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })
  : undefined;

const nextConfig = {
  images: {
    // Allow loading profile/avatar images hosted on Google user content URLs (used for OAuth avatars)
    // Use remotePatterns if you need finer-grained control. This is intentionally narrow to avoid
    // enabling arbitrary external hosts.
    domains: ["lh3.googleusercontent.com"],
  },
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.17:3000",
    "https://vaulteer.kuzaken.tech",
  ],
  // Provide a convenience single JSON env var for `NEXT_PUBLIC_FIREBASE` during dev
  // so developers can read `process.env.NEXT_PUBLIC_FIREBASE` if desired.
  env: {
    NEXT_PUBLIC_FIREBASE: NEXT_PUBLIC_FIREBASE_JSON,
  },
  async headers() {
    // Only enable the Cross-Origin-Opener-Policy header in production/secure environments.
    // Browsers ignore COOP when the origin is not potentially trustworthy (non-HTTPS and not localhost).
    const commonHeaders = [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=()",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
    ];

    const headers = [];

    // If we're running in production (HTTPS), include COOP for cross-origin isolation features.
    if (!isDev) {
      headers.push({ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" });
    }

    // Append the rest of the security headers
    headers.push(...commonHeaders);

    return [
      {
        source: "/:path*",
        headers: headers,
      },
    ];
  },
};

export default nextConfig;
