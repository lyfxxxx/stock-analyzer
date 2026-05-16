<template>
  <div class="detail-view">
    <div v-if="isThisStockUpdating" class="updating-overlay">
      <div class="spinner"></div>
      <p>正在更新财报数据...</p>
      <p class="update-hint">请稍候</p>
    </div>

    <!-- Sub-header -->
    <div v-if="!previewMode" class="sub-header">
      <div class="sub-header-inner">
        <button class="back-button" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          返回
        </button>
        <h1 v-if="stock" class="page-title">{{ stock.name }} <span class="page-code font-mono-nums">{{ stock.code }}</span></h1>
        <div class="sub-header-actions">
          <button class="action-btn update-btn" :disabled="isThisStockUpdating" @click="handleUpdateFinancialData">
            <span v-if="isThisStockUpdating" class="spinner-sm"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            更新财报
          </button>
        </div>
      </div>
    </div>

    <main v-if="stock" class="detail-content">
      <!-- Currency Selector -->
      <div class="currency-bar">
        <label>显示币种：</label>
        <select v-model="displayCurrency" class="currency-select">
          <option value="HKD">港元 (HK$)</option>
          <option value="CNY">人民币 (¥)</option>
          <option value="USD">美元 ($)</option>
        </select>
      </div>

      <!-- Overview Cards -->
      <div class="overview-grid">
        <div class="overview-card">
          <span class="card-label">当前市值</span>
          <span class="card-value font-mono-nums">{{ formatDisplayCurrency(stock.marketCap) }}</span>
        </div>
        <div class="overview-card">
          <span class="card-label">净现金</span>
          <span class="card-value font-mono-nums">{{ formatDisplayCurrency(stock.netCash) }}</span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.freeCashFlowProjected }">
          <span class="card-label">
            自由现金流
            <span v-if="stock.freeCashFlowProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="{ 'text-positive': stock.freeCashFlow > 0, 'text-negative': stock.freeCashFlow < 0 }">
            {{ formatDisplayCurrency(stock.freeCashFlow) }}
          </span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.netProfitProjected }">
          <span class="card-label">
            净利润
            <span v-if="stock.netProfitProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="{ 'text-positive': stock.netProfit > 0, 'text-negative': stock.netProfit < 0 }">
            {{ formatDisplayCurrency(stock.netProfit) }}
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            PE
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">PE = 市值 / 净利润</span>
            </span>
            <span v-if="stock.peRatioProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="getPeClass(stock.peRatio)">
            <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(1) }}x</template>
            <template v-else><span class="na-text">N/A</span></template>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            流动比率
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">流动比率 = 流动资产 / 流动负债</span>
            </span>
            <span v-if="stock.currentRatioProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="getCurrentRatioClass(stock.currentRatio)">
            <template v-if="stock.currentRatio !== null">{{ stock.currentRatio.toFixed(2) }}</template>
            <template v-else><span class="na-text">N/A</span></template>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            ROE
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">ROE = 净利润 / 股东权益</span>
            </span>
          </span>
          <span class="card-value font-mono-nums">
            <template v-if="stock.roe !== null && stock.roe !== undefined">{{ stock.roe.toFixed(1) }}%</template>
            <template v-else><span class="na-text">-</span></template>
            <span v-if="stock.roeProjected" class="projected-badge">预测</span>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            ROA
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">ROA = 净利润 / 资产总额</span>
            </span>
          </span>
          <span class="card-value font-mono-nums">
            <template v-if="stock.roa !== null && stock.roa !== undefined">{{ stock.roa.toFixed(1) }}%</template>
            <template v-else><span class="na-text">-</span></template>
            <span v-if="stock.roaProjected" class="projected-badge">预测</span>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            股息支付率
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">股息支付率 = 股息 / 净利润</span>
            </span>
          </span>
          <span class="card-value font-mono-nums">
            <template v-if="stock.dividendPayoutRatio !== null && stock.dividendPayoutRatio !== undefined">{{ (stock.dividendPayoutRatio > 1 ? stock.dividendPayoutRatio : stock.dividendPayoutRatio * 100).toFixed(1) }}%</template>
            <template v-else><span class="na-text">-</span></template>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            PB
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">PB = 市值 / 账面价值</span>
            </span>
          </span>
          <span class="card-value font-mono-nums">
            <template v-if="stock.pbRatio !== null && stock.pbRatio !== undefined">{{ stock.pbRatio.toFixed(2) }}x</template>
            <template v-else><span class="na-text">-</span></template>
          </span>
        </div>
      </div>

      <!-- Valuation Analysis -->
      <section class="section-card">
        <h2 class="section-title">估值分析</h2>
        <div class="valuation-grid">
          <div class="valuation-box" :class="[getValuationBgClass(getVal1()), { 'projected': stock.isUsingProjectedData }]">
            <div class="val-header">
              <span class="val-title">估值1 <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span></span>
              <span class="val-formula" v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                市值 / FCF <span class="method-note">(流动比率 &lt; 1.5)</span>
              </span>
              <span class="val-formula" v-else>
                (市值 - 净现金) / FCF <span class="method-note">(流动比率 ≥ 1.5)</span>
              </span>
            </div>
            <div class="val-result font-mono-nums" :class="getValuationClass(getVal1())">
              <template v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                <template v-if="stock.freeCashFlow > 0">{{ (stock.marketCap / stock.freeCashFlow).toFixed(2) }}</template>
                <template v-else>
                  <span class="na-text">N/A</span>
                  <span class="info-trigger" @click.stop>⇢<span class="info-text">自由现金流为负时不计算估值</span></span>
                </template>
              </template>
              <template v-else>
                <template v-if="stock.valuation1 !== null">{{ stock.valuation1.toFixed(2) }}</template>
                <template v-else>
                  <span class="na-text">N/A</span>
                  <span class="info-trigger" @click.stop>⇢<span class="info-text">自由现金流为负时不计算估值</span></span>
                </template>
              </template>
            </div>
          </div>
          <div class="valuation-box" :class="[getValuationBgClass(getVal2()), { 'projected': stock.isUsingProjectedData }]">
            <div class="val-header">
              <span class="val-title">估值2 <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span></span>
              <span class="val-formula" v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                PE = 市值 / 净利润 <span class="method-note">(流动比率 &lt; 1.5)</span>
              </span>
              <span class="val-formula" v-else>
                (市值 - 净现金) / 净利润 <span class="method-note">(流动比率 ≥ 1.5)</span>
              </span>
            </div>
            <div class="val-result font-mono-nums" :class="getValuationClass(getVal2())">
              <template v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(2) }}</template>
                <template v-else><span class="na-text">N/A</span></template>
              </template>
              <template v-else>{{ stock.valuation2.toFixed(2) }}</template>
            </div>
          </div>
          <!-- PRR Valuation Box -->
          <div class="valuation-box prr-box" :class="[getPrrValuationBgClass(prrValuationLevel), { 'projected': stock.isUsingProjectedData }]">
            <div class="val-header">
              <span class="val-title">PRR <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span></span>
              <span class="val-formula">{{ getPrrFormulaText(selectedPRRFormula) }}</span>
            </div>
            <div class="val-result font-mono-nums prr-value" :class="getPrrValuationTextClass(prrValuationLevel)" data-testid="detail-prr-value">
              <template v-if="currentPRRValue !== null">
                {{ formatPRR(currentPRRValue) }}
              </template>
              <template v-else>
                <span class="na-text">N/A</span>
              </template>
            </div>
            <div class="prr-valuation-text" :class="getPrrValuationTextClass(prrValuationLevel)">
              {{ getPrrValuationText(currentPRRValue, stock.market === 'A' ? 'A' : 'H') }}
            </div>
            <div class="prr-formula-detail">
              <span class="formula-name">{{ getPrrFormulaDescription(selectedPRRFormula) }}</span>
              <span class="formula-values">{{ getPrrFormulaWithValues(selectedPRRFormula, { peRatio: stock.peRatio ?? null, roe: stock.roe ?? null, pbRatio: stock.pbRatio ?? null, dividendPayoutRatio: stock.dividendPayoutRatio ?? null, roa: stock.roa ?? null }) }}</span>
            </div>
            <!-- PRR Formula Selection -->
            <div class="prr-formula-toggle">
              <button
                v-for="opt in prrFormulaOptions"
                :key="opt.type"
                class="formula-btn"
                :class="{ 'is-active': opt.type === selectedPRRFormula }"
                @click="selectPrrFormula(opt.type)"
                type="button"
              >
                <span class="formula-btn-content">
                  <span class="formula-name">{{ opt.name }}</span>
                  <span class="formula-value font-mono-nums">{{ opt.value !== null ? opt.value.toFixed(2) + 'PR' : '-' }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div class="valuation-note">
          <span class="note-icon">ⓘ</span>
          <span class="note-text">
            流动比率 ≥ 1.5：使用 (市值 - 净现金) 为基础计算，反映股东真实回报<br>
            流动比率 &lt; 1.5：使用 市值 为基础计算，反映整体企业价值<br><br>
            <strong>市赚率公式说明：</strong><br>
            基础：PR = PE / ROE — 衡量每单位盈利能力的价格<br>
            修正：PR = N × PE / ROE — N = 50 / 股息支付率，考虑分红政策修正<br>
            周期：PR = PB × 100 / ROE² — 适用于周期股，PE不可靠时使用<br>
            指数：PR = PE² / PB / 100 — 适用于指数基金和ETF<br>
            衍生：PR = PE / (k × ROA) — k = 历史ROE/ROA比率（默认1.5），适用于回购导致ROE失真
          </span>
        </div>
      </section>

      <!-- Target Price -->
      <section v-if="!previewMode" class="section-card">
        <h2 class="section-title">目标价</h2>
        <div v-if="targetPriceResult.error" class="target-price-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ targetPriceResult.error }}</span>
        </div>
        <div v-else-if="targetPriceResult.price !== null" class="target-price-result">
          <!-- Current stock price -->
          <div v-if="currentPrice !== null" class="current-price-row">
            <span class="price-label">当前价</span>
            <span class="price-value font-mono-nums">{{ currentPrice.toFixed(2) }}</span>
            <span class="target-price-unit">{{ targetPriceUnit }}</span>
          </div>

          <!-- Buy Target Price -->
          <div class="target-price-row">
            <div class="target-price-main">
              <div class="target-price-info">
                <span class="price-label buy">买入目标价</span>
                <span class="price-value font-mono-nums">{{ (targetPriceResult.buyPrice ?? targetPriceResult.price).toFixed(2) }}</span>
                <span class="target-price-unit">{{ targetPriceUnit }}</span>
              </div>
              <span v-if="currentPrice !== null && targetPriceResult.buyPrice !== null"
                    :class="targetPriceResult.buyPrice >= currentPrice ? 'text-positive' : 'text-negative'">
                {{ ((targetPriceResult.buyPrice - currentPrice) / currentPrice * 100).toFixed(1) }}%
              </span>
            </div>
            <!-- PRR Target Price Formula -->
            <template v-if="stock?.targetPriceMethod === 'prr'">
              <div class="target-price-formula">
                <span class="formula-label">PRR 目标价 = targetPR × ROE × 净利润 / 总股本</span>
                <span class="formula-multiplier">{{ (stock.prrTargetPriceConfig?.buyTargetPR ?? stock.prrTargetPriceConfig?.targetPR ?? 0).toFixed(1) }}PR</span>
              </div>
              <div class="target-price-note">
                <span class="note-icon">ⓘ</span>
                <span class="note-text">
                  目标市值 = {{ (stock.prrTargetPriceConfig?.buyTargetPR ?? stock.prrTargetPriceConfig?.targetPR ?? 0).toFixed(2) }}PR × {{ stock.roe?.toFixed(1) ?? '-' }}% × {{ formatYi(stock.netProfit) }} = {{ formatYi((targetPriceResult.buyPrice ?? targetPriceResult.price) * (stock.totalShares ?? 0)) }}
                </span>
              </div>
            </template>
            <!-- Traditional Target Price Formula -->
            <template v-else>
              <div class="target-price-formula">
                <span class="formula-label">{{ stock?.targetPriceConfig?.valuationType === 1 ? '现金流折现' : '市盈率' }} × {{ stock?.targetPriceConfig?.valuationType === 1 ? 'FCF' : '净利润' }}</span>
                <span class="formula-multiplier">{{ (stock?.targetPriceConfig?.buyTargetValuation ?? stock?.targetPriceConfig?.targetValuation)?.toFixed(1) }}x</span>
              </div>
              <div class="target-price-note">
                <span class="note-icon">ⓘ</span>
                <span class="note-text">
                  目标价 = 目标估值倍数 × {{ stock?.targetPriceConfig?.valuationType === 1 ? '自由现金流' : '净利润' }}
                  <template v-if="stock?.currentRatio === null || stock?.currentRatio >= 1.5"> + 净现金</template>
                  ÷ 总股本
                </span>
              </div>
            </template>
          </div>

          <!-- Sell Target Price (only if different from buy) -->
          <div v-if="targetPriceResult.sellPrice !== null && targetPriceResult.sellPrice !== (targetPriceResult.buyPrice ?? targetPriceResult.price)" class="target-price-row sell">
            <div class="target-price-main">
              <div class="target-price-info">
                <span class="price-label sell">卖出目标价</span>
                <span class="price-value font-mono-nums">{{ targetPriceResult.sellPrice.toFixed(2) }}</span>
                <span class="target-price-unit">{{ targetPriceUnit }}</span>
              </div>
              <span v-if="currentPrice !== null"
                    :class="targetPriceResult.sellPrice >= currentPrice ? 'text-positive' : 'text-negative'">
                {{ ((targetPriceResult.sellPrice - currentPrice) / currentPrice * 100).toFixed(1) }}%
              </span>
            </div>
            <!-- PRR Sell Formula -->
            <template v-if="stock?.targetPriceMethod === 'prr'">
              <div class="target-price-formula">
                <span class="formula-label">PRR 目标价 = targetPR × ROE × 净利润 / 总股本</span>
                <span class="formula-multiplier">{{ (stock.prrTargetPriceConfig?.sellTargetPR ?? stock.prrTargetPriceConfig?.targetPR ?? 0).toFixed(1) }}PR</span>
              </div>
            </template>
            <!-- Traditional Sell Formula -->
            <template v-else>
              <div class="target-price-formula">
                <span class="formula-label">{{ stock?.targetPriceConfig?.valuationType === 1 ? '现金流折现' : '市盈率' }} × {{ stock?.targetPriceConfig?.valuationType === 1 ? 'FCF' : '净利润' }}</span>
                <span class="formula-multiplier">{{ (stock?.targetPriceConfig?.sellTargetValuation ?? stock?.targetPriceConfig?.targetValuation)?.toFixed(1) }}x</span>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="target-price-unset">
          <span class="unset-text">未设置目标价</span>
        </div>
        <button class="config-target-btn" @click="openTargetPriceConfig">
          {{ targetPriceResult.price !== null ? '修改目标价' : '配置目标价' }}
        </button>
      </section>

      <!-- Charts -->
      <div class="charts-grid">
        <ValuationChart
          title="自由现金流趋势"
          :yearly-data="stock.yearlyData"
          data-type="freeCashFlow"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
          :source-currency="stock.baseCurrency"
        />
        <ValuationChart
          title="净利润趋势"
          :yearly-data="stock.yearlyData"
          data-type="netProfit"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
          :source-currency="stock.baseCurrency"
        />
        <RoeChart
          title="ROE趋势"
          :yearly-data="stock.yearlyData"
          :forecast-roe="stock.roeProjected ? stock.roe : null"
        />
        <DividendChart
          title="股息支付率趋势"
          :yearly-data="stock.yearlyData"
        />
      </div>

      <!-- Historical Data -->
      <section class="section-card">
        <div class="table-header">
          <h2 class="section-title">历史数据</h2>
          <button @click="toggleSortOrder" class="sort-btn">
            {{ sortOrder === 'asc' ? '从早到晚' : '从晚到早' }}
          </button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>年份</th>
                <th>自由现金流 ({{ currencyUnit }})</th>
                <th>净利润 ({{ currencyUnit }})</th>
                <th>ROE (%)</th>
                <th>ROA (%)</th>
                <th>股息支付率 (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="data in sortedYearlyData" :key="data.year">
                <td class="font-mono-nums">{{ data.year }}</td>
                <td class="font-mono-nums" :class="{ 'text-positive': data.freeCashFlow > 0, 'text-negative': data.freeCashFlow < 0 }">
                  {{ convertAndFormat(data.freeCashFlow) }}
                </td>
                <td class="font-mono-nums" :class="{ 'text-positive': data.netProfit > 0, 'text-negative': data.netProfit < 0 }">
                  {{ convertAndFormat(data.netProfit) }}
                </td>
                <td class="font-mono-nums">
                  <template v-if="data.roe !== null && data.roe !== undefined">{{ data.roe.toFixed(1) }}</template>
                  <template v-else>-</template>
                </td>
                <td class="font-mono-nums">
                  <template v-if="data.roa !== null && data.roa !== undefined">{{ data.roa.toFixed(1) }}</template>
                  <template v-else>-</template>
                </td>
                <td class="font-mono-nums">
                  <template v-if="data.dividendPayoutRatio !== null && data.dividendPayoutRatio !== undefined">{{ data.dividendPayoutRatio.toFixed(1) }}</template>
                  <template v-else>-</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Actions -->
      <div v-if="!previewMode" class="actions-section">
        <button @click="deleteStock" :disabled="deleting" class="delete-btn">
          {{ deleting ? '删除中...' : '删除此股票' }}
        </button>
      </div>
    </main>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="error-state">
      <p>未找到股票数据</p>
      <button @click="goBack" class="back-link">返回首页</button>
    </div>

    <!-- Target Price Config Modal -->
    <TargetPriceConfig
      v-if="stock && !previewMode"
      :stock-id="stock.id"
      v-model:visible="showTargetPriceConfig"
      :initial-config="stock.targetPriceConfig"
      :initial-prr-config="stock.prrTargetPriceConfig ?? null"
      @saved="onTargetPriceSaved"
    />


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { useStockListStore } from '@/stores/stockListStore'
import { fetchExchangeRates } from '@/api/exchangeRate'
import type { StockData } from '@/types/stock'
import type { PRRFormulaType } from '@/types/prr'
import ValuationChart from '@/components/ValuationChart.vue'
import TargetPriceConfig from '@/components/TargetPriceConfig.vue'
import RoeChart from '@/components/RoeChart.vue'
import DividendChart from '@/components/DividendChart.vue'

import { logger } from '@/utils/logger'
import { getValuationLevel, formatYi } from '@/utils/formatters'
import { formatPRR, getPrrValuationText, getPrrFormulaText, getPrrFormulaDescription, getPrrFormulaWithValues, getPrrValuationBgClass, getPrrValuationTextClass, getPrrValuationLevel } from '@/utils/prr-formatter'

const props = defineProps<{
  previewMode?: boolean
  previewData?: StockData | null
}>()

type CurrencyType = 'HKD' | 'CNY' | 'USD' | 'OTHER'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()
const stockListStore = useStockListStore()

const stock = ref<StockData | null>(props.previewData ?? null)
const loading = ref(!props.previewData)
const deleting = ref(false)
const displayCurrency = ref<CurrencyType>('HKD')
// Exchange rates based on HKD (API format): 1 HKD = X currency
const exchangeRates = ref<Record<string, number>>({ 
  HKD: 1, 
  USD: 0.127675,  // 1 HKD = 0.127675 USD
  CNY: 0.874297   // 1 HKD = 0.874297 CNY
})
const sortOrder = ref<'asc' | 'desc'>('desc')
const showTargetPriceConfig = ref(false)

const isThisStockUpdating = computed(() => {
  if (props.previewMode || !stock.value) return false
  return stockStore.currentlyUpdatingIds.has(stock.value.id)
})

// Target price
const targetPriceResult = computed(() => {
  if (props.previewMode || !stock.value) return { price: null as number | null, buyPrice: null as number | null, sellPrice: null as number | null, error: null as string | null }
  return stockStore.getTargetPrice(stock.value.id)
})

const currentPrice = computed(() => {
  if (!stock.value || !stock.value.totalShares || stock.value.totalShares === 0) return null
  return stock.value.marketCap / stock.value.totalShares
})

const targetPriceUnit = computed(() => {
  return stock.value?.market === 'A' ? '元' : '港元'
})

function openTargetPriceConfig() {
  showTargetPriceConfig.value = true
}

function onTargetPriceSaved() {
  if (props.previewMode || !stock.value) return
  // Refresh stock data after target price config is saved
  stockStore.getStockById(stock.value.id).then(updated => {
    if (updated) stock.value = updated
  })
}

// PRR valuation
const selectedPRRFormula = computed<PRRFormulaType>(() => {
  return stock.value?.prrSelectedFormula ?? 'base'
})

const currentPRRValue = computed(() => {
  if (!stock.value) return null
  const formula = selectedPRRFormula.value
  switch (formula) {
    case 'base': return stock.value.prrBase ?? null
    case 'adjusted': return stock.value.prrAdjusted ?? null
    case 'cycle': return stock.value.prrCycle ?? null
    case 'index': return stock.value.prrIndex ?? null
    case 'derived': return stock.value.prrDerived ?? null
    default: return null
  }
})

const prrValuationLevel = computed(() => {
  if (!stock.value) return 'unknown'
  const market = stock.value.market === 'A' ? 'A' : 'H'
  return getPrrValuationLevel(currentPRRValue.value, market)
})

const prrFormulaOptions = computed(() => {
  if (!stock.value) return []
  const formulas: PRRFormulaType[] = ['base', 'adjusted', 'cycle', 'index', 'derived']
  return formulas.map(formula => ({
    type: formula,
    name: getPrrFormulaDescription(formula),
    value: (() => {
      switch (formula) {
        case 'base': return stock.value?.prrBase ?? null
        case 'adjusted': return stock.value?.prrAdjusted ?? null
        case 'cycle': return stock.value?.prrCycle ?? null
        case 'index': return stock.value?.prrIndex ?? null
        case 'derived': return stock.value?.prrDerived ?? null
        default: return null
      }
    })()
  }))
})

async function selectPrrFormula(formula: PRRFormulaType) {
  if (props.previewMode || !stock.value) return
  try {
    await stockListStore.updatePrrFormula(stock.value.id, formula)
    // Refresh stock data
    const updated = await stockStore.getStockById(stock.value.id)
    if (updated) stock.value = updated
  } catch (e) {
    logger.error('StockDetailView', 'Failed to update PRR formula:', e)
  }
}

const sortedYearlyData = computed(() => {
  if (!stock.value) return []
  const data = [...stock.value.yearlyData]
  return sortOrder.value === 'asc'
    ? data.sort((a, b) => a.year - b.year)
    : data.sort((a, b) => b.year - a.year)
})

const currencyUnit = computed(() => {
  const symbols: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return symbols[displayCurrency.value] || symbols.OTHER
})

onMounted(async () => {
  // In preview mode with previewData, skip DB loading
  if (props.previewData) {
    displayCurrency.value = (props.previewData.baseCurrency as CurrencyType) || (props.previewData.market === 'A' ? 'CNY' : 'HKD')
    return
  }

  const id = route.params.id as string
  try {
    // Ensure stocks list is loaded for getTargetPrice() to work
    await stockStore.loadStocks()
    stock.value = await stockStore.getStockById(id)
    if (stock.value) {
      displayCurrency.value = (stock.value.baseCurrency as CurrencyType) || (stock.value.market === 'A' ? 'CNY' : 'HKD')
    }
    try {
      const result = await fetchExchangeRates()
      exchangeRates.value = result.rates
    } catch (e) {
      logger.error('StockDetailView', 'Failed to fetch exchange rates:', e)
    }
  } finally {
    loading.value = false
  }
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function convertCurrency(value: number, toCurrency: CurrencyType): number {
  const sourceCurrency = stock.value?.baseCurrency || 'HKD'
  // 由于汇率数据是以HKD为基准的，因此baseCurrency决定了换算的方式
  if (sourceCurrency === toCurrency) return value
  let rate;
  if (sourceCurrency === 'HKD') {
    rate = exchangeRates.value[toCurrency] || 1
  } else {
    // HKD --> 目标
    const hkd2target = exchangeRates.value[toCurrency] || 1
    // sourceCurrency --> HKD
    const src2hkd = 1 / (exchangeRates.value[sourceCurrency] || 1)
    rate = src2hkd * hkd2target
  }
  return value * rate
}

function formatDisplayCurrency(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value] || unitNames.OTHER}`
}

function convertAndFormat(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value] || unitNames.OTHER}`
}

function getVal1(): number | null {
  if (!stock.value) return null
  const s = stock.value
  if (s.currentRatio !== null && s.currentRatio < 1.5) {
    if (s.freeCashFlow <= 0) return null
    return s.marketCap / s.freeCashFlow
  }
  return s.valuation1
}

function getVal2(): number | null {
  if (!stock.value) return null
  const s = stock.value
  if (s.currentRatio !== null && s.currentRatio < 1.5) {
    return s.peRatio
  }
  return s.valuation2
}

function getValuationClass(value: number | null): string {
  if (value === null) return 'val-na'
  if (value < 0) return 'val-negative'
  if (value < 10) return 'val-low'
  if (value < 20) return 'val-medium'
  return 'val-high'
}

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

async function deleteStock() {
  if (!stock.value) return
  if (!confirm('确定要删除这只股票吗？此操作不可撤销。')) return
  deleting.value = true
  try {
    await stockStore.deleteStock(stock.value.id)
    router.push('/')
  } finally {
    deleting.value = false
  }
}

async function handleUpdateFinancialData() {
  if (!stock.value || isThisStockUpdating.value) return
  try {
    const updatedStock = await stockStore.updateStockWithRecalculation(stock.value.id)
    if (updatedStock) stock.value = updatedStock
  } catch (e) {
    logger.error('StockDetailView', 'Failed to update financial data:', e)
    alert('更新失败，请重试')
  }
}

function goBack() { router.push('/') }
</script>

<style scoped>
.detail-view { min-height: 100vh; background-color: var(--bg-primary); position: relative; }

/* Updating overlay */
.updating-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--bg-overlay); display: flex; flex-direction: column;
  align-items: center; justify-content: center; z-index: 9999; color: white; gap: 12px;
}
.spinner-sm {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
}
.update-hint { font-size: 14px; color: rgba(255,255,255,0.6); }

