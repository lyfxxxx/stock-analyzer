<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="tag-manager-overlay"
        style="position: fixed !important; inset: 0; z-index: 9999; background-color: rgba(0,0,0,0.5);"
        @click="emit('close')"
        @keydown.escape="emit('close')"
      >
        <Transition name="slide-right">
          <div
            v-if="visible"
            class="tag-manager-drawer"
            style="position: fixed !important; right: 0; top: 0; height: 100vh; width: 100%; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background-color: var(--bg-primary); border-left: 1px solid var(--border-primary); display: flex; flex-direction: column; overflow: hidden;"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-[var(--brand-primary-light)] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </div>
                <h2 class="text-base font-semibold text-[var(--text-primary)]">标签管理</h2>
              </div>
              <button
                class="tag-manager-close p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                aria-label="关闭"
                @click="emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

        <!-- Tag List -->
        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div v-if="sortedTags.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-40">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span class="text-sm">暂无标签</span>
            <span class="text-xs mt-1 opacity-60">在下方创建新标签</span>
          </div>

          <div
            v-for="(tag, index) in sortedTags"
            :key="tag.id"
            class="tag-manager-item"
            :class="{ 'tag-item-auto': tag.isAuto }"
            @dragover.prevent="onDragOver(index)"
            @drop.prevent="onDrop(index)"
            @dragend="onDragEnd"
          >
            <!-- Editing mode -->
            <div v-if="editingTagId === tag.id" class="tag-edit-form bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)] shadow-sm space-y-3">
              <input
                v-model="editName"
                class="tag-edit-name-input w-full text-sm px-3 py-2 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/10 transition-all"
                placeholder="标签名称"
                maxlength="20"
                @keydown.enter.prevent="saveEdit(tag)"
                @keydown.escape.prevent="cancelEdit"
              />
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in TAG_COLOR_PALETTE"
                  :key="c"
                  class="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  :class="editColor === c ? 'border-[var(--border-focus)] scale-110 ring-2 ring-[var(--border-focus)]/20' : 'border-transparent hover:border-[var(--border-secondary)]'"
                  :style="{ backgroundColor: c }"
                  @click="editColor = c"
                />
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs text-[var(--text-muted)]">自定义</span>
                  <input
                    v-model="editColor"
                    class="tag-color-hex-input w-24 text-xs px-2 py-1.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                    placeholder="#RRGGBB"
                    maxlength="7"
                  />
                </div>
                <div class="flex-1"></div>
                <button
                  class="tag-edit-cancel px-3 py-1.5 text-xs rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  @click="cancelEdit"
                >
                  取消
                </button>
                <button
                  class="tag-edit-save px-4 py-1.5 text-xs rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50 font-medium"
                  :disabled="!editName.trim()"
                  @click="saveEdit(tag)"
                >
                  保存
                </button>
              </div>
            </div>

            <!-- Display mode -->
            <div v-else class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-150 group hover:bg-[var(--bg-tertiary)] hover:shadow-sm border border-transparent hover:border-[var(--border-secondary)]/50">
              <!-- Drag handle (manual tags only) -->
              <span
                v-if="!tag.isAuto"
                class="tag-drag-handle cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-secondary)] shrink-0 p-1 rounded-md hover:bg-[var(--bg-secondary)] transition-all"
                draggable="true"
                @dragstart="onDragStart(index)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </span>
              <span v-else class="w-6 shrink-0"></span>

              <!-- Color dot -->
              <span
                class="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-[var(--bg-primary)] transition-all shadow-sm"
                :style="{ backgroundColor: tag.color }"
              ></span>

              <!-- Name -->
              <span
                class="tag-item-name flex-1 text-sm truncate font-medium transition-colors"
                :class="tag.isAuto ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'"
                :title="tag.name"
                @dblclick="!tag.isAuto && startEdit(tag)"
              >
                {{ tag.name }}
              </span>

              <!-- Lock icon (auto tags only) -->
              <svg
                v-if="tag.isAuto"
                class="tag-item-lock shrink-0 text-[var(--text-muted)] opacity-50"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>

              <!-- Edit button (manual tags only) -->
              <button
                v-if="!tag.isAuto"
                class="tag-item-edit opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] transition-all shrink-0"
                aria-label="编辑标签"
                @click="startEdit(tag)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>

              <!-- Delete button (manual tags only) -->
              <button
                v-if="!tag.isAuto"
                class="tag-item-delete opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-all shrink-0"
                aria-label="删除标签"
                @click="showDeleteConfirm(tag)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Create Form -->
        <div class="border-t border-[var(--border-primary)] px-5 py-4 space-y-3 bg-[var(--bg-secondary)]">
          <div class="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span class="text-sm font-semibold text-[var(--text-primary)]">新建标签</span>
          </div>
          <input
            v-model="newTagName"
            class="tag-create-input w-full text-sm px-3.5 py-2.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/10 transition-all"
            placeholder="输入新标签名称..."
            maxlength="20"
            @keydown.enter.prevent="createTag"
          />
          <div class="tag-create-color-palette flex flex-wrap gap-2">
            <button
              v-for="c in TAG_COLOR_PALETTE"
              :key="c"
              class="tag-color-swatch w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
              :class="newTagColor === c ? 'border-[var(--border-focus)] scale-110 ring-2 ring-[var(--brand-primary-light)]' : 'border-transparent hover:border-[var(--border-secondary)]'"
              :style="{ backgroundColor: c }"
              :aria-label="`颜色 ${c}`"
              @click="newTagColor = c"
            />
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-[var(--text-muted)]">自定义颜色</span>
              <input
                v-model="newTagColor"
                class="tag-color-hex-input w-24 text-xs px-2 py-1.5 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                placeholder="#RRGGBB"
                maxlength="7"
              />
            </div>
            <div class="flex-1"></div>
            <button
              class="tag-create-btn px-5 py-2 text-sm rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50 font-medium shadow-sm"
              :disabled="!newTagName.trim()"
              @click="createTag"
            >
              添加标签
            </button>
          </div>

          <!-- Error message -->
          <div v-if="errorMessage" class="flex items-center gap-1.5 text-xs text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ errorMessage }}
          </div>

          <!-- Sync auto tags button -->
          <button
            class="tag-sync-btn w-full mt-1 px-3 py-2 text-xs rounded-lg border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5"
            @click="syncAutoTags"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            同步自动标签
          </button>
        </div>
        </div>
        </Transition>

        <!-- Delete confirmation dialog -->
        <div v-if="deleteTarget" class="tag-delete-confirm" style="position: fixed !important; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background-color: var(--bg-overlay); backdrop-filter: blur(4px);" @click="deleteTarget = null">
          <div class="bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-primary)] p-6 max-w-xs w-full mx-4 space-y-4" @click.stop>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[var(--color-danger-bg)] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-[var(--text-primary)]">
                  确认删除标签 <span class="text-[var(--color-danger)]">{{ deleteTarget.name }}</span>？
                </p>
                <p class="text-xs text-[var(--text-muted)] mt-1">此操作将从所有股票中移除此标签，不可撤销。</p>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                class="tag-delete-cancel-btn px-4 py-2 text-xs rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium"
                @click="deleteTarget = null"
              >
                取消
              </button>
              <button
                class="tag-delete-confirm-btn px-4 py-2 text-xs rounded-lg bg-[var(--color-danger)] text-white hover:opacity-90 transition-colors font-medium shadow-sm"
                @click="confirmDelete"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import { TAG_COLOR_PALETTE } from '@/types/tag'
