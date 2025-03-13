<template>
  <v-app>
    <v-main class="bg-light">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-8 rounded-lg">
              <v-toolbar color="primary" dark flat class="rounded-t-lg">
                <v-toolbar-title class="d-flex align-center">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-shield-account" size="large" class="mr-2"></v-icon>
                    <span class="text-h5 font-weight-bold">ISIM</span>
                    <span class="text-h5 font-weight-light ml-1">UI</span>
                  </div>
                </v-toolbar-title>
              </v-toolbar>
              <v-card-text class="pt-6 px-6">
              
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
                    class="mb-3"
                    bg-color="grey-lighten-5"
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
                    class="mb-3"
                    bg-color="grey-lighten-5"
                  />
                  <v-text-field
                    v-model="serverUrl"
                    label="IP адрес сервера"
                    prepend-icon="mdi-server"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    :rules="[rules.required]"
                    placeholder="192.168.1.204:9080"
                    bg-color="grey-lighten-5"
                  />
                </v-form>
              </v-card-text>
              <v-card-actions class="pb-6 px-6">
                <v-spacer />
                <v-btn 
                  color="primary" 
                  @click="handleLogin"
                  :loading="loading"
                  :disabled="loading"
                  size="large"
                  prepend-icon="mdi-login"
                  variant="elevated"
                  class="px-6"
                  elevation="2"
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
      location="top"
      rounded="lg"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/AuthService'

const router = useRouter()
const form = ref(null)
const username = ref('ITIM Manager')
const password = ref('1q@3e4r')
const serverUrl = ref('http://192.168.1.204:9080')
const loading = ref(false)
const snackbar = ref(false)
const errorMessage = ref('')

const rules = {
  required: value => !!value || 'Обязательное поле'
}

async function handleLogin() {

  if (!form.value?.validate()) return

  // Clear existing LtpaToken2 cookie with all necessary attributes
  document.cookie = 'LtpaToken2=; Path=/; Domain=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;'
  document.cookie = 'LtpaToken2=; Path=/itim; Domain=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; HttpOnly; SameSite=Strict;'
  loading.value = true
  snackbar.value = false
  
  try {
    const user = await AuthService.login(username.value, password.value)
    console.log("ROUTING!!!!!!! TO UI")
    console.log(user.tokens.csrf)
    if(user.tokens.csrf != 'not-available'){
      router.push('/ui')
    } else {
      errorMessage.value = 'Неверный логин или пароль'
      snackbar.value = true
    }
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
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.v-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.v-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  border-radius: 8px;
}

.v-text-field {
  border-radius: 8px;
}
</style>