@keyframes spin { to { transform: rotate(360deg); } }

/* Sub-header */
.sub-header {
  background-color: var(--header-bg); border-bottom: 1px solid var(--header-border);
  box-shadow: var(--header-shadow); position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.sub-header-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; height: 52px; gap: 16px;
}
.back-button {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: var(--text-secondary); font-size: 14px; cursor: pointer;
  transition: color var(--transition-fast); padding: 0; font-family: var(--font-sans);
}
.back-button:hover { color: var(--text-primary); }
.page-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-code { font-size: 13px; color: var(--text-muted); font-weight: 400; }
.sub-header-actions { display: flex; gap: 8px; }

.action-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  font-size: 13px; font-weight: 500; border-radius: var(--radius-md, 6px);
  cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.update-btn {
  background-color: var(--brand-primary); color: white; border: none;
}
.update-btn:hover:not(:disabled) { background-color: var(--brand-primary-hover); }
.update-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Main content */
.detail-content {
  max-width: 1400px; margin: 0 auto; padding: 24px 24px 48px;
  display: flex; flex-direction: column; gap: 24px;
}

/* Currency bar */
.currency-bar {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
}
.currency-bar label { font-size: 14px; color: var(--text-secondary); }
.currency-select {
  padding: 6px 12px; background-color: var(--bg-input); border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px); font-size: 14px; color: var(--text-primary); cursor: pointer;
  font-family: var(--font-sans);
}
.currency-select:focus { outline: none; border-color: var(--brand-primary); }

