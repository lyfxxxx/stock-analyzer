<template>
  <div class="tag-filter" ref="containerRef">
    <div class="filter-toolbar">
      <!-- Trigger Button -->
      <button
        class="filter-trigger"
        :class="{ active: selectedCount > 0 || isOpen }"
        @click="togglePanel"
        aria-haspopup="true"
        :aria-expanded="isOpen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>筛选</span>
        <span v-if="selectedCount > 0" class="filter-count">{{ selectedCount }}</span>
      </button>

      <!-- Active Tag Chips -->
      <TagChip
        v-for="tag in selectedTags"
        :key="tag.id"
        :tag="tag"
        size="sm"
        removable
        @remove="(t: Tag) => removeTag(t.id)"
      />
    </div>

    <!-- Dropdown Panel -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="filter-panel"
        :style="panelStyle"
        ref="panelRef"
        @click.stop
      >
        <!-- Header -->
        <div class="panel-header">
          <span class="panel-title">选择标签筛选</span>
          <button
            v-if="selectedCount > 0"
            class="clear-btn"
            @click="clearAll"
          >
            清除全部
          </button>
        </div>

        <!-- Auto Tags Group -->
        <div v-if="autoTags.length > 0" class="tag-group">
          <div class="group-label">自动标签</div>
          <div class="tag-grid">
            <button
              v-for="tag in autoTags"
              :key="tag.id"
              class="tag-chip-btn"
              :class="{ selected: isSelected(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              <TagChip :tag="tag" size="sm" :clickable="false" />
            </button>
          </div>
        </div>

        <!-- Manual Tags Group -->
        <div v-if="manualTags.length > 0" class="tag-group">
          <div class="group-label">手动标签</div>
          <div class="tag-grid">
            <button
              v-for="tag in manualTags"
              :key="tag.id"
              class="tag-chip-btn"
              :class="{ selected: isSelected(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              <TagChip :tag="tag" size="sm" :clickable="false" />
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="availableTags.length === 0" class="empty-tags">
          暂无标签
        </div>

        <!-- Footer Slot for StockPoolManager etc. -->
        <slot name="footer" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Tag } from '@/types/tag'
import TagChip from './TagChip.vue'

const props = defineProps<{
  availableTags: Tag[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const selectedCount = computed(() => props.modelValue.length)

const selectedTags = computed(() =>
  props.modelValue
    .map(id => props.availableTags.find(t => t.id === id))
    .filter((t): t is Tag => t !== undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder)
)

const autoTags = computed(() =>
  props.availableTags.filter(t => t.isAuto)
    .sort((a, b) => a.sortOrder - b.sortOrder)
)

const manualTags = computed(() =>
  props.availableTags.filter(t => !t.isAuto)
    .sort((a, b) => a.sortOrder - b.sortOrder)
)

function isSelected(tagId: string): boolean {
  return props.modelValue.includes(tagId)
}

function toggleTag(tagId: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(tagId)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(tagId)
  }
  emit('update:modelValue', current)
}

function removeTag(tagId: string) {
  emit('update:modelValue', props.modelValue.filter(id => id !== tagId))
}

function clearAll() {
  emit('update:modelValue', [])
}

function togglePanel() {
  if (isOpen.value) {
    closePanel()
  } else {
    openPanel()
  }
}

function openPanel() {
  if (isOpen.value) {
    // Already open - just reposition
    positionPanel()
    return
  }
  isOpen.value = true
  nextTick(() => positionPanel())
}

function closePanel() {
  isOpen.value = false
}

function positionPanel() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const isMobile = window.innerWidth <= 640

  if (isMobile) {
    // Mobile: full-width panel with fixed positioning
    panelStyle.value = {
      position: 'fixed',
      top: `${Math.max(8, rect.bottom + 4)}px`,
      left: '12px',
      right: '12px',
      width: 'auto',
      maxHeight: `${Math.min(400, window.innerHeight - rect.bottom - 16)}px`,
      zIndex: '999',
    }
  } else {
    // Desktop: fixed width panel positioned relative to trigger
    const panelWidth = 480
    let left = rect.left
    const rightOverflow = left + panelWidth - window.innerWidth + 16
    if (rightOverflow > 0) {
      left = Math.max(8, left - rightOverflow)
    }
    const maxHeight = Math.min(400, window.innerHeight - rect.bottom - 16)
    panelStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${left}px`,
      width: `${panelWidth}px`,
      maxHeight: `${Math.max(200, maxHeight)}px`,
      zIndex: '999',
    }
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  // Don't close if clicking inside the teleported panel
  if (panelRef.value && panelRef.value.contains(target)) return
  if (containerRef.value && !containerRef.value.contains(target)) {
    closePanel()
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closePanel()
  }
}

function handleScroll() {
  if (isOpen.value) {
    positionPanel()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('scroll', handleScroll, true)
})
</script>

<style scoped>
.tag-filter {
  position: relative;
  display: inline-flex;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* --- Trigger Button --- */
.filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-trigger:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.filter-trigger.active,
.filter-trigger.panel-open {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
  border-width: 1.5px;
  background-color: rgba(217, 119, 6, 0.12);
  box-shadow: 0 0 0 2px var(--brand-primary);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: var(--brand-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  line-height: 1;
}

/* --- Panel via Teleport --- */
.filter-panel {
  position: absolute;
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-top: 3px solid var(--brand-primary);
  border-radius: var(--radius-xl, 12px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 0;
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: 400px;
  overflow-y: auto;
  z-index: 9999;
  animation: panel-fade-in 0.2s ease-out;
}

@keyframes panel-fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl, 12px) var(--radius-xl, 12px) 0 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.clear-btn {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-md, 6px);
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  color: var(--color-danger);
  background-color: var(--color-danger-bg);
  border-color: var(--color-danger);
}

.tag-group {
  padding: 12px 16px;
}

.tag-group + .tag-group {
  border-top: 1px solid var(--border-primary);
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* --- Tag Grid in Dropdown --- */
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip-btn {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 2px solid transparent;
  background: none;
  cursor: pointer;
  border-radius: 9999px;
  transition: all var(--transition-fast);
}

.tag-chip-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.tag-chip-btn.selected {
  border-color: var(--brand-primary);
  background-color: rgba(217, 119, 6, 0.08);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
}

.tag-chip-btn.selected :deep(.tag-chip) {
  opacity: 1;
  font-weight: 700;
}

.empty-tags {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* Mobile: filter trigger label hidden, panel full-width with margin */
@media (max-width: 640px) {
  .filter-trigger > span:not(.filter-count) {
    display: none;
  }
  .filter-panel {
    width: calc(100vw - 24px);
    left: 12px !important;
    right: 12px !important;
    max-height: 60vh;
  }
}
</style>
