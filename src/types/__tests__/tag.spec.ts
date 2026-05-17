import { describe, it, expect } from 'vitest'
import {
  DEFAULT_AUTO_TAGS,
  TAG_COLOR_PALETTE,
} from '../tag'
import type { Tag, StockTag, TagPool } from '../tag'

describe('Tag Types', () => {
  // ============================================
  // 1. Tag interface shape validation
  // ============================================
  describe('Tag interface', () => {
    it('should have correct fields', () => {
      const tag: Tag = {
        id: 'test-id',
        name: 'Test Tag',
        color: '#EF4444',
        isAuto: true,
        sortOrder: 0,
        createdAt: Date.now(),
      }
      expect(tag.id).toBe('test-id')
      expect(tag.name).toBe('Test Tag')
      expect(tag.color).toBe('#EF4444')
      expect(tag.isAuto).toBe(true)
      expect(tag.sortOrder).toBe(0)
      expect(tag.createdAt).toBeGreaterThan(0)
    })
  })

  // ============================================
  // 2. StockTag interface shape validation
  // ============================================
  describe('StockTag interface', () => {
    it('should have correct fields', () => {
      const stockTag: StockTag = {
        id: 'st-1',
        stockId: 'stock-1',
        tagId: 'auto-market-hk',
        createdAt: 1000,
      }
      expect(stockTag.id).toBe('st-1')
      expect(stockTag.stockId).toBe('stock-1')
      expect(stockTag.tagId).toBe('auto-market-hk')
      expect(stockTag.createdAt).toBe(1000)
    })
  })

  // ============================================
  // 3. TagPool interface shape validation
  // ============================================
  describe('TagPool interface', () => {
    it('should have correct fields', () => {
      const pool: TagPool = {
        id: 'pool-1',
        name: 'My Pool',
        tagIds: ['auto-market-hk', 'auto-val1-low'],
        isDefault: true,
        sortOrder: 0,
        createdAt: 1000,
        updatedAt: 2000,
      }
      expect(pool.id).toBe('pool-1')
      expect(pool.name).toBe('My Pool')
      expect(pool.tagIds).toHaveLength(2)
      expect(pool.isDefault).toBe(true)
      expect(pool.sortOrder).toBe(0)
      expect(pool.createdAt).toBe(1000)
      expect(pool.updatedAt).toBe(2000)
    })
  })
})

describe('DEFAULT_AUTO_TAGS', () => {
  // ============================================
  // 4. Length is 14
  // ============================================
  it('should have exactly 14 auto tags', () => {
    expect(DEFAULT_AUTO_TAGS.length).toBe(14)
  })

  // ============================================
  // 5. All tags have isAuto === true
  // ============================================
  it('should have isAuto=true for all tags', () => {
    for (const tag of DEFAULT_AUTO_TAGS) {
      expect(tag.isAuto).toBe(true)
    }
  })

  // ============================================
  // 6. All tags have valid #RRGGBB color format
  // ============================================
  it('should have valid hex color format for all tags', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    for (const tag of DEFAULT_AUTO_TAGS) {
      expect(tag.color).toMatch(hexColorRegex)
    }
  })

  // ============================================
  // 7. No duplicate IDs
  // ============================================
  it('should have unique IDs with no duplicates', () => {
    const ids = DEFAULT_AUTO_TAGS.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  // ============================================
  // 8. sortOrder should be sequential starting from 0
  // ============================================
  it('should have sortOrder sequential from 0', () => {
    const sorted = [...DEFAULT_AUTO_TAGS].sort((a, b) => a.sortOrder - b.sortOrder)
    for (let i = 0; i < sorted.length; i++) {
      expect(sorted[i].sortOrder).toBe(i)
    }
  })

  // ============================================
  // 9. Market tags have correct IDs and colors
  // ============================================
  it('should contain HK and A market tags with correct colors', () => {
    const hkTag = DEFAULT_AUTO_TAGS.find(t => t.id === 'auto-market-hk')
    const aTag = DEFAULT_AUTO_TAGS.find(t => t.id === 'auto-market-a')

    expect(hkTag).toBeDefined()
    expect(hkTag!.name).toBe('港股')
    expect(hkTag!.color).toBe('#3B82F6')

    expect(aTag).toBeDefined()
    expect(aTag!.name).toBe('A股')
    expect(aTag!.color).toBe('#EF4444')
  })

  // ============================================
  // 10. Valuation and target tags have correct group pattern (3 per group)
  // ============================================
  it('should have groups of 3 tags for valuation categories', () => {
    const valuation1Tags = DEFAULT_AUTO_TAGS.filter(t => t.id.startsWith('auto-val1-'))
    const valuation2Tags = DEFAULT_AUTO_TAGS.filter(t => t.id.startsWith('auto-val2-'))
    const prrTags = DEFAULT_AUTO_TAGS.filter(t => t.id.startsWith('auto-prr-'))
    const targetTags = DEFAULT_AUTO_TAGS.filter(t => t.id.startsWith('auto-target-'))

    expect(valuation1Tags).toHaveLength(3)
    expect(valuation2Tags).toHaveLength(3)
    expect(prrTags).toHaveLength(3)
    expect(targetTags).toHaveLength(3)
  })
})

describe('TAG_COLOR_PALETTE', () => {
  // ============================================
  // 11. Has exactly 12 colors
  // ============================================
  it('should have exactly 12 colors', () => {
    expect(TAG_COLOR_PALETTE.length).toBe(12)
  })

  // ============================================
  // 12. All colors are valid #RRGGBB format
  // ============================================
  it('should have valid hex color format for all colors', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    for (const color of TAG_COLOR_PALETTE) {
      expect(color).toMatch(hexColorRegex)
    }
  })

  // ============================================
  // 13. Contains specific expected colors
  // ============================================
  it('should contain red (#EF4444), amber (#F59E0B), green (#22C55E), blue (#3B82F6)', () => {
    expect(TAG_COLOR_PALETTE).toContain('#EF4444')
    expect(TAG_COLOR_PALETTE).toContain('#F59E0B')
    expect(TAG_COLOR_PALETTE).toContain('#22C55E')
    expect(TAG_COLOR_PALETTE).toContain('#3B82F6')
  })
})
