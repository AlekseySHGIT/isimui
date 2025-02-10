import { createRouter, createWebHistory } from 'vue-router'
import AuthService from '../services/AuthService'
import LoginView from '../views/LoginView.vue'
import MainView from '../views/MainView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/ui',
    name: 'main',
    component: MainView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = AuthService.isAuthenticated()
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to login
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    // If user is authenticated and tries to access login page, redirect to main
    next('/ui')
  } else {
    next()
  }
})

export default router
