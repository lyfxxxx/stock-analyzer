/**
 * PRR Formatter Tests
 * Tests all PRR valuation threshold and formatting utilities
 */

import { describe, it, expect } from 'vitest'
import {
  getPrrValuationLevel,
  getPrrValuationBgClass,
  getPrrValuationTextClass,
  getPrrValuationText,
  formatPRR,
  getPrrFormulaText,
  getPrrFormulaDescription,
  type PRRValuationLevel,
} from '@/utils/prr-formatter'

describe('PRR Valuation Level', () => {
  describe('A-shares thresholds', () => {
    it('returns low for PRR < 0.6', () => {
      expect(getPrrValuationLevel(0.3, 'A')).toBe('low')
      expect(getPrrValuationLevel(0.5, 'A')).toBe('low')
      expect(getPrrValuationLevel(0.59, 'A')).toBe('low')
    })

    it('returns medium for 0.6 <= PRR <= 1.0', () => {
      expect(getPrrValuationLevel(0.6, 'A')).toBe('medium')
      expect(getPrrValuationLevel(0.8, 'A')).toBe('medium')
      expect(getPrrValuationLevel(1.0, 'A')).toBe('medium')
    })

    it('returns high for PRR > 1.0', () => {
      expect(getPrrValuationLevel(1.01, 'A')).toBe('high')
      expect(getPrrValuationLevel(1.5, 'A')).toBe('high')
      expect(getPrrValuationLevel(3.0, 'A')).toBe('high')
    })
  })

  describe('H-shares thresholds', () => {
    it('returns low for PRR < 0.6', () => {
      expect(getPrrValuationLevel(0.3, 'H')).toBe('low')
      expect(getPrrValuationLevel(0.5, 'H')).toBe('low')
      expect(getPrrValuationLevel(0.59, 'H')).toBe('low')
    })

    it('returns medium for 0.6 <= PRR <= 0.8', () => {
      expect(getPrrValuationLevel(0.6, 'H')).toBe('medium')
      expect(getPrrValuationLevel(0.7, 'H')).toBe('medium')
      expect(getPrrValuationLevel(0.8, 'H')).toBe('medium')
    })

    it('returns high for PRR > 0.8', () => {
      expect(getPrrValuationLevel(0.81, 'H')).toBe('high')
      expect(getPrrValuationLevel(1.0, 'H')).toBe('high')
      expect(getPrrValuationLevel(2.0, 'H')).toBe('high')
    })
  })

  describe('US thresholds (same as A-shares)', () => {
    it('returns low for PRR < 0.6', () => {
      expect(getPrrValuationLevel(0.4, 'US')).toBe('low')
    })

    it('returns medium for 0.6 <= PRR <= 1.0', () => {
      expect(getPrrValuationLevel(0.75, 'US')).toBe('medium')
    })

    it('returns high for PRR > 1.0', () => {
      expect(getPrrValuationLevel(1.5, 'US')).toBe('high')
    })
  })

  describe('null handling', () => {
    it('returns unknown for null', () => {
      expect(getPrrValuationLevel(null, 'A')).toBe('unknown')
      expect(getPrrValuationLevel(null, 'H')).toBe('unknown')
      expect(getPrrValuationLevel(null, 'US')).toBe('unknown')
    })

    it('returns unknown for NaN', () => {
      expect(getPrrValuationLevel(NaN, 'A')).toBe('unknown')
    })
  })
})

describe('getPrrValuationBgClass', () => {
  it('returns val-low-bg for low level', () => {
    expect(getPrrValuationBgClass('low')).toBe('val-low-bg')
  })

  it('returns val-medium-bg for medium level', () => {
    expect(getPrrValuationBgClass('medium')).toBe('val-medium-bg')
  })

  it('returns val-high-bg for high level', () => {
    expect(getPrrValuationBgClass('high')).toBe('val-high-bg')
  })

  it('returns val-na-bg for unknown level', () => {
    expect(getPrrValuationBgClass('unknown')).toBe('val-na-bg')
  })
})

describe('getPrrValuationTextClass', () => {
  it('returns val-low for low level', () => {
    expect(getPrrValuationTextClass('low')).toBe('val-low')
  })

  it('returns val-medium for medium level', () => {
    expect(getPrrValuationTextClass('medium')).toBe('val-medium')
  })

  it('returns val-high for high level', () => {
    expect(getPrrValuationTextClass('high')).toBe('val-high')
  })

  it('returns val-na for unknown level', () => {
    expect(getPrrValuationTextClass('unknown')).toBe('val-na')
  })
})

describe('getPrrValuationText', () => {
  describe('Chinese text output', () => {
    it('returns 低估 for low valuation', () => {
      expect(getPrrValuationText(0.5, 'A')).toBe('低估')
      expect(getPrrValuationText(0.3, 'H')).toBe('低估')
      expect(getPrrValuationText(0.4, 'US')).toBe('低估')
    })

    it('returns 合理 for medium valuation', () => {
      expect(getPrrValuationText(0.8, 'A')).toBe('合理')
      expect(getPrrValuationText(0.7, 'H')).toBe('合理')
    })

    it('returns 高估 for high valuation', () => {
      expect(getPrrValuationText(1.5, 'A')).toBe('高估')
      expect(getPrrValuationText(1.0, 'H')).toBe('高估')
      expect(getPrrValuationText(2.0, 'US')).toBe('高估')
    })

    it('returns - for null/undefined', () => {
      expect(getPrrValuationText(null, 'A')).toBe('-')
    })

    it('returns - for NaN', () => {
      expect(getPrrValuationText(NaN, 'A')).toBe('-')
    })
  })
})

describe('formatPRR', () => {
  it('formats valid PRR with PR suffix', () => {
    expect(formatPRR(0.52)).toBe('0.52PR')
    expect(formatPRR(1.23)).toBe('1.23PR')
    expect(formatPRR(3.0)).toBe('3.00PR')
  })

  it('formats boundary values', () => {
    expect(formatPRR(0.6)).toBe('0.60PR')
    expect(formatPRR(1.0)).toBe('1.00PR')
    expect(formatPRR(0.8)).toBe('0.80PR')
  })

  it('returns - for null', () => {
    expect(formatPRR(null)).toBe('-')
  })

  it('returns - for undefined', () => {
    expect(formatPRR(undefined)).toBe('-')
  })

  it('returns - for NaN', () => {
    expect(formatPRR(NaN)).toBe('-')
  })
})

describe('getPrrFormulaText', () => {
  it('returns base formula', () => {
    expect(getPrrFormulaText('base')).toBe('PR = PE / ROE')
  })

  it('returns adjusted formula', () => {
    expect(getPrrFormulaText('adjusted')).toBe('PR = N × PE / ROE')
  })

  it('returns cycle formula', () => {
    expect(getPrrFormulaText('cycle')).toBe('PR = PB × 100 / ROE²')
  })

  it('returns index formula', () => {
    expect(getPrrFormulaText('index')).toBe('PR = PE² / PB / 100')
  })

  it('returns derived formula', () => {
    expect(getPrrFormulaText('derived')).toBe('PR = PE / (k × ROA)')
  })
})

describe('getPrrFormulaDescription', () => {
  it('returns Chinese descriptions', () => {
    expect(getPrrFormulaDescription('base')).toBe('基础市赚率')
    expect(getPrrFormulaDescription('adjusted')).toBe('修正市赚率')
    expect(getPrrFormulaDescription('cycle')).toBe('周期市赚率')
    expect(getPrrFormulaDescription('index')).toBe('指数市赚率')
    expect(getPrrFormulaDescription('derived')).toBe('衍生市赚率')
  })
})