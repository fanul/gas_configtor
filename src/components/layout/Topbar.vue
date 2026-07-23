<script setup>
import { useAppStore } from '@/stores/appStore.js'

const app = useAppStore()
</script>

<template>
  <header class="flex items-center justify-between h-14 px-6 bg-surface-elevated border-b border-slate-700">
    <h1 class="text-lg font-semibold text-slate-100">
      {{ app.activeModule?.name || 'Dashboard' }}
    </h1>
    <div class="flex items-center gap-3">
      <button
        class="px-3 py-1.5 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
        @click="app.toggleTheme"
      >
        {{ app.theme === 'dark' ? 'Light' : 'Dark' }}
      </button>
    </div>
  </header>
</template>
