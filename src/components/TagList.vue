<template>
  <div class="tag-list" @click.stop>
    <!-- Tag display area -->
    <div
      class="tag-display"
      :class="{ 'cursor-pointer': stockTags.length > 0 || showEmptyHint }"
      @click="handleClick"
    >
      <template v-if="stockTags.length > 0">
        <TagChip
          v-for="tag in displayedTags"
          :key="tag.id"
          :tag="tag"
          :size="size"
          :removable="!tag.isAuto && removable"
          :clickable="false"
          @remove="handleRemoveTag(tag)"
        />
        <span v-if="overflowCount > 0" class="tag-overflow">+{{ overflowCount }}</span>
      </template>
      <span v-else-if="showEmptyHint" class="tag-empty-hint">
        {{ emptyText }}
      </span>
    </div>

    <!-- Tag config popup (modal-style) -->
    <Teleport to="body">
      <Transition name="tag-popup">
        <div v-if="isOpen" class="tag-popup-overlay" @click="closePopup">
          <div class="tag-popup-panel" @click.stop>
            <!-- Header -->
            <div class="popup-header">
              <span class="popup-title">{{ stockName }} - 标签配置</span>
              <button class="popup-close" @click="closePopup" aria-label="关闭">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Loading state -->
            <div v-if="!initialized" class="popup-loading">
              <div class="spinner-sm"></div>
              <span>加载中...</span>
            </div>

            <template v-else>
              <!-- Auto tags section -->
              <div class="popup-section">
                <div class="section-label">自动标签</div>
                <div v-if="stockAutoTags.length > 0" class="tag-grid">
                  <TagChip
                    v-for="tag in stockAutoTags"
                    :key="tag.id"
                    :tag="tag"
                    size="sm"
                    :clickable="false"
                  />
                </div>
                <div v-else class="section-empty">暂无可用的自动标签</div>
              </div>

              <!-- Divider -->
              <div class="popup-divider"></div>

              <!-- Manual tags section -->
              <div class="popup-section">
                <div class="section-label">手动标签</div>
                <div v-if="allManualTags.length > 0" class="manual-tag-list">
                  <label
                    v-for="tag in allManualTags"
                    :key="tag.id"
                    class="manual-tag-option"
                    :class="{ 'is-selected': isManualTagSelected(tag.id) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isManualTagSelected(tag.id)"
                      class="tag-checkbox"
                      @change="toggleManualTag(tag.id)"
                    />
                    <TagChip :tag="tag" size="sm" :clickable="false" />
                  </label>
                </div>
                <div v-else class="section-empty">
                  暂无手动标签，请先在标签管理中创建
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import TagChip from './TagChip.vue'
import type { Tag } from '@/types/tag'

const props = withDefaults(defineProps<{
  stockId: string
  stockName?: string
  truncated?: boolean
  maxVisible?: number
  size?: 'sm' | 'md'
  removable?: boolean
  showEmptyHint?: boolean
  emptyText?: string
}>(), {
  stockName: '',
  truncated: false,
  maxVisible: 3,
  size: 'sm',
  removable: true,
  showEmptyHint: false,
  emptyText: '点击添加标签',
})

const emit = defineEmits<{
  (e: 'tagChanged'): void
}>()

// ── Store ──
const tagStore = useTagStore()
const initialized = ref(false)
const isOpen = ref(false)

// ── Computed ─
const stockTags = computed(() => {
  if (!initialized.value) return []
  return tagStore.getStockTags(props.stockId)
})

const displayedTags = computed(() => {
  if (!props.truncated) return stockTags.value
  return stockTags.value.slice(0, props.maxVisible)
})

const overflowCount = computed(() => {
  if (!props.truncated) return 0
  return Math.max(0, stockTags.value.length - props.maxVisible)
})

const stockAutoTags = computed(() =>
  stockTags.value.filter(t => t.isAuto)
)

const allManualTags = computed(() => {
  if (!initialized.value) return []
  return tagStore.manualTags
})

const selectedManualTagIds = computed(() =>
  stockTags.value.filter(t => !t.isAuto).map(t => t.id)
)

function isManualTagSelected(tagId: string): boolean {
  return selectedManualTagIds.value.includes(tagId)
}

// ── Actions ──
async function handleClick() {
  await openPopup()
}

async function openPopup() {
  if (!tagStore.initialized) {
    try {
      await tagStore.init()
    } catch {
      return
    }
  }
  initialized.value = true
  isOpen.value = true
}

function closePopup() {
  isOpen.value = false
}

async function toggleManualTag(tagId: string) {
  try {
    if (isManualTagSelected(tagId)) {
      await tagStore.removeTagFromStock(props.stockId, tagId)
    } else {
      await tagStore.addTagToStock(props.stockId, tagId)
    }
    emit('tagChanged')
  } catch {
    // Store handles logging
  }
}

async function handleRemoveTag(tag: Tag) {
  try {
    await tagStore.removeTagFromStock(props.stockId, tag.id)
    emit('tagChanged')
  } catch {
    // Store handles logging
  }
}

// Close on Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closePopup()
  }
}

// Initialize on mount to show tags immediately
onMounted(async () => {
  if (!tagStore.initialized) {
    try {
      await tagStore.init()
    } catch {
      // Store handles logging
    }
  }
  initialized.value = true
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.tag-list {
  display: inline-block;
}

.tag-display {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tag-display.cursor-pointer {
  cursor: pointer;
}

.tag-overflow {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.tag-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.6;
}

/* Popup overlay */
.tag-popup-overlay {
  position: fixed !important;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Popup panel */
.tag-popup-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

/* Header */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.popup-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.popup-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Loading */
.popup-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
}

/* Sections */
.popup-section {
  padding: 16px 20px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.section-empty {
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.7;
}

.popup-divider {
  height: 1px;
  background: var(--border-primary);
  margin: 0 20px;
}

/* Manual tag list */
.manual-tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.manual-tag-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.manual-tag-option:hover {
  background: var(--bg-secondary);
}

.manual-tag-option.is-selected {
  background: var(--bg-tertiary);
}

.tag-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--brand-primary);
}

/* Transitions */
.tag-popup-enter-active,
.tag-popup-leave-active {
  transition: opacity 0.2s ease;
}

.tag-popup-enter-from,
.tag-popup-leave-to {
  opacity: 0;
}

.tag-popup-enter-active .tag-popup-panel,
.tag-popup-leave-active .tag-popup-panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.tag-popup-enter-from .tag-popup-panel,
.tag-popup-leave-to .tag-popup-panel {
  transform: scale(0.95);
  opacity: 0;
}
</style>
