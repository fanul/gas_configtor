function getRunner() {
  if (!globalThis.google?.script?.run) {
    throw new Error('Google Apps Script bridge tidak tersedia. Buka aplikasi dari URL deployment GAS /exec.')
  }
  return globalThis.google.script.run
}

export function callGas(functionName, ...args) {
  return new Promise((resolve, reject) => {
    getRunner()
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => reject(new Error(error?.message || String(error))))
      [functionName](...args)
  })
}

export const gasBridge = {
  loadConfig: () => callGas('loadConfig'),
  saveCloudflareConfig: (config) => callGas('saveCloudflareConfig', config),
  verifyCloudflare: (config) => callGas('verifyCloudflare', config),
  listCloudflareResources: () => callGas('listCloudflareResources'),
  provisionCloudflareRoute: (route) => callGas('provisionCloudflareRoute', route),
  removeCloudflareRoute: (route) => callGas('removeCloudflareRoute', route),
}
