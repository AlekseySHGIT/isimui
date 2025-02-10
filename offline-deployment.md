# ISIM UI Offline Deployment Guide

## Preparation (On Computer with Internet)

1. Install necessary tools:
```bash
npm install -g npm-pack-all
```

2. Build the application:
```bash
# Install dependencies
npm install

# Build the app
npm run build
```

3. Create package bundle:
```bash
# Create bundle directory
mkdir bundle

# Pack all dependencies
npm-pack-all --output ./bundle
```

4. Prepare files for transfer:
- `dist/` directory (contains built application)
- `bundle/` directory (contains all npm packages)
- `server.js` (Express server)
- `install-service.js` (Windows service installer)
- `uninstall-service.js` (Windows service uninstaller)
- `package.json` (Project configuration)

5. Copy all these files to a USB drive or other transfer medium

## Installation (On Offline Server)

1. Create application directory:
```bash
mkdir isimui
cd isimui
```

2. Copy all files from transfer medium to this directory

3. Install dependencies from local packages:
```bash
npm install --offline ./bundle/*.tgz
```

4. Configure the application:
- Open `install-service.js`
- Update the ISIM_API_URL value to point to your ISIM server
- Update PORT if needed (default is 3000)

5. Install as Windows Service:
```bash
node install-service.js
```

The service will:
- Auto-start when Windows boots
- Restart if it crashes
- Run with system privileges
- Log to Windows Event Viewer

## Service Management

View service in Windows:
1. Open Services (services.msc)
2. Look for "ISIMUI" service
3. You can start/stop/restart from here

Common operations:
- Start service: `net start ISIMUI`
- Stop service: `net stop ISIMUI`
- Uninstall service: `node uninstall-service.js`

## Troubleshooting

1. Service won't start:
   - Check Windows Event Viewer for errors
   - Verify ISIM_API_URL is correct
   - Ensure all dependencies are installed
   - Check server.js permissions

2. Can't access application:
   - Verify service is running
   - Check if port 3000 is open in Windows Firewall
   - Try accessing http://localhost:3000

3. API calls failing:
   - Verify ISIM server is accessible
   - Check network connectivity to ISIM server
   - Verify proxy settings in server.js

## Logs

Find logs in:
- Windows Event Viewer
- daemon folder in your application directory

## Updating the Application

To update:
1. Stop the service: `net stop ISIMUI`
2. Replace the `dist` directory with new version
3. Start the service: `net start ISIMUI`

## Security Notes

1. Run service with appropriate Windows account
2. Configure Windows Firewall
3. Use HTTPS if possible
4. Keep node_modules up to date
5. Regular security audits

## Backup

Regularly backup:
1. Application directory
2. Service configuration
3. Windows Event Logs
4. Any custom configurations
