module.exports = {
  apps: [
    {
      name: "looklikeme",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/deploy/looklikeme/app",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/home/deploy/looklikeme/logs/error.log",
      out_file: "/home/deploy/looklikeme/logs/out.log",
      merge_logs: true,
    },
  ],
};
