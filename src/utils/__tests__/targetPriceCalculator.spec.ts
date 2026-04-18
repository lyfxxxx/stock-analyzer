import { describe, it, expect } from 'vitest'
import { calculateTargetPrice } from '../targetPriceCalculator'
import type { CalculateTargetPriceParams, TargetPriceError } from '../targetPriceCalculator'

describe('calculateTargetPrice', () => {
  describe('normal cases', () => {
    it('should calculate price correctly for valuationType=1 (FCF)', () => {
      // price = (targetValuation × FCF + netCash) / totalShares
      // price = (15 × 10 + 5) / 10 = 155 / 10 = 15.5
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(15.5)
      expect(result.error).toBeNull()
    })

    it('should calculate price correctly for valuationType=2 (netProfit)', () => {
      // price = (targetValuation × netProfit + netCash) / totalShares
      // price = (15 × 8 + 5) / 10 = 125 / 10 = 12.5
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 2,
        freeCashFlow: 10,
        netProfit: 8,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(12.5)
      expect(result.error).toBeNull()
    })
  })

  describe('error cases', () => {
    it('should return SHARES_MISSING when totalShares is null', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: null,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('SHARES_MISSING')
    })

    it('should return SHARES_ZERO when totalShares is zero', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 0,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('SHARES_ZERO')
    })

    it('should return VALUATION_INVALID when valuation < 0.1', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 0.05,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('VALUATION_INVALID')
    })

    it('should return METRIC_ZERO when FCF is zero for valuationType=1', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 0,
        netProfit: 8,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('METRIC_ZERO')
    })

    it('should return METRIC_ZERO when netProfit is zero for valuationType=2', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 2,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('METRIC_ZERO')
    })

    it('should return METRIC_NEGATIVE when FCF is negative for valuationType=1', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: -5,
        netProfit: 8,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('METRIC_NEGATIVE')
    })

    it('should return METRIC_NEGATIVE when netProfit is negative for valuationType=2', () => {
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 2,
        freeCashFlow: 10,
        netProfit: -3,
        netCash: 5,
        totalShares: 10,
        currentRatio: null
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBeNull()
      expect(result.error).toBe('METRIC_NEGATIVE')
    })
  })

  describe('currentRatio < 1.5 simplified formula', () => {
    it('should not include netCash when currentRatio < 1.5 for valuationType=1', () => {
      // price = (targetValuation × FCF) / totalShares (no netCash)
      // price = (15 × 10) / 10 = 150 / 10 = 15
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: 1.2
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(15)
      expect(result.error).toBeNull()
    })

    it('should not include netCash when currentRatio < 1.5 for valuationType=2', () => {
      // price = (targetValuation × netProfit) / totalShares (no netCash)
      // price = (15 × 8) / 10 = 120 / 10 = 12
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 2,
        freeCashFlow: 10,
        netProfit: 8,
        netCash: 5,
        totalShares: 10,
        currentRatio: 1.2
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(12)
      expect(result.error).toBeNull()
    })

    it('should include netCash when currentRatio >= 1.5', () => {
      // price = (targetValuation × FCF + netCash) / totalShares
      // price = (15 × 10 + 5) / 10 = 15.5
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: 1.5
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(15.5)
      expect(result.error).toBeNull()
    })

    it('should include netCash when currentRatio > 1.5', () => {
      // price = (targetValuation × FCF + netCash) / totalShares
      // price = (15 × 10 + 5) / 10 = 15.5
      const params: CalculateTargetPriceParams = {
        targetValuation: 15,
        valuationType: 1,
        freeCashFlow: 10,
        netProfit: 0,
        netCash: 5,
        totalShares: 10,
        currentRatio: 2.0
      }
      const result = calculateTargetPrice(params)
      expect(result.price).toBe(15.5)
      expect(result.error).toBeNull()
    })
  })
})