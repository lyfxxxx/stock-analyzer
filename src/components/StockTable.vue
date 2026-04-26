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
          <th class="col-valuation" @click="toggleSort('valuation1')">
            估值1
            <span class="sort-icon" :class="{ active: sortKey === 'valuation1' }">
              {{ sortKey === 'valuation1' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-valuation" @click="toggleSort('valuation2')">
            估值2
            <span class="sort-icon" :class="{ active: sortKey === 'valuation2' }">
              {{ sortKey === 'valuation2' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-valuation" @click="toggleSort('prr')">
            PRR
            <span class="sort-icon" :class="{ active: sortKey === 'prr' }">
              {{ sortKey === 'prr' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('roe')">
            ROE
            <span class="sort-icon" :class="{ active: sortKey === 'roe' }">
              {{ sortKey === 'roe' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('roa')">
            ROA
            <span class="sort-icon" :class="{ active: sortKey === 'roa' }">
              {{ sortKey === 'roa' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('dividendPayoutRatio')">
            股息支付率
            <span class="sort-icon" :class="{ active: sortKey === 'dividendPayoutRatio' }">
              {{ sortKey === 'dividendPayoutRatio' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-number" @click="toggleSort('pbRatio')">
            PB
            <span class="sort-icon" :class="{ active: sortKey === 'pbRatio' }">
              {{ sortKey === 'pbRatio' && sortOrder === 'desc' ? '↓' : '↑' }}
            </span>
          </th>
          <th class="col-target-price">目标价</th>
          <th class="col-number">净现金</th>
          <th class="col-number">FCF</th>
          <th class="col-number">净利润</th>
          <th class="col-number">PE</th>
          <th class="col-number">流动比率</th>
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
          <td class="col-valuation">
            <div class="val-cell" :class="getValuationBgClass(getVal1(stock))">
              <span class="font-mono-nums val-text" :class="getValClass(getVal1(stock))">
                <template v-if="getVal1(stock) !== null">{{ getVal1(stock)!.toFixed(2) }}</template>
                <template v-else><span class="na-text">N/A</span></template>
              </span>
            </div>
          </td>
          <td class="col-valuation">
            <div class="val-cell" :class="getValuationBgClass(getVal2(stock))">
              <span class="font-mono-nums val-text" :class="getValClass(getVal2(stock))">
                <template v-if="getVal2(stock) !== null">{{ getVal2(stock)!.toFixed(2) }}</template>
                <template v-else><span class="na-text">N/A</span></template>
              </span>
            </div>
          </td>
          <td class="col-valuation" style="position: relative; overflow: visible;">
            <div class="val-cell" :class="getPrrBgClass(stock)" data-testid="prr-cell" @click.stop="togglePrrDropdown(stock.id)">
              <span class="font-mono-nums val-text" :class="getPrrTextClass(stock)">
                {{ getSelectedPrrDisplay(stock) }}
              </span>
            </div>
            <div v-if="prrDropdownStockId === stock.id" class="prr-dropdown" @click.stop>
              <button
                v-for="opt in prrFormulaOptions"
                :key="opt.value"
                class="prr-dropdown-item"
                :class="{ active: (stock.prrSelectedFormula ?? 'base') === opt.value }"
                @click="selectPrrFormula(stock.id, opt.value)"
                type="button"
              >
                <span class="prr-dropdown-label">{{ opt.label }}</span>
                <span class="prr-dropdown-expr">{{ opt.expr }}</span>
              </button>
            </div>
          </td>
          <td class="col-number font-mono-nums">
            <template v-if="stock.roe != null">{{ stock.roe.toFixed(2) }}%</template>
            <template v-else><span class="na-text">-</span></template>
            <span v-if="stock.roeProjected" class="projected-badge">预</span>
          </td>
          <td class="col-number font-mono-nums">
            <template v-if="stock.roa != null">{{ stock.roa.toFixed(2) }}%</template>
            <template v-else><span class="na-text">-</span></template>
            <span v-if="stock.roaProjected" class="projected-badge">预</span>
          </td>
          <td class="col-number font-mono-nums">
            <template v-if="stock.dividendPayoutRatio != null">{{ (stock.dividendPayoutRatio > 1 ? stock.dividendPayoutRatio : stock.dividendPayoutRatio * 100).toFixed(2) }}%</template>
            <template v-else><span class="na-text">-</span></template>
          </td>
          <td class="col-number font-mono-nums">
            <template v-if="stock.pbRatio != null">{{ stock.pbRatio.toFixed(2) }}</template>
            <template v-else><span class="na-text">-</span></template>
          </td>
          <td class="col-target-price" style="position: relative;">
            <div class="target-price-cell" @click.stop="onTargetPriceClick(stock)">
              <template v-if="getTargetPriceForStock(stock.id).error">
                <span class="tp-error">{{ getTargetPriceErrorText(getTargetPriceForStock(stock.id).error) }}</span>
              </template>
              <template v-else-if="getTargetPriceForStock(stock.id).price !== null">
                <span class="tp-price font-mono-nums">{{ getTargetPriceForStock(stock.id).price!.toFixed(2) }}</span>
                <span class="tp-unit">{{ stock.market === 'A' ? '元' : '港元' }}</span>
              </template>
              <template v-else>
                <span class="tp-unconfigured">未设置</span>
                <span class="tp-hint">点击配置</span>
              </template>
            </div>
            <div v-if="targetPriceMenuStockId === stock.id" class="tp-mini-menu" @click.stop>
              <div class="tp-mini-menu-item" @click="openTargetPriceConfig(stock.id)">配置目标价</div>
            </div>
          </td>
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
    <TargetPriceConfig
      v-if="editingTargetPriceId"
      :stock-id="editingTargetPriceId"
      :visible="editingTargetPriceId !== null"
      :initial-config="getInitialTargetPriceConfig(editingTargetPriceId)"
      :initial-prr-config="getInitialPrrTargetPriceConfig(editingTargetPriceId)"
      @saved="onTargetPriceSaved"
      @update:visible="(val: boolean) => { if (!val) editingTargetPriceId = null }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { StockData } from '@/types/stock'
import { formatYi, formatDate, getValuationClass, getValuationLevel } from '@/utils/formatters'
import { formatPRR, getPrrValuationLevel } from '@/utils/prr-formatter'
import { useStockListStore } from '@/stores/stockListStore'
import type { PRRFormulaType, PRRTargetPriceConfig } from '@/types/prr'
import TargetPriceConfig from './TargetPriceConfig.vue'

const props = defineProps<{
  stocks: StockData[]
  updatingIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'click', stock: StockData): void
  (e: 'config-target', stockId: string): void
}>()

const sortKey = ref<'name' | 'marketCap' | 'netCash' | 'freeCashFlow' | 'netProfit' | 'valuation1' | 'valuation2' | 'peRatio' | 'currentRatio' | 'prr' | 'roe' | 'roa' | 'dividendPayoutRatio' | 'pbRatio'>('name')
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
    else if (key === 'valuation1') { aVal = getVal1(a) ?? 9999; bVal = getVal1(b) ?? 9999 }
    else if (key === 'valuation2') { aVal = getVal2(a) ?? 9999; bVal = getVal2(b) ?? 9999 }
    else if (key === 'peRatio') { aVal = a.peRatio ?? 9999; bVal = b.peRatio ?? 9999 }
    else if (key === 'currentRatio') { aVal = a.currentRatio ?? -9999; bVal = b.currentRatio ?? -9999 }
    else if (key === 'prr') { aVal = getSelectedPrrValue(a) ?? 9999; bVal = getSelectedPrrValue(b) ?? 9999 }
    else if (key === 'roe') { aVal = a.roe ?? -9999; bVal = b.roe ?? -9999 }
    else if (key === 'roa') { aVal = a.roa ?? -9999; bVal = b.roa ?? -9999 }
    else if (key === 'dividendPayoutRatio') { aVal = a.dividendPayoutRatio ?? -9999; bVal = b.dividendPayoutRatio ?? -9999 }
    else if (key === 'pbRatio') { aVal = a.pbRatio ?? 9999; bVal = b.pbRatio ?? 9999 }

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

function getVal2(stock: StockData): number | null {
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

function getSelectedPrrValue(stock: StockData): number | null {
  switch (stock.prrSelectedFormula) {
    case 'base': return stock.prrBase ?? null
    case 'adjusted': return stock.prrAdjusted ?? null
    case 'cycle': return stock.prrCycle ?? null
    case 'index': return stock.prrIndex ?? null
    case 'derived': return stock.prrDerived ?? null
    default: return stock.prrBase ?? null
  }
}

function getSelectedPrrDisplay(stock: StockData): string {
  return formatPRR(getSelectedPrrValue(stock))
}

function getPrrBgClass(stock: StockData): string {
  const prrValue = getSelectedPrrValue(stock)
  const marketType = stock.market === 'HK' ? 'H' : 'A'
  const level = getPrrValuationLevel(prrValue, marketType)
  const bgClassMap: Record<string, string> = {
    low: 'val-low-bg',
    medium: 'val-medium-bg',
    high: 'val-high-bg',
    unknown: 'val-na-bg',
  }
  return bgClassMap[level] ?? ''
}

function getPrrTextClass(stock: StockData): string {
  const prrValue = getSelectedPrrValue(stock)
  const marketType = stock.market === 'HK' ? 'H' : 'A'
  const level = getPrrValuationLevel(prrValue, marketType)
  const textClassMap: Record<string, string> = {
    low: 'val-low',
    medium: 'val-medium',
    high: 'val-high',
    unknown: 'val-na',
  }
  return textClassMap[level] ?? ''
}

const stockListStore = useStockListStore()
const editingTargetPriceId = ref<string | null>(null)

function getValuationBgClass(value: number | null): string {
  const level = getValuationLevel(value)
  const bgClassMap: Record<string, string> = {
    low: 'val-low-bg',
    medium: 'val-medium-bg',
    high: 'val-high-bg',
    negative: 'val-negative-bg',
    na: 'val-na-bg',
  }
  return bgClassMap[level] ?? ''
}

function getTargetPriceForStock(id: string) {
  return stockListStore.getTargetPrice(id)
}

function getTargetPriceErrorText(error: string | null): string {
  if (!error) return ''
  const errorMap: Record<string, string> = {
    'SHARES_MISSING': '缺总股本',
    'SHARES_ZERO': '总股本为0',
    'METRIC_ZERO': '指标为0',
    'METRIC_NEGATIVE': '指标为负',
    'VALUATION_INVALID': '估值无效',
  }
  return errorMap[error] ?? '计算失败'
}

function getInitialTargetPriceConfig(id: string) {
  const stock = stockListStore.stocks.find(s => s.id === id)
  return stock?.targetPriceConfig ?? null
}

// PRR formula dropdown state
const prrDropdownStockId = ref<string | null>(null)
const prrFormulaOptions: Array<{ value: PRRFormulaType; label: string; expr: string }> = [
  { value: 'base', label: '基础', expr: 'PR = PE / ROE' },
  { value: 'adjusted', label: '修正', expr: 'PR = N × PE / ROE' },
  { value: 'cycle', label: '周期', expr: 'PR = PB × 100 / ROE²' },
  { value: 'index', label: '指数', expr: 'PR = PE² / PB / 100' },
  { value: 'derived', label: '衍生', expr: 'PR = PE / (k × ROA)' },
]

function togglePrrDropdown(stockId: string) {
  prrDropdownStockId.value = prrDropdownStockId.value === stockId ? null : stockId
}

async function selectPrrFormula(stockId: string, formula: PRRFormulaType) {
  prrDropdownStockId.value = null
  await stockListStore.updatePrrFormula(stockId, formula)
}

// Target price mini menu state
const targetPriceMenuStockId = ref<string | null>(null)

function onTargetPriceClick(stock: StockData) {
  targetPriceMenuStockId.value = stock.id
}

function openTargetPriceConfig(stockId: string) {
  targetPriceMenuStockId.value = null
  emit('config-target', stockId)
  editingTargetPriceId.value = stockId
}

function getInitialPrrTargetPriceConfig(id: string): PRRTargetPriceConfig | null {
  const stock = stockListStore.stocks.find(s => s.id === id)
  return stock?.prrTargetPriceConfig ?? null
}

function onTargetPriceSaved() {
  editingTargetPriceId.value = null
}

function onDocumentClick() {
  prrDropdownStockId.value = null
  targetPriceMenuStockId.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
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

.table-row:hover .col-target-price {
  background-color: transparent;
}

.table-row:hover .col-target-price .target-price-cell {
  background-color: var(--bg-tertiary);
}

.table-row:hover .col-name {
  background-color: var(--bg-card-hover);
}

.col-number { width: 95px; text-align: left; }
.col-valuation { width: 100px; text-align: left; }
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

/* Valuation cell with background pill */
.val-cell {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: var(--radius-md, 6px);
  min-width: 50px;
}

.val-cell.val-low-bg { background-color: var(--val-low-bg); }
.val-cell.val-medium-bg { background-color: var(--val-medium-bg); }
.val-cell.val-high-bg { background-color: var(--val-high-bg); }
.val-cell.val-negative-bg { background-color: var(--val-negative-bg); }
.val-cell.val-na-bg { background-color: var(--val-na-bg); }

.val-text.val-low { color: var(--val-low) !important; }
.val-text.val-medium { color: var(--val-medium) !important; }
.val-text.val-high { color: var(--val-high) !important; }
.val-text.val-negative { color: var(--val-negative) !important; }
.val-text.val-na { color: var(--val-na) !important; }

/* Target price column */
.col-target-price { width: 120px; text-align: left; }

.target-price-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--radius-md, 6px);
  transition: background-color var(--transition-fast);
  min-height: 24px;
  background-color: var(--bg-secondary);
}

.target-price-cell:hover {
  background-color: var(--bg-tertiary);
}

.tp-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-primary);
}

.tp-unit {
  font-size: 10px;
  color: var(--text-muted);
}

.tp-error {
  font-size: 11px;
  color: var(--color-danger);
}

.tp-unconfigured {
  font-size: 11px;
  color: var(--text-muted);
}

.tp-hint {
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.7;
  margin-left: 2px;
}

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

/* PRR Formula Dropdown */
.prr-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 100;
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  padding: 4px 0;
}

.prr-dropdown-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast);
  font-family: inherit;
}

.prr-dropdown-item:hover {
  background-color: var(--bg-secondary);
}

.prr-dropdown-item.active {
  background-color: var(--brand-primary-light);
}

.prr-dropdown-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.prr-dropdown-item.active .prr-dropdown-label {
  color: var(--brand-primary);
}

.prr-dropdown-expr {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono, monospace);
}

/* Target price mini menu */
.tp-mini-menu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 100;
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 150px;
  padding: 4px 0;
}

.tp-mini-menu-item {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
}

.tp-mini-menu-item:hover {
  background-color: var(--bg-secondary);
  color: var(--brand-primary);
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
  .col-valuation { width: 100px; }
  .col-date { width: 75px; }
  .col-target-price { width: 100px; }
  .val-cell { padding: 3px 6px; min-width: 45px; }
}

@media (max-width: 768px) {
  .stock-table th,
  .stock-table td {
    padding: 8px 10px;
  }
}
</style>