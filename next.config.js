// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Preserve old /people links after folder deletion
      { source: '/people', destination: '/members', permanent: true },
      { source: '/people/:slug*', destination: '/members/:slug*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
