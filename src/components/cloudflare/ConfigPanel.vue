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
  <section class="glass-panel rounded-2xl p-6 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-800">Cloudflare Multi-Account Credentials</h2>
        <p class="text-xs font-medium text-slate-500 mt-0.5">Kelola akun & kredensial Cloudflare yang tersimpan di GAS Script Properties.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
          {{ cf.kvNamespaces.length }} KV Namespaces
        </span>
        <span class="text-xs font-bold px-3 py-1 rounded-full bg-slate-200/80 text-slate-700">
          {{ cf.accounts.length }} Akun
        </span>
      </div>
    </div>

    <!-- Active Account Selector -->
    <div v-if="cf.accounts.length > 0" class="p-4 bg-white/60 rounded-xl border border-white/80 shadow-xs space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Akun Aktif:</span>
          <select
            :value="cf.activeAccountId"
            @change="e => cf.switchAccount(e.target.value)"
            class="px-3.5 py-2 bg-white border border-slate-300/80 rounded-xl text-sm font-bold text-blue-600 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option v-for="acc in cf.accounts" :key="acc.id" :value="acc.id">
              {{ acc.name || acc.accountId }} ({{ acc.accountId }})
            </option>
          </select>
        </div>
        <button
          v-if="cf.accounts.length > 1"
          @click="cf.deleteAccount(cf.activeAccountId)"
          class="text-xs font-semibold text-rose-500 hover:text-rose-600 underline"
        >
          Hapus Akun Ini
        </button>
      </div>
    </div>

    <!-- Credentials & Default Zone Form -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Label Akun</span>
        <input v-model="cf.config.name" placeholder="misal: Akun Utama"
          class="w-full px-3.5 py-2 bg-white/90 border border-slate-300/80 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Account ID</span>
        <input v-model="cf.config.accountId" placeholder="Cloudflare Account ID"
          class="w-full px-3.5 py-2 bg-white/90 border border-slate-300/80 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Default Zone</span>
        <select v-model="cf.config.zoneId"
          class="w-full px-3.5 py-2 bg-white/90 border border-slate-300/80 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
          <option value="">Pilih setelah Fetch Resources</option>
          <option v-for="zone in cf.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
        </select>
      </label>
      <label class="space-y-1 md:col-span-3">
        <span class="text-xs font-bold text-slate-600">API Token</span>
        <input v-model="cf.config.apiToken" type="password" :placeholder="cf.tokenConfigured ? 'Token tersimpan — isi hanya jika ingin memperbarui' : 'Isi Cloudflare API token'"
          class="w-full px-3.5 py-2 bg-white/90 border border-slate-300/80 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </label>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center gap-3 pt-2">
      <button class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white text-sm font-bold shadow-md shadow-blue-500/25 glow-primary transition-all disabled:opacity-50"
        :disabled="cf.loading || !cf.config.accountId" @click="cf.saveCredentials">
        {{ cf.loading ? 'Memproses...' : 'Simpan & Verifikasi Token' }}
      </button>
      <button class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-50"
        :disabled="cf.loading || !cf.isConfigured" @click="cf.fetchResources">
        Fetch Resources (Zones & KV)
      </button>
      <span v-if="cf.error" class="text-xs font-bold text-rose-500">{{ cf.error }}</span>
      <span v-else-if="cf.success" class="text-xs font-bold text-emerald-600">{{ cf.success }}</span>
      <span v-else-if="cf.tokenConfigured" class="text-xs font-bold text-emerald-600">✓ Token tersimpan di GAS</span>
    </div>

    <!-- Integrated KV Namespaces Pill List -->
    <div v-if="cf.kvNamespaces.length > 0" class="pt-3 border-t border-slate-200/60">
      <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Terhubung KV Namespaces:</span>
      <div class="flex flex-wrap gap-2">
        <span v-for="kv in cf.kvNamespaces" :key="kv.id" class="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold" :title="kv.id">
          {{ kv.title }} ({{ kv.id.slice(0, 8) }}...)
        </span>
      </div>
    </div>

    <!-- Quick Add New Account Form -->
    <details class="pt-3 border-t border-slate-200/60 text-xs">
      <summary class="cursor-pointer text-slate-600 hover:text-blue-600 font-bold tracking-wide">
        + Tambah Akun Cloudflare Baru
      </summary>
      <div class="mt-3 p-4 bg-white/80 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-3 shadow-xs">
        <input v-model="newAccName" placeholder="Label Akun (misal: Personal)" class="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
        <input v-model="newAccountId" placeholder="Account ID *" class="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
        <input v-model="newApiToken" type="password" placeholder="API Token *" class="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
        <button
          @click="handleSaveNew"
          :disabled="!newAccountId || !newApiToken"
          class="md:col-span-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow-xs transition-colors"
        >
          Simpan & Tambah Akun
        </button>
      </div>
    </details>
  </section>
</template>
