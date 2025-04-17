// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Existing config options */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* Add/Modify the webpack configuration */
  webpack: (config, { isServer, webpack }) => {

    // --- Handle externals correctly ---
    if (!config.externals) {
      config.externals = [];
    } else if (!Array.isArray(config.externals)) {
      config.externals = [config.externals];
    }
    config.externals.push({
      'react-native-fs': 'commonjs react-native-fs',
    });
    // --- End externals configuration ---

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
};

export default nextConfig;
