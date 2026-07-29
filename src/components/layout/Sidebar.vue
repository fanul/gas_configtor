<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore.js'
import RouterIcon from '@/components/icons/RouterIcon.vue'

const app = useAppStore()
const route = useRoute()

const isActive = (path) => route.path === path || (path === '/' && route.path === '/modules/cloudflare-gas')
const toggle = () => app.collapseSidebar()

const navItems = computed(() => [
  { id: 'cloudflare-gas', name: 'GAS & Cloudflare Router', icon: RouterIcon, route: '/' },
])
</script>

<template>
  <aside
    class="flex flex-col h-full glass-panel border-r border-white/60 shadow-lg transition-all duration-300 z-10"
    :class="app.globalSettings.sidebarCollapsed ? 'w-16' : 'w-64'"
  >
    <div class="flex items-center justify-between h-16 px-4 border-b border-slate-200/50">
      <span v-if="!app.globalSettings.sidebarCollapsed" class="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500 text-lg">
        Control Plane
      </span>
      <button
        class="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition-colors"
        title="Toggle sidebar"
        @click="toggle"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-4 space-y-1.5 px-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.route"
        class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
        :class="
          isActive(item.route)
            ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-md shadow-sky-500/25 glow-primary'
            : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 shadow-xs'
        "
        @click="app.setActiveModule(item.id)"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span v-if="!app.globalSettings.sidebarCollapsed" class="truncate">
          {{ item.name }}
        </span>
      </RouterLink>
    </nav>

    <div class="p-3 border-t border-slate-200/50 text-xs font-semibold text-slate-400 text-center">
      <span v-if="!app.globalSettings.sidebarCollapsed">v0.2.0 • Bright Glass</span>
    </div>
  </aside>
</template>