import type { Tag } from '@/types/tag'

const props = withDefaults(defineProps<{
  visible: boolean
}>(), {
  visible: false,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tagStore = useTagStore()

// Init store on mount
onMounted(() => {
  if (!tagStore.initialized) {
    tagStore.init()
  }
})

// Body scroll lock when drawer is open
watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  document.body.style.overflow = ''
})

// Sorted tags
const sortedTags = computed(() => tagStore.sortedTags)

// ---- Create ----
const newTagName = ref('')
const newTagColor = ref(TAG_COLOR_PALETTE[0])
const errorMessage = ref('')

async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return

  errorMessage.value = ''
  try {
    const color = newTagColor.value ?? TAG_COLOR_PALETTE[0] ?? '#3B82F6'
    await tagStore.createTag(name, color)
    newTagName.value = ''
    newTagColor.value = TAG_COLOR_PALETTE[0]
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '创建失败'
  }
}

// ---- Edit ----
const editingTagId = ref<string | null>(null)
const editName = ref('')
const editColor = ref('')

function startEdit(tag: Tag) {
  editingTagId.value = tag.id
  editName.value = tag.name
  editColor.value = tag.color
}

function cancelEdit() {
  editingTagId.value = null
  editName.value = ''
  editColor.value = ''
}

async function saveEdit(tag: Tag) {
  const name = editName.value.trim()
  if (!name) return

  try {
    await tagStore.updateTag(tag.id, { name, color: editColor.value })
    editingTagId.value = null
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '保存失败'
  }
}

// ---- Delete ----
const deleteTarget = ref<Tag | null>(null)

