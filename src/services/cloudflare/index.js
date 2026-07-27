import { BaseService } from '@/services/baseService.js'
import { gasBridge } from '@/services/gas/index.js'

/**
 * Cloudflare control-plane driver.
 * API credentials stay in GAS Script Properties; the browser only calls GAS.
 */
export class CloudflareService extends BaseService {
  static id = 'cloudflare'
  static name = 'Cloudflare Worker Router'

  async init() {
    this.ready = Boolean(this.config.accountId)
    return this.ready
  }

  loadConfig() {
    return gasBridge.loadConfig()
  }

  saveConfig() {
    return gasBridge.saveCloudflareConfig(this.config)
  }

  verify() {
    return gasBridge.verifyCloudflare(this.config)
  }

  async listResources() {
    const data = await gasBridge.listCloudflareResources()
    return {
      zones: data.zones || [],
      kvNamespaces: data.kvNamespaces || [],
    }
  }

  provisionRoute(route) {
    return gasBridge.provisionCloudflareRoute(route)
  }

  saveRouteDraft(route) {
    return gasBridge.saveCloudflareRouteDraft(route)
  }

  deleteRoute(route) {
    return gasBridge.deleteCloudflareRoute(route)
  }

  async applyConfig(payload) {
    const results = []
    for (const route of payload.routes || []) {
      results.push(await this.provisionRoute(route))
    }
    return { ok: true, appliedAt: Date.now(), results }
  }
}

export default CloudflareService
