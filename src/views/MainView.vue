<template>
  <v-app>
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
      </v-list>

      <template v-slot:append>
        <v-list density="compact" nav>
          <v-list-item 
            prepend-icon="mdi-logout" 
            title="Logout"
            @click="handleLogout"
          ></v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <v-card>
          <v-card-title class="d-flex align-center">
            People
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
              density="compact"
            ></v-text-field>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="people"
            :search="search"
            :loading="loading"
          >
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'
import isimClient from '../services/ISIMClient'

const router = useRouter()
const drawer = ref(false)
const rail = ref(true)
const search = ref('')
const loading = ref(false)
const people = ref([])
const currentUser = ref(AuthService.getCurrentUser())

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Department', key: 'department' },
]

async function loadPeople() {
  try {
    loading.value = true
    const response = await isimClient.getPeople()
    people.value = response || []
  } catch (error) {
    console.error('Failed to load people:', error)
    people.value = []
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  AuthService.logout()
  router.push('/login')
}

onMounted(async () => {
  if (!AuthService.isAuthenticated()) {
    router.push('/login')
    return
  }
  
  // Set credentials from current user
  const user = AuthService.getCurrentUser()
  if (user) {
    isimClient.username = user.username
    isimClient.password = user.password // Assuming password is stored securely
  }
  
  await loadPeople()
})
</script>
