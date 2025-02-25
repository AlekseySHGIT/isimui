<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="primary" dark flat>
                <v-toolbar-title class="d-flex align-center">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-shield-account" size="large" class="mr-2"></v-icon>
                    <span class="text-h5 font-weight-bold">ISIM</span>
                    <span class="text-h5 font-weight-light ml-1">UI</span>
                  </div>
                </v-toolbar-title>
              </v-toolbar>
              <v-card-text class="pt-6">
                <div class="text-center mb-4">
                  <v-icon icon="mdi-account-key" color="primary" size="x-large"></v-icon>
                  <h2 class="text-h6 mt-2 text-primary">Вход в систему</h2>
                </div>
                <v-form ref="form">
                
                  <v-text-field
                    v-model="username"
                    :rules="[rules.required]"
                    label="Имя пользователя"
                    name="username"
                    prepend-icon="mdi-account"
                    type="text"
                    required
                    variant="outlined"
                    color="primary"
                  />
                  <v-text-field
                    v-model="password"
                    :rules="[rules.required]"
                    label="Пароль"
                    name="password"
                    prepend-icon="mdi-lock"
                    type="password"
                    required
                    @keyup.enter="handleLogin"
                    variant="outlined"
                    color="primary"
                  />
                  <v-select
                    v-model="serverUrl"
                    :items="serverOptions"
                    :rules="[rules.required]"
                    label="Сервер"
                    name="server"
                    prepend-icon="mdi-server"
                    required
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                  />
                </v-form>
              </v-card-text>
              <v-card-actions class="pb-4 px-4">
                <v-spacer />
                <v-btn 
                  color="primary" 
                  @click="handleLogin"
                  :loading="loading"
                  :disabled="loading"
                  size="large"
                  prepend-icon="mdi-login"
                  variant="elevated"
                >
                  Войти
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar
      v-model="snackbar"
      color="error"
      timeout="3000"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'
import { LOCAL_SERVER_URL, REMOTE_SERVER_URL } from '../config'

const router = useRouter()
const form = ref(null)
const username = ref('ITIM Manager')
const password = ref('')
const serverUrl = ref(LOCAL_SERVER_URL)
const loading = ref(false)
const snackbar = ref(false)
const errorMessage = ref('')

const serverOptions = [
  { title: 'Локальный сервер', value: LOCAL_SERVER_URL },
  { title: 'Удаленный сервер', value: REMOTE_SERVER_URL }
]

const rules = {
  required: value => !!value || 'Обязательное поле'
}

const handleLogin = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  snackbar.value = false
  
  try {
    await AuthService.login(username.value, password.value, serverUrl.value)
    router.push('/ui')
  } catch (error) {
    errorMessage.value = error.message
    snackbar.value = true
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

<style scoped>
.v-toolbar-title {
  overflow: visible;
}

.v-card {
  border-radius: 8px;
}

.v-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
