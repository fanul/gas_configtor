/**
 * Base Service Contract
 *
 * All service drivers must extend this class and implement the abstract methods.
 */
export class BaseService {
  /** Unique service identifier, e.g. 'cloudflare'. */
  static id = 'base'

  /** Human readable name displayed in the UI. */
  static name = 'Base Service'

  /**
   * @param {object} config Service-level configuration (API tokens, endpoints, etc.)
   */
  constructor(config = {}) {
    this.config = config
    this.ready = false
  }

  /**
   * Validate configuration and set ready state.
   * @returns {Promise<boolean>}
   */
  async init() {
    this.ready = true
    return true
  }

  /**
   * Return the raw resource list for the service.
   * @abstract
   * @returns {Promise<Array>}
   */
  async listResources() {
    throw new Error('listResources() must be implemented by subclass')
  }

  /**
   * Apply a configuration payload to the service.
   * @abstract
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async applyConfig(payload) {
    throw new Error('applyConfig() must be implemented by subclass')
  }
}

/**
 * Minimal factory to instantiate a service driver by its static id.
 * @param {typeof BaseService} ServiceClass
 * @param {object} config
 */
export function createService(ServiceClass, config = {}) {
  const instance = new ServiceClass(config)
  return instance
}
