<script setup>
import { computed, ref } from 'vue'

const activeTab = ref('openapi')

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GAS Configtor REST API',
    description: 'Dokumentasi OpenAPI & Swagger REST API untuk terhubung dengan AI Agents (Hermes / LLM).',
    version: '1.0.0'
  },
  servers: [
    { url: 'https://script.google.com/macros/s/{scriptId}/exec', description: 'Google Apps Script Production Web App' }
  ],
  paths: {
    '/doGet': {
      get: {
        summary: 'Ambil Konfigurasi Dashboard & Routes',
        operationId: 'loadConfig',
        responses: {
          '200': { description: 'Objek konfigurasi, routes, dan list resources' }
        }
      }
    },
    '/doPost': {
      post: {
        summary: 'Eksekusi Aksi Admin / Provisioning Route',
        operationId: 'executeAction',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: { type: 'string', example: 'provisionRoute' },
                  payload: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Hasil eksekusi fungsi GAS' }
        }
      }
    }
  }
}

const openApiJson = computed(() => JSON.stringify(openApiSpec, null, 2))
const copied = ref(false)

function copySpec() {
  navigator.clipboard.writeText(openApiJson.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="space-y-6 pb-6">
    <section class="glass-panel rounded-2xl p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">AI OpenAPI / Swagger Schema</h2>
          <p class="text-xs font-medium text-slate-500 mt-0.5">Spesifikasi API standar OpenAPI 3.0 untuk dihubungkan dengan Hermes Agent & AI Tools.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
            :class="activeTab === 'openapi' ? 'bg-blue-600 text-white glow-primary' : 'bg-white/80 text-slate-700 hover:bg-white'"
            @click="activeTab = 'openapi'"
          >
            OpenAPI Spec (JSON)
          </button>
          <button
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
            :class="activeTab === 'endpoints' ? 'bg-blue-600 text-white glow-primary' : 'bg-white/80 text-slate-700 hover:bg-white'"
            @click="activeTab = 'endpoints'"
          >
            API Endpoints Overview
          </button>
          <button
            @click="copyCopySpec"
            class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs"
          >
            {{ copied ? '✓ Copied' : 'Copy Spec JSON' }}
          </button>
        </div>
      </div>

      <!-- JSON View -->
      <div v-if="activeTab === 'openapi'" class="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-sky-300 overflow-x-auto max-h-[500px]">
        <pre>{{ openApiJson }}</pre>
      </div>

      <!-- Endpoints View -->
      <div v-else class="space-y-3">
        <div class="p-4 bg-white/70 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-md">GET</span>
            <span class="font-mono text-xs font-bold text-slate-800">doGet()</span>
          </div>
          <p class="text-xs text-slate-600">Bisa memuat HTML Service atau mengembalikan JSON payload konfigurasi untuk agent AI.</p>
        </div>

        <div class="p-4 bg-white/70 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-md">POST</span>
            <span class="font-mono text-xs font-bold text-slate-800">doPost(e)</span>
          </div>
          <p class="text-xs text-slate-600">Endpoint RPC API untuk membuat/memprovision Worker Route, mengelola akun Cloudflare, dan update project mapping dari Agent AI.</p>
        </div>
      </div>
    </section>
  </div>
</template>
