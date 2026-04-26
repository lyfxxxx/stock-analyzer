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
  adjustedPR?: number | null
  adjustmentFactor?: number | null
  cyclePR?: number | null
  indexPR?: number | null
  derivedPR?: number | null
  valuationStatus: 'undervalued' | 'fair' | 'overvalued' | 'invalid'
  suggestion: 'buy' | 'hold' | 'sell' | 'avoid'
}

export type PRRFormulaType = 'base' | 'adjusted' | 'cycle' | 'index' | 'derived'

export interface PRRThresholds {
  buyThreshold: number
  sellThreshold: number
  market: 'A' | 'H' | 'US'
}

export interface PRRTargetPriceConfig {
  enabled: boolean
  formulaType: PRRFormulaType
  targetPR: number
}