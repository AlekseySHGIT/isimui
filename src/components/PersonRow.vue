<template>
  <tr>
    <td style="width: 48px; padding: 0 4px;">
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        :class="{ 'rotate-180': expanded }"
        @click="toggleExpand"
      ></v-btn>
    </td>
    <td v-for="header in headers" :key="header.key" :style="{ width: getColumnWidth(header.key) }">
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
        <v-chip v-if="person._attributes?.audio" color="primary" size="small">
          MY.AUDIO
        </v-chip>
        <span v-else>-</span>
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
          v-if="formattedAccounts?.length"
          density="comfortable"
          hover
          class="accounts-table"
        >
          <thead>
            <tr>
              <th v-for="attr in props.selectedAccountAttributes" :key="attr" class="text-subtitle-2">
                {{ getAccountAttributeTitle(attr) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in formattedAccounts" :key="account.eruid">
              <td v-for="attr in props.selectedAccountAttributes" :key="attr">
                <template v-if="attr === 'eraccountstatus'">
                  <v-chip
                    size="small"
                    :color="account[attr] === '0' ? 'success' : 'error'"
                    :text="account[attr] === '0' ? 'Активен' : 'Неактивен'"
                  ></v-chip>
                </template>
                <template v-else-if="attr === 'eraccountcompliance'">
                  <v-icon
                    v-if="account[attr] === '2'"
                    color="error"
                    icon="mdi-alert-circle"
                    size="small"
                  />
                  <v-icon
                    v-else-if="account[attr] === '3'"
                    color="warning"
                    icon="mdi-alert"
                    size="small"
                  />
                  <v-icon
                    v-else-if="account[attr] === '1'"
                    color="success"
                    icon="mdi-check-circle"
                    size="small"
                  />
                </template>
                <template v-else-if="attr.toLowerCase().includes('date')">
                  {{ formatDate(account[attr]) }}
                </template>
                <template v-else>
                  {{ account[attr] || '-' }}
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-card-text v-else-if="!loading" class="text-center text-grey">
          <v-icon icon="mdi-account-off" size="large" class="mb-2"></v-icon>
          <div>Нет учетных записей</div>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import AuthService from '../services/AuthService'

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
const loading = ref(false)
const accounts = ref(null)

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
    const formatted = {};
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

function getAccountAttributeTitle(attr) {
  const titles = {
    eruid: 'ID пользователя',
    adisplayname: 'Отображаемое имя',
    adescription: 'Описание',
    erservice: 'Сервис',
    eraccountstatus: 'Статус',
    eraccountcompliance: 'Состояние',
    erlastaccessdate: 'Последний доступ',
    eraccountownershiptype: 'Тип владения'
  }
  return titles[attr] || attr
}

function getColumnWidth(key) {
  const widths = {
    'cn': '200px',
    'mail': '250px',
    'sn': '200px',
    'status': '120px',
    'description': '300px',
    'audio': '100px'
  }
  return widths[key] || 'auto'
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    // Parse date in format YYYYMMDDHHMMZ
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(8, 10);
    const minute = dateString.substring(10, 12);
    
    const date = new Date(year, month - 1, day, hour, minute);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
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
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s;
}

.accounts-table {
  overflow-x: auto;
  width: 100%;
}

:deep(.v-table) {
  width: 100%;
  table-layout: fixed;
}

:deep(.v-table__wrapper) {
  overflow-x: hidden;
}
</style>
