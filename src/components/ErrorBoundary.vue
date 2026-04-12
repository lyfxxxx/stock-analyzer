<script setup lang="ts">
import { ref } from 'vue'
import { onErrorCaptured } from 'vue'
import { logger } from '@/utils/logger'

const props = defineProps<{
  onError?: (error: Error) => void
}>()

const error = ref<Error | null>(null)
const key = ref(0)

onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  logger.error('ErrorBoundary', `Captured error in ${info}`, { error: err })
  props.onError?.(error.value)
  return false
})

function retry() {
  error.value = null
  key.value++
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <h3>出现错误</h3>
    <p class="error-message">{{ error.message }}</p>
    <button class="retry-btn" @click="retry">重试</button>
  </div>
  <slot v-else :key="key" />
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12, 48px) var(--space-6, 24px);
  margin: var(--space-8, 32px) auto;
  max-width: 480px;
  background-color: var(--bg-card);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-xl, 12px);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.error-icon {
  color: var(--color-danger);
  margin-bottom: var(--space-4, 16px);
}

h3 {
  margin: 0 0 var(--space-4, 16px);
  color: var(--color-danger-text);
  font-size: 1.25rem;
}

.error-message {
  margin: 0 0 var(--space-6, 24px);
  color: var(--text-secondary);
  font-size: 0.875rem;
  word-break: break-word;
}

.retry-btn {
  padding: 8px 24px;
  background-color: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.retry-btn:hover {
  background-color: var(--brand-primary-hover);
}
</style>