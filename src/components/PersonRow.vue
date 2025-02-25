<template>
  <tr @click="showUserRoles" style="cursor: pointer">
    <td style="width: 48px; padding: 0 4px;">
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        :class="{ 'rotate-180': expanded }"
        @click.stop="toggleExpand"
      ></v-btn>
    </td>
    <td v-for="header in headers" :key="header.key" :style="{ width: getColumnWidth(header.key), maxWidth: getColumnWidth(header.key) }">
      <template v-if="header.key === 'cn'">
        {{ person._attributes?.cn || '-' }}
      </template>
      <template v-else-if="header.key === 'mail'">
        {{ person._attributes?.mail || '-' }}
      </template>
      <template v-else-if="header.key === 'sn'">
        {{ person._attributes?.sn || '-' }}
      </template>
      <template v-else-if="header.key === 'status'">
        {{ person._attributes?.status || '-' }}
      </template>
      <template v-else-if="header.key === 'description'">
        {{ person._attributes?.description || '-' }}
      </template>
      <template v-else-if="header.key === 'audio'">
        <div class="d-flex align-center" style="min-height: 32px; width: 100%; padding: 0">
          <v-chip
            v-if="person._attributes?.audio"
            color="primary"
            size="small"
            variant="flat"
            class="font-weight-medium ma-0"
            style="min-width: 70px"
          >
            MY.AUDIO
          </v-chip>
          <span v-else class="text-disabled">-</span>
        </div>
      </template>
      <template v-else-if="header.key === 'ercreatedate'">
        {{ formatDate(person._attributes?.ercreatedate) }}
      </template>
      <template v-else>
        <template v-if="header.key.toLowerCase().includes('date')">
          {{ formatDate(person._attributes?.[header.key]) }}
        </template>
        <template v-else>
          {{ person._attributes?.[header.key] || '-' }}
        </template>
      </template>
    </td>
  </tr>
  <tr v-if="expanded">
    <td :colspan="headers.length + 1" class="pa-0">
      <v-card flat class="mx-2 my-1">
        <!-- <v-card-title class="text-subtitle-2 py-2 px-4 bg-grey-lighten-4 d-flex align-center">
          <span class="text-grey-darken-3">PersonID:</span>
          <v-chip
            class="ml-2"
            size="small"
            variant="outlined"
            color="primary"
          >
            {{ extractPersonId(props.person._links?.self?.href) }}
          </v-chip>
        </v-card-title> -->
        <div v-if="loading" class="d-flex justify-center pa-4">
          <v-progress-circular indeterminate></v-progress-circular>
        </div>
        <v-table
          v-else-if="formattedAccounts?.length"
          density="comfortable"
          class="accounts-table"
        >
          <thead>
            <tr>
              <th v-for="attr in props.selectedAccountAttributes" :key="attr" class="text-subtitle-2 bg-blue-lighten-5">
                {{ getAccountAttributeTitle(attr) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(account, index) in formattedAccounts" 
                :key="index" 
                @click.stop="(event) => showAccountGroups(account, index, event)"
                :class="{ 'selected-row': selectedAccountIndex === index }"
                style="cursor: pointer"
            >
              <td v-for="attr in props.selectedAccountAttributes" :key="attr">
                <template v-if="attr === 'eraccountstatus'">
                  <v-chip
                    size="small"
                    :color="account[attr] === '0' ? 'success' : 'error'"
                    :text="account[attr] === '0' ? 'Активен' : 'Неактивен'"
                    variant="elevated"
                    class="font-weight-medium"
                  ></v-chip>
                </template>
                <template v-else-if="attr === 'eraccountcompliance'">
                  <v-tooltip :text="getComplianceStatus(account[attr])" location="top">
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        v-if="account[attr] === '2'"
                        color="error"
                        icon="mdi-alert-circle"
                        size="large"
                      />
                      <v-icon
                        v-bind="props"
                        v-else-if="account[attr] === '3'"
                        color="warning"
                        icon="mdi-alert"
                        size="large"
                      />
                      <v-icon
                        v-bind="props"
                        v-else-if="account[attr] === '1'"
                        color="success"
                        icon="mdi-check-circle"
                        size="large"
                      />
                    </template>
                  </v-tooltip>
                </template>
                <template v-else-if="attr.toLowerCase().includes('date')">
                  {{ formatDate(account[attr]) }}
                </template>
                <template v-else>
                  <v-tooltip :text="account[attr] || '-'" location="top" v-if="account[attr]?.length > 30">
                    <template v-slot:activator="{ props }">
                      <span v-bind="props" class="text-truncate d-inline-block" style="max-width: 250px">
                        {{ account[attr] }}
                      </span>
                    </template>
                  </v-tooltip>
                  <span v-else>{{ account[attr] || '-' }}</span>
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-card-text v-else-if="!loading && accounts" class="text-center text-grey">
          <v-icon icon="mdi-account-off" size="large" class="mb-2"></v-icon>
          <div>У пользователя нет учетных записей</div>
        </v-card-text>
        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="ma-2"
        >
          У пользователя нет учетных записей
        </v-alert>
      </v-card>
    </td>
  </tr>

  <!-- Groups Navigation Drawer -->
  <v-navigation-drawer
    v-model="showGroups"
    location="right"
    temporary
    width="400"
    class="groups-drawer"
    elevation="2"
  >
    <v-toolbar color="blue-lighten-5" class="px-4 border-b">
      <v-toolbar-title class="text-primary d-flex align-center text-body-1">
        <v-icon icon="mdi-account-group" class="mr-2" color="primary"></v-icon>
        Группы 
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-close" variant="text" @click="showGroups = false"></v-btn>
    </v-toolbar>

    <div class="pa-4">
      <v-text-field
        v-model="searchQuery"
        prepend-icon="mdi-magnify"
        label="Поиск"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-4"
      ></v-text-field>

      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-account" class="mr-2" color="primary" size="small"></v-icon>
        <span class="text-body-2 text-medium-emphasis">{{ selectedAccount?.eruid }}</span>
      </div>

      <template v-if="filteredGroups.length">
        <div 
          v-for="(group, index) in filteredGroups" 
          :key="index"
          class="group-item mb-2 pa-3 rounded-lg"
          @click.stop="selectGroup(group)"
          style="cursor: pointer"
        >
          <div class="d-flex align-center mb-1">
            <v-icon icon="mdi-folder-account" color="primary" size="small" class="mr-2"></v-icon>
            <span class="text-subtitle-2">{{ getGroupName(group) }}</span>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getGroupPath(group) }}
          </div>
        </div>
      </template>
      <div v-else class="text-center text-medium-emphasis">
        <v-icon icon="mdi-folder-off" size="large" color="grey" class="mb-2"></v-icon>
        <div>{{ searchQuery ? 'Ничего не найдено' : 'Нет групп' }}</div>
      </div>
    </div>
  </v-navigation-drawer>

  <!-- Roles Navigation Drawer -->
  <v-navigation-drawer
    v-model="showRoles"
    location="right"
    temporary
    width="400"
    class="roles-drawer"
    elevation="2"
  >
    <v-toolbar color="blue-lighten-5" class="px-4 border-b">
      <v-toolbar-title class="text-primary d-flex align-center text-body-1">
        <v-icon icon="mdi-shield-account" class="mr-2" color="primary"></v-icon>
        Роли пользователя
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-close" variant="text" @click="showRoles = false"></v-btn>
    </v-toolbar>

    <div class="pa-4">
      <v-text-field
        v-model="searchQuery"
        prepend-icon="mdi-magnify"
        label="Поиск"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-4"
      ></v-text-field>

      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-account" class="mr-2" color="primary" size="small"></v-icon>
        <span class="text-body-2 text-medium-emphasis">{{ person._attributes?.ercustomdisplay || person._attributes?.cn }}</span>
      </div>

      <v-progress-circular
        v-if="loading"
        indeterminate
        color="primary"
        class="ma-4"
      ></v-progress-circular>

      <template v-if="filteredRoles.length">
        <div 
          v-for="(role, index) in filteredRoles" 
          :key="index"
          class="role-item mb-2 pa-3 rounded-lg"
          @click.stop="selectRole(role)"
          style="cursor: pointer"
        >
          <div class="d-flex align-center">
            <v-icon icon="mdi-shield" color="primary" size="small" class="mr-2"></v-icon>
            <span class="text-subtitle-2">{{ getRoleName(role) }}</span>
          </div>
        </div>
      </template>
      <div v-else class="text-center text-medium-emphasis">
        <v-icon icon="mdi-shield-off" size="large" color="grey" class="mb-2"></v-icon>
        <div>{{ searchQuery ? 'Ничего не найдено' : 'Нет ролей' }}</div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import AuthService from '../services/AuthService'
