import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getEnabledModules } from '@/config/modules.js'

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref('dark')
  const activeModuleId = ref('')
  const toasts = ref([])
  const globalSettings = ref({
    sidebarCollapsed: false,
    apiTimeout: 30000,
  })

  // Getters
  const modules = computed(() => getEnabledModules())
  const activeModule = computed(() => modules.value.find((m) => m.id === activeModuleId.value))

  // Actions
  function setActiveModule(id) {
    activeModuleId.value = id
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('light', theme.value === 'light')
  }

  function collapseSidebar(collapse) {
    globalSettings.value.sidebarCollapsed = collapse ?? !globalSettings.value.sidebarCollapsed
  }

  function pushToast({ message, type = 'info', duration = 4000 }) {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return {
    theme,
    activeModuleId,
    toasts,
    globalSettings,
    modules,
    activeModule,
    setActiveModule,
    toggleTheme,
    collapseSidebar,
    pushToast,
    removeToast,
  }
})
