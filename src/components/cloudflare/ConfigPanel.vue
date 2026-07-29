<script setup>
import { ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()

const newAccName = ref('')
const newAccountId = ref('')
const newApiToken = ref('')

async function handleSaveNew() {
  if (!newAccountId.value) return
  cf.updateConfig({
    id: newAccountId.value,
    name: newAccName.value || newAccountId.value,
    accountId: newAccountId.value,
    apiToken: newApiToken.value,
  })
  await cf.saveCredentials()
  newAccName.value = ''
  newAccountId.value = ''
  newApiToken.value = ''
}
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5 space-y-5">
    <div>
      <h2 class="text-base font-semibold text-slate-100 mb-1">Cloudflare Multi-Account Credentials</h2>
      <p class="text-xs text-slate-500">Kelola multiple akun Cloudflare. Setiap akun menyimpan API Token & Account ID terpisah di GAS Script Properties.</p>
    </div>

    <!-- Active Account Selector / Multi-Account Switcher -->
    <div v-if="cf.accounts.length > 0" class="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-400">Aktif Account:</span>
          <select
            :value="cf.activeAccountId"
            @change="e => cf.switchAccount(e.target.value)"
            class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold text-primary focus:outline-none"
          >
            <option v-for="acc in cf.accounts" :key="acc.id" :value="acc.id">
              {{ acc.name || acc.accountId }} ({{ acc.accountId }})
            </option>
          </select>
        </div>
        <button
          v-if="cf.accounts.length > 1"
          @click="cf.deleteAccount(cf.activeAccountId)"
          class="text-xs text-red-400 hover:text-red-300 underline"
        >
          Hapus Akun Ini
        </button>
      </div>
    </div>

    <!-- Edit Selected Account Credentials -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Nama Akun Label</span>
        <input v-model="cf.config.name" placeholder="misal: Akun Utama / Project B"
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
      <label class="space-y-1 md:col-span-3">
        <span class="text-xs text-slate-400">API Token</span>
        <input v-model="cf.config.apiToken" type="password" :placeholder="cf.tokenConfigured ? 'Token tersimpan — isi hanya jika ingin memperbarui' : 'Isi Cloudflare API token'"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-3 pt-1">
      <button class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.config.accountId" @click="cf.saveCredentials">
        {{ cf.loading ? 'Processing...' : 'Simpan & Verifikasi Token' }}
      </button>
      <button class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.isConfigured" @click="cf.fetchResources">
        Fetch Resources
      </button>
      <span v-if="cf.error" class="text-xs text-red-400">{{ cf.error }}</span>
      <span v-else-if="cf.success" class="text-xs text-green-400">{{ cf.success }}</span>
      <span v-else-if="cf.tokenConfigured" class="text-xs text-green-400">Token tersimpan</span>
    </div>

    <!-- Quick Add New Account Form -->
    <details class="pt-2 border-t border-slate-800 text-xs">
      <summary class="cursor-pointer text-slate-400 hover:text-slate-200 font-medium">
        + Tambah Akun Cloudflare Baru
      </summary>
      <div class="mt-3 p-4 bg-slate-900/40 rounded-lg border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input v-model="newAccName" placeholder="Label (Opsional)" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm" />
        <input v-model="newAccountId" placeholder="Account ID *" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm" />
        <input v-model="newApiToken" type="password" placeholder="API Token *" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm" />
        <button
          @click="handleSaveNew"
          :disabled="!newAccountId || !newApiToken"
          class="md:col-span-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded text-sm"
        >
          Simpan Akun Baru
        </button>
      </div>
    </details>
  </section>
</template>
