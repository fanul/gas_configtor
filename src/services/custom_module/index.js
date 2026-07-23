import { BaseService } from '@/services/baseService.js'

/**
 * Custom Module Template
 *
 * Copy this folder, rename it, import it in the relevant store/view,
 * and register a new module in src/config/modules.js.
 */
export class CustomModuleService extends BaseService {
  static id = 'custom_module'
  static name = 'Custom Module'

  async listResources() {
    return []
  }

  async applyConfig(payload) {
    return { ok: true, payload }
  }
}

export default CustomModuleService
