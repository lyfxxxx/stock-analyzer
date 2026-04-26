/**
 * PRR (Price-to-Return Ratio) Valuation Formatting Utilities
 * Follows PRR methodology thresholds by market
 */

import type { PRRFormulaType } from '@/types/prr'

/**
 * Valuation level type
 */
export type PRRValuationLevel = 'low' | 'medium' | 'high' | 'unknown'

/**
 * Get PRR valuation level based on market-specific thresholds
 *
 * A-shares: <0.6 = low (undervalued), 0.6-1.0 = medium (fair), >1.0 = high (overvalued)
 * H-shares: <0.6 = low, 0.6-0.8 = medium, >0.8 = high
 * US: same as A-shares
 *
 * @param prr - PRR value (null returns 'unknown')
 * @param market - Market type ('A' | 'H' | 'US')
 * @returns Valuation level
 */
export function getPrrValuationLevel(
  prr: number | null,
  market: 'A' | 'H' | 'US'
): PRRValuationLevel {
  if (prr == null || isNaN(prr)) return 'unknown'

  switch (market) {
    case 'A':
    case 'US':
      // A-shares and US: <0.6 low, 0.6-1.0 medium, >1.0 high
      if (prr < 0.6) return 'low'
      if (prr <= 1.0) return 'medium'
      return 'high'

    case 'H':
      // H-shares: <0.6 low, 0.6-0.8 medium, >0.8 high
      if (prr < 0.6) return 'low'
      if (prr <= 0.8) return 'medium'
      return 'high'

    default:
      return 'unknown'
  }
}

/**
 * Get CSS class names for PRR valuation level - background
 * Uses existing CSS variables from theme.css
 *
 * @param level - Valuation level
 * @returns CSS class names with -bg suffix
 */
export function getPrrValuationBgClass(level: PRRValuationLevel): string {
  switch (level) {
    case 'low':
      return 'val-low-bg'
    case 'medium':
      return 'val-medium-bg'
    case 'high':
      return 'val-high-bg'
    case 'unknown':
    default:
      return 'val-na-bg'
  }
}

/**
 * Get CSS class names for PRR valuation level - text color
 * Uses existing CSS variables from theme.css
 *
 * @param level - Valuation level
 * @returns CSS class names without -bg suffix
 */
export function getPrrValuationTextClass(level: PRRValuationLevel): string {
  switch (level) {
    case 'low':
      return 'val-low'
    case 'medium':
      return 'val-medium'
    case 'high':
      return 'val-high'
    case 'unknown':
    default:
      return 'val-na'
  }
}

/**
 * Get Chinese valuation text for PRR
 *
 * @param prr - PRR value
 * @param market - Market type
 * @returns '低估' (undervalued), '合理' (fair), '高估' (overvalued), or '-'
 */
export function getPrrValuationText(
  prr: number | null,
  market: 'A' | 'H' | 'US'
): string {
  if (prr == null || isNaN(prr)) return '-'

  const level = getPrrValuationLevel(prr, market)

  switch (level) {
    case 'low':
      return '低估'
    case 'medium':
      return '合理'
    case 'high':
      return '高估'
    case 'unknown':
    default:
      return '-'
  }
}

/**
 * Format PRR value for display
 * Returns '-' for null/undefined/NaN values
 *
 * @param value - PRR value to format
 * @returns Formatted string like '0.52PR' or '-'
 */
export function formatPRR(value: number | null): string {
  if (value == null || isNaN(value)) return '-'
  return `${value.toFixed(2)}PR`
}

/**
 * Get PRR formula text (mathematical expression)
 *
 * @param formulaType - Type of PRR formula
 * @returns Formula text
 */
export function getPrrFormulaText(formulaType: PRRFormulaType): string {
  switch (formulaType) {
    case 'base':
      return 'PR = PE / ROE'
    case 'adjusted':
      return 'PR = N × PE / ROE'
    case 'cycle':
      return 'PR = PB × 100 / ROE²'
    case 'index':
      return 'PR = PE² / PB / 100'
    case 'derived':
      return 'PR = PE / (k × ROA)'
    default:
      return ''
  }
}

/**
 * Get PRR formula Chinese description
 *
 * @param formulaType - Type of PRR formula
 * @returns Chinese description
 */
export function getPrrFormulaDescription(formulaType: PRRFormulaType): string {
  switch (formulaType) {
    case 'base':
      return '基础市赚率'
    case 'adjusted':
      return '修正市赚率'
    case 'cycle':
      return '周期市赚率'
    case 'index':
      return '指数市赚率'
    case 'derived':
      return '衍生市赚率'
    default:
      return ''
  }
}

