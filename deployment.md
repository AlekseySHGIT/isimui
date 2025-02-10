# ISIM UI Deployment Guide

## Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- Access to your ISIM server

## Build Steps

1. Install dependencies:
```bash
npm install
```

2. Install production server dependencies:
```bash
npm install express http-proxy-middleware
```

3. Build the application:
```bash
npm run build
```

This will create a `dist` directory with the production-ready files.

## Deployment Steps

1. Copy the following files to your production server:
   - `dist/` directory (contains the built application)
   - `server.js` (Express server for serving the application)
   - `package.json`

2. On your production server, install dependencies:
```bash
npm install express http-proxy-middleware
```

3. Set up environment variables:
```bash
# Linux/Mac
export PORT=3000
export ISIM_API_URL=http://your-isim-server:port

# Windows
set PORT=3000
set ISIM_API_URL=http://your-isim-server:port
```

4. Start the server:
```bash
node server.js
```

## Using Process Manager (Recommended)

For production, it's recommended to use PM2 to manage the Node.js process:

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: "isimui",
    script: "server.js",
    env: {
      PORT: 3000,
      ISIM_API_URL: "http://your-isim-server:port"
    }
  }]
}
```

3. Start with PM2:
```bash
pm2 start ecosystem.config.js
```

4. To ensure PM2 starts on system reboot:
```bash
pm2 startup
pm2 save
```

## Nginx Configuration (Optional)

If you're using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Considerations

1. Always use HTTPS in production
2. Set up proper CORS configuration if needed
3. Configure appropriate firewall rules
4. Keep Node.js and npm packages updated
5. Use environment variables for sensitive configuration

## Monitoring

1. Use PM2 monitoring:
```bash
pm2 monit
```

2. View logs:
```bash
pm2 logs isimui
```

## Troubleshooting

1. If the application can't connect to ISIM:
   - Check ISIM_API_URL environment variable
   - Verify network connectivity
   - Check firewall rules

2. If static files aren't loading:
   - Verify dist directory is in the correct location
   - Check file permissions

3. For 404 errors:
   - Verify the Express route configuration
   - Check if index.html exists in dist directory
