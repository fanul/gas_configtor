<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5">
    <h2 class="text-base font-semibold text-slate-100 mb-1">Cloudflare Credentials</h2>
    <p class="text-xs text-slate-500 mb-4">Token, account, zone, route, dan cache resource disimpan di GAS Script Properties. Zone/KV otomatis direfresh saat load.</p>
    <p class="text-xs text-amber-400 mb-4">Wajib: Account → Workers Scripts Edit; Zone → DNS Edit, Workers Routes Edit, Zone Read; Account → Workers KV Storage Read.</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label class="space-y-1">
        <span class="text-xs text-slate-400">API Token</span>
        <input v-model="cf.config.apiToken" type="password" :placeholder="cf.tokenConfigured ? 'Token tersimpan — isi hanya untuk mengganti' : 'Isi Cloudflare API token'"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Account ID</span>
        <input v-model="cf.config.accountId" placeholder="Cloudflare Account ID"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Default Zone</span>
        <select v-model="cf.config.zoneId"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary">
          <option value="">Pilih setelah Fetch Resources</option>
          <option v-for="zone in cf.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
        </select>
      </label>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <button class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.config.apiToken || !cf.config.accountId" @click="cf.saveCredentials">
        {{ cf.loading ? 'Processing...' : 'Save & Verify Token' }}
      </button>
      <button class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.isConfigured" @click="cf.fetchResources">
        Fetch Resources
      </button>
      <span v-if="cf.error" class="text-xs text-red-400">{{ cf.error }}</span>
      <span v-else-if="cf.success" class="text-xs text-green-400">{{ cf.success }}</span>
      <span v-else-if="cf.tokenConfigured" class="text-xs text-green-400">Token tersimpan di GAS Properties</span>
    </div>
  </section>
</template>
