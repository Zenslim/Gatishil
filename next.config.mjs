// next.config.mjs
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    forceSwcTransforms: true,
    // keep native argon2 out of the server bundle
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },

  // Build should proceed even if lint/types have issues (you already had these on)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Allow remote images you already use
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
    ],
  },

  // Transpile common client libs under one resolver (helps avoid mixed builds)
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],

  // Only expose public env at build time (sanity guard)
  env: {
    // do not place secrets here
  },

  webpack: (config, { isServer }) => {
    // ✅ Force a single copy of React/DOM across the app and all deps
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client.js'),
    };

    if (isServer) {
      // Keep @node-rs/argon2 as a runtime require (don’t bundle the native binary)
      config.externals = config.externals || [];
      config.externals.push({ '@node-rs/argon2': 'commonjs @node-rs/argon2' });
    }

    return config;
  },
};

export default nextConfig;
