/**
 * Module Registry
 *
 * Add new service modules here to make them appear in the sidebar/router.
 * Each module should have a matching view component at:
 *   src/views/modules/<kebab-name>.vue
 */
export const ACTIVE_MODULES = [
  {
    id: 'cloudflare-gas',
    name: 'GAS & Cloudflare Router',
    icon: 'RouterIcon',
    route: '/modules/cloudflare-gas',
    enabled: true,
    description: 'Manage Cloudflare Workers, KV namespaces, and Google Apps Script route helpers.',
  },
]

export function getEnabledModules() {
  return ACTIVE_MODULES.filter((m) => m.enabled)
}

export function findModuleByRoute(routePath) {
  return getEnabledModules().find((m) => m.route === routePath)
}
