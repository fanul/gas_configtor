<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore.js'
import LayoutGridIcon from '@/components/icons/LayoutGridIcon.vue'
import RouterIcon from '@/components/icons/RouterIcon.vue'

const ICON_MAP = {
  RouterIcon,
  LayoutGridIcon,
}

const app = useAppStore()
const route = useRoute()

const isActive = (path) => route.path === path

const toggle = () => app.collapseSidebar()

const navItems = computed(() => [
  { id: 'home', name: 'Dashboard', icon: 'LayoutGridIcon', route: '/' },
  ...app.modules,
])
</script>

<template>
  <aside
    class="flex flex-col h-full bg-surface-elevated border-r border-slate-700 transition-all duration-300"
    :class="app.globalSettings.sidebarCollapsed ? 'w-16' : 'w-64'"
  >
    <div class="flex items-center justify-between h-14 px-4 border-b border-slate-700">
      <span v-if="!app.globalSettings.sidebarCollapsed" class="font-bold text-primary truncate">
        gas_configtor
      </span>
      <button
        class="p-1.5 rounded hover:bg-slate-700 text-slate-400"
        title="Toggle sidebar"
        @click="toggle"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-3 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.route"
        class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors"
        :class="
          isActive(item.route)
            ? 'bg-primary/15 text-primary'
            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
        "
        @click="app.setActiveModule(item.id === 'home' ? '' : item.id)"
      >
        <component :is="ICON_MAP[item.icon]" class="w-5 h-5 shrink-0" />
        <span v-if="!app.globalSettings.sidebarCollapsed" class="text-sm font-medium truncate">
          {{ item.name }}
        </span>
      </RouterLink>
    </nav>

    <div class="p-3 border-t border-slate-700 text-xs text-slate-500 text-center">
      <span v-if="!app.globalSettings.sidebarCollapsed">v0.1.0</span>
    </div>
  </aside>
</template>
