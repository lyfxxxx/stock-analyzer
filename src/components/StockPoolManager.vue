<template>
  <div class="pool-manager">
    <!-- Header -->
    <div class="pool-manager-header">
      <span class="pool-manager-title">股票池</span>
      <button
        class="pool-save-btn"
        :disabled="currentTagIds.length === 0"
        :title="currentTagIds.length === 0 ? '请先选择标签' : '保存当前筛选条件'"
        @click="openSaveInput"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>保存筛选</span>
      </button>
    </div>

    <!-- Save Input -->
    <div v-if="showSaveInput" class="pool-save-form">
      <input
        ref="saveInputRef"
        v-model="poolNameInput"
        type="text"
        class="pool-name-input"
        placeholder="输入股票池名称…"
        maxlength="32"
        @keydown.enter="handleSavePool"
        @keydown.escape="handleCancelSave"
      />
      <div class="pool-save-actions">
        <button
          class="pool-btn-confirm"
          :disabled="!poolNameInput.trim() || isSaving"
          @click="handleSavePool"
        >
          {{ isSaving ? '保存中…' : '确认' }}
        </button>
        <button class="pool-btn-cancel" @click="handleCancelSave">
          取消
        </button>
      </div>
      <label class="pool-default-checkbox" :class="{ 'is-checked': saveAsDefault }">
        <input
          v-model="saveAsDefault"
          type="checkbox"
          class="sr-only"
        />
        <span class="pool-checkbox-icon">
          <svg v-if="saveAsDefault" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </span>
        <span>设为默认</span>
      </label>
    </div>

    <!-- Pool List -->
    <div v-if="sortedPools.length === 0 && !showSaveInput" class="pool-empty">
      <p>暂无保存的股票池</p>
      <p class="pool-empty-hint">选择标签后点击"保存筛选"创建</p>
    </div>

    <div v-else class="pool-list">
      <div
        v-for="pool in sortedPools"
        :key="pool.id"
        class="pool-item"
        :class="{ 'pool-item-active': isCurrentPool(pool) }"
      >
        <button
          class="pool-item-main"
          :title="`加载「${pool.name}」筛选条件`"
          @click="handleLoadPool(pool)"
        >
          <span class="pool-item-name">{{ pool.name }}</span>
          <span class="pool-item-meta">
            {{ pool.tagIds.length }} 个标签
            <template v-if="pool.isDefault">
              <span class="pool-default-badge">默认</span>
            </template>
          </span>
        </button>

        <div class="pool-item-actions">
          <button
            class="pool-action-btn"
            :class="{ 'pool-action-active': pool.isDefault }"
            :title="pool.isDefault ? '取消默认' : '设为默认'"
            @click="handleToggleDefault(pool)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="pool.isDefault ? 'var(--brand-primary)' : 'currentColor'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button
            class="pool-action-btn pool-action-danger"
            title="删除"
            @click="handleDeletePool(pool)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { TagPool } from '@/types/tag'
import { useTagStore } from '@/stores/tagStore'

const props = defineProps<{
  currentTagIds: string[]
  tagPools: TagPool[]
}>()

const emit = defineEmits<{
  (e: 'load-pool', tagIds: string[]): void
}>()

const tagStore = useTagStore()

// Save dialog state
const showSaveInput = ref(false)
const poolNameInput = ref('')
const saveAsDefault = ref(false)
const isSaving = ref(false)
const saveInputRef = ref<HTMLInputElement | null>(null)

/** 按 sortOrder 排序的股票池列表 */
const sortedPools = computed(() => {
  return [...props.tagPools].sort((a, b) => a.sortOrder - b.sortOrder)
})

/** 检查当前选中标签是否与该池匹配 */
function isCurrentPool(pool: TagPool): boolean {
  if (props.currentTagIds.length !== pool.tagIds.length) return false
  const current = new Set(props.currentTagIds)
  return pool.tagIds.every(id => current.has(id))
}

/** 打开保存输入框 */
function openSaveInput() {
  poolNameInput.value = ''
  saveAsDefault.value = false
  showSaveInput.value = true
  nextTick(() => {
    saveInputRef.value?.focus()
  })
}

/** 保存股票池 */
async function handleSavePool() {
  const name = poolNameInput.value.trim()
  if (!name || isSaving.value) return

  isSaving.value = true
  try {
    await tagStore.addTagPool(name, props.currentTagIds, saveAsDefault.value)
    showSaveInput.value = false
    poolNameInput.value = ''
    saveAsDefault.value = false
  } catch (err) {
    // Error logged by store
  } finally {
    isSaving.value = false
  }
}

/** 取消保存 */
function handleCancelSave() {
  showSaveInput.value = false
  poolNameInput.value = ''
  saveAsDefault.value = false
}

/** 加载股票池 */
function handleLoadPool(pool: TagPool) {
  emit('load-pool', pool.tagIds)
}

/** 切换默认状态 */
async function handleToggleDefault(pool: TagPool) {
  try {
    await tagStore.putTagPool({
      ...pool,
      isDefault: !pool.isDefault,
    })
  } catch (err) {
    // Error logged by store
  }
}

/** 删除股票池 */
async function handleDeletePool(pool: TagPool) {
  try {
    await tagStore.deleteTagPool(pool.id)
  } catch (err) {
    // Error logged by store
  }
}
</script>

<style scoped>
.pool-manager {
  border-top: 1px solid var(--border-primary);
  padding-top: 8px;
  margin-top: 8px;
}

/* Header */
.pool-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 2px;
}

.pool-manager-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pool-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand-primary);
  background: var(--brand-primary-light);
  border: 1px solid transparent;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: all 150ms ease;
  font-family: var(--font-sans);
  white-space: nowrap;
}

.pool-save-btn:hover:not(:disabled) {
  background: var(--brand-primary);
  color: var(--text-inverse);
}

.pool-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Save Form */
.pool-save-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md, 6px);
}

.pool-name-input {
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm, 4px);
  outline: none;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.pool-name-input:focus {
  border-color: var(--border-focus);
}

.pool-save-actions {
  display: flex;
  gap: 6px;
}

.pool-btn-confirm {
  flex: 1;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-inverse);
  background: var(--brand-primary);
  border: none;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: opacity 150ms ease;
  font-family: var(--font-sans);
}

.pool-btn-confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.pool-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pool-btn-cancel {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: all 150ms ease;
  font-family: var(--font-sans);
}

.pool-btn-cancel:hover {
  background: var(--bg-tertiary);
}

.pool-default-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.pool-default-checkbox.is-checked {
  color: var(--brand-primary);
}

.pool-checkbox-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border-secondary);
  border-radius: 3px;
  color: transparent;
  transition: all 150ms ease;
}

.pool-default-checkbox.is-checked .pool-checkbox-icon {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: white;
}

/* Empty State */
.pool-empty {
  text-align: center;
  padding: 16px 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.pool-empty-hint {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

/* Pool List */
.pool-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
  overflow-y: auto;
}

.pool-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--radius-md, 6px);
  transition: background 150ms ease;
}

.pool-item:hover {
  background: var(--bg-secondary);
}

.pool-item-active {
  background: var(--brand-primary-light);
}

.pool-item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
}

.pool-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.pool-item-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.pool-default-badge {
  display: inline-block;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--brand-primary);
  background: var(--brand-primary-light);
  border-radius: 3px;
  line-height: 1.4;
}

.pool-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.pool-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: all 150ms ease;
}

.pool-action-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.pool-action-btn.pool-action-active {
  color: var(--brand-primary);
}

.pool-action-danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
</style>
