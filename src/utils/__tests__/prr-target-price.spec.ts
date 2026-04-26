import { describe, it, expect } from 'vitest'
import { calculatePRRTargetPrice } from '../prr-target-price'

describe('calculatePRRTargetPrice', () => {
  describe('happy path', () => {
    it('should calculate correct target price with valid inputs', () => {
      // targetPR=0.5, ROE=15, netProfit=1000, totalShares=100
      // 目标市值 = 0.5 × 15 × 1000 = 7500
      // 目标价 = 7500 / 100 = 75.00
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: 1000,
        totalShares: 100
      })

      expect(result.error).toBeNull()
      expect(result.price).toBe(75)
    })

    it('should round price to 2 decimal places', () => {
      // targetPR=0.5, ROE=15, netProfit=1000, totalShares=99
      // 目标市值 = 0.5 × 15 × 1000 = 7500
      // 目标价 = 7500 / 99 = 75.757575...
      // Should round to 75.76
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: 1000,
        totalShares: 99
      })

      expect(result.error).toBeNull()
      expect(result.price).toBe(75.76)
    })
  })

  describe('error handling', () => {
    it('should return SHARES_MISSING when totalShares is null', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: 1000,
        totalShares: null
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('SHARES_MISSING')
    })

    it('should return SHARES_ZERO when totalShares is 0', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: 1000,
        totalShares: 0
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('SHARES_ZERO')
    })

    it('should return ROE_ZERO when ROE is null', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: null,
        netProfit: 1000,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('ROE_ZERO')
    })

    it('should return ROE_ZERO when ROE is 0', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 0,
        netProfit: 1000,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('ROE_ZERO')
    })

    it('should return NETPROFIT_ZERO when netProfit is null', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: null,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('NETPROFIT_ZERO')
    })

    it('should return NETPROFIT_ZERO when netProfit is 0', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0.5,
        roe: 15,
        netProfit: 0,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('NETPROFIT_ZERO')
    })

    it('should return TARGET_PR_INVALID when targetPR is -1', () => {
      const result = calculatePRRTargetPrice({
        targetPR: -1,
        roe: 15,
        netProfit: 1000,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('TARGET_PR_INVALID')
    })

    it('should return TARGET_PR_INVALID when targetPR is 0', () => {
      const result = calculatePRRTargetPrice({
        targetPR: 0,
        roe: 15,
        netProfit: 1000,
        totalShares: 100
      })

      expect(result.price).toBeNull()
      expect(result.error).toBe('TARGET_PR_INVALID')
    })
  })
})