/**
 * Get detailed PRR formula explanation with term definitions
 * Explains what each variable means in the formula
 *
 * @param formulaType - Type of PRR formula
 * @returns Detailed explanation string
 */
export function getPrrFormulaExplanation(formulaType: PRRFormulaType): string {
  switch (formulaType) {
    case 'base':
      return 'PR = PE / ROE\nPE = 市盈率（股价/每股收益）\nROE = 净资产收益率（净利润/股东权益）\n基础市赚率衡量投资者为每单位盈利能力和回报支付的价格'
    case 'adjusted':
      return 'PR = N × PE / ROE\nN = 调整因子 = 50 / 股息支付率\n当股息支付率≠50%时，N用于修正偏差\n例如：股息支付率30% → N=50/30≈1.67\n股息支付率60% → N=50/60≈0.83\n该公式考虑了分红政策对估值的影响'
    case 'cycle':
      return 'PR = PB × 100 / ROE²\nPB = 市净率（股价/每股净资产）\nROE = 净资产收益率\n适用于周期股和困境企业，当PE不可靠时使用\n通过PB和ROE的平方关系评估企业价值'
    case 'index':
      return 'PR = PE² / PB / 100\nPE = 市盈率，PB = 市净率\n适用于指数基金和ETF\n当只有PE和PB数据时使用\n通过PE和PB的联合关系评估估值水平'
    case 'derived':
      return 'PR = PE / (k × ROA)\nk = 历史ROE/ROA比率（默认1.5）\nROA = 总资产收益率（净利润/总资产）\n适用于回购导致ROE失真的情况\n通过ROA推算真实ROE进行评估'
    default:
      return ''
  }
}

/**
 * Get PRR formula with actual stock values substituted
 *
 * @param formulaType - Type of PRR formula
 * @param params - Stock parameters
 * @returns Formula with values substituted
 */
export function getPrrFormulaWithValues(
  formulaType: PRRFormulaType,
  params: {
    peRatio: number | null
    roe: number | null
    pbRatio: number | null
    dividendPayoutRatio: number | null
    roa: number | null
  }
): string {
  const { peRatio, roe, pbRatio, dividendPayoutRatio, roa } = params

  // Normalize dividendPayoutRatio: decimal (<=1) → percentage number used by PRR calculator
  const normalizedDpr = dividendPayoutRatio !== null && dividendPayoutRatio <= 1
    ? dividendPayoutRatio * 100
    : dividendPayoutRatio

  const pe = peRatio !== null ? peRatio.toFixed(1) : '?'
  const r = roe !== null ? roe.toFixed(1) : '?'
  const pb = pbRatio !== null ? pbRatio.toFixed(2) : '?'
  const dpr = normalizedDpr !== null ? normalizedDpr.toFixed(1) : '?'
  const ra = roa !== null ? roa.toFixed(1) : '?'

  switch (formulaType) {
    case 'base':
      return `PR = ${pe} / ${r} = ${peRatio !== null && roe !== null && roe !== 0 ? (peRatio / roe).toFixed(2) : '?'}PR`
    case 'adjusted': {
      const n = normalizedDpr !== null && normalizedDpr > 0
        ? (50 / normalizedDpr).toFixed(2)
        : '?'
      return `N = 50 / ${dpr} = ${n}\nPR = ${n} × ${pe} / ${r} = ${peRatio !== null && roe !== null && normalizedDpr !== null && normalizedDpr > 0 && roe !== 0 ? ((50 / normalizedDpr) * peRatio / roe).toFixed(2) : '?'}PR`
    }
    case 'cycle':
      return `PR = ${pb} × 100 / ${r}² = ${pbRatio !== null && roe !== null && roe !== 0 ? (pbRatio * 100 / (roe * roe)).toFixed(2) : '?'}PR`
    case 'index':
      return `PR = ${pe}² / ${pb} / 100 = ${peRatio !== null && pbRatio !== null && pbRatio !== 0 ? (peRatio * peRatio / pbRatio / 100).toFixed(2) : '?'}PR`
    case 'derived':
      return `PR = ${pe} / (1.5 × ${ra}) = ${peRatio !== null && roa !== null && roa !== 0 ? (peRatio / (1.5 * roa)).toFixed(2) : '?'}PR`
    default:
      return ''
  }
}