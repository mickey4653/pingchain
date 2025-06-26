/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Ensure middleware is properly handled
  middleware: {
    // This is required for Clerk middleware to work
    skipMiddlewareUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  },
};

module.exports = nextConfig; 