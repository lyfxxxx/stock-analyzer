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
    <div class="error-icon">⚠️</div>
    <h3>Something went wrong</h3>
    <p class="error-message">{{ error.message }}</p>
    <button class="retry-btn" @click="retry">Try Again</button>
  </div>
  <slot v-else :key="key" />
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg, 24px);
  margin: var(--spacing-lg, 24px) auto;
  max-width: 480px;
  background: var(--card-bg);
  border: 1px solid var(--danger-color);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md, 16px);
}

h3 {
  margin: 0 0 var(--spacing-md, 16px);
  color: var(--danger-color);
  font-size: 1.25rem;
}

.error-message {
  margin: 0 0 var(--spacing-lg, 24px);
  color: var(--text-secondary);
  font-size: 0.875rem;
  word-break: break-word;
}

.retry-btn {
  padding: 8px 24px;
  background: var(--primary-color);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md, 8px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.retry-btn:hover {
  opacity: 0.85;
}
</style>
