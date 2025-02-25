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
      :rail="rail"
      permanent
      :width="250"
    >
      <v-list>
        <v-list-item>
          <template v-slot:prepend>
            <v-icon icon="mdi-account" color="primary" size="small"></v-icon>
          </template>
          <v-list-item-title class="text-caption text-grey-darken-1">
            {{ currentUser.displayName }}
          </v-list-item-title>
          <template v-slot:append>
            <v-btn
              variant="text"
              :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
              @click.stop="rail = !rail"
              :title="rail ? 'Развернуть меню' : 'Свернуть меню'"
              color="primary"
              size="small"
            ></v-btn>
          </template>
        </v-list-item>
      </v-list>

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

      <template v-slot:append>
        <div class="pa-2">
          <v-btn
            block
            :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            @click.stop="rail = !rail"
            :color="rail ? 'primary' : 'grey'"
            variant="tonal"
          >
            {{ rail ? 'Развернуть' : 'Свернуть' }}
          </v-btn>
        </div>
      </template>
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
                  class="mx-2"
                  prepend-icon="mdi-account-details"
                >
                  Атрибуты пользователя ({{ selectedAttributes.length }})
                </v-btn>
              </template>
              
              <v-card min-width="300" class="pa-2">
                <v-card-title class="text-subtitle-1">Атрибуты пользователя</v-card-title>
                <v-divider></v-divider>
                <v-list density="compact">
                  <v-list-item
                    v-for="attr in allAttributes"
                    :key="attr.value"
                    :value="attr.value"
                  >
                    <template v-slot:prepend>
                      <v-checkbox
                        v-model="selectedAttributes"
                        :value="attr.value"
                        hide-details
                      ></v-checkbox>
                    </template>
                    <v-list-item-title>{{ attr.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>

            <v-menu
              v-model="showAccountColumnsMenu"
              :close-on-content-click="false"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="outlined"
                  class="mx-2"
                  prepend-icon="mdi-key-variant"
                >
                  Атрибуты уч. записей ({{ selectedAccountAttributes.length }})
                </v-btn>
              </template>
              
              <v-card min-width="300" class="pa-2">
                <v-card-title class="text-subtitle-1">Атрибуты учетных записей</v-card-title>
                <v-divider></v-divider>
                <v-list density="compact">
                  <v-list-item
                    v-for="attr in allAccountAttributes"
                    :key="attr.value"
                    :value="attr.value"
                  >
                    <template v-slot:prepend>
                      <v-checkbox
                        v-model="selectedAccountAttributes"
                        :value="attr.value"
                        hide-details
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
              :headers="[{ title: '', key: 'expand', sortable: false, width: '48px' }, ...headers]"
              :items="people"
              :search="search"
              :loading="loading"
              :items-per-page="50"
              fixed-header
              density="comfortable"
              hover
              height="calc(100vh - 140px)"
              class="elevation-1"
              @update:options="handleTableOptionsUpdate"
            >
              <template #[`item`]="{ item }">
                <PersonRow
                  :person="item"
                  :headers="headers"
                  :selected-account-attributes="selectedAccountAttributes"
                  :services="services"
                />
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
import PersonRow from '../components/PersonRow.vue'

const router = useRouter()
const drawer = ref(true)
const rail = ref(false)
const loading = ref(false)
const search = ref('')
const people = ref([])
const currentUser = ref({
  username: '',
  displayName: ''
})
const expanded = ref([])
const userAccounts = ref({})
const loadingAccounts = ref({})
const showColumnsMenu = ref(false)
const showAccountColumnsMenu = ref(false)
const services = ref({})

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

const allAccountAttributes = [
  { title: 'Логин', value: 'eruid' },
  { title: 'Отображаемое имя', value: 'adisplayname' },
  { title: 'Описание', value: 'adescription' },
  { title: 'Сервис', value: 'erservice' },
  { title: 'Статус', value: 'eraccountstatus' },
  { title: 'Последний доступ', value: 'erlastaccessdate' },
  { title: 'Владелец', value: 'owner' },
  { title: 'Тип владения', value: 'eraccountownershiptype' },
  { title: 'Дата создания', value: 'ercreatedate' },
  { title: 'Дата изменения', value: 'ermodifydate' },
  { title: 'Дата удаления', value: 'erdeletedate' },
  { title: 'Дата блокировки', value: 'erlockdate' },
  { title: 'Дата разблокировки', value: 'erunlockdate' },
  { title: 'Дата истечения', value: 'erexpirydate' },
  { title: 'Дата последнего изменения пароля', value: 'erpasswordmodifydate' },
  { title: 'Дата последней синхронизации', value: 'erlastsyncdate' },
  { title: 'Дата последней ошибки синхронизации', value: 'erlastsyncerrordate' },
  { title: 'Ошибка синхронизации', value: 'ersyncerrormessage' },
  { title: 'Тип учетной записи', value: 'eraccounttype' },
  { title: 'Идентификатор', value: 'erid' },
  { title: 'Идентификатор владельца', value: 'erownerid' },
  { title: 'Идентификатор сервиса', value: 'erserviceid' },
  { title: 'Идентификатор типа учетной записи', value: 'eraccounttypeid' },
  { title: 'Идентификатор статуса', value: 'eraccountstatusid' },
  { title: 'Идентификатор типа владения', value: 'eraccountownershiptypeid' }
]

const defaultColumns = ['cn', 'mail', 'sn', 'status', 'description']
const defaultAccountAttributes = [
  'eruid',
  'adisplayname',
  'adescription',
  'erservice',
  'eraccountstatus',
  'eraccountcompliance',
  'erlastaccessdate',
  'eraccountownershiptype'
]

const selectedAttributes = ref(defaultColumns)
const selectedAccountAttributes = ref(defaultAccountAttributes)

// Update headers based on selected attributes
const headers = computed(() => {
  return selectedAttributes.value.map(attr => {
    const foundAttr = allAttributes.find(a => a.value === attr);
    return {
      title: foundAttr?.title || attr,
      key: attr,
      sortable: true,
      align: attr === 'audio' ? 'end' : 'start',
      width: attr === 'cn' ? '200px' : undefined
    }
  })
})

// Handle table options update for column reordering
function handleTableOptionsUpdate(options) {
  console.log('Table options update:', options)
  if (options.columnOrder) {
    const newOrder = []
    for (const col of options.columnOrder) {
      const key = typeof col === 'string' ? col : col.key
      if (key && selectedAttributes.value.includes(key)) {
        newOrder.push(key)
      }
    }
    console.log('New column order:', newOrder)
    if (newOrder.length === selectedAttributes.value.length) {
      selectedAttributes.value = newOrder
    }
  }
}

// Transform people data to include _personId
const transformPerson = (person) => {
  const transformed = { ...person };
  
  // Copy all attributes from _attributes to the root level
  if (person._attributes) {
    Object.assign(transformed, person._attributes);
  }
  
  // Add personId from href
  if (person._links?.self?.href) {
    transformed._personId = extractPersonId(person._links.self.href);
  }

  // Handle audio attribute specially
  if (transformed.audio) {
    transformed.audio = 'MY.AUDIO';
  }

  // Ensure cn (name) is properly displayed
  if (person._attributes?.cn) {
    transformed.cn = person._attributes.cn;
  }
  
  return transformed;
};

// Watch for rail state changes
watch(rail, (newValue) => {
  console.log('Rail state changed:', newValue)
})

// Watch for changes in selected attributes
watch(selectedAttributes, (newAttrs) => {
  console.log('Selected attributes changed:', newAttrs)
})

// Watch for changes in selected account attributes
watch(selectedAccountAttributes, (newAttrs) => {
  console.log('Selected account attributes changed:', newAttrs)
})

// Function to extract personId from href
function extractPersonId(href) {
  if (!href) return null;
  const match = href.match(/\/people\/([^/]+)/);
  return match ? match[1] : null;
}

// Load person accounts when expanded
async function loadPersonAccounts(personId) {
  if (loadingAccounts.value[personId] || userAccounts.value[personId]) return;
  
  try {
    loadingAccounts.value[personId] = true;
    const isimClient = AuthService.getISIMClient();
    if (!isimClient) {
      throw new Error('Not authenticated');
    }
    
    const accounts = await isimClient.getPersonAccounts(personId);
    userAccounts.value[personId] = accounts;
  } catch (error) {
    console.error('Failed to load accounts:', error);
    userAccounts.value[personId] = [];
  } finally {
    loadingAccounts.value[personId] = false;
  }
}

function toggleExpand(personId) {
  const index = expanded.value.indexOf(personId)
  if (index === -1) {
    expanded.value.push(personId)
    // Load accounts when expanding
    loadPersonAccounts(personId)
  } else {
    expanded.value.splice(index, 1)
  }
}

// Function to generate fake accounts for a user
function getFakeAccounts(person) {
  if (!person) return []
  
  return [
    {
      type: 'Active Directory',
      description: 'Корпоративная учетная запись',
      username: `${person.cn}@company.local`,
      status: 'active',
      lastLogin: '2024-02-10 15:30',
      details: 'Группы: Domain Users, VPN Users, Remote Desktop Users'
    },
    {
      type: 'PostgreSQL',
      description: 'База данных',
      username: person.cn?.toLowerCase(),
      status: 'active',
      lastLogin: '2024-02-09 11:45',
      details: 'Роли: read_only, backup_operator'
    },
    {
      type: 'Jira',
      description: 'Система управления задачами',
      username: person.mail,
      status: 'inactive',
      lastLogin: null,
      details: 'Лицензия истекла'
    },
    {
      type: 'VPN',
      description: 'Удаленный доступ',
      username: person.cn?.toLowerCase(),
      status: 'active',
      lastLogin: '2024-02-10 09:15',
      details: 'IP: 10.0.0.123, Сертификат действителен до 2024-12-31'
    },
    {
      type: 'Git',
      description: 'Система контроля версий',
      username: person.mail,
      status: 'active',
      lastLogin: '2024-02-10 16:20',
      details: 'Доступ: Developer, Репозитории: main-project, utils'
    }
  ]
}

async function loadServices() {
  try {
    const isimClient = AuthService.getISIMClient();
    const serviceMap = await isimClient.getAllServicesWithNames();
    services.value = serviceMap;
    console.log('Loaded service map:', serviceMap);
  } catch (error) {
    console.error('Failed to load services:', error);
  }
}

async function loadPeople() {
  if (loading.value) return;

  try {
    loading.value = true;
    const isimClient = AuthService.getISIMClient();
    if (!isimClient) {
      router.push('/login');
      return;
    }

    const response = await isimClient.getPeople();
    
    // Transform each person to include personId and flatten attributes
    people.value = response.map(transformPerson);
    
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

// Get current user information
async function getCurrentUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user'))
    if (storedUser) {
      currentUser.value = {
        username: storedUser.username,
        displayName: storedUser.username // You can add more user info here if needed
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error)
  }
}

// Load people automatically when the component is mounted
onMounted(async () => {
  if (!AuthService.isAuthenticated()) {
    router.push('/')
    return
  }
  
  await getCurrentUser()
  await loadServices()
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

.v-data-table-header__content {
  white-space: nowrap;
}
</style>