function showDeleteConfirm(tag: Tag) {
  deleteTarget.value = tag
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await tagStore.deleteTag(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '删除失败'
  }
}

// ---- Drag & Drop Reorder ----
const dragIndex = ref<number | null>(null)

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(_index: number) {
  // Visual feedback is handled by CSS
}

async function onDrop(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    return
  }

  const sourceTag = sortedTags.value[dragIndex.value]
  if (!sourceTag || sourceTag.isAuto) return

  // Convert visual index to sortOrder
  await tagStore.reorderTags(sourceTag.id, targetIndex)
  dragIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
}

// ---- Sync ----
async function syncAutoTags() {
  try {
    await tagStore.updateAllAutoTags()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '同步失败'
  }
}
</script>

<style scoped>
/* ===== Overlay & Drawer Transitions ===== */
.fade-enter-active {
  transition: opacity 250ms ease;
}

.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-right-leave-active {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* ===== Custom Scrollbar ===== */
.tag-manager-drawer ::-webkit-scrollbar {
  width: 6px;
}

.tag-manager-drawer ::-webkit-scrollbar-track {
  background: transparent;
}

.tag-manager-drawer ::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, rgba(0,0,0,0.15));
  border-radius: 10px;
  transition: background-color 150ms ease;
}

.tag-manager-drawer ::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover, rgba(0,0,0,0.25));
}

/* ===== Tag List Items ===== */
.tag-manager-item {
  position: relative;
  transition: all 150ms ease;
}

.tag-manager-item:hover {
  transform: translateY(-1px);
}

.tag-manager-item:hover .tag-item-name {
  color: var(--text-primary, #1a1a1a);
}

/* Drag handle */
.tag-drag-handle {
  opacity: 0.4;
  transition: opacity 150ms ease, color 150ms ease;
}

.tag-manager-item:hover .tag-drag-handle {
  opacity: 0.7;
}

.tag-drag-handle:hover {
  opacity: 1 !important;
  color: var(--brand-primary, #3B82F6) !important;
}

/* Edit form */
.tag-edit-form {
  animation: formSlideIn 200ms ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
}

@keyframes formSlideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-edit-name-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tag-color-hex-input:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
}

/* ===== Create Form Section ===== */
.tag-create-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tag-color-swatch {
  transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), 
              box-shadow 150ms ease, 
              border-color 150ms ease;
}

.tag-color-swatch:hover {
  transform: scale(1.15);
}

.tag-color-swatch:active {
  transform: scale(0.95);
}

.tag-create-btn {
  position: relative;
  overflow: hidden;
  transition: all 200ms ease;
}

.tag-create-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.tag-create-btn:active:not(:disabled) {
  transform: translateY(0);
}

.tag-create-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tag-sync-btn {
  transition: all 150ms ease;
}

.tag-sync-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.tag-sync-btn:active {
  transform: translateY(0);
}

/* ===== Delete Confirmation Dialog ===== */
.tag-delete-confirm {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: dialogFadeIn 200ms ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tag-delete-confirm > div {
  animation: dialogSlideUp 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialogSlideUp {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.tag-delete-cancel-btn {
  transition: all 150ms ease;
}

.tag-delete-cancel-btn:hover {
  background-color: var(--bg-tertiary, #f3f4f6);
}

.tag-delete-confirm-btn {
  transition: all 150ms ease;
}

.tag-delete-confirm-btn:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
  transform: translateY(-1px);
}

.tag-delete-confirm-btn:active {
  transform: translateY(0);
}

/* ===== Mobile Responsive ===== */
@media (max-width: 640px) {
  .tag-manager-drawer {
    width: 100% !important;
    max-width: 100vw;
    border-radius: 0;
  }
  
  .tag-manager-item:hover {
    transform: none;
  }
  
  .tag-create-btn:hover:not(:disabled),
  .tag-sync-btn:hover,
  .tag-delete-confirm-btn:hover {
    transform: none;
  }
}

/* ===== Accessibility: Focus States ===== */
.tag-edit-save:focus-visible,
.tag-edit-cancel:focus-visible,
.tag-create-btn:focus-visible,
.tag-sync-btn:focus-visible,
.tag-delete-cancel-btn:focus-visible,
.tag-delete-confirm-btn:focus-visible {
  outline: 2px solid var(--brand-primary, #3B82F6);
  outline-offset: 2px;
}

/* ===== Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .tag-manager-item,
  .tag-color-swatch,
  .tag-create-btn,
  .tag-sync-btn,
  .tag-delete-confirm-btn {
    transition: none !important;
    animation: none !important;
  }
}
</style>
