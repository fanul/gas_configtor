<script setup>
import { useAppStore } from '@/stores/appStore.js'

const app = useAppStore()
</script>

<template>
  <header class="flex items-center justify-between h-16 px-6 glass-panel border-b border-white/60 shadow-sm sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
        G
      </div>
      <h1 class="text-lg font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-sky-600 bg-clip-text text-transparent">
        GAS Configtor
      </h1>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 border border-blue-200/80 shadow-xs">
        Active Environment: GAS Exec
      </span>
    </div>
  </header>
</template>
