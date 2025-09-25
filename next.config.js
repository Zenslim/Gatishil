// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      // keep default; adjust if you use turbopack locally later
    },
  },
  async redirects() {
    return [
      // Canonicalize people → members (keeps old links and SEO juice)
      {
        source: '/people',
        destination: '/members',
        permanent: true, // 308
      },
      {
        source: '/people/:slug*',
        destination: '/members/:slug*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
