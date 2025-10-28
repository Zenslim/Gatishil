// next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname/__filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    forceSwcTransforms: true,
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
    ],
  },

  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],

  webpack: (config, { isServer }) => {
    // ✅ Force a single copy of React/DOM to end the `'S'/isPrimaryRenderer` crash
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client.js'),
    };

    if (isServer) {
      // Keep native binary out of the server bundle
      config.externals = config.externals || [];
      config.externals.push({ '@node-rs/argon2': 'commonjs @node-rs/argon2' });
    }

    return config;
  },
};

export default nextConfig;
