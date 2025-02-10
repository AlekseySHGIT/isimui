module.exports = {
  apps: [{
    name: "isimui",
    script: "server.js",
    env: {
      PORT: 3000,
      NODE_ENV: "production",
      ISIM_API_URL: "http://your-isim-server:port" // Replace with your ISIM server URL
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
