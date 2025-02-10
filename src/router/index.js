import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import MainView from '../views/MainView.vue'
import AuthService from '../services/AuthService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LoginView,
      beforeEnter: (to, from, next) => {
        if (AuthService.isAuthenticated()) {
          next('/ui')
        } else {
          next()
        }
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      beforeEnter: (to, from, next) => {
        if (AuthService.isAuthenticated()) {
          next('/ui')
        } else {
          next()
        }
      }
    },
    {
      path: '/ui',
      name: 'main',
      component: MainView,
      beforeEnter: (to, from, next) => {
        if (!AuthService.isAuthenticated()) {
          next('/')
        } else {
          next()
        }
      }
    }
  ]
})

export default router
