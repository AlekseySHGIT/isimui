<template>
  <v-app>
    <v-main class="bg-light">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6">
            <v-card class="elevation-8 rounded-lg">
              <v-toolbar color="primary" dark flat class="rounded-t-lg">
                <v-toolbar-title class="d-flex align-center">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-shield-account" size="large" class="mr-2"></v-icon>
                    <span class="text-h5 font-weight-bold">ISIM</span>
                    <span class="text-h5 font-weight-light ml-1">UI</span>
                  </div>
                </v-toolbar-title>
              </v-toolbar>
              <v-card-text class="pt-6 px-6">
              
                <v-form ref="form">
                
                  <v-text-field
                    v-model="username"
                    :rules="[rules.required]"
                    label="Имя пользователя"
                    name="username"
                    prepend-icon="mdi-account"
                    type="text"
                    required
                    variant="outlined"
                    color="primary"
                    class="mb-3"
                    bg-color="grey-lighten-5"
                  />
                  <v-text-field
                    v-model="password"
                    :rules="[rules.required]"
                    label="Пароль"
                    name="password"
                    prepend-icon="mdi-lock"
                    type="password"
                    required
                    @keyup.enter="handleLogin"
                    variant="outlined"
                    color="primary"
                    class="mb-3"
                    bg-color="grey-lighten-5"
                  />
                  <v-text-field
                    v-model="serverUrl"
                    label="IP адрес сервера"
                    prepend-icon="mdi-server"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    :rules="[rules.required]"
                    placeholder="192.168.1.204:9080"
                    bg-color="grey-lighten-5"
                  />
                </v-form>
              </v-card-text>
              <v-card-actions class="pb-6 px-6">
                <v-spacer />
                <v-btn 
                  color="primary" 
                  @click="handleLogin"
                  :loading="loading"
                  :disabled="loading"
                  size="large"
                  prepend-icon="mdi-login"
                  variant="elevated"
                  class="px-6"
                  elevation="2"
                >
                  Войти
                </v-btn>
              </v-card-actions>
              
              <!-- Authentication Log Panel -->
              <v-expansion-panels v-model="logPanelOpen" variant="accordion" class="mt-4">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-console" class="mr-2"></v-icon>
                      Authentication Log
                      <v-chip v-if="authLogs.length > 0" color="primary" size="small" class="ml-2">
                        {{ authLogs.length }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-card flat>
                      <!-- Current Cookies Display -->
                      <v-card-text class="cookie-display pa-2 mb-3" v-if="currentCookies">
                        <div class="d-flex align-center mb-2">
                          <v-icon icon="mdi-cookie" class="mr-2" color="amber-darken-2"></v-icon>
                          <span class="text-subtitle-2 font-weight-bold">Current Cookies</span>
                        </div>
                        <v-chip-group>
                          <v-chip v-if="currentCookies.JSESSIONID" color="success" size="small" label>
                            JSESSIONID
                          </v-chip>
                          <v-chip v-if="currentCookies.LtpaToken2" color="info" size="small" label>
                            LtpaToken2
                          </v-chip>
                          <v-chip v-if="currentCookies.WASPostParam" color="warning" size="small" label>
                            WASPostParam
                          </v-chip>
                        </v-chip-group>
                        <v-btn size="x-small" variant="text" @click="cookieDetailsOpen = !cookieDetailsOpen" class="mt-1">
                          {{ cookieDetailsOpen ? 'Hide Details' : 'Show Details' }}
                        </v-btn>
                        <pre v-if="cookieDetailsOpen" class="log-code mt-1">{{ JSON.stringify(currentCookies, null, 2) }}</pre>
                      </v-card-text>
                      
                      <div v-if="authLogs.length === 0" class="text-center pa-4 text-grey">
                        No authentication logs yet. Login to see the authentication flow.
                      </div>
                      <div v-else class="auth-log-container">
                        <v-timeline density="compact" align="start">
                          <v-timeline-item
                            v-for="(log, index) in sortedLogs"
                            :key="index"
                            :dot-color="getLogStatusColor(log.status)"
                            :icon="getLogStatusIcon(log.status)"
                            size="small"
                          >
                            <div class="d-flex align-start">
                              <div>
                                <div class="text-subtitle-2 font-weight-medium">{{ log.step }}</div>
                                <div class="text-body-2">{{ log.message }}</div>
                                <div v-if="log.details" class="log-details mt-1">
                                  <v-btn
                                    size="x-small"
                                    variant="text"
                                    density="compact"
                                    @click="log.expanded = !log.expanded"
                                  >
                                    {{ log.expanded ? 'Hide Details' : 'Show Details' }}
                                  </v-btn>
                                  <pre v-if="log.expanded" class="log-code mt-1">{{ log.details }}</pre>
                                </div>
                                <div class="text-caption text-grey">{{ log.time }}</div>
                              </div>
                            </div>
                          </v-timeline-item>
                        </v-timeline>
                      </div>
                      <div class="text-center mt-2" v-if="authLogs.length > 0">
                        <v-btn size="small" color="error" variant="text" @click="clearLogs">
                          Clear Logs
                        </v-btn>
                      </div>
                    </v-card>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar
      v-model="snackbar"
      color="error"
      timeout="3000"
      location="top"
      rounded="lg"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const form = ref(null)
const username = ref('ITIM Manager')
const password = ref('1q@3e4r')
const serverUrl = ref('http://192.168.1.204:9080')
const loading = ref(false)
const snackbar = ref(false)
const errorMessage = ref('')
const authLogs = ref([])
const logPanelOpen = ref(0) // Open by default
const cookieInterval = ref(null)
const currentCookies = ref({})
const cookieDetailsOpen = ref(false)

const rules = {
  required: value => !!value || 'Обязательное поле'
}

// Computed property to sort logs by timestamp (most recent first)
const sortedLogs = computed(() => {
  return [...authLogs.value].sort((a, b) => {
    // Convert time strings to Date objects for comparison
    const timeA = new Date(`${new Date().toDateString()} ${a.time}`).getTime()
    const timeB = new Date(`${new Date().toDateString()} ${b.time}`).getTime()
    return timeB - timeA // Sort in descending order (newest first)
  })
})

// Log helper functions
function addLog(step, message, status = 'info', details = null) {
  authLogs.value.push({
    step,
    message,
    status,
    details,
    time: new Date().toLocaleTimeString(),
    expanded: false,
    timestamp: Date.now() // Add timestamp for sorting
  })
}

function getLogStatusColor(status) {
  switch (status) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'warning': return 'warning'
    default: return 'info'
  }
}

