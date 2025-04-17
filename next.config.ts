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
    // Webpack externals can be an object, string, function, RegExp, or array thereof.
    // Spreading might fail if the original config.externals isn't a plain object.
    // It's safer to ensure it's an array and push the new rule.
    if (!config.externals) {
      config.externals = [];
    } else if (!Array.isArray(config.externals)) {
      // If it exists but isn't an array, wrap it in an array
      config.externals = [config.externals];
    }

    // Push the specific external rule for react-native-fs
    // It's common to push an object for specific rules like this
    config.externals.push({
      'react-native-fs': 'commonjs react-native-fs',
    });
    // --- End externals configuration ---


    // It's still good practice to keep fallbacks for client build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, // Standard way to ignore 'fs' on the client
      };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
