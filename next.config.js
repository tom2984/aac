/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds (if needed)
    ignoreBuildErrors: false,
  },
  // Force specific port for development
  async rewrites() {
    return []
  },
  // Better error handling
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Clear console on dev server start
  compiler: {
    removeConsole: false,
  },
}

module.exports = nextConfig
