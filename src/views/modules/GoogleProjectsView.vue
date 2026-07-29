<script setup>
import { reactive, ref } from 'vue'
import { useCloudflareStore } from '@/stores/modules/cloudflareStore.js'

const cf = useCloudflareStore()
const showModal = ref(false)
const editingId = ref('')

const form = reactive({
  id: '',
  name: '',
  scriptId: '',
  githubRepo: '',
  deployUrl: '',
  status: 'active',
})

function openModal(project = null) {
  if (project) {
    Object.assign(form, project)
    editingId.value = project.id
  } else {
    Object.assign(form, { id: 'proj_' + Date.now(), name: '', scriptId: '', githubRepo: '', deployUrl: '', status: 'active' })
    editingId.value = ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveProject() {
  const current = [...cf.projects]
  const idx = current.findIndex(p => p.id === form.id)
  if (idx >= 0) {
    current[idx] = { ...form }
  } else {
    current.push({ ...form })
  }
  await cf.saveProjectList(current)
  closeModal()
}

async function deleteProject(project) {
  if (!window.confirm(`Hapus mapping project ${project.name}?`)) return
  const current = cf.projects.filter(p => p.id !== project.id)
  await cf.saveProjectList(current)
}
</script>

<template>
  <div class="space-y-6 pb-6">
    <section class="glass-panel rounded-2xl p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Google Apps Script ↔ GitHub Project Mapping</h2>
          <p class="text-xs font-medium text-slate-500 mt-0.5">Pemetaan project GAS ke repositori GitHub untuk sinkronisasi clasp & deploy.</p>
        </div>
        <button
          class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all glow-primary"
          @click="openModal()"
        >
          + Tambah Project Mapping
        </button>
      </div>

      <!-- Projects Table -->
      <div class="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/70 shadow-xs">
        <table class="w-full min-w-[850px] text-left text-sm">
          <thead class="bg-slate-100/90 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th class="p-3.5">Nama Project</th>
              <th class="p-3.5">Script ID (GAS)</th>
              <th class="p-3.5">GitHub Repository</th>
              <th class="p-3.5">Deploy / Web App URL</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60">
            <tr v-for="proj in cf.projects" :key="proj.id" class="hover:bg-white/90 transition-colors">
              <td class="p-3.5 font-bold text-slate-800">{{ proj.name }}</td>
              <td class="p-3.5 font-mono text-xs text-slate-600 max-w-xs truncate" :title="proj.scriptId">{{ proj.scriptId }}</td>
              <td class="p-3.5 text-xs text-blue-600 font-medium max-w-xs truncate">
                <a v-if="proj.githubRepo" :href="proj.githubRepo" target="_blank" class="hover:underline">{{ proj.githubRepo }}</a>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="p-3.5 font-mono text-xs text-slate-600 max-w-xs truncate">
                <a v-if="proj.deployUrl" :href="proj.deployUrl" target="_blank" class="text-sky-600 hover:underline">{{ proj.deployUrl }}</a>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="p-3.5">
                <span class="rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {{ proj.status || 'Active' }}
                </span>
              </td>
              <td class="p-3.5">
                <div class="flex justify-end gap-3 text-xs font-bold">
                  <button class="text-blue-600 hover:text-blue-800" @click="openModal(proj)">Edit</button>
                  <button class="text-rose-500 hover:text-rose-700" @click="deleteProject(proj)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="!cf.projects.length">
              <td colspan="6" class="p-8 text-center text-slate-400 font-medium">
                Belum ada project mapping. Klik '+ Tambah Project Mapping' untuk menambahkan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Popup -->
    <Transition name="modal">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="glass-panel w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl relative bg-white/95 modal-content">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-base font-bold text-slate-800">
              {{ editingId ? 'Edit Project Mapping' : 'Tambah Project Mapping Baru' }}
            </h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
          </div>

          <form class="space-y-4" @submit.prevent="saveProject">
            <label class="block space-y-1">
              <span class="text-xs font-bold text-slate-600">Nama Project *</span>
              <input v-model.trim="form.name" required class="field" placeholder="misal: gas_configtor / linktree" />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-bold text-slate-600">Google Apps Script Script ID *</span>
              <input v-model.trim="form.scriptId" required class="field font-mono text-xs" placeholder="1RVkCuepMZdC17Qw-M_Fm..." />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-bold text-slate-600">GitHub Repository URL</span>
              <input v-model.trim="form.githubRepo" class="field font-mono text-xs" placeholder="https://github.com/fanul/gas_configtor" />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-bold text-slate-600">Web App Exec Deploy URL</span>
              <input v-model.trim="form.deployUrl" class="field font-mono text-xs" placeholder="https://script.google.com/macros/s/.../exec" />
            </label>
            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs" @click="closeModal">Batal</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-xs shadow-md shadow-blue-500/20">
                Simpan Mapping
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.field { width: 100%; padding: .5rem .875rem; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(203, 213, 225, 0.8); border-radius: .75rem; font-size: .875rem; color: #0f172a; font-weight: 500; }
.field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.94) translateY(10px);
  opacity: 0;
}
</style>
