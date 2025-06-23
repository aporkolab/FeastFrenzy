// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'feastfrenzy',
      script: 'server.prod.js',
      cwd: '/var/www/feastfrenzy/backend',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart settings
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: '/var/log/pm2/feastfrenzy-combined.log',
      error_file: '/var/log/pm2/feastfrenzy-error.log',
      out_file: '/var/log/pm2/feastfrenzy-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Watch (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
