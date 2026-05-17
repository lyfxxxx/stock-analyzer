<template>
  <span
    class="tag-chip inline-flex items-center gap-1 select-none"
    :class="[
      size === 'sm' ? 'tag-chip-sm' : 'tag-chip-md',
      clickable
        ? 'cursor-pointer hover:opacity-80 transition-opacity duration-150'
        : 'cursor-default'
    ]"
    :style="{
      backgroundColor: tag.color + '1A',
      color: tag.color
    }"
    @click="handleClick"
  >
    <!-- Lock icon for auto tags -->
    <svg
      v-if="tag.isAuto"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="tag.color"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0 opacity-60"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
    <span class="truncate max-w-[120px]">{{ tag.name }}</span>
    <!-- Remove button -->
    <button
      v-if="removable"
      class="remove-btn ml-1 rounded-full p-0.5 hover:bg-black/15 active:bg-black/20 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--brand-primary)] group/btn"
      :style="{ color: tag.color }"
      :aria-label="`移除标签 ${tag.name}`"
      @click.stop="handleRemove"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-150 group-hover/btn:rotate-90">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </span>
</template>

<script setup lang="ts">
import type { Tag } from '@/types/tag'

const props = withDefaults(defineProps<{
  tag: Tag
  size?: 'sm' | 'md'
  removable?: boolean
  clickable?: boolean
}>(), {
  size: 'sm',
  removable: false,
  clickable: true,
})

const emit = defineEmits<{
  (e: 'click', tag: Tag): void
  (e: 'remove', tag: Tag): void
}>()

function handleClick() {
  if (props.clickable) {
    emit('click', props.tag)
  }
}

function handleRemove() {
  emit('remove', props.tag)
}
</script>

<style scoped>
.tag-chip {
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: var(--radius-sm, 6px);
  flex-shrink: 0;
  transition: opacity 150ms ease, transform 150ms ease;
}

.tag-chip:hover {
  opacity: 0.92;
}

.tag-chip:active {
  transform: scale(0.98);
}

.tag-chip-sm {
  font-size: 11px;
  padding: 3px 8px;
}

.tag-chip-md {
  font-size: 12px;
  padding: 4px 10px;
}

/* Remove button enhanced styling */
.remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  min-height: 16px;
  transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.remove-btn:hover {
  transform: scale(1.1);
}

.remove-btn:active {
  transform: scale(0.9);
}

/* Focus states for accessibility */
.remove-btn:focus-visible {
  outline: 2px solid var(--brand-primary, #3B82F6);
  outline-offset: 2px;
}
</style>
