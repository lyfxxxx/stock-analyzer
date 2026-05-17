<template>
  <div ref="containerRef" class="tag-selector relative">
    <!-- Trigger: shows selected tags as chips -->
    <div
      class="tag-selector-trigger flex flex-wrap gap-1.5 items-center min-h-[38px] w-full px-3 py-1.5 rounded-lg border cursor-pointer transition-colors duration-150"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--border-hover)]',
        isOpen ? 'border-[var(--border-focus)] ring-2 ring-[var(--border-focus)]/20' : 'border-[var(--border-primary)]'
      ]"
      :style="{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-disabled="disabled"
      :tabindex="disabled ? -1 : 0"
      @click="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <TagChip
        v-for="tag in selectedTags"
        :key="tag.id"
        :tag="tag"
        size="sm"
        removable
        @remove="removeTag(tag)"
      />
      <span
        v-if="modelValue.length === 0 && !hasSelectedDisplay"
        class="text-sm"
        :style="{ color: 'var(--text-muted)' }"
      >
        {{ placeholder }}
      </span>
      <!-- Dropdown arrow -->
      <svg
        class="ml-auto shrink-0 w-4 h-4 transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
        :style="{ color: 'var(--text-muted)' }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- Dropdown panel -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="tag-selector-dropdown absolute left-0 right-0 mt-1 z-50 rounded-xl shadow-lg border overflow-hidden"
        :style="{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-lg)'
        }"
      >
        <!-- Search input -->
        <div class="p-2 border-b" :style="{ borderColor: 'var(--border-primary)' }">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="搜索标签..."
            class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
            :style="{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)',
            }"
            @click.stop
            @keydown.escape.prevent="closeDropdown"
          />
        </div>

        <!-- Tag list -->
        <div class="max-h-60 overflow-y-auto">
          <!-- Auto tags group -->
          <template v-if="filteredAutoTags.length > 0">
            <div
              class="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
              :style="{ color: 'var(--text-muted)' }"
            >
              自动标签
            </div>
            <div
              v-for="tag in filteredAutoTags"
              :key="tag.id"
              class="tag-option flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              :style="{ color: 'var(--text-primary)' }"
              @click="toggleTag(tag)"
            >
              <input
                type="checkbox"
                :checked="isSelected(tag.id)"
                class="rounded w-4 h-4 cursor-pointer accent-amber-500"
                @click.stop="toggleTag(tag)"
              />
              <TagChip :tag="tag" size="sm" :clickable="false" />
            </div>
          </template>

          <!-- Divider between groups -->
          <div
            v-if="filteredAutoTags.length > 0 && filteredManualTags.length > 0"
            class="mx-3 my-1 border-t"
            :style="{ borderColor: 'var(--border-primary)' }"
          ></div>

          <!-- Manual tags group -->
          <template v-if="filteredManualTags.length > 0">
            <div
              class="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
              :style="{ color: 'var(--text-muted)' }"
            >
              手动标签
            </div>
            <div
              v-for="tag in filteredManualTags"
              :key="tag.id"
              class="tag-option flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              :style="{ color: 'var(--text-primary)' }"
              @click="toggleTag(tag)"
            >
              <input
                type="checkbox"
                :checked="isSelected(tag.id)"
                class="rounded w-4 h-4 cursor-pointer accent-amber-500"
                @click.stop="toggleTag(tag)"
              />
              <TagChip :tag="tag" size="sm" :clickable="false" />
            </div>
          </template>

          <!-- Empty state -->
          <div
            v-if="filteredAutoTags.length === 0 && filteredManualTags.length === 0"
            class="px-3 py-6 text-sm text-center"
            :style="{ color: 'var(--text-muted)' }"
          >
            无匹配标签
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Tag } from '@/types/tag'
import TagChip from './TagChip.vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  availableTags: Tag[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '选择标签...',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

// ── State ──
const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

// ── Computed ──
const sortedTags = computed(() => {
  return [...props.availableTags].sort((a, b) => a.sortOrder - b.sortOrder)
})

const autoTags = computed(() => sortedTags.value.filter(t => t.isAuto))
const manualTags = computed(() => sortedTags.value.filter(t => !t.isAuto))

const filteredAutoTags = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return autoTags.value
  return autoTags.value.filter(t => t.name.toLowerCase().includes(q))
})

const filteredManualTags = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return manualTags.value
  return manualTags.value.filter(t => t.name.toLowerCase().includes(q))
})

const selectedTags = computed(() => {
  return props.availableTags.filter(t => props.modelValue.includes(t.id))
})

/** Whether there are selected chips displayed (to show/hide placeholder) */
const hasSelectedDisplay = computed(() => selectedTags.value.length > 0)

// ── Methods ──
function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    void nextTick(() => searchInputRef.value?.focus())
  } else {
    searchQuery.value = ''
  }
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function isSelected(tagId: string): boolean {
  return props.modelValue.includes(tagId)
}

function toggleTag(tag: Tag) {
  if (props.disabled) return
  const current = [...props.modelValue]
  const idx = current.indexOf(tag.id)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(tag.id)
  }
  emit('update:modelValue', current)
}

function removeTag(tag: Tag) {
  toggleTag(tag)
}

// ── Click outside handler ──
function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.tag-option:hover {
  background-color: var(--bg-tertiary);
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
