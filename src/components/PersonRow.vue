<template>
  <tr>
    <td>
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        :class="{ 'rotate-180': expanded }"
        @click="toggleExpand"
      ></v-btn>
    </td>
    <td v-for="header in headers" :key="header.key">
      <template v-if="person[header.key]">
        <v-chip
          v-if="header.key === 'audio'"
          color="primary"
          size="small"
        >
          {{ person[header.key] }}
        </v-chip>
        <span v-else>{{ person[header.key] }}</span>
      </template>
      <span v-else>-</span>
    </td>
  </tr>
  <tr v-if="expanded">
    <td :colspan="headers.length + 1">
      <v-card flat class="mx-2 my-1">
        <v-card-title class="text-subtitle-2 py-2 px-4 bg-grey-lighten-4 d-flex align-center">
          <span class="text-grey-darken-1">PersonID:</span>
          <v-chip
            class="ml-2"
            size="small"
            variant="outlined"
            color="primary"
          >
            {{ extractPersonId(props.person._links?.self?.href) }}
          </v-chip>
        </v-card-title>
        <div v-if="loading" class="d-flex justify-center pa-4">
          <v-progress-circular indeterminate></v-progress-circular>
        </div>
        <v-table
          v-if="formattedAccounts?.length"
          density="comfortable"
          hover
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
                    :color="account[attr] === 'active' ? 'success' : 'error'"
                    :text="account[attr] === 'active' ? 'Активен' : 'Неактивен'"
                  ></v-chip>
                </template>
                <template v-else-if="attr === 'erlastaccessdate'">
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
    default: () => ['eruid', 'adisplayname', 'adescription', 'erservice', 'eraccountstatus', 'erlastaccessdate']
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
    
    // Check if response has _embedded.accounts
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

function getAccountAttributeTitle(attr) {
  const titles = {
    eruid: 'Логин',
    adisplayname: 'Отображаемое имя',
    adescription: 'Описание',
    erservice: 'Сервис',
    eraccountstatus: 'Статус',
    erlastaccessdate: 'Последний доступ',
    owner: 'Владелец',
    eraccountownershiptype: 'Тип владения'
  }
  return titles[attr] || attr
}

const formattedAccounts = computed(() => {
  if (!accounts.value) return [];
  return accounts.value.map(account => {
    console.log('Processing account:', account);
    const formatted = {};
    props.selectedAccountAttributes.forEach(attr => {
      formatted[attr] = account._attributes?.[attr] || '';
    });
    return formatted;
  });
});

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
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
</style>
