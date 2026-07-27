<script setup>
import { computed, reactive } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
const form = reactive({
  hostname: 'game.uploadx.my.id',
  pathPrefix: '/',
  targetUrl: 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec',
  workerName: 'gas-game-uploadx',
  stripPrefix: true,
})

const selectedZone = computed(() => cf.zones.find((zone) => zone.id === cf.config.zoneId))
const routePattern = computed(() => {
  const path = (form.pathPrefix || '/').replace(/\/+$/, '') || '/'
  return path === '/' ? `${form.hostname}/*` : `${form.hostname}${path}*`
})

async function provision() {
  await cf.provisionRoute({ ...form, zoneId: cf.config.zoneId })
}

function useBackpackExample() {
  form.hostname = 'game.uploadx.my.id'
  form.pathPrefix = '/backpack'
  form.workerName = 'gas-game-uploadx-backpack'
}
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-slate-100">GAS → Cloudflare Route Provisioner</h2>
        <p class="text-xs text-slate-500 mt-1">Membuat DNS proxied, mengunggah proxy Worker, lalu memasang Worker Route.</p>
      </div>
      <span class="text-xs text-slate-500">{{ cf.routeCount }} route(s)</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Hostname/Subdomain</span>
        <input v-model.trim="form.hostname" placeholder="game.uploadx.my.id"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Path prefix</span>
        <input v-model.trim="form.pathPrefix" placeholder="/ atau /backpack"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
      <label class="space-y-1 md:col-span-2">
        <span class="text-xs text-slate-400">Target URL</span>
        <input v-model.trim="form.targetUrl" placeholder="https://script.google.com/macros/s/.../exec"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-primary" />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-slate-400">Worker name</span>
        <input v-model.trim="form.workerName" placeholder="gas-game-uploadx"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary" />
      </label>
      <label class="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
        <input v-model="form.stripPrefix" type="checkbox" />
        Hapus path prefix sebelum diteruskan ke target
      </label>
    </div>

    <div class="rounded-lg bg-slate-900 border border-slate-700 p-3 text-xs space-y-1">
      <p><span class="text-slate-500">Zone:</span> {{ selectedZone?.name || 'belum dipilih' }}</p>
      <p><span class="text-slate-500">Cloudflare pattern:</span> <code class="text-primary">{{ routePattern }}</code></p>
      <p><span class="text-slate-500">Public URL:</span> <code>https://{{ form.hostname }}{{ form.pathPrefix === '/' ? '/' : form.pathPrefix }}</code></p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading || !cf.config.zoneId || !form.hostname || !form.targetUrl" @click="provision">
        {{ cf.loading ? 'Provisioning...' : 'Provision Route' }}
      </button>
      <button class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm" @click="useBackpackExample">
        Isi contoh /backpack
      </button>
      <span v-if="cf.error" class="text-xs text-red-400">{{ cf.error }}</span>
      <span v-else-if="cf.success" class="text-xs text-green-400">{{ cf.success }}</span>
    </div>

    <ul v-if="cf.gasRoutes.length" class="space-y-2 pt-2">
      <li v-for="route in cf.gasRoutes" :key="route.id"
        class="px-3 py-3 bg-slate-900 rounded-lg border border-slate-700">
        <div class="flex flex-wrap justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-slate-100">https://{{ route.hostname }}{{ route.pathPrefix }}</p>
            <p class="text-xs text-slate-500 font-mono">{{ route.pattern }} → {{ route.workerName }}</p>
            <p class="text-xs text-slate-500 font-mono mt-1">{{ route.targetUrl }}</p>
          </div>
          <span class="text-xs text-green-400">Provisioned</span>
        </div>
      </li>
    </ul>
  </section>
</template>
