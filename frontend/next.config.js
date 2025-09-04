/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com', 'discord.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  // Désactiver le splitting automatique des chunks pour éviter les erreurs de chargement
  experimental: {
    optimizeCss: false,
  },
  // Configuration webpack pour résoudre les problèmes de chunks
  webpack: (config, { dev, isServer }) => {
    // Désactiver le code splitting en développement si nécessaire
    if (dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -10,
            reuseExistingChunk: true
          }
        }
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;