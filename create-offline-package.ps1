# Create directories
New-Item -ItemType Directory -Force -Path "offline-package"
New-Item -ItemType Directory -Force -Path "offline-package\node_modules"
New-Item -ItemType Directory -Force -Path "offline-package\bundle"

# Copy necessary files
Copy-Item "dist" -Destination "offline-package" -Recurse
Copy-Item "server.js" -Destination "offline-package"
Copy-Item "install-service.js" -Destination "offline-package"
Copy-Item "uninstall-service.js" -Destination "offline-package"
Copy-Item "package.json" -Destination "offline-package"
Copy-Item "node_modules\*" -Destination "offline-package\node_modules" -Recurse

# Create README
@"
# ISIM UI Offline Installation

1. Make sure Node.js is installed on the target machine

2. Run as Administrator:
   ```powershell
   # Install dependencies from local bundle
   npm install --offline ./bundle/*.tgz
   
   # Install the Windows service
   node install-service.js
   ```

3. The service will be installed and started automatically

4. Access the application at http://localhost:3000

To uninstall:
```powershell
node uninstall-service.js
```

Configuration:
- Edit ISIM_API_URL in install-service.js to point to your ISIM server
- Default port is 3000, can be changed in install-service.js
"@ | Out-File -FilePath "offline-package\README.md"

# Create zip file
Compress-Archive -Path "offline-package\*" -DestinationPath "isimui-offline-package.zip" -Force

Write-Host "Offline package created: isimui-offline-package.zip"
