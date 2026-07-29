function getRunner() {
  if (!globalThis.google?.script?.run) {
    throw new Error('Google Apps Script bridge tidak tersedia. Buka aplikasi dari URL deployment GAS /exec.')
  }
  return globalThis.google.script.run
}

export function callGas(functionName, ...args) {
  return new Promise((resolve, reject) => {
    const runner = getRunner()
    if (typeof runner[functionName] !== 'function') {
      return reject(new Error(`Fungsi GAS '${functionName}' tidak ditemukan pada server.`))
    }
    runner
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => reject(new Error(error?.message || String(error))))
      [functionName](...args)
  })
}

export const gasBridge = {
  loadConfig: () => callGas('loadCloudflareDashboard'),
  saveCloudflareConfig: (config) => callGas('saveCloudflareConfig', config),
  verifyCloudflare: (config) => callGas('verifyCloudflare', config),
  listCloudflareResources: () => callGas('fetchCloudflareResources'),
  provisionCloudflareRoute: (route) => callGas('provisionCloudflareRoute', route),
  saveCloudflareRouteDraft: (route) => callGas('saveCloudflareRouteDraft', route),
  deleteCloudflareRoute: (route) => callGas('deleteCloudflareRoute', route),
  switchAccount: (accId) => callGas('switchAccount', accId),
  deleteAccount: (accId) => callGas('deleteAccount', accId),
  saveProjects: (projects) => callGas('saveProjects', projects),
}
