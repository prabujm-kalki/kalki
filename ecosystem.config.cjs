module.exports = {
  apps: [
    {
      name: "kalki-web",
      cwd: "/home/ubuntu/kalki",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "600M"
    },
    {
      name: "kalki-cron",
      cwd: "/home/ubuntu/kalki",
      script: "node_modules/.bin/tsx",
      args: "--env-file=.env src/workers/cron.ts",
      env: {
        NODE_ENV: "production"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M"
    }
  ]
};
