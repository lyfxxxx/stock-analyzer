<template>
  <div class="stock-table-wrapper">
    <table class="stock-table">
      <thead>
        <tr>
          <th class="col-name" @click="toggleSort('name')">
            股票
            <span class="sort-icon" :class="{ active: sortKey === 'name' }">
              {{ sortKey === 'name' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('marketCap')">
            市值
            <span class="sort-icon" :class="{ active: sortKey === 'marketCap' }">
              {{ sortKey === 'marketCap' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('netCash')">净现金</th>
          <th class="col-number" @click="toggleSort('freeCashFlow')">FCF</th>
          <th class="col-number" @click="toggleSort('netProfit')">净利润</th>
          <th class="col-valuation" @click="toggleSort('valuation1')">
            估值1
            <span class="sort-icon" :class="{ active: sortKey === 'valuation1' }">
              {{ sortKey === 'valuation1' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-valuation" @click="toggleSort('valuation2')">估值2</th>
          <th class="col-number" @click="toggleSort('peRatio')">PE</th>
          <th class="col-number" @click="toggleSort('currentRatio')">流动比率</th>
          <th class="col-date">更新</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="stock in sortedStocks"
          :key="stock.id"
          class="table-row"
          :class="{ 'is-updating': updatingIds.has(stock.id) }"
          @click="$emit('click', stock)"
        >
          <td class="col-name">
            <div class="name-cell">
              <span class="stock-name">{{ stock.name }}</span>
              <div class="stock-meta">
                <span class="stock-code font-mono-nums">{{ stock.code }}</span>
                <span class="market-badge" :class="stock.market === 'HK' ? 'badge-hk' : 'badge-a'">
                  {{ stock.market }}
                </span>
              </div>
            </div>
          </td>
          <td class="col-number font-mono-nums">{{ formatYi(stock.marketCap) }}</td>
          <td class="col-number font-mono-nums">
            <span :class="stock.netCash >= 0 ? 'text-positive' : 'text-negative'">{{ formatYi(stock.netCash) }}</span>
          </td>
          <td class="col-number font-mono-nums">
            <span :class="stock.freeCashFlow >= 0 ? 'text-positive' : 'text-negative'">{{ formatYi(stock.freeCashFlow) }}</span>
            <span v-if="stock.freeCashFlowProjected" class="projected-badge">预</span>
          </td>
          <td class="col-number font-mono-nums">
            <span :class="stock.netProfit >= 0 ? 'text-positive' : 'text-negative'">{{ formatYi(stock.netProfit) }}</span>
            <span v-if="stock.netProfitProjected" class="projected-badge">预</span>
          </td>
          <td class="col-valuation">
            <span class="font-mono-nums" :class="getValClass(getVal1(stock))">
              <template v-if="getVal1(stock) !== null">{{ getVal1(stock)!.toFixed(2) }}</template>
              <template v-else><span class="na-text">N/A</span></template>
            </span>
          </td>
          <td class="col-valuation">
            <span class="font-mono-nums" :class="getValClass(getVal2(stock))">
              {{ getVal2(stock).toFixed(2) }}
            </span>
          </td>
          <td class="col-number font-mono-nums" :class="getPeClass(stock.peRatio)">
            <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(1) }}x</template>
            <template v-else><span class="na-text">N/A</span></template>
          </td>
          <td class="col-number font-mono-nums" :class="getCurrentRatioClass(stock.currentRatio)">
            <template v-if="stock.currentRatio !== null">{{ stock.currentRatio.toFixed(2) }}</template>
            <template v-else><span class="na-text">N/A</span></template>
          </td>
          <td class="col-date">{{ formatDate(stock.updatedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { formatYi, formatDate, getValuationClass } from '@/utils/formatters'

const props = defineProps<{
  stocks: StockData[]
  updatingIds: Set<string>
}>()

defineEmits<{
  (e: 'click', stock: StockData): void
}>()

const sortKey = ref<'name' | 'marketCap' | 'netCash' | 'freeCashFlow' | 'netProfit' | 'valuation1' | 'valuation2' | 'peRatio' | 'currentRatio'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedStocks = computed(() => {
  const arr = [...props.stocks]
  const key = sortKey.value
  const order = sortOrder.value
  const mult = order === 'asc' ? 1 : -1

  return arr.sort((a, b) => {
    let aVal: number | string = 0
    let bVal: number | string = 0

    if (key === 'name') { aVal = a.name; bVal = b.name }
    else if (key === 'marketCap') { aVal = a.marketCap; bVal = b.marketCap }
    else if (key === 'netCash') { aVal = a.netCash; bVal = b.netCash }
    else if (key === 'freeCashFlow') { aVal = a.freeCashFlow; bVal = b.freeCashFlow }
    else if (key === 'netProfit') { aVal = a.netProfit; bVal = b.netProfit }
    else if (key === 'valuation1') { aVal = a.valuation1 ?? 9999; bVal = b.valuation1 ?? 9999 }
    else if (key === 'valuation2') { aVal = a.valuation2; bVal = b.valuation2 }
    else if (key === 'peRatio') { aVal = a.peRatio ?? 9999; bVal = b.peRatio ?? 9999 }
    else if (key === 'currentRatio') { aVal = a.currentRatio ?? -9999; bVal = b.currentRatio ?? -9999 }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * mult
    }
    return ((aVal as number) - (bVal as number)) * mult
  })
})

function getVal1(stock: StockData): number | null {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    if (stock.freeCashFlow <= 0) return null
    return stock.marketCap / stock.freeCashFlow
  }
  return stock.valuation1
}

function getVal2(stock: StockData): number {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return stock.peRatio ?? stock.valuation2
  }
  return stock.valuation2
}

function getValClass(value: number | null): string {
  return getValuationClass(value)
}

function getPeClass(value: number | null): string {
  if (value === null) return 'metric-na'
  if (value < 12) return 'metric-low'
  if (value < 20) return 'metric-medium'
  return 'metric-high'
}

function getCurrentRatioClass(value: number | null): string {
  if (value === null) return 'metric-na'
  return value >= 1.5 ? 'metric-low' : 'metric-medium'
}
</script>

<style scoped>
.stock-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px);
  background-color: var(--bg-card);
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
  table-layout: fixed;
}

.stock-table th,
.stock-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  vertical-align: middle;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-table th {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.stock-table th:hover {
  color: var(--text-primary);
}

.sort-icon {
  font-size: 10px;
  opacity: 0.3;
  margin-left: 2px;
}

.sort-icon.active {
  opacity: 1;
  color: var(--brand-primary);
}

.stock-table td {
  color: var(--text-primary);
  transition: background-color var(--transition-fast);
}

.table-row {
  cursor: pointer;
}

.table-row:hover td {
  background-color: var(--bg-card-hover);
}

.table-row:last-child td {
  border-bottom: none;
}

.table-row.is-updating {
  opacity: 0.6;
  pointer-events: none;
}

/* Column widths - must be identical for th and td, all left aligned */
.col-name { 
  width: 150px; 
  text-align: left; 
  position: sticky;
  left: 0;
  z-index: 20;
  background-color: var(--bg-card);
}

.stock-table th.col-name {
  z-index: 30;
  background-color: var(--bg-secondary);
}

.table-row:hover .col-name {
  background-color: var(--bg-card-hover);
}

.col-number { width: 95px; text-align: left; }
.col-valuation { width: 80px; text-align: left; }
.col-date { width: 85px; text-align: left; font-size: 12px; }

/* Name cell */
.name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.stock-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.stock-code {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.market-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--radius-sm, 4px);
}

/* Valuation colors */
.val-low { color: var(--val-low) !important; }
.val-medium { color: var(--val-medium) !important; }
.val-high { color: var(--val-high) !important; }
.val-negative { color: var(--val-negative) !important; }
.val-na { color: var(--val-na) !important; }

/* Metric colors */
.metric-low { color: var(--val-low) !important; }
.metric-medium { color: var(--val-medium) !important; }
.metric-high { color: var(--val-high) !important; }
.metric-na { color: var(--text-muted) !important; }

.text-positive { color: var(--val-low) !important; }
.text-negative { color: var(--val-negative) !important; }

.na-text {
  color: var(--text-muted);
}

.projected-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  padding: 1px 4px;
  font-size: 9px;
  font-weight: 600;
  color: var(--projected-color);
  background-color: var(--projected-bg);
  border: 1px solid var(--projected-border);
  border-radius: var(--radius-sm, 4px);
}

@media (max-width: 1024px) {
  .stock-table {
    font-size: 12px;
  }

  .stock-table th,
  .stock-table td {
    padding: 10px 12px;
  }

  .col-name { width: 130px; }
  .col-number { width: 85px; }
  .col-valuation { width: 70px; }
  .col-date { width: 75px; }
}

@media (max-width: 768px) {
  .stock-table th,
  .stock-table td {
    padding: 8px 10px;
  }
}
</style>