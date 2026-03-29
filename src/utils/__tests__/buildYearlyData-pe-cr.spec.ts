import { describe, it, expect } from 'vitest'
import { buildYearlyData } from '../../utils/excelParser'

describe('buildYearlyData with PE and Current Ratio', () => {
  describe('with all new fields provided', () => {
    it('should build yearly data with currentRatio and peRatio', () => {
      const years = [2021, 2022, 2023]
      const operatingCashFlow = [600, 700, 800]
      const capitalExpenditure = [-200, -250, -300]
      const netProfits = [400, 450, 500]
      const currentRatioProjected = [false, false, true]
      const peRatioProjected = [false, true, false]

      const result = buildYearlyData(
        years, operatingCashFlow, capitalExpenditure, netProfits,
        undefined, undefined, undefined, undefined,
        currentRatioProjected, peRatioProjected
      )

      expect(result).toHaveLength(3)
      // result is sorted ascending by year: [2021, 2022, 2023]
      expect(result[0].currentRatioProjected).toBe(false)  // 2021: index 0
      expect(result[0].peRatioProjected).toBe(false)         // 2021: index 0
      expect(result[2].currentRatioProjected).toBe(true)   // 2023: index 2
      expect(result[2].peRatioProjected).toBe(false)       // 2023: index 2
    })

    it('should default to false when projected arrays not provided', () => {
      const result = buildYearlyData(
        [2021], [600], [-200], [400]
      )

      expect(result[0].currentRatioProjected).toBe(false)
      expect(result[0].peRatioProjected).toBe(false)
    })

    it('should handle mixed projected values correctly', () => {
      const years = [2023, 2024, 2025]
      const operatingCashFlow = [800, 850, 900]
      const capitalExpenditure = [-300, -320, -340]
      const netProfits = [500, 530, 560]
      // 2023: annual report, 2024: Q1 only, 2025: annual
      const currentRatioProjected = [false, true, false]
      const peRatioProjected = [false, true, false]

      const result = buildYearlyData(
        years, operatingCashFlow, capitalExpenditure, netProfits,
        [false, true, false], // isProjected
        [false, true, false], // netProfitProjected
        [true, true, false],  // freeCashFlowProjected
        [false, true, false], // netCashProjected
        currentRatioProjected,
        peRatioProjected
      )

      // Result is sorted ascending by year: [2023, 2024, 2025]
      expect(result[0].year).toBe(2023)
      expect(result[0].netProfitProjected).toBe(false)
      expect(result[0].freeCashFlowProjected).toBe(true)
      expect(result[0].currentRatioProjected).toBe(false)
      expect(result[0].peRatioProjected).toBe(false)

      // Middle year (2024) - all predicted
      expect(result[1].year).toBe(2024)
      expect(result[1].netProfitProjected).toBe(true)
      expect(result[1].freeCashFlowProjected).toBe(true)
      expect(result[1].currentRatioProjected).toBe(true)
      expect(result[1].peRatioProjected).toBe(true)

      // Last year (2025) - not predicted
      expect(result[2].year).toBe(2025)
      expect(result[2].netProfitProjected).toBe(false)
      expect(result[2].freeCashFlowProjected).toBe(false)
      expect(result[2].currentRatioProjected).toBe(false)
      expect(result[2].peRatioProjected).toBe(false)
    })
  })
})