import defaultClient from '../services/ISIMClient'

const showGroups = ref(false)
const showRoles = ref(false)
const accountGroups = ref([])
const userRoles = ref([])
const searchQuery = ref('')
const selectedAccountIndex = ref(null)
const loading = ref(false)

// Inject the role mapping from parent
const roleMapping = inject('roleMapping', {})

const props = defineProps({
  person: {
    type: Object,
    required: true
  },
  headers: {
    type: Array,
    required: true
  },
  selectedAccountAttributes: {
    type: Array,
    default: () => ['eruid', 'adisplayname', 'adescription', 'erservice', 'eraccountstatus', 'eraccountcompliance', 'erlastaccessdate']
  },
  services: {
    type: Object,
    required: true
  }
})

const expanded = ref(false)
const accounts = ref(null)
const selectedAccount = ref(null)

function extractPersonId(href) {
  if (!href) return null;
  const match = href.match(/\/people\/([^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

function getServiceName(erservice, serviceId) {
  if (!erservice && !serviceId) return '-';
  
  if (serviceId && props.services[serviceId]) {
    const serviceAttrs = props.services[serviceId];
    return serviceAttrs.erservicename || serviceAttrs.description || erservice || serviceId;
  }
  
  return erservice || '-';
}

async function loadAccounts() {
  if (loading.value || accounts.value) return;
  
  const personId = extractPersonId(props.person._links?.self?.href);
  if (!personId) return;

  try {
    loading.value = true;
    const isimClient = AuthService.getISIMClient();
    if (!isimClient) {
      throw new Error('Not authenticated');
    }
    
    const response = await isimClient.getPersonAccounts(personId);
    console.log('Raw accounts response:', response);
    
    if (response._embedded?.accounts) {
      accounts.value = response._embedded.accounts;
    } else if (Array.isArray(response)) {
      accounts.value = response;
    } else {
      accounts.value = [];
    }
    
    console.log('Processed accounts:', accounts.value);
  } catch (error) {
    console.error('Failed to load accounts:', error);
    accounts.value = [];
  } finally {
    loading.value = false;
  }
}

const formattedAccounts = computed(() => {
  if (!accounts.value) return [];
  return accounts.value.map(account => {
    console.log('Processing account:', account);
    const formatted = {
      _attributes: account._attributes // Keep the original _attributes
    };
    props.selectedAccountAttributes.forEach(attr => {
      if (attr === 'erservice') {
        // Get service ID from _links.erservice.id that we added in ISIMClient
        const serviceId = account._links?.erservice?.id;
        formatted[attr] = getServiceName(account._attributes?.erservice, serviceId);
      } else {
        formatted[attr] = account._attributes?.[attr] || '';
      }
    });
    return formatted;
  });
});

const hasNonCompliantAccount = computed(() => {
  if (!accounts.value) return false;
  return accounts.value.some(account => {
    const compliance = account._attributes?.eraccountcompliance;
    return compliance === '2' || compliance === '3';
  });
});

function getAccountAttributeTitle(attr) {
  const titles = {
    eruid: 'ID пользователя',
    adisplayname: 'Отображаемое имя',
    adescription: 'Описание',
    erservice: 'Сервис',
    eraccountstatus: 'Статус',
    eraccountcompliance: 'Состояние',
    erlastaccessdate: 'Последний доступ',
  
  }
  return titles[attr] || attr
}

function getColumnWidth(key) {
  const widths = {
    'expand': '48px',
    'cn': '200px',
    'mail': '250px',
    'sn': '200px',
    'description': '300px',
    'audio': '90px'
  }
  return widths[key] || '150px'
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    // Parse date in format YYYYMMDDHHMMZ
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(8, 10);
    const minute = dateString.substring(10, 12);
    
    const date = new Date(year, month - 1, day, hour, minute);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e, dateString);
    return dateString;
  }
}

function toggleExpand() {
  expanded.value = !expanded.value;
  if (expanded.value) {
    loadAccounts();
  } else {
    accounts.value = null;
  }
}

function getComplianceStatus(value) {
  const statuses = {
    '1': 'Соответствует',
    '2': 'Критическое несоответствие',
    '3': 'Несоответствие'
  }
  return statuses[value] || 'Неизвестно'
}

async function showUserRoles(event) {
  // Prevent event from bubbling up if clicking on expand button
  if (event.target.closest('.v-btn')) {
    return;
  }
  
  console.log('Opening roles for user:', props.person);
  
  // Get roles from person attributes
  const roles = props.person._attributes?.erroles;
  console.log('Roles from user:', roles);
  
  if (!roles) {
    userRoles.value = [];
    console.log('No roles found for this user');
    return;
  }
  
  // Process the roles to extract roleIds from the href
  userRoles.value = roles.map(role => {
    const match = role.match(/\/roles\/([^,]+)/);
    return match ? match[1] : role;
  });

  searchQuery.value = ''; // Reset search when showing roles
  showRoles.value = true;
}

function getRoleName(roleId) {
  const name = roleMapping.value[roleId];
  console.log(`Getting role name for ${roleId}:`, name);
  return name || roleId;
}

function getGroupName(groupDN) {
  if (!groupDN) return '';
  const match = groupDN.match(/CN=([^,]+)/);
  return match ? match[1] : groupDN;
}

function getGroupPath(groupDN) {
  if (!groupDN) return '';
  const ous = groupDN.match(/OU=([^,]+)/g);
  return ous ? ous.map(ou => ou.replace('OU=', '')).join(' → ') : '';
}

const filteredGroups = computed(() => {
  if (!searchQuery.value) return accountGroups.value;
  const query = searchQuery.value.toLowerCase();
  return accountGroups.value.filter(group => {
    const name = getGroupName(group).toLowerCase();
    const path = getGroupPath(group).toLowerCase();
    return name.includes(query) || path.includes(query);
  });
});

const filteredRoles = computed(() => {
  if (!searchQuery.value) return userRoles.value;
  const query = searchQuery.value.toLowerCase();
  return userRoles.value.filter(roleId => {
    const name = getRoleName(roleId).toLowerCase();
    return name.includes(query);
  });
});

function selectGroup(group) {
  console.log('Selected group:', getGroupName(group));
  // Add any additional group selection logic here
}

function selectRole(role) {
  console.log('Selected role:', role);
  // Add any additional role selection logic here
}

function showAccountGroups(account, index, event) {
  // Prevent event from bubbling up to parent elements
  event.stopPropagation();
  
  console.log('Opening groups for account:', account);
  
  // Get groups from account attributes
  const groups = account._attributes?.ergroup;
  console.log('Groups from account:', groups);
  
  if (!groups) {
    accountGroups.value = [];
    console.log('No groups found for this account');
    return;
  }
  
  selectedAccount.value = account._attributes;
  selectedAccountIndex.value = index;
  
  // Convert to array if it's a single item
  accountGroups.value = Array.isArray(groups) ? groups : [groups];
  searchQuery.value = ''; // Reset search when showing groups
  showGroups.value = true;
}
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
}

td {
  padding: 8px 16px !important;
  vertical-align: middle !important;
  height: 48px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.accounts-table {
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  background: white !important;
}

.accounts-table :deep(th) {
  font-weight: 500 !important;
  padding: 12px 16px !important;
  border-bottom: 2px solid rgba(0, 0, 0, 0.12) !important;
  color: rgba(0, 0, 0, 0.87) !important;
}

.accounts-table :deep(td) {
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.accounts-table :deep(tr:last-child td) {
  border-bottom: none !important;
}

.text-truncate {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.v-chip {
  font-weight: 500 !important;
}

.selected-row {
  background-color: var(--v-primary-lighten-5) !important;
}

.selected-row:hover {
  background-color: var(--v-primary-lighten-4) !important;
}

tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.v-list-item {
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.groups-drawer {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  z-index: 100;
}

.groups-drawer::v-deep .v-navigation-drawer__content {
  overflow-y: auto;
  overflow-x: hidden;
}

.group-item, .role-item {
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.group-item:hover, .role-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
  border-color: rgba(var(--v-theme-primary), 0.1);
}

.v-navigation-drawer {
  pointer-events: auto !important;
}

.v-navigation-drawer__content {
  pointer-events: auto !important;
}

.roles-drawer {
  z-index: 100;
}
</style>
