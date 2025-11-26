/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow loading profile/avatar images hosted on Google user content URLs (used for OAuth avatars)
    // Use remotePatterns if you need finer-grained control. This is intentionally narrow to avoid
    // enabling arbitrary external hosts.
    domains: ["lh3.googleusercontent.com"],
  },
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.8:3000",
    "http://192.168.1.8:3001",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
