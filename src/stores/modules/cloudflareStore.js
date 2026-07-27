import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CloudflareService } from '@/services/cloudflare/index.js'
import { removeRoute, upsertRoute } from '@/services/cloudflare/routeModel.js'

const defaultConfig = { apiToken: '', accountId: '', zoneId: '' }

export const useCloudflareStore = defineStore('cloudflare', () => {
  const config = ref({ ...defaultConfig })
  const gasRoutes = ref([])
  const zones = ref([])
  const kvNamespaces = ref([])
  const loading = ref(false)
  const error = ref('')
  const success = ref('')
  const lastSaved = ref(null)
  const tokenConfigured = ref(false)

  const service = computed(() => new CloudflareService(config.value))
  const isConfigured = computed(() => Boolean(config.value.accountId && tokenConfigured.value))
  const routeCount = computed(() => gasRoutes.value.length)

  function begin() {
    loading.value = true
    error.value = ''
    success.value = ''
  }

  function fail(err, fallback) {
    error.value = err?.message || fallback
    throw err
  }

  async function load() {
    begin()
    try {
      const data = await service.value.loadConfig()
      config.value = { ...defaultConfig, ...(data.config || {}) }
      gasRoutes.value = data.routes || []
      zones.value = data.resources?.zones || []
      kvNamespaces.value = data.resources?.kvNamespaces || []
      tokenConfigured.value = Boolean(data.tokenConfigured)
      if (data.warning) success.value = data.warning
    } catch (err) {
      fail(err, 'Gagal memuat konfigurasi')
    } finally {
      loading.value = false
    }
  }

  async function saveCredentials() {
    begin()
    try {
      const result = await service.value.verify()
      config.value.apiToken = ''
      tokenConfigured.value = true
      success.value = `Cloudflare token valid (${result.status || 'active'})`
      lastSaved.value = Date.now()
      return result
    } catch (err) {
      fail(err, 'Gagal menyimpan Cloudflare credentials')
    } finally {
      loading.value = false
    }
  }

  async function fetchResources() {
    begin()
    try {
      await service.value.saveConfig()
      const resources = await service.value.listResources()
      zones.value = resources.zones
      kvNamespaces.value = resources.kvNamespaces
      success.value = `${zones.value.length} zone dan ${kvNamespaces.value.length} KV ditemukan`
    } catch (err) {
      fail(err, 'Gagal mengambil resource Cloudflare')
    } finally {
      loading.value = false
    }
  }

  async function provisionRoute(route) {
    begin()
    try {
      const result = await service.value.provisionRoute(route)
      gasRoutes.value = upsertRoute(gasRoutes.value, {
        ...result.route,
        cloudflareRouteId: result.cloudflareRouteId,
      })
      success.value = `Route aktif: ${result.publicUrl}`
      lastSaved.value = result.appliedAt
      return result
    } catch (err) {
      fail(err, 'Gagal provisioning route')
    } finally {
      loading.value = false
    }
  }

  async function saveRouteDraft(route) {
    begin()
    try {
      const stored = await service.value.saveRouteDraft(route)
      gasRoutes.value = upsertRoute(gasRoutes.value, stored)
      success.value = 'Draft route tersimpan di GAS Properties'
      return stored
    } catch (err) {
      fail(err, 'Gagal menyimpan draft route')
    } finally {
      loading.value = false
    }
  }

  async function deleteRoute(route) {
    begin()
    try {
      await service.value.deleteRoute(route)
      gasRoutes.value = removeRoute(gasRoutes.value, route.id)
      success.value = 'Route dihapus'
    } catch (err) {
      fail(err, 'Gagal menghapus route')
    } finally {
      loading.value = false
    }
  }

  function updateConfig(patch) {
    config.value = { ...config.value, ...patch }
  }

  return {
    config, gasRoutes, zones, kvNamespaces, loading, error, success, lastSaved,
    tokenConfigured, service, isConfigured, routeCount, load, saveCredentials,
    fetchResources, provisionRoute, saveRouteDraft, deleteRoute, updateConfig,
  }
})
