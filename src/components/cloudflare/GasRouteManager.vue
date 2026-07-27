<script setup>
import { reactive, ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'
import { emptyRoute } from '@/services/cloudflare/routeModel.js'

const cf = useCloudflareStore()
const editingId = ref('')
const form = reactive(emptyRoute())

function resetForm() {
  Object.assign(form, emptyRoute(cf.config.zoneId))
  editingId.value = ''
}

function editRoute(route) {
  Object.assign(form, route)
  editingId.value = route.id
}

async function saveDraft() {
  const stored = await cf.saveRouteDraft({ ...form, zoneId: form.zoneId || cf.config.zoneId })
  Object.assign(form, stored)
  editingId.value = stored.id
}

async function provision() {
  const result = await cf.provisionRoute({ ...form, zoneId: form.zoneId || cf.config.zoneId })
  Object.assign(form, result.route, { cloudflareRouteId: result.cloudflareRouteId })
  editingId.value = result.route.id
}

async function deleteRoute(route) {
  if (!window.confirm(`Hapus route ${route.pattern || route.hostname}?`)) return
  await cf.deleteRoute(route)
  if (editingId.value === route.id) resetForm()
}
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-slate-100">GAS → Cloudflare Route Provisioner</h2>
        <p class="text-xs text-slate-500 mt-1">CRUD route tersimpan di GAS Properties; Provision membuat DNS, Worker, dan Worker Route.</p>
      </div>
      <button class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm" @click="resetForm">+ New Route</button>
    </div>

    <form class="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4" @submit.prevent="saveDraft">
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Zone</span>
        <select v-model="form.zoneId" class="field">
          <option value="">Pilih zone</option>
          <option v-for="zone in cf.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Hostname/Subdomain</span>
        <input v-model.trim="form.hostname" class="field" placeholder="game.uploadx.my.id" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Path Prefix</span>
        <input v-model.trim="form.pathPrefix" class="field" placeholder="/ atau /backpack" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Worker Name</span>
        <input v-model.trim="form.workerName" class="field" placeholder="gas-game-uploadx" />
      </label>
      <label class="space-y-1 md:col-span-2">
        <span class="text-xs text-slate-400">Target URL</span>
        <input v-model.trim="form.targetUrl" class="field font-mono" placeholder="https://script.google.com/macros/s/.../exec" />
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-300">
        <input v-model="form.stripPrefix" type="checkbox" /> Strip path prefix sebelum proxy
      </label>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm" :disabled="cf.loading" @click="saveDraft">Save Draft</button>
        <button type="button" class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-sm disabled:opacity-50"
          :disabled="cf.loading || !form.zoneId || !form.hostname || !form.targetUrl" @click="provision">
          {{ form.cloudflareRouteId ? 'Update Provision' : 'Provision' }}
        </button>
      </div>
    </form>

    <div class="overflow-x-auto rounded-lg border border-slate-700">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-slate-900 text-xs uppercase text-slate-400">
          <tr><th class="p-3">Hostname</th><th class="p-3">Path</th><th class="p-3">Target</th><th class="p-3">Worker</th><th class="p-3">Status</th><th class="p-3 text-right">Actions</th></tr>
        </thead>
        <tbody>
          <tr v-for="route in cf.gasRoutes" :key="route.id" class="border-t border-slate-700">
            <td class="p-3 font-medium">{{ route.hostname }}</td>
            <td class="p-3 font-mono text-xs">{{ route.pathPrefix }}</td>
            <td class="p-3 font-mono text-xs max-w-xs truncate" :title="route.targetUrl">{{ route.targetUrl }}</td>
            <td class="p-3 font-mono text-xs">{{ route.workerName }}</td>
            <td class="p-3"><span :class="route.cloudflareRouteId ? 'text-green-400' : 'text-amber-400'">{{ route.cloudflareRouteId ? 'Provisioned' : 'Draft' }}</span></td>
            <td class="p-3"><div class="flex justify-end gap-2">
              <button class="text-primary hover:underline" @click="editRoute(route)">Edit</button>
              <button class="text-green-400 hover:underline" :disabled="cf.loading" @click="cf.provisionRoute(route)">Provision</button>
              <button class="text-red-400 hover:underline" :disabled="cf.loading" @click="deleteRoute(route)">Delete</button>
            </div></td>
          </tr>
          <tr v-if="!cf.gasRoutes.length"><td colspan="6" class="p-6 text-center text-slate-500">Belum ada route. Klik New Route untuk menambahkan.</td></tr>
        </tbody>
      </table>
    </div>

    <p v-if="cf.error" class="text-xs text-red-400">{{ cf.error }}</p>
    <p v-else-if="cf.success" class="text-xs text-green-400">{{ cf.success }}</p>
  </section>
</template>

<style scoped>
.field { width: 100%; padding: .5rem .75rem; background: rgb(15 23 42); border: 1px solid rgb(51 65 85); border-radius: .5rem; font-size: .875rem; }
.field:focus { outline: none; border-color: var(--color-primary); }
</style>
