/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "graham-width-tires-late.trycloudflare.com"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3001"],
    },
  },
};
module.exports = nextConfig;
