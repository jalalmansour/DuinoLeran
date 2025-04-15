// next.config.js
import type { NextConfig } from 'next/types';

const nextConfig: NextConfig = {
  /* Existing config options */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* Add the webpack configuration */
  webpack: (config, { isServer, webpack }) => {
    // Apply this rule only to the client-side bundle
    if (!isServer) {
      // Resolve 'react-native-fs' to false to prevent the error
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-native-fs': false,
      };

      // Provide fallbacks for Node.js core modules (good practice)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Important: return the modified config
    return config;
  },
};

// Use export default consistently with your original file
export default nextConfig;
