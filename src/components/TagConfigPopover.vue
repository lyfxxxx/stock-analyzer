<template>
  <div ref="containerRef" class="relative inline-block">
    <!-- Trigger -->
    <div
      class="tag-config-trigger"
      @click="handleTriggerClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <slot />
    </div>

    <!-- Popover panel (absolute positioned, no Teleport) -->
    <Transition name="popover">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="tag-config-popover absolute left-0 z-50 mt-1 rounded-xl border shadow-lg overflow-hidden"
      >
        <!-- Loading state -->
        <div v-if="!initialized" class="px-4 py-6 text-sm text-center muted-text">
          加载中...
        </div>

        <template v-else>
          <!-- Auto tags section -->
          <div class="px-3 pt-3 pb-2">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wider muted-text">
              自动标签
            </div>
            <div v-if="stockAutoTags.length > 0" class="flex flex-wrap gap-1.5">
              <TagChip
                v-for="tag in stockAutoTags"
                :key="tag.id"
                :tag="tag"
                size="sm"
                :clickable="false"
              />
            </div>
            <div v-else class="text-xs muted-text">
              暂无可用的自动标签
            </div>
          </div>

          <!-- Divider -->
          <div class="mx-3 border-t divider-border"></div>

          <!-- Manual tags section -->
          <div class="px-3 pt-2 pb-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wider muted-text">
              手动标签
            </div>
            <div v-if="allManualTags.length > 0" class="space-y-0.5 max-h-56 overflow-y-auto">
              <label
                v-for="tag in allManualTags"
                :key="tag.id"
                class="tag-option flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150"
                :class="{ 'is-selected': isManualTagSelected(tag.id) }"
              >
                <input
                  type="checkbox"
                  :checked="isManualTagSelected(tag.id)"
                  class="rounded w-4 h-4 cursor-pointer"
                  @change="toggleManualTag(tag.id)"
                />
                <TagChip :tag="tag" size="sm" :clickable="false" />
              </label>
            </div>
            <div v-else class="text-xs muted-text">
              暂无手动标签，请先在标签管理中创建
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import TagChip from './TagChip.vue'

const props = withDefaults(defineProps<{
  stockId: string
  trigger?: 'click' | 'hover'
}>(), {
  trigger: 'click',
})

// ── Store ──
const tagStore = useTagStore()
const initialized = ref(false)

// ── Popover state ──
const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

// Hover delay timer
let hoverTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ──

/** Tags belonging to the current stock */
const stockTags = computed(() => {
  if (!initialized.value) return []
  return tagStore.getStockTags(props.stockId)
})

/** Auto tags for this stock (displayed as read-only chips) */
const stockAutoTags = computed(() =>
  stockTags.value.filter(t => t.isAuto)
)

/** All manual tags in the system (for selection) */
const allManualTags = computed(() => {
  if (!initialized.value) return []
  return tagStore.manualTags
})

/** Manual tag IDs that are currently selected for this stock */
const selectedManualTagIds = computed(() =>
  stockTags.value.filter(t => !t.isAuto).map(t => t.id)
)

function isManualTagSelected(tagId: string): boolean {
  return selectedManualTagIds.value.includes(tagId)
}

async function toggleManualTag(tagId: string) {
  try {
    if (isManualTagSelected(tagId)) {
      await tagStore.removeTagFromStock(props.stockId, tagId)
    } else {
      await tagStore.addTagToStock(props.stockId, tagId)
    }
  } catch {
    // Store handles logging
  }
}

// ── Trigger handling ──

function handleTriggerClick() {
  if (props.trigger !== 'click') return
  if (isOpen.value) {
    closePanel()
  } else {
    openPanel()
  }
}

function handleMouseEnter() {
  if (props.trigger !== 'hover') return
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    openPanel()
  }, 200)
}

function handleMouseLeave() {
  if (props.trigger !== 'hover') return
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    closePanel()
  }, 300)
}

async function openPanel() {
  // Ensure store is initialized
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

function closePanel() {
  isOpen.value = false
}

// ── Outside click / Escape ──

function handleDocumentClick(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node

  // Ignore clicks on the trigger or inside the panel
  if (containerRef.value?.contains(target)) return

  closePanel()
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closePanel()
  }
}

// ── Lifecycle ──

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('keydown', handleEscape)
  if (hoverTimer) clearTimeout(hoverTimer)
})
</script>

<style scoped>
.tag-config-popover {
  min-width: 240px;
  background-color: var(--bg-card);
  border-color: var(--border-primary);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
}

.muted-text {
  color: var(--text-muted);
}

.divider-border {
  border-color: var(--border-primary);
}

.tag-option:hover {
  background-color: var(--bg-tertiary);
}

.tag-option.is-selected {
  background-color: var(--brand-primary-light, rgba(217, 119, 6, 0.08));
}

/* Popover transition */
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
