<template>
  <div class="view-toggle" role="radiogroup" aria-label="视图切换">
    <button
      class="toggle-btn"
      :class="{ active: modelValue === 'card' }"
      :aria-checked="modelValue === 'card'"
      role="radio"
      title="卡片视图"
      @click="$emit('update:modelValue', 'card')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
      </svg>
      <span class="toggle-label">卡片</span>
    </button>
    <button
      class="toggle-btn"
      :class="{ active: modelValue === 'table' }"
      :aria-checked="modelValue === 'table'"
      role="radio"
      title="表格视图"
      @click="$emit('update:modelValue', 'table')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
      <span class="toggle-label">表格</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'card' | 'table'
}>()

defineEmits<{
  (e: 'update:modelValue', value: 'card' | 'table'): void
}>()
</script>

<style scoped>
.view-toggle {
  display: inline-flex;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
  padding: 3px;
  gap: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-md, 6px);
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 150ms ease);
  font-family: var(--font-sans);
  white-space: nowrap;
}

.toggle-btn:hover {
  color: var(--text-secondary);
  background-color: var(--bg-tertiary);
}

.toggle-btn.active {
  background-color: var(--bg-card);
  color: var(--brand-primary);
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.04));
}

.toggle-btn:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: -2px;
}

@media (max-width: 640px) {
  .toggle-label {
    display: none;
  }

  .toggle-btn {
    padding: 6px 10px;
  }
}
</style>