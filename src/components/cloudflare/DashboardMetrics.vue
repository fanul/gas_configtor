<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-slate-400">Total Routes</span>
      <span class="text-2xl font-bold text-slate-100 mt-2">{{ cf.metrics.total }}</span>
    </div>
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-emerald-400">Provisioned</span>
      <span class="text-2xl font-bold text-emerald-400 mt-2">{{ cf.metrics.provisioned }}</span>
    </div>
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-amber-400">Drafts</span>
      <span class="text-2xl font-bold text-amber-400 mt-2">{{ cf.metrics.drafts }}</span>
    </div>
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-sky-400">Redirect Mode</span>
      <span class="text-2xl font-bold text-sky-400 mt-2">{{ cf.metrics.redirect }}</span>
    </div>
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-indigo-400">Full Proxy Mode</span>
      <span class="text-2xl font-bold text-indigo-400 mt-2">{{ cf.metrics.fullProxy }}</span>
    </div>
    <div class="bg-surface-elevated border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
      <span class="text-xs font-medium text-purple-400">Accounts & Zones</span>
      <div class="text-sm font-semibold text-slate-200 mt-2">
        {{ cf.metrics.accountsCount }} Acc / {{ cf.metrics.zonesCount }} Zones
      </div>
    </div>
  </div>
</template>
