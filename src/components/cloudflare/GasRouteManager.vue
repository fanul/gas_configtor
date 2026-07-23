<script setup>
import { ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
const pattern = ref('')
const scriptId = ref('')

function addRoute() {
  if (!pattern.value || !scriptId.value) return
  cf.addGasRoute(pattern.value, scriptId.value)
  pattern.value = ''
  scriptId.value = ''
}

async function save() {
  await cf.saveRoutes()
}
</script>

<template>
  <section class="bg-surface-elevated rounded-xl border border-slate-700 p-5 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-slate-100">GAS Route Helpers</h2>
      <span class="text-xs text-slate-500">{{ cf.routeCount }} route(s)</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <input
        v-model="pattern"
        placeholder="Route pattern (e.g. /api/*)"
        class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary"
      />
      <input
        v-model="scriptId"
        placeholder="GAS Script ID / Worker name"
        class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary"
      />
      <button
        class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50"
        :disabled="!pattern || !scriptId"
        @click="addRoute"
      >
        Add Route
      </button>
    </div>

    <ul v-if="cf.gasRoutes.length" class="space-y-2">
      <li
        v-for="route in cf.gasRoutes"
        :key="route.id"
        class="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg border border-slate-700"
      >
        <div>
          <p class="text-sm font-medium text-slate-100">{{ route.pattern }}</p>
          <p class="text-xs text-slate-500 font-mono">{{ route.scriptId }}</p>
        </div>
        <button
          class="text-xs text-red-400 hover:text-red-300 px-2 py-1"
          @click="cf.removeGasRoute(route.id)"
        >
          Remove
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-slate-500">No routes defined yet.</p>

    <div class="flex items-center gap-3 pt-2">
      <button
        class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium disabled:opacity-50"
        :disabled="cf.loading"
        @click="save"
      >
        {{ cf.loading ? 'Saving...' : 'Save Routes' }}
      </button>
      <span v-if="cf.lastSaved" class="text-xs text-green-400">Saved {{ new Date(cf.lastSaved).toLocaleTimeString() }}</span>
    </div>
  </section>
</template>
