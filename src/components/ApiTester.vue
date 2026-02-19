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

    <div v-if="tested && !anyAvailable" class="api-warning">
      ⚠️ API不可用，将无法使用API获取模式
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ApiTestResult } from '@/types/stock'
import { testEastMoneyAPI } from '@/api/eastmoney'

const emit = defineEmits<{
  (e: 'update:available', value: boolean): void
}>()

const testing = ref(false)
const tested = ref(false)
const results = ref<ApiTestResult[]>([])

const anyAvailable = computed(() => 
  results.value.some(r => r.status === 'success')
)

async function testAPIs() {
  testing.value = true
  tested.value = true
  
  try {
    const eastMoneyResult = await testEastMoneyAPI()
    results.value = [eastMoneyResult]
    emit('update:available', anyAvailable.value)
  } catch (err) {
    console.error('API test error:', err)
  } finally {
    testing.value = false
  }
}

if (!tested.value) {
  testAPIs()
}
</script>

<style scoped>
.api-tester {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.api-tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.api-tester-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.test-button {
  padding: 8px 16px;
  background: var(--primary-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.test-button:hover:not(:disabled) {
  opacity: 0.9;
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.api-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 3px solid var(--border-color);
}

.api-result-item.success {
  border-left-color: var(--success-color);
}

.api-result-item.error {
  border-left-color: var(--danger-color);
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
  color: var(--success-color);
}

.error .status-icon {
  color: var(--danger-color);
}

.source-name {
  font-weight: 500;
  color: var(--text-primary);
}

.result-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message {
  font-size: 14px;
  color: var(--text-secondary);
}

.latency {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
}

.api-warning {
  margin-top: 12px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: var(--danger-color);
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
