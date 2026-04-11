import { describe, it, expect } from 'vitest'
import {
  calculateSeasonalRatios,
  projectAnnualValue,
  predictWithTTM,
  predictFullYearFlexible,
  predictFullYearWithSeasonalAndGrowth,
  type SeasonalRatios,
  type QuarterlyData,
  type TTMData
} from '../calculator'

describe('Calculator Prediction Functions', () => {
  describe('calculateSeasonalRatios', () => {
    it('should calculate seasonal ratios with sufficient data', () => {
      const historicalQuarterly: QuarterlyData[] = [
        { year: 2021, reportType: 'Q1', value: 25 },
        { year: 2021, reportType: 'H1', value: 50 },
        { year: 2021, reportType: 'Q3', value: 75 },
        { year: 2022, reportType: 'Q1', value: 28 },
        { year: 2022, reportType: 'H1', value: 52 },
        { year: 2022, reportType: 'Q3', value: 78 }
      ]
      const historicalAnnual = new Map<number, number>([
        [2021, 100],
        [2022, 110]
      ])

      const result = calculateSeasonalRatios(historicalQuarterly, historicalAnnual)

      expect(result.Q1).toBeCloseTo(0.252, 2)
      expect(result.H1).toBeCloseTo(0.486, 2)
      expect(result.Q3).toBeCloseTo(0.73, 2)
    })

    it('should use default ratios when insufficient data', () => {
      const historicalQuarterly: QuarterlyData[] = [
        { year: 2021, reportType: 'Q1', value: 25 }
      ]
      const historicalAnnual = new Map<number, number>([[2021, 100]])

      const result = calculateSeasonalRatios(historicalQuarterly, historicalAnnual)

      // Should use defaults when only 1 data point
      expect(result.Q1).toBe(0.25)
      expect(result.H1).toBe(0.5)
      expect(result.Q3).toBe(0.75)
    })

    it('should clamp ratios within valid ranges', () => {
      const historicalQuarterly: QuarterlyData[] = [
        { year: 2021, reportType: 'Q1', value: 5 }, // 5% - should clamp to 0.1
        { year: 2021, reportType: 'H1', value: 95 }, // 95% - should clamp to 0.7
        { year: 2021, reportType: 'Q3', value: 98 }, // 98% - should clamp to 0.9
        { year: 2022, reportType: 'Q1', value: 6 },
        { year: 2022, reportType: 'H1', value: 96 },
        { year: 2022, reportType: 'Q3', value: 99 }
      ]
      const historicalAnnual = new Map<number, number>([
        [2021, 100],
        [2022, 100]
      ])

      const result = calculateSeasonalRatios(historicalQuarterly, historicalAnnual)

      expect(result.Q1).toBe(0.1) // clamped minimum
      expect(result.H1).toBe(0.7) // clamped maximum
      expect(result.Q3).toBe(0.9) // clamped maximum
    })

    it('should skip years with missing annual data', () => {
      const historicalQuarterly: QuarterlyData[] = [
        { year: 2021, reportType: 'Q1', value: 25 },
        { year: 2022, reportType: 'Q1', value: 30 }
      ]
      const historicalAnnual = new Map<number, number>([[2021, 100]])
      // 2022 missing annual

      const result = calculateSeasonalRatios(historicalQuarterly, historicalAnnual)

      expect(result.Q1).toBe(0.25)
    })

    it('should handle empty quarterly data', () => {
      const result = calculateSeasonalRatios([], new Map())
      expect(result).toEqual({ Q1: 0.25, H1: 0.5, Q3: 0.75 })
    })
  })

  describe('projectAnnualValue', () => {
    const seasonalRatios: SeasonalRatios = { Q1: 0.25, H1: 0.5, Q3: 0.75 }

    it('should return current value for annual report type', () => {
      expect(projectAnnualValue(100, 'annual', null)).toBe(100)
      expect(projectAnnualValue(100, 'annual', seasonalRatios)).toBe(100)
    })

    it('should project using seasonal ratios', () => {
      expect(projectAnnualValue(25, 'Q1', seasonalRatios)).toBe(100)
      expect(projectAnnualValue(50, 'H1', seasonalRatios)).toBe(100)
      expect(projectAnnualValue(75, 'Q3', seasonalRatios)).toBe(100)
    })

    it('should fall back to simple multiplier when no seasonal ratios', () => {
      expect(projectAnnualValue(25, 'Q1', null)).toBe(100) // * 4
      expect(projectAnnualValue(50, 'H1', null)).toBe(100) // * 2
      expect(projectAnnualValue(75, 'Q3', null)).toBe(100) // * (4/3)
    })

    it('should use simple multiplier when ratio is 0', () => {
      const badRatios: SeasonalRatios = { Q1: 0, H1: 0.5, Q3: 0.75 }
      expect(projectAnnualValue(25, 'Q1', badRatios)).toBe(100)
    })
  })

  describe('predictWithTTM', () => {
    it('should return low confidence for empty history', () => {
      const result = predictWithTTM([])
      expect(result.predictedTTM).toBe(0)
      expect(result.avgGrowthRate).toBe(0)
      expect(result.confidence).toBe('low')
      expect(result.details.historyCount).toBe(0)
      expect(result.details.growthRates).toEqual([])
    })

    it('should calculate TTM prediction correctly', () => {
      const historyTTM: TTMData[] = [
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 110, reportType: 'semi' },
        { year: 2022, ttm: 121, reportType: 'semi' }
      ]
      // Growth rates: 10%, 10%
      // Avg growth: 10%
      // Predicted TTM: 121 * (1 + 0.1 * 0.5) = 121 * 1.05 = 127.05

      const result = predictWithTTM(historyTTM)
      expect(result.avgGrowthRate).toBeCloseTo(0.1, 2)
      expect(result.predictedTTM).toBeCloseTo(127.05, 1)
    })

    it('should filter abnormal growth rates', () => {
      // Growth > 100% or < -50% should be filtered
      const historyTTM: TTMData[] = [
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 300, reportType: 'semi' }, // 200% growth - filtered
        { year: 2022, ttm: 330, reportType: 'semi' } // 10% growth - kept
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.details.growthRates).toEqual([0.1])
    })

    it('should return high confidence for 5+ years with 3+ growth rates', () => {
      const historyTTM: TTMData[] = [
        { year: 2018, ttm: 80, reportType: 'semi' },
        { year: 2019, ttm: 90, reportType: 'semi' },
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 110, reportType: 'semi' },
        { year: 2022, ttm: 121, reportType: 'semi' }
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.confidence).toBe('high')
    })

    it('should return medium confidence for 3+ years with 2+ growth rates', () => {
      const historyTTM: TTMData[] = [
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 110, reportType: 'semi' },
        { year: 2022, ttm: 121, reportType: 'semi' }
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.confidence).toBe('medium')
    })

    it('should return low confidence for insufficient data', () => {
      const historyTTM: TTMData[] = [
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 110, reportType: 'semi' }
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.confidence).toBe('low')
    })

    it('should handle zero prevTTM in growth calculation', () => {
      const historyTTM: TTMData[] = [
        { year: 2020, ttm: 0, reportType: 'semi' },
        { year: 2021, ttm: 100, reportType: 'semi' }
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.details.growthRates).toEqual([])
    })

    it('should sort history by year', () => {
      const historyTTM: TTMData[] = [
        { year: 2022, ttm: 121, reportType: 'semi' },
        { year: 2020, ttm: 100, reportType: 'semi' },
        { year: 2021, ttm: 110, reportType: 'semi' }
      ]

      const result = predictWithTTM(historyTTM)
      expect(result.details.latestTTM).toBe(121)
    })
  })

  describe('predictFullYearFlexible', () => {
    const baseHistory = [
      { year: 2021, annual: 100, h1: 45 },
      { year: 2022, annual: 110, h1: 50 }
    ]

    describe('h1 mode (HK stocks)', () => {
      it('should return low confidence for empty disclosed periods', () => {
        const result = predictFullYearFlexible([], { h1: 50 }, 'h1')
        expect(result.predictedValue).toBe(0)
        expect(result.confidence).toBe('low')
      })

      it('should return low confidence for empty history', () => {
        const result = predictFullYearFlexible([], { h1: 50 }, 'h1')
        expect(result.confidence).toBe('low')
      })

      it('should calculate prediction with valid data', () => {
        const result = predictFullYearFlexible(baseHistory, { h1: 50 }, 'h1')
        expect(result.predictedValue).toBeGreaterThan(0)
      })

      it('should always return high confidence for h1 mode', () => {
        const result = predictFullYearFlexible(baseHistory, { h1: 50 }, 'h1')
        expect(result.confidence).toBe('high')
      })
    })

    describe('quarterly mode (A-shares)', () => {
      const quarterlyHistory = [
        { year: 2021, q1: 20, q2: 30, q3: 40, q4: 10 },
        { year: 2022, q1: 22, q2: 33, q3: 44, q4: 11 }
      ]

      it('should return high confidence when 3+ quarters disclosed', () => {
        const result = predictFullYearFlexible(
          quarterlyHistory,
          { q1: 22, q2: 33, q3: 44 },
          'quarterly'
        )
        expect(result.confidence).toBe('high')
      })

      it('should return medium confidence when 2 quarters disclosed', () => {
        const result = predictFullYearFlexible(
          quarterlyHistory,
          { q1: 22, q2: 33 },
          'quarterly'
        )
        expect(result.confidence).toBe('medium')
      })

      it('should return low confidence when only 1 quarter disclosed', () => {
        const result = predictFullYearFlexible(
          quarterlyHistory,
          { q1: 22 },
          'quarterly'
        )
        expect(result.confidence).toBe('low')
      })
    })

    describe('growth rate calculations', () => {
      it('should calculate positive growth rate', () => {
        const history = [{ year: 2022, annual: 100, h1: 50 }]
        const result = predictFullYearFlexible(history, { h1: 55 }, 'h1')
        expect(result.growthRate).toBeGreaterThan(0)
      })

      it('should calculate negative growth rate when both negative', () => {
        const history = [{ year: 2022, annual: 100, h1: -50 }]
        const result = predictFullYearFlexible(history, { h1: -40 }, 'h1')
        // Both negative, improvement counted as positive growth
        expect(result.growthRate).toBeGreaterThan(0)
      })

      it('should return -1 when lastYear positive and current negative', () => {
        const history = [{ year: 2022, annual: 100, h1: 50 }]
        const result = predictFullYearFlexible(history, { h1: -25 }, 'h1')
        expect(result.growthRate).toBe(-1)
      })

      it('should return 1 when lastYear negative and current positive', () => {
        const history = [{ year: 2022, annual: 100, h1: -50 }]
        const result = predictFullYearFlexible(history, { h1: 25 }, 'h1')
        expect(result.growthRate).toBe(1)
      })
    })

    describe('ratio validation', () => {
      it('should filter out ratios outside 0.1-0.9 range', () => {
        // H1 ratio of 0.05 (very low) should be filtered (below 0.1)
        const history = [
          { year: 2021, annual: 100, h1: 5 }, // ratio 0.05 - filtered
          { year: 2022, annual: 100, h1: 50 }  // ratio 0.5 - kept
        ]
        const result = predictFullYearFlexible(history, { h1: 50 }, 'h1')
        expect(result.details.validHistoryYears).toBe(1)
      })

      it('should skip years where annual is undefined or 0', () => {
        const history = [
          { year: 2021, h1: 50 }, // no annual
          { year: 2022, annual: 100, h1: 50 }
        ]
        const result = predictFullYearFlexible(history, { h1: 50 }, 'h1')
        expect(result.details.validHistoryYears).toBe(1)
      })
    })
  })

  describe('predictFullYearWithSeasonalAndGrowth', () => {
    const baseHistory = [
      { year: 2021, q1: 20, q2: 30, q3: 40, q4: 10 },
      { year: 2022, q1: 22, q2: 33, q3: 44, q4: 11 }
    ]

    it('should return low confidence for empty quarters', () => {
      const result = predictFullYearWithSeasonalAndGrowth(baseHistory, {})
      expect(result.predictedValue).toBe(0)
      expect(result.confidence).toBe('low')
    })

    it('should return low confidence for empty history', () => {
      const result = predictFullYearWithSeasonalAndGrowth([], { q1: 22 })
      expect(result.confidence).toBe('low')
    })

    it('should calculate prediction correctly', () => {
      const result = predictFullYearWithSeasonalAndGrowth(baseHistory, { q1: 22 })
      expect(result.predictedValue).toBeGreaterThan(0)
    })

    it('should return high confidence for 3+ quarters', () => {
      const result = predictFullYearWithSeasonalAndGrowth(
        baseHistory,
        { q1: 22, q2: 33, q3: 44 }
      )
      expect(result.confidence).toBe('high')
    })

    it('should return medium confidence for 2 quarters', () => {
      const result = predictFullYearWithSeasonalAndGrowth(
        baseHistory,
        { q1: 22, q2: 33 }
      )
      expect(result.confidence).toBe('medium')
    })

    it('should skip years where annual total is 0 or negative', () => {
      const history = [
        { year: 2021, q1: 20, q2: 30, q3: 40, q4: 10 },
        { year: 2022, q1: 0, q2: 0, q3: 0, q4: 0 } // annual total is 0
      ]
      const result = predictFullYearWithSeasonalAndGrowth(history, { q1: 22 })
      // Should use only valid year (2021)
      expect(result.predictedValue).toBeGreaterThan(0)
    })

    describe('growth rate calculations', () => {
      it('should calculate positive growth rate when both YTD positive', () => {
        const history = [{ year: 2022, q1: 20, q2: 30, q3: 40, q4: 10 }]
        const result = predictFullYearWithSeasonalAndGrowth(history, { q1: 25 })
        expect(result.growthRate).toBe(0.25) // (25-20)/20
      })

      it('should calculate positive growth when both YTD negative', () => {
        const history = [{ year: 2022, q1: -20, q2: -30, q3: -40, q4: -10 }]
        const result = predictFullYearWithSeasonalAndGrowth(history, { q1: -15 })
        // Improvement from -20 to -15
        expect(result.growthRate).toBeGreaterThan(0)
      })

      it('should keep growth rate at 0 when signs differ', () => {
        const history = [{ year: 2022, q1: -20, q2: -30, q3: -40, q4: -10 }]
        const result = predictFullYearWithSeasonalAndGrowth(history, { q1: 15 })
        expect(result.growthRate).toBe(0)
      })
    })
  })
})
