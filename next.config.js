/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["dis-thorough-enable-replace.trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["dis-thorough-enable-replace.trycloudflare.com", "*.trycloudflare.com"],
    },
  },
};
module.exports = nextConfig;
