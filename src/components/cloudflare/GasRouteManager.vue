<script setup>
import { reactive, ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'
import { emptyRoute, normalizeRouteInput } from '@/services/cloudflare/routeModel.js'

const cf = useCloudflareStore()
const editingId = ref('')
const form = reactive(emptyRoute())

function resetForm() {
  Object.assign(form, emptyRoute(cf.config.zoneId))
  editingId.value = ''
}

function editRoute(route) {
  Object.assign(form, emptyRoute(route.zoneId || cf.config.zoneId), route, {
    deliveryMode: route.deliveryMode === 'full_proxy' ? 'full_proxy' : 'redirect',
  })
  editingId.value = route.id
}

function setFavicon(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    canvas.getContext('2d').drawImage(image, 0, 0, 32, 32)
    form.faviconDataUrl = canvas.toDataURL('image/png')
    URL.revokeObjectURL(image.src)
  }
  image.src = URL.createObjectURL(file)
}

async function saveDraft() {
  const stored = await cf.saveRouteDraft(normalizeRouteInput({ ...form, zoneId: form.zoneId || cf.config.zoneId }))
  Object.assign(form, stored)
  editingId.value = stored.id
}

async function provision() {
  const result = await cf.provisionRoute(normalizeRouteInput({ ...form, zoneId: form.zoneId || cf.config.zoneId }))
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
  <section class="glass-panel rounded-2xl p-6 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-800">GAS → Cloudflare Route Provisioner</h2>
        <p class="text-xs font-medium text-slate-500 mt-0.5">Kelola route proxy. Provision membuat DNS record, Worker Script, dan Worker Route otomatis.</p>
      </div>
      <button class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-colors" @click="resetForm">+ New Route</button>
    </div>

    <form class="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-xs" @submit.prevent="saveDraft">
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Zone</span>
        <select v-model="form.zoneId" class="field">
          <option value="">Pilih zone</option>
          <option v-for="zone in cf.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Hostname/Subdomain</span>
        <input v-model.trim="form.hostname" class="field" placeholder="game.uploadx.my.id" />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Path Prefix</span>
        <input v-model.trim="form.pathPrefix" class="field" placeholder="/ atau /backpack" />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">Worker Name</span>
        <input v-model.trim="form.workerName" class="field" placeholder="gas-proxy-game-uploadx" />
      </label>
      <label class="space-y-1 md:col-span-2">
        <span class="text-xs font-bold text-slate-600">Target URL (Google Apps Script /exec)</span>
        <input v-model.trim="form.targetUrl" class="field font-mono" placeholder="https://script.google.com/macros/s/.../exec" />
      </label>
      <label class="space-y-1 md:col-span-2">
        <span class="text-xs font-bold text-slate-600">Favicon (opsional, disinkronkan ke Drive)</span>
        <input class="field text-xs text-slate-600" type="file" accept="image/*" @change="setFavicon" />
        <span v-if="form.faviconDataUrl || form.faviconDriveFileId" class="text-xs font-bold text-emerald-600">✓ Favicon siap diprovision</span>
      </label>
      <label class="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input v-model="form.stripPrefix" type="checkbox" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" /> Strip path prefix sebelum proxy
      </label>
      <div class="md:col-span-2 rounded-2xl border p-4 transition-all"
        :class="form.deliveryMode === 'full_proxy' ? 'border-amber-300 bg-amber-50/80 shadow-xs' : 'border-emerald-300 bg-emerald-50/80 shadow-xs'">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="max-w-2xl">
            <p class="text-sm font-bold text-slate-800">URL delivery mode</p>
            <p class="mt-1 text-xs leading-5 text-slate-600">
              <template v-if="form.deliveryMode === 'full_proxy'">
                Full proxy Worker-native: disajikan dari custom origin & google.script.run diterjemahkan jadi RPC fetch.
              </template>
              <template v-else>
                Redirect kompatibel: paling stabil untuk Apps Script & Google Sheet.
              </template>
            </p>
          </div>
          <label class="switch-control">
            <span class="text-xs font-bold uppercase tracking-wider" :class="form.deliveryMode === 'full_proxy' ? 'text-amber-700' : 'text-emerald-700'">
              {{ form.deliveryMode === 'full_proxy' ? 'Full proxy' : 'Redirect' }}
            </span>
            <input v-model="form.deliveryMode" class="sr-only" type="checkbox" true-value="full_proxy" false-value="redirect" />
            <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
          </label>
        </div>
      </div>
      <div class="flex flex-wrap justify-end gap-3 md:col-span-2">
        <button type="button" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors" :disabled="cf.loading" @click="saveDraft">Save Draft</button>
        <button type="button" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          :disabled="cf.loading || !form.zoneId || !form.hostname || !form.targetUrl" @click="provision">
          {{ form.cloudflareRouteId ? 'Update Provision' : 'Provision' }}
        </button>
      </div>
    </form>

    <div class="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60 shadow-xs">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-slate-100/90 text-xs font-bold uppercase text-slate-500">
          <tr><th class="p-3.5">Hostname</th><th class="p-3.5">Path</th><th class="p-3.5">Target</th><th class="p-3.5">Mode</th><th class="p-3.5">Worker</th><th class="p-3.5">Status</th><th class="p-3.5 text-right">Actions</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-200/60">
          <tr v-for="route in cf.gasRoutes" :key="route.id" class="hover:bg-white/80 transition-colors">
            <td class="p-3.5 font-bold text-slate-800">{{ route.hostname }}</td>
            <td class="p-3.5 font-mono text-xs text-slate-600">{{ route.pathPrefix }}</td>
            <td class="p-3.5 font-mono text-xs max-w-xs truncate text-slate-600" :title="route.targetUrl">{{ route.targetUrl }}</td>
            <td class="p-3.5"><span class="rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs"
              :class="route.deliveryMode === 'full_proxy' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'">
              {{ route.deliveryMode === 'full_proxy' ? 'Full proxy' : 'Redirect' }}
            </span></td>
            <td class="p-3.5 font-mono text-xs text-slate-600">{{ route.workerName }}</td>
            <td class="p-3.5"><span class="font-bold text-xs" :class="route.cloudflareRouteId ? 'text-emerald-600' : 'text-amber-600'">{{ route.cloudflareRouteId ? '✓ Provisioned' : 'Draft' }}</span></td>
            <td class="p-3.5"><div class="flex justify-end gap-3 text-xs font-bold">
              <button class="text-blue-600 hover:text-blue-800" @click="editRoute(route)">Edit</button>
              <button class="text-emerald-600 hover:text-emerald-800" :disabled="cf.loading" @click="cf.provisionRoute(route)">Provision</button>
              <button class="text-rose-500 hover:text-rose-700" :disabled="cf.loading" @click="deleteRoute(route)">Delete</button>
            </div></td>
          </tr>
          <tr v-if="!cf.gasRoutes.length"><td colspan="7" class="p-8 text-center text-slate-400 font-medium">Belum ada route tersimpan. Tambahkan route baru melalui form di atas.</td></tr>
        </tbody>
      </table>
    </div>

    <p v-if="cf.error" class="text-xs font-bold text-rose-500">{{ cf.error }}</p>
    <p v-else-if="cf.success" class="text-xs font-bold text-emerald-600">{{ cf.success }}</p>
  </section>
</template>

<style scoped>
.field { width: 100%; padding: .5rem .875rem; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(203, 213, 225, 0.8); border-radius: .75rem; font-size: .875rem; color: #0f172a; font-weight: 500; }
.field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.switch-control { display: flex; align-items: center; gap: .75rem; cursor: pointer; user-select: none; }
.switch-track { position: relative; width: 3.25rem; height: 1.75rem; border-radius: 999px; background: #cbd5e1; transition: background-color .2s ease; }
.switch-thumb { position: absolute; width: 1.25rem; height: 1.25rem; left: .25rem; top: .25rem; border-radius: 999px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform .2s cubic-bezier(.2,.8,.2,1); }
.switch-control input:checked + .switch-track { background: #3b82f6; }
.switch-control input:checked + .switch-track .switch-thumb { transform: translateX(1.5rem); }
</style>
