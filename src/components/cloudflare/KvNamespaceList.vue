<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <section class="glass-panel rounded-2xl p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-800">Cloudflare KV Namespaces</h2>
        <p class="text-xs font-medium text-slate-500 mt-0.5">Daftar namespace KV untuk akun terhubung.</p>
      </div>
      <span class="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
        {{ cf.kvNamespaces.length }} KV
      </span>
    </div>

    <div v-if="cf.kvNamespaces.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="kv in cf.kvNamespaces" :key="kv.id" class="p-3.5 bg-white/70 rounded-xl border border-slate-200/80 shadow-2xs">
        <p class="text-xs font-bold text-slate-800">{{ kv.title }}</p>
        <p class="text-[11px] font-mono text-slate-500 mt-1 truncate" :title="kv.id">{{ kv.id }}</p>
      </div>
    </div>
    <div v-else class="p-4 text-center text-xs font-medium text-slate-400 bg-white/40 rounded-xl border border-dashed border-slate-300">
      Belum ada KV Namespaces atau belum melakukan Fetch Resources.
    </div>
  </section>
</template>
