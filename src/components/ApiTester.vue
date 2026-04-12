<template>
  <div class="api-tester">
    <div class="api-tester-header">
      <h3>API连接测试</h3>
      <button 
        @click="testAPIs" 
        :disabled="testing"
        class="test-button"
        :class="{ 'loading': testing }"
      >
        <span v-if="testing">测试中...</span>
        <span v-else>测试连接</span>
      </button>
    </div>

    <div v-if="tested" class="api-results">
      <div 
        v-for="result in results" 
        :key="result.source"
        class="api-result-item"
        :class="result.status"
      >
        <div class="result-status">
          <span class="status-icon">
            {{ result.status === 'success' ? '✓' : '✗' }}
          </span>
          <span class="source-name">{{ result.source }}</span>
        </div>
        <div class="result-details">
          <span class="message">{{ result.message }}</span>
          <span v-if="result.latency" class="latency">{{ result.latency }}ms</span>
        </div>
      </div>
    </div>

    <div v-if="tested && !anyAvailable && !testing" class="api-warning">
      ⚠️ API不可用，将无法使用API获取模式
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStockStore } from '@/stores/stockStore'

const store = useStockStore()

const testing = computed(() => store.loading)
const tested = computed(() => store.apiTestResults.length > 0)
const results = computed(() => store.apiTestResults)
const anyAvailable = computed(() => store.isApiAvailable)

async function testAPIs() {
  await store.testAPIs()
}
</script>

<style scoped>
.api-tester {
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px);
  padding: var(--space-4, 16px);
  margin-bottom: var(--space-6, 24px);
}

.api-tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 16px);
}

.api-tester-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.test-button {
  padding: 6px 16px;
  background-color: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--transition-fast), background-color var(--transition-fast);
}

.test-button:hover:not(:disabled) {
  background-color: var(--brand-primary-hover);
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.api-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.api-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3, 12px);
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px);
  border-left: 3px solid var(--border-secondary);
}

.api-result-item.success {
  border-left-color: var(--color-success);
}

.api-result-item.error {
  border-left-color: var(--color-danger);
}

.result-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-weight: bold;
  font-size: 16px;
}

.success .status-icon {
  color: var(--color-success);
}

.error .status-icon {
  color: var(--color-danger);
}

.source-name {
  font-weight: 500;
  color: var(--text-primary);
}

.result-details {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
}

.message {
  font-size: 14px;
  color: var(--text-secondary);
}

.latency {
  font-size: 12px;
  color: var(--text-muted);
  background-color: var(--bg-primary);
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
}

.api-warning {
  margin-top: var(--space-3, 12px);
  padding: 10px;
  background-color: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md, 6px);
  color: var(--color-danger-text);
  font-size: 14px;
}

@media (max-width: 640px) {
  .api-result-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .result-details {
    width: 100%;
    justify-content: space-between;
  }
}
</style>