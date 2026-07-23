<script setup>
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5">
    <h2 class="text-base font-semibold text-slate-100 mb-4">Cloudflare Credentials</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1">
        <label class="text-xs text-slate-400">API Token</label>
        <input
          v-model="cf.config.apiToken"
          type="password"
          placeholder="CF_API_TOKEN"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary"
          @change="cf.updateConfig({ apiToken: cf.config.apiToken })"
        />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-slate-400">Account ID</label>
        <input
          v-model="cf.config.accountId"
          placeholder="CF_ACCOUNT_ID"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary"
          @change="cf.updateConfig({ accountId: cf.config.accountId })"
        />
      </div>
    </div>
    <div class="mt-4 flex items-center gap-3">
      <button
        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.isConfigured"
        @click="cf.fetchResources"
      >
        {{ cf.loading ? 'Loading...' : 'Fetch Resources' }}
      </button>
      <span v-if="cf.error" class="text-xs text-red-400">{{ cf.error }}</span>
    </div>
  </section>
</template>
