/**
 * PRR (市赚率, Profit Ratio) Calculator
 *
 * Pure functions for calculating various PRR valuation metrics.
 * All values in 亿元 (hundred million yuan), ROE input as percentage.
 */

// ============================================
// Type Definitions
// ============================================

export interface PRRInputs {
  peRatio: number
  roe: number
  pbRatio?: number
  dividendPayoutRatio?: number
  roa?: number
  historicalRoeRoaRatio?: number
}

export interface PRRResult {
  basePR: number | null
  adjustmentFactor?: number | null
  adjustedPR?: number | null
  cyclePR?: number | null
  indexPR?: number | null
  derivedPR?: number | null
  valuationStatus: 'undervalued' | 'fair' | 'overvalued' | 'invalid'
  suggestion: 'buy' | 'hold' | 'sell' | 'avoid'
}

export interface YearlyROE {
  year: number
  roe: number
}

export interface PRRValidationResult {
  valid: boolean
  strength: 'strong' | 'weak' | 'invalid'
  message: string
}

// ============================================
// Core PRR Formulas
// ============================================

/**
 * Calculate base PRR (市赚率)
 * PR = PE / ROE
 *
 * @param pe - Price-to-Earnings ratio (multiplier)
 * @param roe - Return on Equity (percentage, e.g., 15 for 15%)
 * @returns PR value, or null if inputs invalid
 */
export function calculateBasePRR(pe: number | null, roe: number | null): number | null {
  if (pe === null || roe === null) return null
  if (roe <= 0) return null
  return pe / roe
}

/**
 * Calculate adjustment factor N
 * N = 50% / dividendPayoutRatio
 *
 * @param dividendPayoutRatio - Dividend payout ratio (percentage, e.g., 30 for 30%)
 * @returns Adjustment factor N, or null if dividendPayoutRatio <= 0
 */
export function calculateAdjustmentFactor(dividendPayoutRatio: number | null): number | null {
  if (dividendPayoutRatio === null) return null
  if (dividendPayoutRatio <= 0) return null
  return 50 / dividendPayoutRatio
}

/**
 * Calculate adjusted PRR (修正市赚率)
 * PR = N × PE / ROE
 *
 * @param pe - Price-to-Earnings ratio
 * @param roe - Return on Equity (percentage)
 * @param dividendPayoutRatio - Dividend payout ratio (percentage)
 * @returns Adjusted PR value, or null if inputs invalid
 */
export function calculateAdjustedPRR(
  pe: number | null,
  roe: number | null,
  dividendPayoutRatio: number | null
): number | null {
  if (pe === null || roe === null || dividendPayoutRatio === null) return null
  if (roe <= 0) return null
  if (dividendPayoutRatio <= 0) return null

  const n = calculateAdjustmentFactor(dividendPayoutRatio)
  if (n === null) return null

  return n * pe / roe
}

/**
 * Calculate cycle PRR (周期股市赚率)
 * PR = PB × 100 / ROE²
 *
 * Used for cyclical stocks and distressed companies where PE is unreliable.
 *
 * @param pb - Price-to-Book ratio
 * @param weightedAverageRoe - Weighted average ROE (percentage)
 * @returns Cycle PR value, or null if inputs invalid
 */
export function calculateCyclePRR(
  pb: number | null,
  weightedAverageRoe: number | null
): number | null {
  if (pb === null || weightedAverageRoe === null) return null
  if (pb <= 0) return null
  if (weightedAverageRoe <= 0) return null

  return pb * 100 / (weightedAverageRoe * weightedAverageRoe)
}

/**
 * Calculate index PRR (指数市赚率)
 * PR = PE² / PB / 100
 *
 * Used for index funds and ETFs when only PE and PB are available.
 *
 * @param pe - Price-to-Earnings ratio
 * @param pb - Price-to-Book ratio
 * @returns Index PR value, or null if inputs invalid
 */
export function calculateIndexPRR(pe: number | null, pb: number | null): number | null {
  if (pe === null || pb === null) return null
  if (pb <= 0) return null

  return (pe * pe) / pb / 100
}

/**
 * Calculate derived PRR (衍生市赚率)
 * PR = PE / (k × ROA)
 *
 * Used when buybacks cause ROE distortion.
 *
 * @param pe - Price-to-Earnings ratio
 * @param roa - Return on Assets (percentage)
 * @param historicalRoeRoaRatio - Historical ROE/ROA ratio (default 1.5)
 * @returns Derived PR value, or null if inputs invalid
 */
