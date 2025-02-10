<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="primary" dark flat>
                <v-toolbar-title>Login</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-form ref="form">
                  <v-text-field
                    v-model="username"
                    :rules="[rules.required]"
                    label="Username"
                    name="username"
                    prepend-icon="mdi-account"
                    type="text"
                    required
                  />
                  <v-text-field
                    v-model="password"
                    :rules="[rules.required]"
                    label="Password"
                    name="password"
                    prepend-icon="mdi-lock"
                    type="password"
                    required
                    @keyup.enter="handleLogin"
                  />
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn 
                  color="primary" 
                  @click="handleLogin"
                  :loading="loading"
                  :disabled="loading"
                >
                  Login
                </v-btn>
              </v-card-actions>
              <v-snackbar
                v-model="showError"
                color="error"
                timeout="3000"
              >
                {{ errorMessage }}
              </v-snackbar>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const form = ref(null)
const username = ref('')
const password = ref('')
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')

const rules = {
  required: v => !!v || 'This field is required'
}

const handleLogin = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  showError.value = false
  
  try {
    await AuthService.login(username.value, password.value)
    router.push('/ui')
  } catch (error) {
    errorMessage.value = error.message
    showError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (AuthService.isAuthenticated()) {
    router.push('/ui')
  }
})
</script>
