import { describe, it, expect } from 'vitest'
import {
  calculateCurrentRatio,
  calculatePERatio
} from '../calculator'

describe('PE and Current Ratio Calculations', () => {
  // ============================================================
  // calculateCurrentRatio Tests
  // ============================================================
  describe('calculateCurrentRatio', () => {
    it('should calculate current ratio correctly', () => {
      const result = calculateCurrentRatio(1200, 800)
      expect(result).toBeCloseTo(1.5, 2)
    })

    it('should return null when current assets is 0', () => {
      const result = calculateCurrentRatio(0, 800)
      expect(result).toBeNull()
    })

    it('should return null when current liabilities is 0', () => {
      const result = calculateCurrentRatio(1200, 0)
      expect(result).toBeNull()
    })

    it('should return null when both are 0', () => {
      const result = calculateCurrentRatio(0, 0)
      expect(result).toBeNull()
    })

    it('should return 1 when current assets equals current liabilities', () => {
      const result = calculateCurrentRatio(1000, 1000)
      expect(result).toBe(1)
    })

    it('should handle case where current assets < current liabilities (weak liquidity)', () => {
      const result = calculateCurrentRatio(500, 1000)
      expect(result).toBeCloseTo(0.5, 2)
    })

    it('should handle very large values (Haidilao scale)', () => {
      // 497.6B / 613.6B = 0.811 → rounded to 2dp = 0.81
      const result = calculateCurrentRatio(497646000000, 613560000000)
      expect(result).toBeCloseTo(0.81, 2)
    })

    it('should handle decimal values in 亿元', () => {
      // 12427.277 / 9323.962 = 1.3328 → rounded to 2dp = 1.33
      const result = calculateCurrentRatio(12427.277, 9323.962)
      expect(result).toBeCloseTo(1.33, 2)
    })
  })

  // ============================================================
  // calculatePERatio Tests
  // ============================================================
  describe('calculatePERatio', () => {
    it('should calculate PE ratio correctly (Haidilao scenario)', () => {
      // marketCap=760B HKD, netProfit=45.81B CNY → PE ≈ 16.6
      const result = calculatePERatio(760, 45.81)
      expect(result).toBeCloseTo(16.59, 1)
    })

    it('should return null when market cap is 0', () => {
      const result = calculatePERatio(0, 45810000000)
      expect(result).toBeNull()
    })

    it('should return null when net profit is 0', () => {
      const result = calculatePERatio(760000000000, 0)
      expect(result).toBeNull()
    })

    it('should return null when both are 0', () => {
      const result = calculatePERatio(0, 0)
      expect(result).toBeNull()
    })

    it('should return null when net profit is negative (loss)', () => {
      const result = calculatePERatio(760000000000, -1000000000)
      expect(result).toBeNull()
    })

    it('should handle high PE (growth stock)', () => {
      const result = calculatePERatio(100, 1)
      expect(result).toBe(100)
    })

    it('should handle low PE (value stock)', () => {
      const result = calculatePERatio(50, 10)
      expect(result).toBe(5)
    })

    it('should handle same unit values directly', () => {
      const result = calculatePERatio(760000000000, 45810000000)
      expect(result).toBeCloseTo(16.59, 1)
    })
  })

  // ============================================================
  // Rounding and Precision
  // ============================================================
  describe('Rounding and precision', () => {
    it('should round current ratio to 2 decimal places', () => {
      const result = calculateCurrentRatio(1000, 333)
      expect(result).toBeCloseTo(3.00, 2)
    })

    it('should round PE to 1 decimal place', () => {
      const result = calculatePERatio(100, 7.3)
      expect(result).toBeCloseTo(13.7, 1)
    })

    it('should handle very small ratios', () => {
      // 1 / 1000 = 0.001 → rounded to 2dp = 0.00
      const result = calculateCurrentRatio(1, 1000)
      expect(result).toBe(0)
    })

    it('should handle very large PE', () => {
      const result = calculatePERatio(1000000000000, 100000000)
      expect(result).toBe(10000)
    })
  })
})