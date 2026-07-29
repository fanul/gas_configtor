<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Routes</span>
      <span class="text-3xl font-extrabold text-slate-800 mt-2">{{ cf.metrics.total }}</span>
    </div>
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 glow-emerald">
      <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">Provisioned</span>
      <span class="text-3xl font-extrabold text-emerald-600 mt-2">{{ cf.metrics.provisioned }}</span>
    </div>
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 glow-amber">
      <span class="text-xs font-bold uppercase tracking-wider text-amber-600">Drafts</span>
      <span class="text-3xl font-extrabold text-amber-600 mt-2">{{ cf.metrics.drafts }}</span>
    </div>
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300">
      <span class="text-xs font-bold uppercase tracking-wider text-sky-600">Redirect Mode</span>
      <span class="text-3xl font-extrabold text-sky-600 mt-2">{{ cf.metrics.redirect }}</span>
    </div>
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 glow-primary">
      <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Full Proxy</span>
      <span class="text-3xl font-extrabold text-indigo-600 mt-2">{{ cf.metrics.fullProxy }}</span>
    </div>
    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300">
      <span class="text-xs font-bold uppercase tracking-wider text-purple-600">Accounts & Zones</span>
      <div class="text-base font-bold text-purple-700 mt-2">
        {{ cf.metrics.accountsCount }} Acc / {{ cf.metrics.zonesCount }} Zones
      </div>
    </div>
  </div>
</template>
