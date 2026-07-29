<script setup>
import { useAppStore } from '@/stores/appStore.js'
import Topbar from '@/components/layout/Topbar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'

const app = useAppStore()
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden">
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <Topbar />
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
