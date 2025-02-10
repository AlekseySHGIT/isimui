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
      >
        Logout
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
        :title="currentUser?.username || 'User'"
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
        <v-list-item prepend-icon="mdi-account-group" title="People" value="people"></v-list-item>
        <v-list-item 
          prepend-icon="mdi-logout" 
          title="Logout"
          color="error"
          @click="handleLogout"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <v-card>
          <v-card-title class="d-flex align-center">
            People
            <v-spacer></v-spacer>
            <v-select
              v-model="selectedAttributes"
              :items="availableAttributes"
              label="Select Attributes"
              multiple
              chips
              class="mx-4"
              style="max-width: 300px"
            ></v-select>
            <v-btn
              color="primary"
              @click="loadPeople"
              :loading="loading"
              class="mx-2"
            >
              Load People
            </v-btn>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
              density="compact"
              class="mx-4"
              style="max-width: 300px"
            ></v-text-field>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="people"
            :search="search"
            :loading="loading"
            :items-per-page="10"
          >
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
            <template v-slot:no-data>
              No people found
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const drawer = ref(true)
const rail = ref(false) // Set rail to false to keep sidebar expanded
const loading = ref(false)
const search = ref('')
const people = ref([])
const currentUser = ref(null)

// Define all possible attributes
const allAttributes = [
  { title: 'Name', value: 'cn' },
  { title: 'Email', value: 'mail' },
  { title: 'Department', value: 'department' },
  { title: 'Manager', value: 'manager' },
  { title: 'Title', value: 'title' },
  { title: 'Phone', value: 'telephoneNumber' },
  { title: 'Given Name', value: 'givenName' },
  { title: 'Surname', value: 'sn' },
  { title: 'Display Name', value: 'displayName' },
  { title: 'Employee Number', value: 'employeeNumber' },
  { title: 'Employee Type', value: 'employeeType' },
  { title: 'Office', value: 'physicalDeliveryOfficeName' },
  { title: 'Mobile', value: 'mobile' },
  { title: 'Country', value: 'co' },
  { title: 'Location', value: 'l' },
  { title: 'Organization', value: 'o' },
  { title: 'Org Unit', value: 'ou' },
  { title: 'Postal Code', value: 'postalCode' },
  { title: 'State', value: 'st' },
  { title: 'Street', value: 'street' },
  { title: 'Description', value: 'description' },
  { title: 'Audio', value: 'audio' }
]

const availableAttributes = ref([])
const selectedAttributes = ref(['cn']) // Start with Name selected by default

const headers = computed(() => {
  return selectedAttributes.value.map(attr => {
    const attrDef = allAttributes.find(a => a.value === attr)
    return {
      title: attrDef?.title || attr,
      key: attr,
      align: 'start',
      sortable: true
    }
  })
})

async function loadPeople() {
  if (loading.value) return
  
  try {
    loading.value = true
    const isimClient = AuthService.getISIMClient()
    if (!isimClient) {
      throw new Error('Not authenticated')
    }
    
    // Load with all possible attributes to check which ones have values
    const response = await isimClient.getPeople({
      attributes: allAttributes.map(attr => attr.value)
    })
    
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response format')
    }
    
    // Find which attributes have values in any person
    const attributesWithValues = new Set()
    response.forEach(person => {
      Object.entries(person._attributes || {}).forEach(([attr, value]) => {
        if (value && value.toString().trim() !== '') {
          attributesWithValues.add(attr)
        }
      })
    })
    
    // Update available attributes to only show those with values
    availableAttributes.value = allAttributes.filter(attr => 
      attributesWithValues.has(attr.value)
    )
    
    // Transform the response data to use attribute keys directly
    people.value = response.map(person => {
      const transformedPerson = {}
      Object.entries(person._attributes || {}).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          transformedPerson[key] = value
        }
      })
      // Ensure cn (name) is always present
      if (!transformedPerson.cn) {
        transformedPerson.cn = person._links?.self?.title || 'Unknown'
      }
      return transformedPerson
    })

    console.log('Available attributes:', availableAttributes.value)
    console.log('People data:', people.value)
  } catch (error) {
    console.error('Failed to load people:', error)
    people.value = []
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  AuthService.logout()
  router.push('/')
}

onMounted(async () => {
  if (!AuthService.isAuthenticated()) {
    router.push('/')
    return
  }
  // Load people immediately on mount
  await loadPeople()
})
</script>
