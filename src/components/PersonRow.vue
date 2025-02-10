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
          v-else-if="accounts?.length"
          density="comfortable"
          hover
        >
          <thead>
            <tr>
              <th class="text-subtitle-2">Статус</th>
              <th class="text-subtitle-2">Сервис</th>
              <th class="text-subtitle-2">Имя</th>
              <th class="text-subtitle-2">DN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.href">
              <td style="white-space: nowrap">
                <v-icon
                  :color="account.status === 'active' ? 'success' : 'error'"
                  :icon="account.status === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle'"
                  size="small"
                  class="mr-1"
                ></v-icon>
                <v-chip
                  :color="account.status === 'active' ? 'success' : 'error'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ account.status === 'active' ? 'Активна' : 'Неактивна' }}
                </v-chip>
              </td>
              <td>{{ account.service }}</td>
              <td>{{ account.name }}</td>
              <td class="text-caption text-grey">{{ account.dn }}</td>
            </tr>
          </tbody>
        </v-table>
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
import { ref } from 'vue'
import AuthService from '../services/AuthService'

const props = defineProps({
  person: {
    type: Object,
    required: true
  },
  headers: {
    type: Array,
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
    accounts.value = response;
  } catch (error) {
    console.error('Failed to load accounts:', error);
    accounts.value = [];
  } finally {
    loading.value = false;
  }
}

function toggleExpand() {
  expanded.value = !expanded.value;
  if (expanded.value) {
    loadAccounts();
  }
}
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s;
}
</style>
