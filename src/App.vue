<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0">
        <v-row justify="center">
          <v-col cols="12" class="pa-4">
            <v-card class="mx-auto">
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
                  <v-btn type="submit" color="primary" :loading="loading">Login</v-btn>
                </v-form>

                <!-- User search section -->
                <v-divider class="my-4"></v-divider>
                <v-card-title>User Search</v-card-title>
                <v-btn 
                  color="primary" 
                  :disabled="!isAuthenticated" 
                  :loading="searchLoading"
                  @click="searchUsers"
                  class="mb-4"
                >
                  Search Users
                </v-btn>

                <!-- User list -->
                <v-list v-if="users.length > 0" class="mt-4">
                  <v-list-item
                    v-for="user in users"
                    :key="user._links.self.href"
                    class="mb-2"
                  >
                    <template v-slot:default>
                      <v-list-item-title class="font-weight-bold">
                        {{ user._links.self.title }}
                      </v-list-item-title>
                      <v-list-item-subtitle v-if="user._attributes?.mail">
                        Email: {{ user._attributes.mail }}
                      </v-list-item-subtitle>
                      <v-list-item-subtitle v-if="user._attributes?.telephoneNumber">
                        Phone: {{ Array.isArray(user._attributes.telephoneNumber) 
                          ? user._attributes.telephoneNumber.join(', ') 
                          : user._attributes.telephoneNumber }}
                      </v-list-item-subtitle>
                    </template>
                  </v-list-item>
                </v-list>

                <v-divider class="my-4"></v-divider>
                <v-card-title class="d-flex flex-wrap align-center gap-4">
                  <div class="d-flex align-center gap-4">
                    <span class="text-h5">People</span>
                    <v-btn 
                      color="primary" 
                      @click="getPeople"
                      :loading="peopleLoading"
                    >
                      Get People
                    </v-btn>
                  </div>

                  <v-spacer></v-spacer>

                  <v-text-field
                    v-model="search"
                    label="Search"
                    prepend-icon="mdi-magnify"
                    single-line
                    hide-details
                    style="max-width: 300px"
                  ></v-text-field>

                  <v-dialog v-model="attributeDialog" max-width="500px">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        color="primary"
                        v-bind="props"
                        variant="outlined"
                      >
                        Select Attributes
                      </v-btn>
                    </template>
                    <v-card>
                      <v-card-title>Select Attributes to Display</v-card-title>
                      <v-card-text>
                        <v-container>
                          <v-row>
                            <v-col cols="12">
                              <v-checkbox
                                v-for="attr in availableAttributes"
                                :key="attr"
                                v-model="selectedAttributes"
                                :label="formatAttributeName(attr)"
                                :value="attr"
                                hide-details
                                class="mb-2"
                              ></v-checkbox>
                            </v-col>
                          </v-row>
                        </v-container>
                      </v-card-text>
                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                          color="primary"
                          text
                          @click="attributeDialog = false"
                        >
                          Close
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </v-card-title>

                <v-data-table
                  v-if="people.length > 0"
                  :headers="peopleHeaders"
                  :items="filteredPeople"
                  :items-per-page="25"
                  :search="search"
                  class="mt-4"
                  style="width: 100%; min-width: 1800px"
                  density="comfortable"
                >
                  <template v-slot:item.name="{ item }">
                    <div style="min-width: 300px; white-space: normal">{{ item._links.self.title }}</div>
                  </template>
                  <template v-for="attr in selectedAttributes" :key="attr" v-slot:[`item.${attr}`]="{ item }">
                    <div style="min-width: 300px; white-space: normal">{{ item._attributes?.[attr] }}</div>
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <div style="min-width: 150px">
                      <v-btn
                        size="small"
                        color="primary"
                        variant="text"
                        :href="item._links.self.href"
                        target="_blank"
                        class="mr-2"
                      >
                        Details
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>

                <div class="d-flex justify-center mt-4" v-if="people.length > 0">
                  <v-pagination
                    v-model="currentPage"
                    :length="Math.ceil(totalItems / itemsPerPage)"
                    @update:model-value="getPeople"
                  ></v-pagination>
                </div>

                <v-divider class="my-4"></v-divider>
                <v-card-title class="d-flex align-center">
                  System Users
                  <v-spacer></v-spacer>
                  <v-btn 
                    color="primary" 
                    @click="getUsers"
                    :loading="usersLoading"
                    class="ml-4"
                  >
                    Get System Users
                  </v-btn>
                </v-card-title>

                <v-data-table
                  v-if="systemUsers.length > 0"
                  :headers="userHeaders"
                  :items="systemUsers"
                  :items-per-page="10"
                  class="mt-4"
                >
                  <template v-slot:item.title="{ item }">
                    {{ item._links.self.title }}
                  </template>
                  <template v-slot:item.eruid="{ item }">
                    {{ item._attributes?.eruid }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn
                      size="small"
                      color="primary"
                      variant="text"
                      :href="item._links.self.href"
                      target="_blank"
                      class="mr-2"
                    >
                      Details
                    </v-btn>
                    <v-btn
                      size="small"
                      color="info"
                      variant="text"
                      :href="item._links.delegates?.href"
                      target="_blank"
                      class="mr-2"
                      v-if="item._links.delegates"
                    >
                      Delegates
                    </v-btn>
                    <v-btn
                      size="small"
                      color="warning"
                      variant="text"
                      :href="item._links.constraints?.href"
                      target="_blank"
                      v-if="item._links.constraints"
                    >
                      Constraints
                    </v-btn>
                  </template>
                </v-data-table>

                <v-divider class="my-4"></v-divider>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
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
      username: '',
      password: '',
      searchLoading: false,
      users: [],
      systemUsers: [],
      people: [],
      isAuthenticated: false,
      credentials: {
        username: 'ITIM Manager',
        password: '1q@3e4r',
        baseUrl: 'http://192.168.1.204:9080/itim',
        certPath: ''
      },
      userHeaders: [
        { title: 'Name', key: 'title', align: 'start', sortable: true },
        { title: 'ERUID', key: 'eruid', align: 'start', sortable: true },
        { title: 'Actions', key: 'actions', align: 'end', sortable: false },
      ],
      peopleHeaders: [],
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
      selectedAttributes: ['mail', 'telephoneNumber', 'cn'],
      availableAttributes: [
        'mail',
        'telephoneNumber',
        'cn',
        'sn',
        'givenName',
        'employeeNumber',
        'department',
        'title',
        'manager',
        'location'
      ],
      search: '',
      attributeDialog: false,
      isimClient: null,
      loading: false,
      usersLoading: false,
      peopleLoading: false,
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
  computed: {
    peopleHeaders() {
      const headers = [
        { title: 'Name', key: 'name', align: 'start', sortable: true, width: '300px' }
      ];
      
      // Add headers for selected attributes
      this.selectedAttributes.forEach(attr => {
        headers.push({
          title: attr.charAt(0).toUpperCase() + attr.slice(1),
          key: attr,
          align: 'start',
          sortable: true,
          width: '300px'
        });
      });
      
      headers.push({ 
        title: 'Actions', 
        key: 'actions', 
        align: 'end', 
        sortable: false,
        width: '150px'
      });
      return headers;
    },
    filteredPeople() {
      if (!this.search) return this.people;
      
      const searchLower = this.search.toLowerCase();
      return this.people.filter(person => {
        // Search in name
        if (person._links.self.title.toLowerCase().includes(searchLower)) return true;
        
        // Search in attributes
        return this.selectedAttributes.some(attr => {
          const value = person._attributes?.[attr];
          if (!value) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
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
    async searchUsers() {
      this.searchLoading = true;
      try {
        const users = await this.isimClient.searchPeople({
          attributes: ['mail', 'telephoneNumber'],
          limit: 100,
          sort: '+cn'
        });
        this.users = users;
        this.addLog(`Found ${users.length} users`);
      } catch (error) {
        console.error('Search error:', error);
        this.addLog('Search error: ' + error);
      } finally {
        this.searchLoading = false;
      }
    },
    async getPeople() {
      this.peopleLoading = true;
      try {
        const data = await this.isimClient.getPeople({
          page: this.currentPage - 1,
          itemsPerPage: this.itemsPerPage,
          attributes: this.selectedAttributes
        });
        this.people = data;
        this.totalItems = data.length; // This should ideally come from response headers
        this.addLog(`Found ${data.length} people on page ${this.currentPage}`);
      } catch (error) {
        console.error('People search error:', error);
        this.addLog('People search error: ' + error);
      } finally {
        this.peopleLoading = false;
      }
    },
    async getUsers() {
      this.usersLoading = true;
      try {
        const users = await this.isimClient.getSystemUsers();
        this.systemUsers = users;
        this.addLog(`Found ${users.length} system users`);
      } catch (error) {
        console.error('System users error:', error);
        this.addLog('System users error: ' + error);
      } finally {
        this.usersLoading = false;
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
    formatAttributeName(attr) {
      return attr
        .split(/(?=[A-Z])|_/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
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
