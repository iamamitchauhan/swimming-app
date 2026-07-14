module.exports = {
  apps: [
    {
      name: "server",
      cwd: "./server",
      script: "npx",
      args: "ts-node src/server.ts",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      max_memory_restart: "1G",
      restart_delay: 3000,
      min_uptime: "10s",
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
    {
      name: "client",
      cwd: "./client",
      script: "npm",
      args: "run preview -- --host --strictPort --port 5002",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
    },
    {
      name: "landing",
      cwd: "./landing",
      script: "npm",
      args: "run preview -- --host --strictPort --port 5001",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
    },
  ],
};
