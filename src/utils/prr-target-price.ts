/**
 * PRR-based target price calculation utility
 * Calculates target stock price using Price-to-Return-Ratio (PRR) method
 *
 * Formula: 目标市值 = targetPR × roe × netProfit
 *          目标价 = 目标市值 / totalShares
 */

export interface PRRTargetPriceParams {
  targetPR: number
  roe: number | null
  netProfit: number | null
  totalShares: number | null
}

export interface PRRTargetPriceResult {
  price: number | null
  error: PRRTargetPriceError | null
}

export type PRRTargetPriceError =
  | 'SHARES_MISSING'
  | 'SHARES_ZERO'
  | 'ROE_ZERO'
  | 'NETPROFIT_ZERO'
  | 'TARGET_PR_INVALID'

/**
 * Calculate target price based on PRR (Price-to-Return-Ratio) method
 *
 * @param params - Calculation parameters
 * @returns Result with price or error
 */
export function calculatePRRTargetPrice(
  params: PRRTargetPriceParams
): PRRTargetPriceResult {
  const { targetPR, roe, netProfit, totalShares } = params

  // Check shares first
  if (totalShares === null) {
    return { price: null, error: 'SHARES_MISSING' }
  }

  if (totalShares === 0) {
    return { price: null, error: 'SHARES_ZERO' }
  }

  // Check targetPR validity
  if (targetPR <= 0) {
    return { price: null, error: 'TARGET_PR_INVALID' }
  }

  // Check ROE
  if (roe === null || roe === 0) {
    return { price: null, error: 'ROE_ZERO' }
  }

  // Check netProfit
  if (netProfit === null || netProfit === 0) {
    return { price: null, error: 'NETPROFIT_ZERO' }
  }

  // Calculate: 目标市值 = targetPR × roe × netProfit
  const targetMarketValue = targetPR * roe * netProfit

  // Calculate: 目标价 = 目标市值 / totalShares
  const price = targetMarketValue / totalShares

  // Round to 2 decimal places
  return { price: Math.round(price * 100) / 100, error: null }
}
