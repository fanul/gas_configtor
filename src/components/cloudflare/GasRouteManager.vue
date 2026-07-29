<script setup>
import { reactive, ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'
import { emptyRoute, normalizeRouteInput } from '@/services/cloudflare/routeModel.js'

const cf = useCloudflareStore()
const showModal = ref(false)
const editingId = ref('')
const form = reactive(emptyRoute())

function openModal(route = null) {
  if (route) {
    Object.assign(form, emptyRoute(route.zoneId || cf.config.zoneId), route, {
      deliveryMode: route.deliveryMode === 'full_proxy' ? 'full_proxy' : 'redirect',
    })
    editingId.value = route.id
  } else {
    Object.assign(form, emptyRoute(cf.config.zoneId))
    editingId.value = ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
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
  closeModal()
}

async function provision() {
  const result = await cf.provisionRoute(normalizeRouteInput({ ...form, zoneId: form.zoneId || cf.config.zoneId }))
  Object.assign(form, result.route, { cloudflareRouteId: result.cloudflareRouteId })
  editingId.value = result.route.id
  closeModal()
}

async function deleteRoute(route) {
  if (!window.confirm(`Hapus route ${route.pattern || route.hostname}?`)) return
  await cf.deleteRoute(route)
}
</script>

<template>
  <section class="glass-panel rounded-2xl p-6 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-800">GAS → Cloudflare Route Provisioner</h2>
        <p class="text-xs font-medium text-slate-500 mt-0.5">Daftar route proxy terkonfigurasi. Klik 'Tambah Route Baru' untuk menambah atau mengedit.</p>
      </div>
      <button
        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all glow-primary"
        @click="openModal()"
      >
        + Tambah Route Baru
      </button>
    </div>

    <!-- Table Only -->
    <div class="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/70 shadow-xs">
      <table class="w-full min-w-[850px] text-left text-sm">
        <thead class="bg-slate-100/90 text-xs font-bold uppercase text-slate-500">
          <tr>
            <th class="p-3.5">Hostname</th>
            <th class="p-3.5">Path</th>
            <th class="p-3.5">Target URL</th>
            <th class="p-3.5">Mode</th>
            <th class="p-3.5">Worker</th>
            <th class="p-3.5">Status</th>
            <th class="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200/60">
          <tr v-for="route in cf.gasRoutes" :key="route.id" class="hover:bg-white/90 transition-colors">
            <td class="p-3.5 font-bold text-slate-800">{{ route.hostname }}</td>
            <td class="p-3.5 font-mono text-xs text-slate-600">{{ route.pathPrefix }}</td>
            <td class="p-3.5 font-mono text-xs max-w-xs truncate text-slate-600" :title="route.targetUrl">{{ route.targetUrl }}</td>
            <td class="p-3.5">
              <span class="rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs"
                :class="route.deliveryMode === 'full_proxy' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'">
                {{ route.deliveryMode === 'full_proxy' ? 'Full proxy' : 'Redirect' }}
              </span>
            </td>
            <td class="p-3.5 font-mono text-xs text-slate-600">{{ route.workerName }}</td>
            <td class="p-3.5">
              <span class="font-bold text-xs" :class="route.cloudflareRouteId ? 'text-emerald-600' : 'text-amber-600'">
                {{ route.cloudflareRouteId ? '✓ Provisioned' : 'Draft' }}
              </span>
            </td>
            <td class="p-3.5">
              <div class="flex justify-end gap-3 text-xs font-bold">
                <button class="text-blue-600 hover:text-blue-800" @click="openModal(route)">Edit</button>
                <button class="text-emerald-600 hover:text-emerald-800" :disabled="cf.loading" @click="cf.provisionRoute(route)">Provision</button>
                <button class="text-rose-500 hover:text-rose-700" :disabled="cf.loading" @click="deleteRoute(route)">Delete</button>
              </div>
            </td>
          </tr>
          <tr v-if="!cf.gasRoutes.length">
            <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
              Belum ada route. Klik '+ Tambah Route Baru' di atas untuk konfigurasi.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Clean Modal Form Popup -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="glass-panel w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl relative bg-white/95">
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 class="text-base font-bold text-slate-800">
            {{ editingId ? 'Edit Route Configuration' : 'Tambah Route Baru' }}
          </h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
        </div>

        <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="saveDraft">
          <label class="space-y-1">
            <span class="text-xs font-bold text-slate-600">Zone</span>
            <select v-model="form.zoneId" class="field">
              <option value="">Pilih zone</option>
              <option v-for="zone in cf.zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
            </select>
          </label>
          <label class="space-y-1">
            <span class="text-xs font-bold text-slate-600">Hostname / Subdomain</span>
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
            <input v-model.trim="form.targetUrl" class="field font-mono text-xs" placeholder="https://script.google.com/macros/s/.../exec" />
          </label>
          <label class="space-y-1 md:col-span-2">
            <span class="text-xs font-bold text-slate-600">Favicon (opsional)</span>
            <input class="field text-xs text-slate-600" type="file" accept="image/*" @change="setFavicon" />
            <span v-if="form.faviconDataUrl || form.faviconDriveFileId" class="text-xs font-bold text-emerald-600">✓ Favicon terpilih</span>
          </label>
          <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            <input v-model="form.stripPrefix" type="checkbox" class="w-4 h-4 rounded text-blue-600" /> Strip path prefix sebelum proxy
          </label>
          <div class="md:col-span-2 rounded-xl border p-3.5 transition-all"
            :class="form.deliveryMode === 'full_proxy' ? 'border-amber-300 bg-amber-50/80' : 'border-emerald-300 bg-emerald-50/80'">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">URL delivery mode</p>
                <p class="text-[11px] text-slate-600 mt-0.5">
                  {{ form.deliveryMode === 'full_proxy' ? 'Full proxy Worker-native (RPC Same-Origin)' : 'Redirect Kompatibel (Google Apps Script)' }}
                </p>
              </div>
              <label class="switch-control">
                <input v-model="form.deliveryMode" class="sr-only" type="checkbox" true-value="full_proxy" false-value="redirect" />
                <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
              </label>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 md:col-span-2 pt-2 border-t border-slate-200">
            <button type="button" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs" @click="closeModal">Batal</button>
            <button type="button" class="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs" :disabled="cf.loading" @click="saveDraft">Save Draft</button>
            <button type="button" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              :disabled="cf.loading || !form.zoneId || !form.hostname || !form.targetUrl" @click="provision">
              {{ form.cloudflareRouteId ? 'Update Provision' : 'Provision' }}
            </button>
          </div>
        </form>
      </div>
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
