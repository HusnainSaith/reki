module.exports = {
  apps: [{
    name: 'reki-backend',
    script: 'start.js',
    cwd: '/home/ubuntu/reki-backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/reki-backend/logs/pm2-error.log',
    out_file: '/home/ubuntu/reki-backend/logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
