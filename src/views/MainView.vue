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
      :rail="rail"
      permanent
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
            <template v-slot:item.audio="{ item }">
              <v-chip
                v-if="item.audio"
                color="primary"
                size="small"
              >
                {{ item.audio }}
              </v-chip>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const drawer = ref(false)
const rail = ref(true)
const search = ref('')
const loading = ref(false)
const people = ref([])
const currentUser = ref(AuthService.getCurrentUser())

// All possible ISIM attributes
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
  { title: 'Organizational Unit', value: 'ou' },
  { title: 'Postal Code', value: 'postalCode' },
  { title: 'State', value: 'st' },
  { title: 'Street', value: 'street' },
  { title: 'Description', value: 'description' },
  { title: 'Audio', value: 'audio' }
]

// Available attributes will be computed based on data
const availableAttributes = ref([])
const selectedAttributes = ref(['cn', 'mail', 'department', 'title', 'telephoneNumber', 'manager', 'audio'])

// Dynamic headers based on selected attributes
const headers = computed(() => {
  const baseHeaders = []
  
  if (selectedAttributes.value.includes('cn')) {
    baseHeaders.push({ title: 'Name', key: 'name' })
  }
  if (selectedAttributes.value.includes('mail')) {
    baseHeaders.push({ title: 'Email', key: 'email' })
  }
  if (selectedAttributes.value.includes('department')) {
    baseHeaders.push({ title: 'Department', key: 'department' })
  }
  if (selectedAttributes.value.includes('manager')) {
    baseHeaders.push({ title: 'Manager', key: 'manager' })
  }
  if (selectedAttributes.value.includes('title')) {
    baseHeaders.push({ title: 'Title', key: 'title' })
  }
  if (selectedAttributes.value.includes('telephoneNumber')) {
    baseHeaders.push({ title: 'Phone', key: 'phone' })
  }
  if (selectedAttributes.value.includes('givenName')) {
    baseHeaders.push({ title: 'Given Name', key: 'givenName' })
  }
  if (selectedAttributes.value.includes('sn')) {
    baseHeaders.push({ title: 'Surname', key: 'surname' })
  }
  if (selectedAttributes.value.includes('displayName')) {
    baseHeaders.push({ title: 'Display Name', key: 'displayName' })
  }
  if (selectedAttributes.value.includes('employeeNumber')) {
    baseHeaders.push({ title: 'Employee Number', key: 'employeeNumber' })
  }
  if (selectedAttributes.value.includes('employeeType')) {
    baseHeaders.push({ title: 'Employee Type', key: 'employeeType' })
  }
  if (selectedAttributes.value.includes('physicalDeliveryOfficeName')) {
    baseHeaders.push({ title: 'Office', key: 'office' })
  }
  if (selectedAttributes.value.includes('mobile')) {
    baseHeaders.push({ title: 'Mobile', key: 'mobile' })
  }
  if (selectedAttributes.value.includes('co')) {
    baseHeaders.push({ title: 'Country', key: 'country' })
  }
  if (selectedAttributes.value.includes('l')) {
    baseHeaders.push({ title: 'Location', key: 'location' })
  }
  if (selectedAttributes.value.includes('o')) {
    baseHeaders.push({ title: 'Organization', key: 'organization' })
  }
  if (selectedAttributes.value.includes('ou')) {
    baseHeaders.push({ title: 'Org Unit', key: 'orgUnit' })
  }
  if (selectedAttributes.value.includes('postalCode')) {
    baseHeaders.push({ title: 'Postal Code', key: 'postalCode' })
  }
  if (selectedAttributes.value.includes('st')) {
    baseHeaders.push({ title: 'State', key: 'state' })
  }
  if (selectedAttributes.value.includes('street')) {
    baseHeaders.push({ title: 'Street', key: 'street' })
  }
  if (selectedAttributes.value.includes('description')) {
    baseHeaders.push({ title: 'Description', key: 'description' })
  }
  if (selectedAttributes.value.includes('audio')) {
    baseHeaders.push({ title: 'Audio', key: 'audio' })
  }
  
  return baseHeaders
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
      Object.keys(person._attributes || {}).forEach(attr => {
        if (person._attributes[attr]) {
          attributesWithValues.add(attr)
        }
      })
    })
    
    // Update available attributes to only show those with values
    availableAttributes.value = allAttributes.filter(attr => 
      attributesWithValues.has(attr.value)
    )
    
    // Update selected attributes to only include available ones
    selectedAttributes.value = selectedAttributes.value.filter(attr => 
      attributesWithValues.has(attr)
    )
    
    // Transform the response data
    people.value = response.map(person => ({
      name: person._links?.self?.title || 'Unknown',
      email: person._attributes?.mail || '',
      department: person._attributes?.department || '',
      manager: person._attributes?.manager || '',
      title: person._attributes?.title || '',
      phone: person._attributes?.telephoneNumber || '',
      givenName: person._attributes?.givenName || '',
      surname: person._attributes?.sn || '',
      displayName: person._attributes?.displayName || '',
      employeeNumber: person._attributes?.employeeNumber || '',
      employeeType: person._attributes?.employeeType || '',
      office: person._attributes?.physicalDeliveryOfficeName || '',
      mobile: person._attributes?.mobile || '',
      country: person._attributes?.co || '',
      location: person._attributes?.l || '',
      organization: person._attributes?.o || '',
      orgUnit: person._attributes?.ou || '',
      postalCode: person._attributes?.postalCode || '',
      state: person._attributes?.st || '',
      street: person._attributes?.street || '',
      description: person._attributes?.description || '',
      audio: person._attributes?.audio || ''
    }))

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
