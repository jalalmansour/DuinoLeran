// next.config.js
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

    // --- Use externals to ignore the problematic require ---
    // This configuration applies to both server and client builds,
    // effectively telling Webpack "don't worry about this module".
    config.externals = {
      ...config.externals, // Keep existing externals if any
      'react-native-fs': 'commonjs react-native-fs', // Treat it as an external commonjs module
    };
    // --- End externals configuration ---


    // It's still good practice to keep fallbacks for client build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;