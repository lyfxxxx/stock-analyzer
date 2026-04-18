/**
 * Target price calculation utility
 * Calculates target stock price based on valuation metrics
 */

export type TargetPriceError =
  | 'METRIC_ZERO'
  | 'METRIC_NEGATIVE'
  | 'SHARES_ZERO'
  | 'SHARES_MISSING'
  | 'VALUATION_INVALID'

export interface CalculateTargetPriceParams {
  targetValuation: number
  valuationType: 1 | 2
  freeCashFlow: number
  netProfit: number
  netCash: number
  totalShares: number | null
  currentRatio: number | null
}

export interface CalculateTargetPriceResult {
  price: number | null
  error: TargetPriceError | null
}

/**
 * Calculate target price based on valuation parameters
 *
 * Formula when currentRatio >= 1.5 or null:
 *   price = (targetValuation × metric + netCash) / totalShares
 *
 * Formula when currentRatio < 1.5:
 *   price = (targetValuation × metric) / totalShares (no netCash, simplified)
 *
 * @param params - Calculation parameters
 * @returns Result with price or error
 */
export function calculateTargetPrice(
  params: CalculateTargetPriceParams
): CalculateTargetPriceResult {
  const {
    targetValuation,
    valuationType,
    freeCashFlow,
    netProfit,
    netCash,
    totalShares,
    currentRatio
  } = params

  // Error handling order: shares first, then valuation, then metric

  // Check shares
  if (totalShares === null) {
    return { price: null, error: 'SHARES_MISSING' }
  }

  if (totalShares === 0) {
    return { price: null, error: 'SHARES_ZERO' }
  }

  // Check valuation
  if (targetValuation < 0.1) {
    return { price: null, error: 'VALUATION_INVALID' }
  }

  // Determine which metric to use based on valuationType
  const metric = valuationType === 1 ? freeCashFlow : netProfit

  // Check metric
  if (metric === 0) {
    return { price: null, error: 'METRIC_ZERO' }
  }

  if (metric < 0) {
    return { price: null, error: 'METRIC_NEGATIVE' }
  }

  // Calculate price
  // If currentRatio is < 1.5, use simplified formula (no netCash)
  const useSimplifiedFormula = currentRatio !== null && currentRatio < 1.5

  let price: number
  if (useSimplifiedFormula) {
    price = (targetValuation * metric) / totalShares
  } else {
    price = (targetValuation * metric + netCash) / totalShares
  }

  return { price, error: null }
}