/* Overview grid */
.overview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;
}
.overview-card {
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px); padding: 16px; display: flex; flex-direction: column; gap: 6px;
  transition: border-color var(--transition-base);
}
.overview-card.projected { border-color: var(--projected-border); background-color: var(--projected-bg); }
.card-label { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.card-value { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.na-text { color: var(--text-muted); }

.projected-badge {
  display: inline-flex; padding: 1px 6px; font-size: 10px; font-weight: 600;
  color: var(--projected-color); background-color: var(--projected-bg);
  border: 1px solid var(--projected-border); border-radius: var(--radius-sm, 4px); margin-left: 4px;
}

.info-trigger { position: relative; cursor: help; font-size: 12px; color: var(--text-muted); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.info-text {
  display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  background-color: var(--bg-card); color: var(--text-primary); padding: 6px 10px;
  border-radius: var(--radius-md, 6px); font-size: 12px; font-weight: normal; white-space: nowrap;
  box-shadow: var(--shadow-lg); border: 1px solid var(--border-secondary); z-index: 100;
}
.info-trigger:hover .info-text, .info-trigger:active .info-text { display: block; }

.text-positive { color: var(--val-low) !important; }
.text-negative { color: var(--val-negative) !important; }
.metric-low { color: var(--val-low) !important; }
.metric-medium { color: var(--val-medium) !important; }
.metric-high { color: var(--val-high) !important; }
.metric-na { color: var(--text-muted) !important; }

/* Valuation */
.val-low { color: var(--val-low) !important; }
.val-medium { color: var(--val-medium) !important; }
.val-high { color: var(--val-high) !important; }
.val-negative { color: var(--val-negative) !important; }
.val-na { color: var(--val-na) !important; }

/* Valuation background classes */
.valuation-box.val-low-bg { background-color: var(--val-low-bg) !important; }
.valuation-box.val-medium-bg { background-color: var(--val-medium-bg) !important; }
.valuation-box.val-high-bg { background-color: var(--val-high-bg) !important; }
.valuation-box.val-negative-bg { background-color: var(--val-negative-bg) !important; }
.valuation-box.val-na-bg { background-color: var(--val-na-bg) !important; }

.section-card {
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px); padding: 24px;
}
.section-title { margin: 0 0 20px 0; font-size: 17px; font-weight: 600; color: var(--text-primary); }

.valuation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.valuation-box {
  background-color: var(--bg-secondary); border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 10px); padding: 20px;
}
.valuation-box.projected { border-color: var(--projected-border); background-color: var(--projected-bg); }
.val-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.val-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.val-formula { font-size: 12px; color: var(--text-muted); }
.method-note { color: var(--brand-primary); font-size: 11px; margin-left: 4px; }
.val-result { font-size: 36px; font-weight: 700; }

/* PRR Valuation Box */
.prr-box { display: flex; flex-direction: column; gap: 8px; }
.prr-value { font-size: 42px; font-weight: 700; }
.prr-valuation-text { font-size: 16px; font-weight: 600; margin-top: -4px; }
.prr-formula-toggle {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}
.formula-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 52px;
  box-shadow: var(--shadow-xs);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.formula-btn:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--shadow-sm);
  background-color: var(--bg-card-hover);
}
.formula-btn.active {
  background-color: var(--brand-primary-light);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary), var(--shadow-sm);
}
.formula-btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}
.formula-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  transition: color var(--transition-fast);
  white-space: nowrap;
}
.formula-desc {
  font-size: 10px;
  color: var(--text-muted);
  transition: color var(--transition-fast);
  white-space: nowrap;
}
.formula-btn.active .formula-name {
  color: var(--brand-primary);
}
.formula-btn.active .formula-desc {
  color: var(--brand-primary);
  opacity: 0.7;
}
.formula-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
}
.formula-btn.active .formula-value {
  color: var(--brand-primary);
}

