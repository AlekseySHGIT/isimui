<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="primary" dark flat>
                <v-toolbar-title>ISIM Login</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-form @submit.prevent="login" ref="form">
                  <v-text-field
                    v-model="credentials.username"
                    label="Username"
                    name="username"
                    prepend-icon="mdi-account"
                    type="text"
                    required
                    clearable
                    variant="outlined"
                  />
                  <v-text-field
                    v-model="credentials.password"
                    label="Password"
                    name="password"
                    prepend-icon="mdi-lock"
                    type="password"
                    required
                    clearable
                    variant="outlined"
                    @keyup.enter="login"
                  />
                  <v-text-field
                    v-model="credentials.baseUrl"
                    label="Base URL"
                    name="baseUrl"
                    prepend-icon="mdi-web"
                    type="text"
                    required
                    clearable
                    variant="outlined"
                  />
                  <v-text-field
                    v-model="credentials.certPath"
                    label="Certificate Path"
                    name="certPath"
                    prepend-icon="mdi-certificate"
                    type="text"
                    clearable
                    variant="outlined"
                  />
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="login"
                  :loading="loading"
                  size="large"
                >
                  Login
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Log Display Area -->
        <v-row class="mt-4">
          <v-col cols="12" sm="10" offset-sm="1">
            <v-container>
              <v-row>
                <v-col cols="12" sm="10" offset-sm="1">
                  <v-card class="mb-4">
                    <v-card-title>ISIM Authentication</v-card-title>
                    <v-card-text>
                      <!-- Display JSESSIONID if available -->
                      <v-alert
                        v-if="authTokens.jsessionId || authTokens.ltpaToken"
                        type="info"
                        class="mb-4"
                        variant="tonal"
                        color="info"
                      >
                        <div class="text-h6 mb-2">Authentication Status</div>
                        <div v-if="authTokens.jsessionId" class="mb-2">
                          <strong>JSESSIONID:</strong> {{ authTokens.jsessionId }}
                        </div>
                        <div v-if="authTokens.ltpaToken" class="mb-2">
                          <strong>LtpaToken2:</strong> {{ authTokens.ltpaToken }}
                        </div>
                      </v-alert>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-container>
            <div v-if="logs.length > 0" class="logs">
              <div class="d-flex align-center justify-space-between mb-4">
                <h2>API Logs</h2>
                <v-btn color="error" text @click="clearLogs">CLEAR LOGS</v-btn>
              </div>
              <div v-for="(log, index) in logs" :key="index" class="mb-4">
                <div class="d-flex align-center">
                  <span class="text-caption">{{ log.timestamp }}</span>
                  <v-chip 
                    :color="log.status === 'success' ? 'success' : log.status === 'error' ? 'error' : 'info'"
                    small
                    class="ml-2"
                  >
                    {{ log.status.toUpperCase() }}
                  </v-chip>
                </div>
                <div class="text-subtitle-1 mt-1">{{ log.step }}: {{ log.url }}</div>
                <v-expansion-panels v-if="log.result" class="mt-2">
                  <v-expansion-panel>
                    <v-expansion-panel-header>Response Details</v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <pre class="response-details">{{ log.result }}</pre>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script>
import { ISIMClient } from './services/ISIMClient';

export default {
  name: 'App',
  data() {
    return {
      credentials: {
        username: 'ITIM Manager',
        password: '1q@3e4r',
        baseUrl: 'http://192.168.1.204:9080/itim',
        certPath: ''
      },
      isimClient: null,
      loading: false,
      authTokens: {
        jsessionId: null,
        ltpaToken: null
      },
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      logs: []
    }
  },
  methods: {
    addLog(step, url, status, result) {
      if (result) {
        try {
          const data = JSON.parse(result);
          
          // Extract tokens from headers
          if (data.headers && data.headers.cookies) {
            // Find JSESSIONID
            const jsessionCookie = data.headers.cookies.find(c => c.startsWith('JSESSIONID='));
            if (jsessionCookie) {
              const match = jsessionCookie.match(/JSESSIONID=([^;]+)/);
              if (match) {
                this.authTokens.jsessionId = match[1];
              }
            }
            
            // Find LtpaToken2
            const ltpaCookie = data.headers.cookies.find(c => c.startsWith('LtpaToken2='));
            if (ltpaCookie) {
              const match = ltpaCookie.match(/LtpaToken2=([^;]+)/);
              if (match) {
                this.authTokens.ltpaToken = match[1];
              }
            }
          }
        } catch (e) {
          console.error('Error parsing log result:', e);
        }
      }

      this.logs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        step,
        url,
        status,
        result
      });
    },
    clearLogs() {
      this.logs = [];
      this.authTokens = {
        jsessionId: null,
        ltpaToken: null
      };
    },
    async login() {
      this.loading = true;
      this.clearLogs();
      
      try {
        // Initialize ISIM client with logging callback
        this.isimClient = new ISIMClient({
          baseURI: this.credentials.baseUrl,
          username: this.credentials.username,
          password: this.credentials.password,
          onLog: this.addLog
        });

        try {
          const token = await this.isimClient.connect();
          
          // Store tokens in localStorage
          localStorage.setItem('isimToken', JSON.stringify(token));
          this.showMessage('Login successful', 'success');
        } catch (error) {
          throw error;
        }

      } catch (error) {
        console.error('Login error:', error);
        this.showMessage(error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    formatHeaders(headers) {
      return Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    },
    formatBody(body) {
      try {
        // Try to parse and format as JSON
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not JSON, return as is
        return body;
      }
    },
    showMessage(message, color = 'success') {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  }
}
</script>

<style>
.v-application {
  background-color: #f5f5f5;
}

.logs {
  margin-top: 2rem;
  padding: 1rem;
}

.response-details {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
