import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { REMOTE_SERVER_URL } from './src/config'

// Remove protocol and port from URL
const remoteServerUrl = REMOTE_SERVER_URL.replace(/^https?:\/\//, '').replace(/:\d+$/, '')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  server: {
    proxy: {
      '/itim': {
        target: REMOTE_SERVER_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove headers that might cause CORS issues
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              // Forward the original Set-Cookie header
              res.setHeader('Set-Cookie', setCookie);
              
              // Log the full cookie details
              setCookie.forEach((cookie, index) => {
                // Extract just the value part before any attributes (Path, HttpOnly, etc)
                const cookieValue = cookie.split(';')[0];  // Gets "LtpaToken2=xyz..."
                const [cookieName, value] = cookieValue.split('=');
                console.log(`\nCookie ${index} details:`);
                console.log('Name:', cookieName);
                console.log('Value:', value);
                console.log('Full cookie:', cookie);
              });
              
              // Also store in our custom header for backup
              res.setHeader('x-set-cookie-original', setCookie);
              
              // Copy each cookie to a custom header
              setCookie.forEach((cookie, index) => {
                res.setHeader(`x-auth-cookie-${index}`, cookie);
              });
              
              // Store the number of cookies
              res.setHeader('x-auth-cookie-count', setCookie.length.toString());
            }
          });
        }
      },
      '/itim/rest/systemusers': {
        target: REMOTE_SERVER_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying system users request:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('System users response headers:', proxyRes.headers);
          });
        }
      },
      '/itim/rest/people': {
        target: REMOTE_SERVER_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying people request:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('People response headers:', proxyRes.headers);
          });
        }
      },
    }
  }
})
