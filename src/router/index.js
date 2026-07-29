import { createRouter, createWebHashHistory } from 'vue-router'
import CloudflareGasView from '@/views/modules/CloudflareGasView.vue'
import GoogleProjectsView from '@/views/modules/GoogleProjectsView.vue'
import SwaggerApiView from '@/views/modules/SwaggerApiView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: CloudflareGasView,
  },
  {
    path: '/modules/cloudflare-gas',
    name: 'cloudflare-gas',
    component: CloudflareGasView,
  },
  {
    path: '/modules/google-projects',
    name: 'google-projects',
    component: GoogleProjectsView,
  },
  {
    path: '/modules/swagger-api',
    name: 'swagger-api',
    component: SwaggerApiView,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