export function calculateDerivedPRR(
  pe: number | null,
  roa: number | null,
  historicalRoeRoaRatio: number = 1.5
): number | null {
  if (pe === null || roa === null) return null
  if (roa <= 0) return null

  const realROE = historicalRoeRoaRatio * roa
  if (realROE <= 0) return null

  return pe / realROE
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate ROE range for PRR effectiveness
 *
 * | ROE Range      | Effectiveness      |
 * |---------------|-------------------|
 * | 10% ~ 33%     | Strong           |
 * | 33% ~ 50%     | Weak             |
 * | > 50% or < 10%| Invalid          |
 *
 * @param roe - Return on Equity (percentage)
 * @returns Validation result with strength indicator
 */
export function validatePRRRange(roe: number): PRRValidationResult {
  if (roe >= 10 && roe <= 33) {
    return {
      valid: true,
      strength: 'strong',
      message: 'ROE 在强有效区间'
    }
  }
  if (roe > 33 && roe <= 50) {
    return {
      valid: true,
      strength: 'weak',
      message: 'ROE 在弱有效区间，需谨慎'
    }
  }
  if (roe > 50) {
    return {
      valid: false,
      strength: 'invalid',
      message: 'ROE 过高，市赚率可能失真'
    }
  }
  return {
    valid: false,
    strength: 'invalid',
    message: 'ROE 过低（<10%），市赚率失效'
  }
}

/**
 * Detect ROE distortion caused by buybacks
 *
 * When companies do large buybacks funded by debt, ROE increases artificially
 * because equity decreases. This function detects such distortion.
 *
 * @param roe - Return on Equity (percentage)
 * @param roa - Return on Assets (percentage)
 * @param threshold - ROE/ROA ratio threshold (default 2.0)
 * @returns true if ROE/ROA > threshold, indicating possible distortion
 */
export function detectROEDistortion(
  roe: number,
  roa: number | null,
  threshold: number = 2.0
): boolean {
  if (roa === null || roa <= 0) return false
  return roe / roa > threshold
}

/**
 * Calculate weighted average ROE with linear decreasing weights
 *
 * Newer years receive higher weights. Minimum 3 years required.
 * Weights: year1=1, year2=2, year3=3, ... (normalized by sum)
 *
 * @param roes - Array of yearly ROE data
 * @returns Weighted average ROE, or null if < 3 years or invalid data
 */
export function calculateWeightedAverageROE(roes: YearlyROE[] | null): number | null {
  if (roes === null || roes.length < 3) return null

  // Filter out invalid entries and sort by year (oldest first)
  const validRoes = roes
    .filter(r => r.roe !== null && r.roe > 0)
    .sort((a, b) => a.year - b.year)

  if (validRoes.length < 3) return null

  // Calculate weights: [1, 2, 3, ..., n] normalized by sum
  // sum = 1 + 2 + ... + n = n(n+1)/2
  const n = validRoes.length
  const weightSum = n * (n + 1) / 2

  // Calculate weighted average
  let weightedSum = 0
  for (let i = 0; i < n; i++) {
    const weight = (i + 1) / weightSum
    weightedSum += weight * validRoes[i]!.roe
  }

  return weightedSum
}

// ============================================
// Combined PRR Calculator
// ============================================

/**
 * Market-specific thresholds for PRR valuation
 */
interface PRRThresholds {
  buyThreshold: number
  sellThreshold: number
}

/**
 * Get default thresholds for a market
 */
function getDefaultThresholds(market: 'A' | 'H' | 'US'): PRRThresholds {
  const thresholds: Record<'A' | 'H' | 'US', PRRThresholds> = {
    A: { buyThreshold: 0.6, sellThreshold: 1.0 },
    H: { buyThreshold: 0.6, sellThreshold: 0.8 },
    US: { buyThreshold: 0.6, sellThreshold: 1.0 },
  }
  return thresholds[market]
}

/**
 * Calculate all PRR metrics for a stock
 *
 * @param inputs - PRR input parameters
 * @param market - Market type ('A' | 'H' | 'US')
 * @returns Complete PRR calculation result
 */
export function calculateAllPRR(inputs: PRRInputs, market: 'A' | 'H' | 'US'): PRRResult {
  const { peRatio, roe, pbRatio, dividendPayoutRatio, roa, historicalRoeRoaRatio } = inputs
  const thresholds = getDefaultThresholds(market)

  // 1. Calculate base PRR
  const basePR = calculateBasePRR(peRatio, roe)

  // 2. Validate ROE range
  const validity = validatePRRRange(roe)

  // 3. Calculate adjustment factor and adjusted PRR (if dividend data available)
  let adjustmentFactor: number | undefined
  let adjustedPR: number | undefined

  if (dividendPayoutRatio !== undefined && dividendPayoutRatio > 0) {
    adjustmentFactor = calculateAdjustmentFactor(dividendPayoutRatio) ?? undefined
    if (adjustmentFactor !== undefined) {
      adjustedPR = calculateAdjustedPRR(peRatio, roe, dividendPayoutRatio) ?? undefined
    }
  }

  // 4. Calculate cycle PRR (if PB and ROE available)
  let cyclePR: number | undefined
  if (pbRatio !== undefined && pbRatio > 0) {
    cyclePR = calculateCyclePRR(pbRatio, roe) ?? undefined
  }

  // 5. Calculate index PRR (if PE and PB available)
  let indexPR: number | undefined
  if (peRatio !== null && pbRatio !== undefined && pbRatio > 0) {
    indexPR = calculateIndexPRR(peRatio, pbRatio) ?? undefined
  }

  // 6. Calculate derived PRR (if ROA available)
  let derivedPR: number | undefined
  if (roa !== undefined && roa > 0) {
    derivedPR = calculateDerivedPRR(peRatio, roa, historicalRoeRoaRatio ?? 1.5) ?? undefined
  }

  // 7. Determine valuation status and suggestion
  // Use adjusted PR if available, otherwise base PR
  const effectivePR = adjustedPR ?? basePR

  let valuationStatus: PRRResult['valuationStatus']
  let suggestion: PRRResult['suggestion']

  if (!validity.valid || effectivePR === null) {
    valuationStatus = 'invalid'
    suggestion = 'avoid'
  } else if (effectivePR <= thresholds.buyThreshold) {
    valuationStatus = 'undervalued'
    suggestion = 'buy'
  } else if (effectivePR >= thresholds.sellThreshold) {
    valuationStatus = 'overvalued'
    suggestion = 'sell'
  } else {
    valuationStatus = 'fair'
    suggestion = 'hold'
  }

  return {
    basePR,
    adjustmentFactor,
    adjustedPR,
    cyclePR,
    indexPR,
    derivedPR,
    valuationStatus,
    suggestion
  }
}