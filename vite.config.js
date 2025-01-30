import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  server: {
    proxy: {
      '/itim': {
        target: 'http://192.168.1.204:9080',
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
      }
    }
  }
})
