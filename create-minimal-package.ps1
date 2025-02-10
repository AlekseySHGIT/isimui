# Create minimal package directory
New-Item -ItemType Directory -Force -Path "minimal-package"
New-Item -ItemType Directory -Force -Path "minimal-package\node_modules"

# Build the application
npm run build

# Copy only the essential files
Copy-Item "dist" -Destination "minimal-package" -Recurse
Copy-Item "server.js" -Destination "minimal-package"

# Copy only the required node_modules (for the server)
Copy-Item "node_modules\express" -Destination "minimal-package\node_modules\express" -Recurse
Copy-Item "node_modules\http-proxy-middleware" -Destination "minimal-package\node_modules\http-proxy-middleware" -Recurse

# Create simple start script
@"
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

// Proxy configuration for ISIM API
const apiProxy = createProxyMiddleware('/rest', {
    target: 'http://localhost:8080', // Change this to your ISIM server
    changeOrigin: true
});

// Use proxy middleware
app.use('/rest', apiProxy);

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
"@ | Out-File -FilePath "minimal-package\start.js"

# Create README
@"
# ISIM UI Minimal Package

1. Edit ISIM server URL in start.js:
   Find the line with 'target: ' and change it to your ISIM server URL

2. Start the application:
   ```
   node start.js
   ```

3. Access the application at http://localhost:3000
"@ | Out-File -FilePath "minimal-package\README.md"

# Create zip file
Compress-Archive -Path "minimal-package\*" -DestinationPath "isimui-minimal.zip" -Force

Write-Host "Minimal package created: isimui-minimal.zip"
