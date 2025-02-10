import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy configuration for ISIM API
const apiProxy = createProxyMiddleware('/rest', {
    target: process.env.ISIM_API_URL || 'http://your-isim-server:port',
    changeOrigin: true,
    secure: false, // Set to true if your ISIM server uses HTTPS
    onProxyReq: (proxyReq, req, res) => {
        // Forward authentication headers if needed
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
    }
});

// Use proxy middleware
app.use('/rest', apiProxy);

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
