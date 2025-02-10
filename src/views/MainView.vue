<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>ISIM UI</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        color="error"
        prepend-icon="mdi-logout"
        @click="handleLogout"
        title="Выйти"
      >
        Выйти
      </v-btn>
    </v-app-bar>
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="false"
      permanent
      width="250"
    >
      <v-list-item
        prepend-avatar="https://randomuser.me/api/portraits/men/85.jpg"
        :title="currentUser?.username || 'Пользователь'"
      >
        <template v-slot:append>
          <v-btn
            variant="text"
            icon="mdi-chevron-left"
            @click.stop="rail = !rail"
          ></v-btn>
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-account-group" title="Пользователи" value="people"></v-list-item>
        <v-list-item 
          prepend-icon="mdi-logout" 
          title="Выйти"
          color="error"
          @click="handleLogout"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-0">
        <v-card height="100vh" elevation="0">
          <v-toolbar
            color="blue-lighten-5"
            flat
            class="px-4 py-2 border-b"
          >
            <v-toolbar-title class="text-h6 font-weight-medium">
              Пользователи
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Поиск"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mx-4 flex-grow-1"
              style="max-width: 400px"
              bg-color="white"
            ></v-text-field>
            <v-menu
              v-model="showColumnsMenu"
              :close-on-content-click="false"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="outlined"
                  class="mx-4"
                  prepend-icon="mdi-view-column"
                >
                  Столбцы ({{ selectedAttributes.length }})
                </v-btn>
              </template>
              
              <v-card min-width="300" class="pa-2">
                <v-card-title class="text-subtitle-1">Выберите столбцы</v-card-title>
                <v-divider></v-divider>
                <v-list density="compact">
                  <v-list-item
                    v-for="attr in availableAttributes"
                    :key="attr.value"
                    :value="attr.value"
                  >
                    <template v-slot:prepend>
                      <v-checkbox
                        v-model="selectedAttributes"
                        :value="attr.value"
                        hide-details
                        density="compact"
                      ></v-checkbox>
                    </template>
                    <v-list-item-title>{{ attr.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
            <v-btn
              @click="loadPeople"
              :loading="loading"
              prepend-icon="mdi-refresh"
              variant="tonal"
              color="primary"
              size="large"
            >
              Обновить
            </v-btn>
          </v-toolbar>
          
          <v-card-text class="pa-4">
            <v-data-table
              :headers="headers"
              :items="people"
              :search="search"
              :loading="loading"
              :items-per-page="50"
              column-draggable
              fixed-header
              density="comfortable"
              hover
              height="calc(100vh - 140px)"
              class="elevation-1"
              @update:options="handleTableOptionsUpdate"
              v-model:expanded="expanded"
              :show-expand="true"
            >
            <!-- Add expand column -->
            <template v-slot:expanded-row="{ item }">
              <td :colspan="headers.length">
                <v-card flat>
                  <v-card-title class="text-subtitle-1">
                    Учетные записи пользователя
                    <v-spacer></v-spacer>
                    <v-progress-circular
                      v-if="loadingAccounts[item._personId]"
                      indeterminate
                      size="24"
                      class="mr-2"
                    ></v-progress-circular>
                  </v-card-title>
                  <v-card-text>
                    <v-list v-if="userAccounts[item._personId]?.length">
                      <v-list-item
                        v-for="account in userAccounts[item._personId]"
                        :key="account.name"
                      >
                        <template v-slot:prepend>
                          <v-icon
                            :color="account.status === 'active' ? 'success' : 'error'"
                            class="mr-2"
                          >
                            {{ account.status === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                          </v-icon>
                        </template>
                        <v-list-item-title>{{ account.name }}</v-list-item-title>
                        <v-list-item-subtitle>
                          Статус: {{ account.status === 'active' ? 'Активна' : 'Неактивна' }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                    <div v-else-if="!loadingAccounts[item._personId]" class="text-body-1 pa-4">
                      Учетные записи не найдены
                    </div>
                  </v-card-text>
                </v-card>
              </td>
            </template>

            <template v-slot:item="{ item }">
              <tr>
                <td v-for="header in headers" :key="header.key">
                  <template v-if="item[header.key]">
                    <v-chip
                      v-if="header.key === 'audio'"
                      color="primary"
                      size="small"
                    >
                      {{ item[header.key] }}
                    </v-chip>
                    <span v-else>{{ item[header.key] }}</span>
                  </template>
                  <span v-else>-</span>
                </td>
              </tr>
            </template>
          </v-data-table>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const drawer = ref(true)
const rail = ref(false)
const loading = ref(false)
const search = ref('')
const people = ref([])
const currentUser = ref(null)
const expanded = ref([])
const userAccounts = ref({})
const loadingAccounts = ref({})
const showColumnsMenu = ref(false)

// Define all possible attributes with Russian titles
const allAttributes = [
  { title: 'Имя', value: 'cn' },
  { title: 'Email', value: 'mail' },
  { title: 'Отдел', value: 'department' },
  { title: 'Руководитель', value: 'manager' },
  { title: 'Должность', value: 'title' },
  { title: 'Телефон', value: 'telephoneNumber' },
  { title: 'Имя', value: 'givenName' },
  { title: 'Фамилия', value: 'sn' },
  { title: 'Отображаемое имя', value: 'displayName' },
  { title: 'Табельный номер', value: 'employeeNumber' },
  { title: 'Тип сотрудника', value: 'employeeType' },
  { title: 'Офис', value: 'physicalDeliveryOfficeName' },
  { title: 'Мобильный', value: 'mobile' },
  { title: 'Страна', value: 'co' },
  { title: 'Местоположение', value: 'l' },
  { title: 'Организация', value: 'o' },
  { title: 'Подразделение', value: 'ou' },
  { title: 'Почтовый индекс', value: 'postalCode' },
  { title: 'Регион', value: 'st' },
  { title: 'Улица', value: 'street' },
  { title: 'Описание', value: 'description' },
  { title: 'Аудио', value: 'audio' },
  { title: 'Статус', value: 'status' }
]

const defaultColumns = ['cn', 'mail', 'sn', 'status', 'description']
const availableAttributes = ref([])
const selectedAttributes = ref(defaultColumns)
const columnOrder = ref([...defaultColumns])

// Update headers based on selected attributes
const headers = computed(() => {
  return selectedAttributes.value.map(attr => {
    const attrDef = allAttributes.find(a => a.value === attr)
    return {
      title: attrDef?.title || attr,
      key: attr,
      value: attr,
      align: 'start',
      sortable: true,
      draggable: true,
      width: attr === 'cn' ? '200px' : undefined,
      class: 'text-subtitle-1 font-weight-medium text-primary-darken-1 py-4'
    }
  })
})

// Handle table options update for column reordering
function handleTableOptionsUpdate(options) {
  console.log('Table options update:', options)
  if (options.columnOrder) {
    const newOrder = []
    for (const col of options.columnOrder) {
      if (typeof col === 'string') {
        newOrder.push(col)
      } else if (col.key) {
        newOrder.push(col.key)
      }
    }
    console.log('New column order:', newOrder)
    columnOrder.value = newOrder
    selectedAttributes.value = newOrder
  }
}

// Watch for changes in selected attributes
watch(selectedAttributes, (newAttrs) => {
  console.log('Selected attributes changed:', newAttrs)
  columnOrder.value = newAttrs
})

// Extract person ID from href
function extractPersonId(href) {
  const match = href.match(/\/people\/([^/]+)/);
  return match ? match[1] : null;
}

// Load person accounts when expanded
async function loadPersonAccounts(item) {
  const personId = extractPersonId(item._links?.self?.href);
  if (!personId || loadingAccounts.value[personId]) return;

  loadingAccounts.value[personId] = true;
  try {
    const isimClient = AuthService.getISIMClient();
    if (!isimClient) throw new Error('Not authenticated');

    const accounts = await isimClient.getPersonAccounts(personId);
    userAccounts.value[personId] = accounts;
  } catch (error) {
    console.error('Failed to load accounts:', error);
    userAccounts.value[personId] = [];
  } finally {
    loadingAccounts.value[personId] = false;
  }
}

// Watch expanded rows to load accounts
watch(expanded, async (newExpanded) => {
  for (const item of people.value) {
    const personId = extractPersonId(item._links?.self?.href);
    if (personId && newExpanded.includes(item)) {
      if (!userAccounts.value[personId]) {
        await loadPersonAccounts(item);
      }
    }
  }
});

// Transform person data to include _personId
const transformPerson = (person) => {
  const transformed = {};
  
  // Copy all attributes from _attributes to the root level
  if (person._attributes) {
    Object.assign(transformed, person._attributes);
  }
  
  // Add personId
  if (person._links?.self?.href) {
    transformed._personId = extractPersonId(person._links.self.href);
  }
  
  // Store original _links for account loading
  transformed._links = person._links;
  
  return transformed;
};

async function loadPeople() {
  if (loading.value) return;
  
  try {
    loading.value = true;
    const isimClient = AuthService.getISIMClient();
    if (!isimClient) {
      throw new Error('Not authenticated');
    }
    
    const response = await isimClient.getPeople();
    
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response format');
    }
    
    // Find which attributes have values in any person
    const attributesWithValues = new Set();
    response.forEach(person => {
      if (person._attributes) {
        Object.entries(person._attributes).forEach(([attr, value]) => {
          // Check if the value exists and is not empty
          if (value && (
              (Array.isArray(value) && value.length > 0) || // Handle array values
              (typeof value === 'string' && value.trim() !== '') || // Handle string values
              (typeof value === 'number') || // Handle number values
              (typeof value === 'boolean') // Handle boolean values
          )) {
            attributesWithValues.add(attr);
          }
        });
      }
    });
    
    // Update available attributes to only show those with values
    availableAttributes.value = allAttributes.filter(attr => 
      attributesWithValues.has(attr.value)
    );
    
    // Transform the response data
    people.value = response.map(person => {
      const transformedPerson = transformPerson(person);
      if (person._attributes) {
        Object.entries(person._attributes).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            transformedPerson[key] = value.join(', ');
          } else if (value && typeof value === 'string') {
            transformedPerson[key] = value.trim();
          } else if (value !== null && value !== undefined) {
            transformedPerson[key] = value.toString();
          }
        });
      }
      
      // Ensure name is always present
      if (!transformedPerson.cn && person._links?.self?.title) {
        transformedPerson.cn = person._links.self.title;
      }
      
      return transformedPerson;
    });

    console.log('Found attributes with values:', Array.from(attributesWithValues));
    console.log('People loaded:', people.value.length);
  } catch (error) {
    console.error('Failed to load people:', error);
    people.value = [];
  } finally {
    loading.value = false;
  }
}

function handleLogout() {
  AuthService.logout()
  router.push('/')
}

// Load people automatically when the component is mounted
onMounted(async () => {
  if (!AuthService.isAuthenticated()) {
    router.push('/')
    return
  }
  await loadPeople()
})
</script>

<style>
.v-data-table {
  font-size: 1.1rem;
}

.v-data-table .v-data-table-header th {
  cursor: move;
  user-select: none;
}

.v-data-table .v-data-table-header th:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Make the refresh button more prominent */
.v-btn.v-btn--prepend-icon {
  min-width: 120px;
}

.v-expansion-panel-text__wrapper {
  padding: 12px !important;
}
</style>
