import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CloudflareService } from '@/services/cloudflare/index.js'
import { gasBridge } from '@/services/gas/index.js'
import { removeRoute, upsertRoute } from '@/services/cloudflare/routeModel.js'

const defaultConfig = { id: '', name: '', apiToken: '', accountId: '', zoneId: '' }

export const useCloudflareStore = defineStore('cloudflare', () => {
  const config = ref({ ...defaultConfig })
  const accounts = ref([])
  const activeAccountId = ref('')
  const gasRoutes = ref([])
  const zones = ref([])
  const kvNamespaces = ref([])
  const projects = ref([])
  const loading = ref(false)
  const error = ref('')
  const success = ref('')
  const lastSaved = ref(null)
  const tokenConfigured = ref(false)

  const service = computed(() => new CloudflareService(config.value))
  const isConfigured = computed(() => Boolean(config.value.accountId && tokenConfigured.value))
  const routeCount = computed(() => gasRoutes.value.length)

  const metrics = computed(() => {
    const total = gasRoutes.value.length
    const provisioned = gasRoutes.value.filter(r => r.status === 'provisioned').length
    const drafts = gasRoutes.value.filter(r => r.status === 'draft').length
    const redirect = gasRoutes.value.filter(r => r.deliveryMode === 'redirect').length
    const fullProxy = gasRoutes.value.filter(r => r.deliveryMode === 'full_proxy').length

    return {
      total,
      provisioned,
      drafts,
      redirect,
      fullProxy,
      accountsCount: accounts.value.length,
      zonesCount: zones.value.length,
      kvCount: kvNamespaces.value.length,
      projectsCount: projects.value.length,
    }
  })

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
      accounts.value = data.accounts || []
      activeAccountId.value = data.activeAccountId || (accounts.value[0]?.id || '')
      tokenConfigured.value = Boolean(data.config?.tokenConfigured)
      gasRoutes.value = data.routes || []
      zones.value = data.resources?.zones || []
      kvNamespaces.value = data.resources?.kvNamespaces || []
      projects.value = data.projects || []
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
      config.value = { ...config.value, ...(result.config || {}) }
      accounts.value = result.accounts || accounts.value
      activeAccountId.value = result.activeAccountId || activeAccountId.value
      tokenConfigured.value = true
      success.value = 'Kredensial Cloudflare berhasil diverifikasi dan disimpan'
      lastSaved.value = Date.now()
    } catch (err) {
      fail(err, 'Gagal verifikasi token Cloudflare')
    } finally {
      loading.value = false
    }
  }

  async function switchAccount(accId) {
    begin()
    try {
      const data = await gasBridge.switchAccount(accId)
      config.value = { ...defaultConfig, ...(data.config || {}) }
      accounts.value = data.accounts || []
      activeAccountId.value = data.activeAccountId || accId
      tokenConfigured.value = Boolean(data.config?.tokenConfigured)
      zones.value = data.resources?.zones || []
      kvNamespaces.value = data.resources?.kvNamespaces || []
      success.value = 'Berhasil berpindah akun Cloudflare'
    } catch (err) {
      fail(err, 'Gagal berpindah akun')
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(accId) {
    begin()
    try {
      const data = await gasBridge.deleteAccount(accId)
      config.value = { ...defaultConfig, ...(data.config || {}) }
      accounts.value = data.accounts || []
      activeAccountId.value = data.activeAccountId || ''
      tokenConfigured.value = Boolean(data.config?.tokenConfigured)
      success.value = 'Akun Cloudflare dihapus'
    } catch (err) {
      fail(err, 'Gagal menghapus akun')
    } finally {
      loading.value = false
    }
  }

  async function fetchResources() {
    begin()
    try {
      const resources = await service.value.listResources()
      zones.value = resources.zones || []
      kvNamespaces.value = resources.kvNamespaces || []
      success.value = 'Data zones & KV namespaces diperbarui'
    } catch (err) {
      fail(err, 'Gagal mengambil resources Cloudflare')
    } finally {
      loading.value = false
    }
  }

  async function saveProjectList(newList) {
    begin()
    try {
      const data = await gasBridge.saveProjects(newList)
      projects.value = data.projects || newList
      success.value = 'Daftar Google Project berhasil disimpan'
    } catch (err) {
      fail(err, 'Gagal menyimpan Google Project')
    } finally {
      loading.value = false
    }
  }

  async function provisionRoute(routeInput) {
    begin()
    try {
      const result = await service.value.provisionRoute(routeInput)
      gasRoutes.value = upsertRoute(gasRoutes.value, result.route)
      success.value = `Route ${result.route.routePattern} berhasil diprovision`
      return result
    } catch (err) {
      fail(err, 'Gagal memprovision route')
    } finally {
      loading.value = false
    }
  }

  async function saveRouteDraft(routeInput) {
    begin()
    try {
      const result = await service.value.saveRouteDraft(routeInput)
      gasRoutes.value = upsertRoute(gasRoutes.value, result)
      success.value = `Draft route ${result.routePattern} disimpan`
      return result
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
    config, accounts, activeAccountId, gasRoutes, zones, kvNamespaces, projects, loading, error, success, lastSaved,
    tokenConfigured, service, isConfigured, routeCount, metrics, load, saveCredentials, switchAccount, deleteAccount,
    fetchResources, saveProjectList, provisionRoute, saveRouteDraft, deleteRoute, updateConfig,
  }
})
