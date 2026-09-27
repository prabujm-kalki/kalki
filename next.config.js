/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  allowedDevOrigins: [
    '192.168.31.96',
    '192.168.31.96:3001',
    'detached-manned-shining.ngrok-free.dev'
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.31.96:3001', 'detached-manned-shining.ngrok-free.dev'],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
