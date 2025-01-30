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
                  <div class="d-flex flex-column">
                    <div class="d-flex align-center gap-4 mb-2">
                      <span class="text-h5">People</span>
                      <v-btn 
                        color="primary" 
                        @click="getPeople"
                        :loading="peopleLoading"
                        :disabled="peopleLoading"
                      >
                        Get People
                      </v-btn>
                    </div>
                    
                    <!-- Loading Progress -->
                    <div v-if="peopleLoading" class="progress-container" style="width: 300px">
                      <div class="d-flex justify-space-between align-center mb-1">
                        <span class="text-body-2">
                          <v-icon size="small" color="primary" class="mr-1">mdi-account-group</v-icon>
                          {{ loadingStatus }}
                        </span>
                        <span class="text-body-2 font-weight-medium">{{ progress }}%</span>
                      </div>
                      <v-progress-linear
                        color="primary"
                        :model-value="progress"
                        height="8"
                        rounded
                        striped
                      ></v-progress-linear>
                    </div>
                  </div>

                  <v-spacer></v-spacer>

                  <v-text-field
                    v-model="search"
                    label="Search People"
                    prepend-icon="mdi-magnify"
                    single-line
                    hide-details
                    style="max-width: 300px"
                    @input="handleSearch"
                    :disabled="peopleLoading"
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

                <!-- Data Table -->
                <v-data-table
                  v-model:expanded="expanded"
                  :headers="peopleHeaders"
                  :items="filteredPeople"
                  :loading="peopleLoading"
                  :items-per-page="10"
                  class="elevation-1"
                  item-value="id"
                >
                  <!-- ID Column -->
                  <template v-slot:item.id="{ item }">
                    <div class="d-flex align-center">
                      <v-icon size="small" class="mr-2">mdi-magnify</v-icon>
                      {{ item.id }}
                    </div>
                  </template>

                  <!-- Name Column -->
                  <template v-slot:item.name="{ item }">
                    <div class="d-flex align-center">
                      <v-avatar size="32" color="primary" class="mr-2">
                        <span class="text-white">{{ getInitials(item.name) }}</span>
                      </v-avatar>
                      <div>
                        <div class="font-weight-medium">{{ item.name }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.attributes?.mail }}</div>
                      </div>
                    </div>
                  </template>

                  <!-- Status Column -->
                  <template v-slot:item.status="{ item }">
                    <v-chip
                      :color="getStatusColor(item.status)"
                      :text="item.status"
                      size="small"
                    ></v-chip>
                  </template>

                  <!-- Actions Column -->
                  <template v-slot:item.actions="{ item }">
                    <div class="d-flex align-center gap-2">
                      <v-tooltip text="View Details" location="top">
                        <template v-slot:activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon="mdi-eye"
                            size="small"
                            variant="text"
                            color="primary"
                          ></v-btn>
                        </template>
                      </v-tooltip>

                      <v-tooltip text="Edit User" location="top">
                        <template v-slot:activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon="mdi-pencil"
                            size="small"
                            variant="text"
                            color="primary"
                          ></v-btn>
                        </template>
                      </v-tooltip>

                      <v-menu>
                        <template v-slot:activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon="mdi-dots-vertical"
                            size="small"
                            variant="text"
                          ></v-btn>
                        </template>
                        <v-list>
                          <v-list-item
                            v-for="action in ['Reset Password', 'Suspend', 'Enable']"
                            :key="action"
                            :value="action"
                          >
                            <v-list-item-title>{{ action }}</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </template>

                  <!-- Expanded Content - Accounts -->
                  <template v-slot:expanded-row="{ columns, item }">
                    <tr>
                      <td :colspan="columns.length">
                        <v-card flat class="ma-2">
                          <v-card-title class="text-subtitle-1">
                            <v-icon start color="primary">mdi-account-multiple</v-icon>
                            Connected Accounts
                          </v-card-title>
                          <v-card-text>
                            <v-table density="comfortable">
                              <thead>
                                <tr>
                                  <th>Account Type</th>
                                  <th>Username</th>
                                  <th>Domain</th>
                                  <th>Status</th>
                                  <th>Last Login</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-if="item.accounts && item.accounts.length === 0">
                                  <td colspan="6" class="text-center">No accounts found</td>
                                </tr>
                                <tr v-else-if="!item.accounts">
                                  <td colspan="6" class="text-center">
                                    <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular>
                                    Loading accounts...
                                  </td>
                                </tr>
                                <tr v-for="account in item.accounts || []" :key="account.id">
                                  <td>
                                    <div class="d-flex align-center">
                                      <v-icon size="small" class="mr-2" :color="getAccountTypeColor(account.type)">
                                        {{ getAccountTypeIcon(account.type) }}
                                      </v-icon>
                                      {{ account.type }}
                                    </div>
                                  </td>
                                  <td>{{ account.username }}</td>
                                  <td>{{ account.domain }}</td>
                                  <td>
                                    <v-chip
                                      :color="getStatusColor(account.status)"
                                      :text="account.status"
                                      size="x-small"
                                    ></v-chip>
                                  </td>
                                  <td>{{ formatDate(account.lastLogin) }}</td>
                                  <td>
                                    <v-btn
                                      size="x-small"
                                      color="primary"
                                      variant="text"
                                    >
                                      Details
                                    </v-btn>
                                  </td>
                                </tr>
                              </tbody>
                            </v-table>
                          </v-card-text>
                        </v-card>
                      </td>
                    </tr>
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
      search: '',
      filterDepartment: 'All',
      filterStatus: 'All',
      expanded: [],
      peopleLoading: false,
      people: [],
      filteredPeople: [],
      discoveredAttributes: new Set(),
      selectedAttributes: ['mail', 'telephoneNumber', 'cn', 'audio'],
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      logs: [],
      username: '',
      password: '',
      searchLoading: false,
      users: [],
      systemUsers: [],
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
      attributeDialog: false,
      isimClient: null,
      loading: false,
      usersLoading: false,
      authTokens: {
        jsessionId: null,
        ltpaToken: null
      }
    }
  },
  computed: {
    availableAttributes() {
      return Array.from(this.discoveredAttributes).sort();
    },
    peopleHeaders() {
      const headers = [
        { title: 'ID', key: 'id', align: 'start', sortable: true, width: '100px' },
        { title: 'Name', key: 'name', align: 'start', sortable: true, width: '300px' }
      ];
      
      // Add headers for selected attributes
      this.selectedAttributes.forEach(attr => {
        headers.push({
          title: this.formatAttributeName(attr),
          key: `attributes.${attr}`,
          align: 'start',
          sortable: true,
          width: '200px'
        });
      });
      
      headers.push(
        { title: 'Status', key: 'status', align: 'start', sortable: true, width: '150px' },
        { title: 'Actions', key: 'actions', align: 'end', sortable: false, width: '150px' }
      );
      
      return headers;
    }
  },
  watch: {
    expanded: {
      async handler(newVal) {
        if (newVal.length > 0) {
          const expandedUser = this.filteredPeople.find(p => p.id === newVal[0]);
          if (expandedUser && !expandedUser.accounts) {
            try {
              const accounts = await this.isimClient.getPersonAccounts(expandedUser.id);
              this.$set(expandedUser, 'accounts', accounts);
            } catch (error) {
              console.error('Error loading accounts:', error);
              this.showMessage('Failed to load user accounts', 'error');
              this.$set(expandedUser, 'accounts', []);
            }
          }
        }
      },
      immediate: true
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
          attributes: ['*', 'audio', 'mail', 'telephoneNumber', 'cn']  // Explicitly request these attributes
        });
        
        // Transform the data to flatten attributes
        const transformedData = data.map(person => ({
          ...person,
          attributes: person._attributes || {},  // Move attributes to top level
          id: person.id,
          name: person._links.self.title,
          status: person._attributes?.status || 'Active'
        }));

        console.log('Transformed data:', transformedData);
        transformedData.forEach(person => {
          if (person.name === 'Авдонин') {
            console.log('Авдонин transformed:', person);
          }
        });

        this.people = transformedData;
        this.filteredPeople = transformedData;

        // Discover available attributes
        this.discoveredAttributes.clear();
        this.people.forEach(person => {
          if (person.attributes) {
            Object.keys(person.attributes).forEach(attr => {
              if (person.attributes[attr] !== null && person.attributes[attr] !== undefined) {
                this.discoveredAttributes.add(attr);
              }
            });
          }
        });

        // Set required attributes
        const requiredAttributes = ['mail', 'telephoneNumber', 'cn', 'audio'];
        this.selectedAttributes = requiredAttributes.filter(attr => 
          this.discoveredAttributes.has(attr)
        );

        console.log('Selected attributes:', this.selectedAttributes);
        console.log('Discovered attributes:', Array.from(this.discoveredAttributes));

        this.addLog(`Found ${data.length} people with ${this.discoveredAttributes.size} attributes`);
      } catch (error) {
        console.error('People search error:', error);
        this.addLog('People search error: ' + error);
        this.showMessage('Failed to load people data', 'error');
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
      // Handle special cases
      const specialCases = {
        'cn': 'Common Name',
        'sn': 'Surname',
        'eruid': 'ERUID',
        'uid': 'User ID'
      };

      if (specialCases[attr]) {
        return specialCases[attr];
      }

      // Handle regular cases
      return attr
        .split(/(?=[A-Z])|_/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    },
    handleSearch() {
      if (!this.search) {
        this.filteredPeople = this.people;
        return;
      }

      const searchLower = this.search.toLowerCase();
      this.filteredPeople = this.people.filter(person => {
        // Search in name
        if (person.name.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in all attributes
        if (person.attributes) {
          return Object.entries(person.attributes).some(([key, value]) => {
            if (value === null || value === undefined) return false;

            // Handle array values
            if (Array.isArray(value)) {
              return value.some(v => String(v).toLowerCase().includes(searchLower));
            }

            // Handle single values
            return String(value).toLowerCase().includes(searchLower);
          });
        }

        return false;
      });

      console.log(`Search "${this.search}" found ${this.filteredPeople.length} results`);
    },
    showMessage(message, color = 'success') {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    beforeDestroy() {
      if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
      }
    },
    getInitials(name) {
      return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
    },
    getStatusColor(status) {
      switch (status) {
        case 'active':
          return 'success';
        case 'inactive':
          return 'error';
        default:
          return 'info';
      }
    },
    getAccountTypeColor(type) {
      switch (type) {
        case 'email':
          return 'primary';
        case 'ldap':
          return 'info';
        default:
          return 'warning';
      }
    },
    getAccountTypeIcon(type) {
      switch (type) {
        case 'email':
          return 'mdi-email';
        case 'ldap':
          return 'mdi-account';
        default:
          return 'mdi-help-circle';
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleString();
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
