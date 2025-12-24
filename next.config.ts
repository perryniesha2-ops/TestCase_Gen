import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to acknowledge Turbopack usage
    // Turbopack handles Monaco Editor and most webpack configs automatically
  },
  
  // Webpack configuration (fallback for when using --webpack flag)
  webpack: (config, { isServer }) => {
    // Monaco Editor configuration
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Externalize Playwright (server-only)
      config.externals = config.externals || [];
      config.externals.push({
        playwright: 'commonjs playwright',
        '@playwright/test': 'commonjs @playwright/test',
      });
    }

    // Support .node files (Playwright native modules)
    config.module = config.module || { rules: [] };
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },

  // Transpile Monaco packages (works with both Turbopack and Webpack)
  transpilePackages: ['@monaco-editor/react', 'monaco-editor'],

  // Image optimization for screenshots
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Large file support for test artifacts
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;