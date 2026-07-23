<script setup>
import ConfigPanel from '@/components/cloudflare/ConfigPanel.vue'
import KvNamespaceList from '@/components/cloudflare/KvNamespaceList.vue'
import GasRouteManager from '@/components/cloudflare/GasRouteManager.vue'
import { useAppStore } from '@/stores/appStore.js'

const app = useAppStore()
app.setActiveModule('cloudflare-gas')
</script>

<template>
  <div class="space-y-6">
    <ConfigPanel />
    <KvNamespaceList />
    <GasRouteManager />
  </div>
</template>
