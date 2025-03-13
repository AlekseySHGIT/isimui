import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',   // Rich blue for primary actions
          secondary: '#424242', // Dark gray for secondary elements
          accent: '#82B1FF',    // Light blue for accents
          error: '#FF5252',     // Bright red for errors
          info: '#2196F3',      // Information blue
          success: '#4CAF50',   // Green for success messages
          warning: '#FFC107',   // Amber for warnings
          background: '#F5F5F5' // Light gray background
        }
      }
    }
  }
})

const app = createApp(App)
app.use(vuetify)
app.use(router)  
app.mount('#app')
