const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
//44
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
    console.log(Server running at http://localhost:);
});
