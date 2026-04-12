/**
 * Format a number as currency in 亿元 units
 * @param value - Number in 亿元
 * @param currency - Currency type
 * @param decimals - Decimal places (default 2)
 */
export function formatCurrency(value: number, currency: 'HKD' | 'CNY' | 'USD' | 'OTHER' = 'HKD', decimals = 2): string {
  if (value == null || isNaN(value)) return 'N/A'
  const unitMap: Record<string, string> = {
    HKD: '亿港元',
    CNY: '亿人民币',
    USD: '亿美元',
    OTHER: '亿',
  }
  const unit = unitMap[currency] || '亿'

  if (value >= 10000) {
    return `${(value / 10000).toFixed(decimals)}万亿`
  }

  return `${value.toFixed(decimals)}${unit}`
}

/**
 * Format a number with comma separators
 */
export function formatNumber(value: number, decimals = 2): string {
  if (value == null || isNaN(value)) return 'N/A'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a large number in 亿 units with proper display
 */
export function formatYi(value: number, decimals = 2): string {
  if (value == null || isNaN(value)) return 'N/A'
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(decimals)}万亿`
  }
  return `${value.toFixed(decimals)}亿`
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number, decimals = 1): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a ratio value (e.g., current ratio, PE)
 */
export function formatRatio(value: number | null, decimals = 2): string {
  if (value == null) return 'N/A'
  return value.toFixed(decimals)
}

/**
 * Format a valuation value with color class
 */
export type ValuationLevel = 'low' | 'medium' | 'high' | 'negative' | 'na'

export function getValuationLevel(value: number | null, isCurrentRatioLow = false): ValuationLevel {
  if (value === null) return 'na'
  if (value < 0) return 'negative'
  if (value < 10) return 'low'
  if (value < 20) return 'medium'
  return 'high'
}

export function getValuationClass(value: number | null): string {
  return getValuationLevel(value)
}

/**
 * Format a date timestamp
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get the currency unit suffix
 */
export function getCurrencyUnit(currency: 'HKD' | 'CNY' | 'USD' | 'OTHER'): string {
  const units: Record<string, string> = {
    HKD: '亿港元',
    CNY: '亿人民币',
    USD: '亿美元',
    OTHER: '亿',
  }
  return units[currency] || '亿'
}