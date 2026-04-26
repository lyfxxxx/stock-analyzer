import { describe, it, expect } from 'vitest'
import {
  calculateBasePRR,
  calculateAdjustmentFactor,
  calculateAdjustedPRR,
  calculateCyclePRR,
  calculateIndexPRR,
  calculateDerivedPRR,
  validatePRRRange,
  detectROEDistortion,
  calculateWeightedAverageROE,
  calculateAllPRR,
} from '../prr-calculator'
import type { PRRInputs, PRRResult } from '../prr-calculator'

describe('PRR Calculator', () => {
  // ============================================
  // 1. calculateBasePRR Tests
  // ============================================
  describe('calculateBasePRR', () => {
    it('should calculate PR correctly for Coca-Cola: PE=10, ROE=15% → PR ≈ 0.667', () => {
      const result = calculateBasePRR(10, 15)
      expect(result).toBeCloseTo(0.667, 2)
    })

    it('should return null when PE is null', () => {
      const result = calculateBasePRR(null as unknown as number, 15)
      expect(result).toBeNull()
    })

    it('should return null when ROE is null', () => {
      const result = calculateBasePRR(10, null as unknown as number)
      expect(result).toBeNull()
    })

    it('should return null when ROE is 0', () => {
      const result = calculateBasePRR(10, 0)
      expect(result).toBeNull()
    })

    it('should return null when ROE is negative', () => {
      const result = calculateBasePRR(10, -5)
      expect(result).toBeNull()
    })

    it('should handle negative PE by returning negative PR', () => {
      const result = calculateBasePRR(-10, 15)
      expect(result).toBeCloseTo(-0.667, 2)
    })
  })

  // ============================================
  // 2. calculateAdjustmentFactor Tests
  // ============================================
  describe('calculateAdjustmentFactor', () => {
    it('should return 1.0 when dividendPayoutRatio is 50%', () => {
      const result = calculateAdjustmentFactor(50)
      expect(result).toBeCloseTo(1.0, 2)
    })

    it('should return 1.25 when dividendPayoutRatio is 40%', () => {
      const result = calculateAdjustmentFactor(40)
      expect(result).toBeCloseTo(1.25, 2)
    })

    it('should return 1.67 (≈ 5/3) when dividendPayoutRatio is 30%', () => {
      const result = calculateAdjustmentFactor(30)
      expect(result).toBeCloseTo(1.667, 2)
    })

    it('should return 2.0 when dividendPayoutRatio is 25%', () => {
      const result = calculateAdjustmentFactor(25)
      expect(result).toBeCloseTo(2.0, 2)
    })

    it('should return null when dividendPayoutRatio is 0', () => {
      const result = calculateAdjustmentFactor(0)
      expect(result).toBeNull()
    })

    it('should return null when dividendPayoutRatio is negative', () => {
      const result = calculateAdjustmentFactor(-10)
      expect(result).toBeNull()
    })

    it('should return null when dividendPayoutRatio is <= 0', () => {
      const result = calculateAdjustmentFactor(-1)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // 3. calculateAdjustedPRR Tests
  // ============================================
  describe('calculateAdjustedPRR', () => {
    it('should calculate adjusted PR with 50% payout: PR = PE / ROE', () => {
      // N = 50% / 50% = 1.0, so adjusted PR = 1.0 * PE / ROE
      const result = calculateAdjustedPRR(10, 15, 50)
      expect(result).toBeCloseTo(0.667, 2)
    })

    it('should calculate adjusted PR with 30% payout: N = 1.67', () => {
      // N = 50% / 30% = 1.67, PR = 1.67 * 10 / 15 = 1.11
      const result = calculateAdjustedPRR(10, 15, 30)
      expect(result).toBeCloseTo(1.111, 2)
    })

    it('should return null when dividendPayoutRatio is 0', () => {
      const result = calculateAdjustedPRR(10, 15, 0)
      expect(result).toBeNull()
    })

    it('should return null when ROE is 0', () => {
      const result = calculateAdjustedPRR(10, 0, 30)
      expect(result).toBeNull()
    })

    it('should return null when ROE is null', () => {
      const result = calculateAdjustedPRR(10, null as unknown as number, 30)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // 4. calculateCyclePRR Tests
  // ============================================
  describe('calculateCyclePRR', () => {
    it('should calculate PR for PetroChina: PB=0.96, avgROE=15.88% → PR ≈ 0.38', () => {
      const result = calculateCyclePRR(0.96, 15.88)
      expect(result).toBeCloseTo(0.38, 1)
    })

    it('should return null when PB is 0', () => {
      const result = calculateCyclePRR(0, 15.88)
      expect(result).toBeNull()
    })

    it('should return null when PB is negative', () => {
      const result = calculateCyclePRR(-1, 15.88)
      expect(result).toBeNull()
    })

    it('should return null when ROE is 0', () => {
      const result = calculateCyclePRR(0.96, 0)
      expect(result).toBeNull()
    })

    it('should return null when ROE is null', () => {
      const result = calculateCyclePRR(0.96, null as unknown as number)
      expect(result).toBeNull()
    })

    it('should return null when ROE is negative', () => {
      const result = calculateCyclePRR(0.96, -5)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // 5. calculateIndexPRR Tests
  // ============================================
  describe('calculateIndexPRR', () => {
    it('should calculate PR = PE² / PB / 100', () => {
      // PE=20, PB=2 → PR = 400 / 2 / 100 = 2
      const result = calculateIndexPRR(20, 2)
      expect(result).toBeCloseTo(2.0, 2)
    })

    it('should return null when PE is null', () => {
      const result = calculateIndexPRR(null as unknown as number, 2)
      expect(result).toBeNull()
    })

    it('should return null when PB is 0', () => {
      const result = calculateIndexPRR(20, 0)
      expect(result).toBeNull()
    })

    it('should return null when PB is negative', () => {
      const result = calculateIndexPRR(20, -1)
      expect(result).toBeNull()
    })

    it('should return null when PB is null', () => {
      const result = calculateIndexPRR(20, null as unknown as number)
      expect(result).toBeNull()
    })

    it('should handle edge case of very high PE', () => {
      // PE=100, PB=2 → PR = 10000 / 2 / 100 = 50
      const result = calculateIndexPRR(100, 2)
      expect(result).toBeCloseTo(50, 2)
    })
  })

  // ============================================
  // 6. calculateDerivedPRR Tests
  // ============================================
  describe('calculateDerivedPRR', () => {
    it('should calculate derived PR for Apple: PE=27.48, ROA=?, k=1.5', () => {
      // Given historicalRoeRoaRatio = 1.5 (default)
      // derived PR = PE / (k × ROA)
      // If ROA = 8, realROE = 1.5 * 8 = 12, PR = 27.48 / 12 = 2.29
      const result = calculateDerivedPRR(27.48, 8, 1.5)
      expect(result).toBeCloseTo(2.29, 2)
    })

    it('should use default k=1.5 when historicalRoeRoaRatio not provided', () => {
      // PE=27.48, ROA=8, k=1.5 → PR = 27.48 / (1.5 * 8) = 27.48 / 12 = 2.29
      const result = calculateDerivedPRR(27.48, 8)
      expect(result).toBeCloseTo(2.29, 2)
    })

    it('should return null when PE is null', () => {
      const result = calculateDerivedPRR(null as unknown as number, 8)
      expect(result).toBeNull()
    })

    it('should return null when ROA is 0', () => {
      const result = calculateDerivedPRR(27.48, 0)
      expect(result).toBeNull()
    })

    it('should return null when ROA is null', () => {
      const result = calculateDerivedPRR(27.48, null as unknown as number)
      expect(result).toBeNull()
    })

    it('should return null when ROA is negative', () => {
      const result = calculateDerivedPRR(27.48, -5)
      expect(result).toBeNull()
    })

    it('should return null when k * ROA results in 0', () => {
      const result = calculateDerivedPRR(27.48, 0, 1.5)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // Helper: validatePRRRange Tests
  // ============================================
  describe('validatePRRRange', () => {
    it('should return strong for ROE 10-33%', () => {
      const result = validatePRRRange(15)
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should return strong for ROE = 10% (boundary)', () => {
      const result = validatePRRRange(10)
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should return strong for ROE = 33% (boundary)', () => {
      const result = validatePRRRange(33)
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should return weak for ROE 33-50%', () => {
      const result = validatePRRRange(40)
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('weak')
    })

    it('should return weak for ROE = 50% (boundary)', () => {
      const result = validatePRRRange(50)
      expect(result.valid).toBe(true)
      expect(result.strength).toBe('weak')
    })

    it('should return invalid for ROE < 10%', () => {
      const result = validatePRRRange(5)
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('invalid')
    })

    it('should return invalid for ROE > 50%', () => {
      const result = validatePRRRange(73.69)
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('invalid')
    })

    it('should return invalid for ROE = 0', () => {
      const result = validatePRRRange(0)
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('invalid')
    })

    it('should return invalid for negative ROE', () => {
      const result = validatePRRRange(-10)
      expect(result.valid).toBe(false)
      expect(result.strength).toBe('invalid')
    })
  })

  // ============================================
  // Helper: detectROEDistortion Tests
  // ============================================
  describe('detectROEDistortion', () => {
    it('should return true for Apple: ROE=73.69, ROA=8, threshold=2.0', () => {
      // 73.69 / 8 = 9.21 > 2.0 → true
      const result = detectROEDistortion(73.69, 8)
      expect(result).toBe(true)
    })

    it('should return true when roe/roa > threshold', () => {
      const result = detectROEDistortion(30, 10, 2.0)
      expect(result).toBe(true)
    })

    it('should return false when roe/roa = threshold', () => {
      const result = detectROEDistortion(20, 10, 2.0)
      expect(result).toBe(false)
    })

    it('should return false when roe/roa < threshold', () => {
      const result = detectROEDistortion(15, 10, 2.0)
      expect(result).toBe(false)
    })

    it('should return false when ROA is 0', () => {
      const result = detectROEDistortion(73.69, 0)
      expect(result).toBe(false)
    })

    it('should return false when ROA is null', () => {
      const result = detectROEDistortion(73.69, null as unknown as number)
      expect(result).toBe(false)
    })

    it('should return false when ROA is negative', () => {
      const result = detectROEDistortion(73.69, -5)
      expect(result).toBe(false)
    })

    it('should use custom threshold', () => {
      // 15 / 10 = 1.5, with threshold 1.0 → true
      const result = detectROEDistortion(15, 10, 1.0)
      expect(result).toBe(true)
    })
  })

  // ============================================
  // Helper: calculateWeightedAverageROE Tests
  // ============================================
  describe('calculateWeightedAverageROE', () => {
    it('should calculate weighted average for 3 years: [year1:10, year2:12, year3:15] → ~13.x', () => {
      // Linear decreasing weights: newer years get higher weights
      // weights: [1/6, 2/6, 3/6] for [year1, year2, year3] (if sorted oldest to newest)
      // But the function sorts by year, so oldest first: year1=10, year2=12, year3=15
      // weight for year1 (oldest) = 1, year2 = 2, year3 (newest) = 3
      // weighted sum = (1*10 + 2*12 + 3*15) / 6 = (10 + 24 + 45) / 6 = 79/6 = 13.167
      const roes = [
        { year: 2021, roe: 10 },
        { year: 2022, roe: 12 },
        { year: 2023, roe: 15 },
      ]
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeCloseTo(13.167, 1)
    })

    it('should return null when less than 3 years provided', () => {
      const roes = [
        { year: 2022, roe: 12 },
        { year: 2023, roe: 15 },
      ]
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeNull()
    })

    it('should return null when empty array', () => {
      const result = calculateWeightedAverageROE([])
      expect(result).toBeNull()
    })

    it('should return null when all ROEs are 0', () => {
      const roes = [
        { year: 2021, roe: 0 },
        { year: 2022, roe: 0 },
        { year: 2023, roe: 0 },
      ]
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeNull()
    })

    it('should handle unsorted years (reorders correctly)', () => {
      const roes = [
        { year: 2023, roe: 15 },
        { year: 2021, roe: 10 },
        { year: 2022, roe: 12 },
      ]
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeCloseTo(13.167, 1)
    })

    it('should handle 5 years of data', () => {
      const roes = [
        { year: 2019, roe: 10 },
        { year: 2020, roe: 12 },
        { year: 2021, roe: 14 },
        { year: 2022, roe: 16 },
        { year: 2023, roe: 18 },
      ]
      // weights: [1, 2, 3, 4, 5] / 15
      // sum = 1*10 + 2*12 + 3*14 + 4*16 + 5*18 = 10 + 24 + 42 + 64 + 90 = 230
      // avg = 230 / 15 = 15.333
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeCloseTo(15.333, 2)
    })

    it('should return null if any year has null ROE', () => {
      const roes = [
        { year: 2021, roe: 10 },
        { year: 2022, roe: null as unknown as number },
        { year: 2023, roe: 15 },
      ]
      const result = calculateWeightedAverageROE(roes)
      expect(result).toBeNull()
    })
  })

  // ============================================
  // Combined: calculateAllPRR Tests
  // ============================================
  describe('calculateAllPRR', () => {
    it('should calculate all PRR metrics for A-share stock', () => {
      const inputs: PRRInputs = {
        peRatio: 10,
        roe: 15,
        pbRatio: 1.5,
        dividendPayoutRatio: 30,
        roa: 8,
        historicalRoeRoaRatio: 1.5,
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.basePR).toBeCloseTo(0.667, 2)
      expect(result.adjustmentFactor).toBeCloseTo(1.667, 2)
      expect(result.adjustedPR).toBeCloseTo(1.111, 2)
      expect(result.cyclePR).toBeCloseTo(0.667, 2)
      expect(result.indexPR).toBeCloseTo(0.667, 2)
      // derivedPR is now always calculated when ROA is available
      // PR = PE / (k × ROA) = 10 / (1.5 × 8) = 0.833
      expect(result.derivedPR).toBeCloseTo(0.833, 2)
      // adjustedPR = 1.111 > 1.0 (A sell threshold) → overvalued
      expect(result.valuationStatus).toBe('overvalued')
      expect(result.suggestion).toBe('sell')
    })

    it('should calculate all PRR metrics for H-share stock', () => {
      const inputs: PRRInputs = {
        peRatio: 8,
        roe: 12,
        dividendPayoutRatio: 40,
      }
      const result = calculateAllPRR(inputs, 'H')

      expect(result.basePR).toBeCloseTo(0.667, 2)
      expect(result.adjustmentFactor).toBeCloseTo(1.25, 2)
      expect(result.adjustedPR).toBeCloseTo(0.833, 2)
      // 0.833 > 0.8 (H sell threshold) → overvalued
      expect(result.valuationStatus).toBe('overvalued')
      expect(result.suggestion).toBe('sell')
    })

    it('should calculate all PRR metrics for US stock', () => {
      const inputs: PRRInputs = {
        peRatio: 25,
        roe: 20,
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'US')

      expect(result.basePR).toBeCloseTo(1.25, 2)
      expect(result.adjustmentFactor).toBeCloseTo(1.0, 2)
      expect(result.adjustedPR).toBeCloseTo(1.25, 2)
      expect(result.valuationStatus).toBe('overvalued')
      expect(result.suggestion).toBe('sell')
    })

    it('should handle fair valuation status', () => {
      const inputs: PRRInputs = {
        peRatio: 15,
        roe: 20,
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'A')
      // PR = 15 / 20 = 0.75
      expect(result.basePR).toBeCloseTo(0.75, 2)
      expect(result.valuationStatus).toBe('fair')
      expect(result.suggestion).toBe('hold')
    })

    it('should return invalid status for ROE < 10%', () => {
      const inputs: PRRInputs = {
        peRatio: 10,
        roe: 5,
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.valuationStatus).toBe('invalid')
      expect(result.suggestion).toBe('avoid')
    })

    it('should return invalid status for ROE > 50%', () => {
      const inputs: PRRInputs = {
        peRatio: 10,
        roe: 73.69,
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.valuationStatus).toBe('invalid')
      expect(result.suggestion).toBe('avoid')
    })

    it('should handle missing optional fields gracefully', () => {
      const inputs: PRRInputs = {
        peRatio: 10,
        roe: 15,
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.basePR).toBeCloseTo(0.667, 2)
      expect(result.adjustedPR).toBeUndefined()
      expect(result.adjustmentFactor).toBeUndefined()
      expect(result.cyclePR).toBeUndefined()
      expect(result.derivedPR).toBeUndefined()
      // PR = 0.667, A-buy = 0.6, so 0.667 > 0.6 → fair
      expect(result.valuationStatus).toBe('fair')
    })

it('should use H-share thresholds (sell at 0.8)', () => {
      const inputs: PRRInputs = {
        peRatio: 12,
        roe: 15, // PR = 0.8
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'H')

      expect(result.basePR).toBeCloseTo(0.8, 2)
      // PR = 0.8, H sell = 0.8, so 0.8 >= 0.8 → overvalued
      expect(result.valuationStatus).toBe('overvalued')
      expect(result.suggestion).toBe('sell')
    })

    it('should detect buyback distortion and include derivedPR', () => {
      const inputs: PRRInputs = {
        peRatio: 27.48,
        roe: 73.69,
        roa: 8,
        historicalRoeRoaRatio: 1.5,
      }
      const result = calculateAllPRR(inputs, 'US')

      // ROE/ROA = 9.21 > 2.0 threshold → distortion detected
      expect(result.derivedPR).toBeCloseTo(2.29, 2)
    })

    it('should return undervalued status when PR <= buy threshold', () => {
      const inputs: PRRInputs = {
        peRatio: 5, // PR = 5 / 10 = 0.5
        roe: 10,
        dividendPayoutRatio: 50,
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.basePR).toBeCloseTo(0.5, 2)
      expect(result.valuationStatus).toBe('undervalued')
      expect(result.suggestion).toBe('buy')
    })

    it('should handle cyclePR with PB but no ROE', () => {
      const inputs: PRRInputs = {
        peRatio: 10,
        roe: 0, // ROE = 0 makes basePR null
        pbRatio: 0.96,
      }
      const result = calculateAllPRR(inputs, 'A')

      // basePR should be null due to ROE=0, but cyclePR should still work
      expect(result.basePR).toBeNull()
      // cyclePR is undefined since calculateCyclePRR with roe=0 returns null
      expect(result.cyclePR).toBeUndefined()
      expect(result.valuationStatus).toBe('invalid')
    })

    it('should handle indexPR with only PE and PB', () => {
      const inputs: PRRInputs = {
        peRatio: 20,
        roe: 15,
        pbRatio: 2,
        // No dividend data
      }
      const result = calculateAllPRR(inputs, 'A')

      expect(result.basePR).toBeCloseTo(1.333, 2)
      expect(result.indexPR).toBeCloseTo(2.0, 2)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle PE = 0', () => {
      const result = calculateBasePRR(0, 15)
      expect(result).toBe(0)
    })

    it('should handle very small ROE values', () => {
      const result = calculateBasePRR(10, 0.01)
      expect(result).toBeCloseTo(1000, 0)
    })

    it('should handle very large PE values', () => {
      const result = calculateBasePRR(1000, 15)
      expect(result).toBeCloseTo(66.67, 1)
    })

    it('should handle decimal ROE values', () => {
      const result = calculateBasePRR(10, 15.5)
      expect(result).toBeCloseTo(0.645, 2)
    })

    it('should handle decimal PE values', () => {
      const result = calculateBasePRR(10.5, 15)
      expect(result).toBeCloseTo(0.7, 2)
    })

    it('should handle dividendPayoutRatio > 100% (unlikely but valid)', () => {
      // N = 50% / 120% = 0.417
      const result = calculateAdjustmentFactor(120)
      expect(result).toBeCloseTo(0.417, 2)
    })

    it('should handle dividendPayoutRatio exactly at boundaries', () => {
      // 50 / 49.99 = 1.0002
      expect(calculateAdjustmentFactor(49.99)).toBeCloseTo(1.0002, 3)
      // 50 / 50.01 = 0.9998
      expect(calculateAdjustmentFactor(50.01)).toBeCloseTo(0.9998, 3)
    })
  })
})