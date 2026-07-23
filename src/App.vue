<script setup>
import { RouterView } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import Topbar from '@/components/layout/Topbar.vue'
import { useAppStore } from '@/stores/appStore.js'

const app = useAppStore()
</script>

<template>
  <div class="flex h-full overflow-hidden" :class="app.theme">
    <Sidebar />
    <div class="flex flex-col flex-1 min-w-0">
      <Topbar />
      <main class="flex-1 overflow-auto p-6 bg-surface">
        <RouterView />
      </main>
    </div>
  </div>
</template>
