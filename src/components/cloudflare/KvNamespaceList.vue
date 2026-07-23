<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5">
    <h2 class="text-base font-semibold text-slate-100 mb-4">KV Namespaces</h2>
    <ul v-if="cf.kvNamespaces.length" class="space-y-2">
      <li
        v-for="ns in cf.kvNamespaces"
        :key="ns.id"
        class="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg border border-slate-700"
      >
        <div>
          <p class="text-sm font-medium text-slate-100">{{ ns.title }}</p>
          <p class="text-xs text-slate-500 font-mono">{{ ns.id }}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">KV</span>
      </li>
    </ul>
    <p v-else class="text-sm text-slate-500">No KV namespaces loaded. Configure credentials and fetch resources.</p>
  </section>
</template>
