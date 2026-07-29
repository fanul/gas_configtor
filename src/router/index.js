import { createRouter, createWebHashHistory } from 'vue-router'
import CloudflareGasView from '@/views/modules/CloudflareGasView.vue'

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
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
