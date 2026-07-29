<script setup>
import { onMounted } from 'vue'
import DashboardMetrics from '@/components/cloudflare/DashboardMetrics.vue'
import ConfigPanel from '@/components/cloudflare/ConfigPanel.vue'
import GasRouteManager from '@/components/cloudflare/GasRouteManager.vue'
import { useAppStore } from '@/stores/appStore.js'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const app = useAppStore()
const cf = useCloudflareStore()
app.setActiveModule('cloudflare-gas')

onMounted(() => cf.load())
</script>

<template>
  <div class="space-y-6 pb-6">
    <DashboardMetrics />
    <ConfigPanel />
    <GasRouteManager />
  </div>
</template>