function getLogStatusIcon(status) {
  switch (status) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    default: return 'mdi-information'
  }
}

function clearLogs() {
  authLogs.value = []
}

function parseCookies() {
  return document.cookie.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=')
    cookies[name] = value || 'present'
    return cookies
  }, {})
}

// Monitor cookies during login process
function startCookieMonitoring() {
  if (cookieInterval.value) clearInterval(cookieInterval.value)
  
  // Initialize with current cookies
  currentCookies.value = parseCookies()
  addLog('Initial State', 'Checking initial cookies', 'info', JSON.stringify(currentCookies.value, null, 2))
  
  cookieInterval.value = setInterval(() => {
    const newCookies = parseCookies()
    const cookieKeys = Object.keys(newCookies)
    
    // Check for important auth cookies
    const hasJsessionId = cookieKeys.includes('JSESSIONID')
    const hasLtpaToken = cookieKeys.includes('LtpaToken2')
    const hasWasPostParam = cookieKeys.includes('WASPostParam')
    
    // Update current cookies display
    currentCookies.value = newCookies
    
    // Check if cookies have changed
    const oldCookieKeys = Object.keys(currentCookies.value || {})
    const hasNewCookies = cookieKeys.length !== oldCookieKeys.length || 
                         cookieKeys.some(key => !oldCookieKeys.includes(key))
    
    if (hasNewCookies || hasJsessionId || hasLtpaToken || hasWasPostParam) {
      addLog('Cookie Update', 'Authentication cookies detected', 'info', JSON.stringify({
        JSESSIONID: hasJsessionId ? 'present' : 'not present',
        LtpaToken2: hasLtpaToken ? 'present' : 'not present',
        WASPostParam: hasWasPostParam ? 'present' : 'not present',
        allCookies: newCookies
      }, null, 2))
    }
  }, 1000)
}

function stopCookieMonitoring() {
  if (cookieInterval.value) {
    clearInterval(cookieInterval.value)
    cookieInterval.value = null
  }
}

async function handleLogin() {
  if (!username.value || !password.value || !serverUrl.value) {
    errorMessage.value = 'Пожалуйста, заполните все поля'
    snackbar.value = true
    return
  }

  loading.value = true
  startCookieMonitoring()
  
  try {
    // Override console.log to capture authentication logs
    const originalConsoleLog = console.log
    console.log = function(...args) {
      originalConsoleLog.apply(console, args)
      
      // Only log authentication-related messages
      const message = args.join(' ')
      if (message.includes('Authentication') || 
          message.includes('cookie') || 
          message.includes('token') || 
          message.includes('CSRF') ||
          message.includes('login') ||
          message.includes('JSESSIONID') ||
          message.includes('Step')) {
        
        let status = 'info'
        if (message.includes('success') || message.includes('Success')) status = 'success'
        if (message.includes('error') || message.includes('Error') || message.includes('failed')) status = 'error'
        if (message.includes('warning') || message.includes('Warning')) status = 'warning'
        
        addLog('Auth Flow', message, status)
      }
    }
    
    addLog('Authentication', 'Starting authentication process', 'info')
    const user = await AuthService.login(username.value, password.value)
    
    // Restore original console.log
    console.log = originalConsoleLog
    
    if(user.tokens.csrf != 'not-available'){
      addLog('Login Success', 'Authentication successful, redirecting to UI', 'success')
      router.push('/ui')
    } else {
      addLog('Login Failed', 'Authentication failed - CSRF token not available', 'error')
      errorMessage.value = 'Неверный логин или пароль'
      snackbar.value = true
    }
  } catch (error) {
    addLog('Login Error', error.message, 'error')
    errorMessage.value = error.message
    snackbar.value = true
  } finally {
    loading.value = false
    stopCookieMonitoring()
  }
}

function handleLogout() {
  AuthService.logout()
  authLogs.value = []
  router.push('/login')
}

onMounted(() => {
  if (AuthService.isAuthenticated()) {
    router.push('/ui')
  }
})
</script>

<style scoped>
.v-toolbar-title {
  overflow: visible;
}

.v-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.v-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.v-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  border-radius: 8px;
}

.v-text-field {
  border-radius: 8px;
}

.auth-log-container {
  max-height: 400px;
  overflow-y: auto;
}

.cookie-display {
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.log-details {
  margin-left: 0;
}

.log-code {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
