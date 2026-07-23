<script setup>
import { useAppStore } from '@/stores/appStore.js'

const app = useAppStore()
app.setActiveModule('')
</script>

<template>
  <div class="space-y-6">
    <section class="bg-surface-elevated rounded-xl border border-slate-700 p-6">
      <h1 class="text-2xl font-bold text-slate-100 mb-2">gas_configtor</h1>
      <p class="text-slate-400 text-sm">
        Multi-service dashboard control plane. Start by opening the
        <RouterLink to="/modules/cloudflare-gas" class="text-primary hover:underline">GAS & Cloudflare Router</RouterLink>
        module.
      </p>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="mod in app.modules"
        :key="mod.id"
        :to="mod.route"
        class="block p-5 bg-surface-elevated rounded-xl border border-slate-700 hover:border-primary transition-colors"
      >
        <h3 class="text-base font-semibold text-slate-100">{{ mod.name }}</h3>
        <p class="mt-1 text-xs text-slate-500">{{ mod.description }}</p>
      </RouterLink>
    </section>
  </div>
</template>