.valuation-note {
  margin-top: 12px; padding: 12px; background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px); display: flex; align-items: flex-start; gap: 8px;
}
.note-icon { color: var(--brand-primary); font-size: 14px; }
.note-text { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

/* Target Price */
.target-price-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-danger);
  font-size: 14px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px);
}

.target-price-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.target-price-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.target-price-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--brand-primary);
}

.target-price-unit {
  font-size: 16px;
  color: var(--text-muted);
}

/* Current price row at top */
.current-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, var(--bg-tertiary));
}

/* Target price block for buy/sell */
.target-price-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.target-price-row.sell {
  padding-top: 8px;
  border-top: 1px solid var(--border-color, var(--bg-tertiary));
}

/* Main row: label + price + diff */
.target-price-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.target-price-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

/* Reusable price label */
.price-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}
.price-label.buy {
  color: var(--val-low, #22c55e);
}
.price-label.sell {
  color: var(--val-negative, #ef4444);
}

/* Price value (current or target) */
.price-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.price-value + .target-price-unit {
  font-size: 14px;
}

.target-price-formula {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px);
}

.formula-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.formula-multiplier {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-primary);
}

.target-price-note {
  margin-top: 4px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.note-icon { color: var(--brand-primary); font-size: 14px; }
.note-text { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

.target-price-unset {
  padding: 24px;
  text-align: center;
}

.unset-text {
  font-size: 15px;
  color: var(--text-muted);
}

.config-target-btn {
  margin-top: 16px;
  padding: 10px 20px;
  background-color: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  font-family: var(--font-sans);
  min-height: 44px;
  min-width: 44px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.config-target-btn:hover {
  background-color: var(--brand-primary-hover);
}

/* Charts */
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }

/* Table */
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sort-btn {
  padding: 6px 12px; background-color: var(--bg-secondary); border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px); font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.sort-btn:hover { background-color: var(--brand-primary); color: white; border-color: var(--brand-primary); }

.data-table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-primary); }
.data-table th { font-weight: 600; color: var(--text-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { color: var(--text-primary); }
.data-table tr:hover td { background-color: var(--bg-card-hover); }

/* Delete */
.actions-section { display: flex; justify-content: center; padding-top: 16px; border-top: 1px solid var(--border-primary); }
.delete-btn {
  padding: 10px 24px; background: transparent; color: var(--color-danger-text);
  border: 1px solid var(--color-danger); border-radius: var(--radius-lg, 8px);
  font-size: 14px; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.delete-btn:hover:not(:disabled) { background-color: var(--color-danger); color: white; }
.delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading / Error */
.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100px 20px;
}
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--border-secondary);
  border-top-color: var(--brand-primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin-bottom: 16px;
}
.error-state p { color: var(--text-secondary); margin-bottom: 16px; }
.back-link {
  padding: 10px 20px; background-color: var(--brand-primary); color: white;
  border: none; border-radius: var(--radius-md, 6px); cursor: pointer; font-family: var(--font-sans);
}

@media (max-width: 768px) {
  .sub-header-inner { padding: 0 16px; height: 48px; }
  .page-title { font-size: 14px; }
  .update-btn .update-btn-text { display: none; }
  .detail-content { padding: 16px 16px 32px; gap: 16px; overflow-x: hidden; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .valuation-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .val-result { font-size: 28px; }
.target-price-value { font-size: 28px; }
.price-value { font-size: 20px; }
.target-price-display { flex-wrap: wrap; }
  .target-price-formula { flex-direction: column; gap: 6px; }
  .target-price-note { flex-direction: column; }
  .config-target-btn { width: 100%; justify-content: center; }
  .section-card { padding: 16px; }
  .section-title { font-size: 15px; margin-bottom: 16px; }
  .data-table-wrapper { overflow-x: auto; max-width: 100%; }
}
</style>