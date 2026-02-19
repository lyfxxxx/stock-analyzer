<template>
  <div class="stock-card" :class="{ 'updating': isUpdating }">
    <div class="card-header">
      <div class="stock-info">
        <h3 class="stock-name">{{ stock.name }}</h3>
        <span class="stock-code">{{ stock.code }}</span>
        <span class="market-badge" :class="stock.market">{{ stock.market }}</span>
      </div>
      <div class="card-actions">
        <button 
          v-if="isApiAvailable"
          class="action-btn refresh-btn"
          :disabled="isUpdating"
          :title="isUpdating ? '更新中...' : '更新市值'"
          @click.stop="handleUpdateMarketCap"
        >
          <span v-if="isUpdating" class="spinner-small"></span>
          <span v-else>↻</span>
        </button>
        <button 
          class="action-btn edit-btn"
          title="编辑"
          @click.stop="handleEdit"
        >
          ✎
        </button>
      </div>
    </div>
    
    <div class="card-body" @click="handleClick">
      <div class="market-cap">
        市值: {{ formatCurrency(stock.marketCap) }}
        <span class="base-currency">({{ stock.market === 'A' ? '亿人民币' : '亿港元' }})</span>
        <span v-if="stock.rateSource === 'fallback'" class="rate-warning">*</span>
      </div>
      
      <div class="valuation-row">
        <div class="valuation-item">
          <span class="label">估值1</span>
          <span class="value" :class="getValuationClass(stock.valuation1)">
            <template v-if="stock.valuation1 !== null">
              {{ stock.valuation1.toFixed(2) }}
            </template>
            <template v-else>
              <span class="na-value">N/A</span>
              <span class="tooltip-trigger">
                ⓘ
                <span class="tooltip-text">自由现金流为负时不计算估值</span>
              </span>
            </template>
          </span>
          <span class="formula-hint">(市值-净现金)/自由现金流</span>
        </div>
        <div class="valuation-item">
          <span class="label">估值2</span>
          <span class="value" :class="getValuationClass(stock.valuation2)">
            {{ stock.valuation2.toFixed(2) }}
          </span>
          <span class="formula-hint">(市值-净现金)/净利润</span>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <span class="update-time">
        更新于: {{ formatDate(stock.updatedAt) }}
      </span>
      <span class="arrow">→</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StockData } from '@/types/stock'

const props = defineProps<{
  stock: StockData
  isApiAvailable?: boolean
  updatingId?: string | null
}>()

const emit = defineEmits<{
  (e: 'click', stock: StockData): void
  (e: 'update-market-cap', stock: StockData): void
  (e: 'edit', stock: StockData): void
}>()

const isUpdating = computed(() => props.updatingId === props.stock.id)

function handleClick() {
  emit('click', props.stock)
}

function handleUpdateMarketCap() {
  if (!isUpdating.value) {
    emit('update-market-cap', props.stock)
  }
}

function handleEdit() {
  emit('edit', props.stock)
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万亿`
  }
  return `${value.toFixed(2)}亿`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getValuationClass(value: number | null): string {
  if (value === null) return 'na'
  if (value < 0) return 'negative'
  if (value < 12) return 'low'
  if (value < 20) return 'medium'
  return 'high'
}
</script>

<style scoped>
.stock-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stock-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.stock-code {
  font-size: 14px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
}

.market-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 4px;
  font-weight: 500;
  width: fit-content;
}

.market-badge.HK {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.market-badge.A {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.market-cap {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}

.refresh-btn {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.refresh-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-btn {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.edit-btn:hover {
  background: var(--accent-color);
  color: white;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stock-card.updating {
  opacity: 0.8;
}

.base-currency {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 2px;
}

.rate-warning {
  color: var(--warning-color);
  font-weight: bold;
  cursor: help;
}

.card-body {
  margin-bottom: 16px;
}

.valuation-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.valuation-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 13px;
  color: var(--text-secondary);
}

.value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.value.low {
  color: var(--success-color);
}

.value.medium {
  color: var(--primary-color);
}

.value.high {
  color: var(--danger-color);
}

.value.negative {
  color: #ef4444;
}

.formula-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.na-value {
  color: var(--text-muted);
}

.value.na {
  color: var(--text-muted);
}

.tooltip-trigger {
  margin-left: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: help;
  position: relative;
}

.tooltip-text {
  visibility: hidden;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: normal;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.tooltip-trigger:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.update-time {
  font-size: 12px;
  color: var(--text-muted);
}

.arrow {
  font-size: 18px;
  color: var(--primary-color);
  opacity: 0;
  transition: opacity 0.2s;
}

.stock-card:hover .arrow {
  opacity: 1;
}

@media (max-width: 640px) {
  .valuation-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .value {
    font-size: 20px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .market-cap {
    text-align: left;
  }
}
</style>
