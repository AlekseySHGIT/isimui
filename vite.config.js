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
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              // Forward the original Set-Cookie header
              res.setHeader('Set-Cookie', setCookie);
              
              // Also store in our custom header for backup
              res.setHeader('x-set-cookie-original', setCookie);
              
              // Copy each cookie to a custom header
              setCookie.forEach((cookie, index) => {
                res.setHeader(`x-auth-cookie-${index}`, cookie);
              });
              
              // Store the number of cookies
              res.setHeader('x-auth-cookie-count', setCookie.length.toString());
              
              // Log for debugging
              console.log('Proxy received Set-Cookie:', setCookie);
            }
          });
        }
      }
    }
  }
})
