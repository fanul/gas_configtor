import { BaseService } from '@/services/baseService.js'

/**
 * Cloudflare Driver
 *
 * Wraps Cloudflare REST API calls for Workers, KV, and routing metadata.
 * This is a thin client; all state lives in the cloudflareStore.
 */
export class CloudflareService extends BaseService {
  static id = 'cloudflare'
  static name = 'Cloudflare Worker & KV'

  constructor(config = {}) {
    super(config)
    this.baseUrl = config.baseUrl || 'https://api.cloudflare.com/client/v4'
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.config.apiToken || ''}`,
      'Content-Type': 'application/json',
    }
  }

  async init() {
    if (!this.config.apiToken) {
      this.ready = false
      return false
    }
    this.ready = true
    return true
  }

  async listResources() {
    if (!this.ready) throw new Error('Cloudflare service not initialized')
    const results = []

    // Fetch KV namespaces
    const kvRes = await fetch(`${this.baseUrl}/accounts/${this.config.accountId}/storage/kv/namespaces`, {
      headers: this.getHeaders(),
    })
    if (kvRes.ok) {
      const kvJson = await kvRes.json()
      if (kvJson.success) {
        results.push(
          ...kvJson.result.map((ns) => ({
            type: 'kv_namespace',
            id: ns.id,
            title: ns.title,
          })),
        )
      }
    }

    // Fetch Workers (scripts list is not exposed directly via REST; this is a placeholder)
    results.push({
      type: 'worker',
      id: 'placeholder',
      title: 'Worker scripts require GraphQL/Wrangler API',
    })

    return results
  }

  async applyConfig(payload) {
    if (!this.ready) throw new Error('Cloudflare service not initialized')
    // In real implementation: deploy worker script, update routes, etc.
    return { ok: true, appliedAt: Date.now(), payload }
  }
}

export default CloudflareService
