import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CloudflareService } from '@/services/cloudflare/index.js'

export const useCloudflareStore = defineStore('cloudflare', () => {
  // State
  const config = ref({
    apiToken: '',
    accountId: '',
    baseUrl: 'https://api.cloudflare.com/client/v4',
  })
  const gasRoutes = ref([])
  const kvNamespaces = ref([])
  const workerMeta = ref({})
  const loading = ref(false)
  const error = ref('')
  const lastSaved = ref(null)

  // Derived state
  const service = computed(() => new CloudflareService(config.value))

  const isConfigured = computed(() => Boolean(config.value.apiToken && config.value.accountId))

  const routeCount = computed(() => gasRoutes.value.length)

  // Actions
  async function initService() {
    loading.value = true
    error.value = ''
    try {
      await service.value.init()
    } catch (err) {
      error.value = err.message || 'Failed to init Cloudflare service'
    } finally {
      loading.value = false
    }
  }

  async function fetchResources() {
    if (!isConfigured.value) {
      error.value = 'Configure API token and account ID first'
      return
    }
    loading.value = true
    error.value = ''
    try {
      await service.value.init()
      const resources = await service.value.listResources()
      kvNamespaces.value = resources.filter((r) => r.type === 'kv_namespace')
    } catch (err) {
      error.value = err.message || 'Failed to fetch Cloudflare resources'
    } finally {
      loading.value = false
    }
  }

  function addGasRoute(pattern, scriptId, bindings = []) {
    gasRoutes.value.push({
      id: Date.now().toString(),
      pattern,
      scriptId,
      bindings,
      createdAt: Date.now(),
    })
  }

  function removeGasRoute(id) {
    gasRoutes.value = gasRoutes.value.filter((r) => r.id !== id)
  }

  function updateConfig(patch) {
    config.value = { ...config.value, ...patch }
  }

  async function saveRoutes() {
    loading.value = true
    error.value = ''
    try {
      const result = await service.value.applyConfig({ routes: gasRoutes.value })
      lastSaved.value = result.appliedAt
      return result
    } catch (err) {
      error.value = err.message || 'Failed to save routes'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    config,
    gasRoutes,
    kvNamespaces,
    workerMeta,
    loading,
    error,
    lastSaved,
    service,
    isConfigured,
    routeCount,
    initService,
    fetchResources,
    addGasRoute,
    removeGasRoute,
    updateConfig,
    saveRoutes,
  }
})
