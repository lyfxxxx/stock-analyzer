import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagStore } from '../tagStore'
import { DEFAULT_AUTO_TAGS } from '@/types/tag'
import type { Tag, StockTag, TagPool } from '@/types/tag'

// Mock dependencies
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
    getAllTags: vi.fn(),
    addTag: vi.fn(),
    putTag: vi.fn(),
    getTag: vi.fn(),
    deleteTag: vi.fn(),
    addStockTag: vi.fn(),
    getAllStockTags: vi.fn(),
    getStockTags: vi.fn(),
    getStocksByTag: vi.fn(),
    deleteStockTag: vi.fn(),
    deleteStockTagsByStockId: vi.fn(),
    deleteStockTagsByTagId: vi.fn(),
    getAllTagPools: vi.fn(),
    addTagPool: vi.fn(),
    putTagPool: vi.fn()
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

function createMockTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Tag',
    color: '#22C55E',
    isAuto: false,
    sortOrder: 0,
    createdAt: Date.now(),
    ...overrides
  }
}

function createMockTagPool(overrides: Partial<TagPool> = {}): TagPool {
  return {
    id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Pool',
    tagIds: [],
    isDefault: false,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

function createMockStockTag(overrides: Partial<StockTag> = {}): StockTag {
  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stockId: 'stock-1',
    tagId: 'tag-1',
    createdAt: Date.now(),
    ...overrides
  }
}

describe('tagStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const store = useTagStore()
      expect(store.tags).toEqual([])
      expect(store.stockTags).toEqual([])
      expect(store.tagPools).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.initialized).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('autoTags should return only auto tags', () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-1', isAuto: true, name: 'Auto1' }),
        createMockTag({ id: 'manual-1', isAuto: false, name: 'Manual1' }),
        createMockTag({ id: 'auto-2', isAuto: true, name: 'Auto2' })
      ]
      expect(store.autoTags).toHaveLength(2)
      expect(store.autoTags.every(t => t.isAuto)).toBe(true)
    })

    it('manualTags should return only non-auto tags', () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-1', isAuto: true, name: 'Auto1' }),
        createMockTag({ id: 'manual-1', isAuto: false, name: 'Manual1' }),
        createMockTag({ id: 'auto-2', isAuto: true, name: 'Auto2' })
      ]
      expect(store.manualTags).toHaveLength(1)
      expect(store.manualTags[0].name).toBe('Manual1')
    })

    it('sortedTags should return tags sorted by sortOrder', () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'c', sortOrder: 3, name: 'C' }),
        createMockTag({ id: 'a', sortOrder: 1, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 2, name: 'B' })
      ]
      expect(store.sortedTags.map(t => t.name)).toEqual(['A', 'B', 'C'])
    })
  })

  describe('init', () => {
    it('should load all data from IndexedDB and ensure default auto tags exist', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAllTags).mockResolvedValue([])
      vi.mocked(stockDB.getAllStockTags).mockResolvedValue([])
      vi.mocked(stockDB.getAllTagPools).mockResolvedValue([])
      vi.mocked(stockDB.putTag).mockResolvedValue()
 
      const store = useTagStore()
      await store.init()

      expect(stockDB.init).toHaveBeenCalled()
      expect(stockDB.getAllTags).toHaveBeenCalled()
      expect(stockDB.getAllStockTags).toHaveBeenCalled()
      expect(stockDB.getAllTagPools).toHaveBeenCalled()
      // Should have added all 14 default auto tags
      expect(stockDB.putTag).toHaveBeenCalledTimes(DEFAULT_AUTO_TAGS.length)
      expect(store.tags).toHaveLength(DEFAULT_AUTO_TAGS.length)
      expect(store.initialized).toBe(true)
    })

    it('should not add default auto tags that already exist', async () => {
      const { stockDB } = await import('@/db')
      const existingTags = [DEFAULT_AUTO_TAGS[0], DEFAULT_AUTO_TAGS[1]]
      vi.mocked(stockDB.getAllTags).mockResolvedValue(existingTags)
      vi.mocked(stockDB.getAllStockTags).mockResolvedValue([])
      vi.mocked(stockDB.getAllTagPools).mockResolvedValue([])
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      await store.init()

      // Should add remaining 12 default auto tags
      expect(stockDB.putTag).toHaveBeenCalledTimes(DEFAULT_AUTO_TAGS.length - 2)
      expect(store.tags).toHaveLength(DEFAULT_AUTO_TAGS.length)
    })

    it('should set loading to false after init completes', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.getAllTags).mockResolvedValue([])
      vi.mocked(stockDB.getAllStockTags).mockResolvedValue([])
      vi.mocked(stockDB.getAllTagPools).mockResolvedValue([])

      const store = useTagStore()
      store.loading = true
      await store.init()
      expect(store.loading).toBe(false)
    })
  })

  describe('createTag', () => {
    it('should create a manual tag with auto-generated UUID and sortOrder', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'existing', sortOrder: 0, name: 'Existing' }),
        createMockTag({ id: 'auto-1', sortOrder: 1, isAuto: true, name: 'Auto Tag' })
      ]

      const tag = await store.createTag('My Custom Tag', '#8B5CF6')

      expect(tag.name).toBe('My Custom Tag')
      expect(tag.color).toBe('#8B5CF6')
      expect(tag.isAuto).toBe(false)
      expect(tag.sortOrder).toBe(2) // max(0,1) + 1 = 2
      expect(tag.id).toBeTruthy()
      expect(tag.createdAt).toBeGreaterThan(0)
      expect(stockDB.addTag).toHaveBeenCalledWith(tag)
      // Should be in the store's tags array
      expect(store.tags.find(t => t.id === tag.id)).toBeDefined()
    })

    it('should reject creating a tag with duplicate name', async () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'existing', name: 'Existing Tag' })
      ]

      await expect(store.createTag('Existing Tag', '#EF4444')).rejects.toThrow('标签名称已存在')
    })

    it('should reject creating a tag with name matching an auto tag', async () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-hk', name: '港股', isAuto: true })
      ]

      await expect(store.createTag('港股', '#EF4444')).rejects.toThrow('标签名称已存在')
    })
  })

  describe('updateTag', () => {
    it('should update name and color of a manual tag', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      const tag = createMockTag({ id: 'my-tag', name: 'Old Name', color: '#22C55E', isAuto: false })
      store.tags = [tag]

      await store.updateTag('my-tag', { name: 'New Name', color: '#EF4444' })

      expect(tag.name).toBe('New Name')
      expect(tag.color).toBe('#EF4444')
      expect(stockDB.putTag).toHaveBeenCalledWith(tag)
    })

    it('should reject updating an auto tag', async () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-val1-low', name: '估值1低估', isAuto: true })
      ]

      await expect(
        store.updateTag('auto-val1-low', { name: 'Modified' })
      ).rejects.toThrow('自动标签不可编辑')
      // Name should remain unchanged
      expect(store.tags[0].name).toBe('估值1低估')
    })
  })

  describe('deleteTag', () => {
    it('should delete a manual tag and cascade remove associated stockTags', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.deleteTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTagsByTagId).mockResolvedValue()

      const store = useTagStore()
      const tag = createMockTag({ id: 'my-tag', name: 'Delete Me' })
      store.tags = [tag]
      store.stockTags = [
        createMockStockTag({ id: 'st-1', stockId: 's1', tagId: 'my-tag' }),
        createMockStockTag({ id: 'st-2', stockId: 's2', tagId: 'my-tag' }),
        createMockStockTag({ id: 'st-3', stockId: 's1', tagId: 'other-tag' })
      ]

      await store.deleteTag('my-tag')

      expect(stockDB.deleteTag).toHaveBeenCalledWith('my-tag')
      expect(stockDB.deleteStockTagsByTagId).toHaveBeenCalledWith('my-tag')
      // Tag removed from tags array
      expect(store.tags.find(t => t.id === 'my-tag')).toBeUndefined()
      // Associated stockTags removed
      expect(store.stockTags.filter(st => st.tagId === 'my-tag')).toHaveLength(0)
      // Other stockTags preserved
      expect(store.stockTags).toHaveLength(1)
      expect(store.stockTags[0].tagId).toBe('other-tag')
    })

    it('should reject deleting an auto tag', async () => {
      const { stockDB } = await import('@/db')

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-val1-low', name: '估值1低估', isAuto: true })
      ]

      await expect(store.deleteTag('auto-val1-low')).rejects.toThrow('自动标签不可删除')
      expect(stockDB.deleteTag).not.toHaveBeenCalled()
    })
  })

  describe('addTagToStock', () => {
    it('should add a tag to a stock', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()

      const store = useTagStore()
      const tag = createMockTag({ id: 'my-tag' })
      store.tags = [tag]

      await store.addTagToStock('stock-1', 'my-tag')

      expect(stockDB.addStockTag).toHaveBeenCalled()
      const added = vi.mocked(stockDB.addStockTag).mock.calls[0][0]
      expect(added.stockId).toBe('stock-1')
      expect(added.tagId).toBe('my-tag')
      expect(added.id).toBeTruthy()
      // Should be in local stockTags
      expect(store.stockTags.find(st => st.stockId === 'stock-1' && st.tagId === 'my-tag')).toBeDefined()
    })

    it('should prevent duplicate tag-stock association', async () => {
      const { stockDB } = await import('@/db')

      const store = useTagStore()
      const tag = createMockTag({ id: 'my-tag' })
      store.tags = [tag]
      store.stockTags = [
        createMockStockTag({ id: 'st-existing', stockId: 'stock-1', tagId: 'my-tag' })
      ]

      await expect(store.addTagToStock('stock-1', 'my-tag')).rejects.toThrow('该股票已拥有此标签')
      expect(stockDB.addStockTag).not.toHaveBeenCalled()
    })
  })

  describe('removeTagFromStock', () => {
    it('should remove a tag from a stock', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const store = useTagStore()
      const tag = createMockTag({ id: 'my-tag', isAuto: false })
      store.tags = [tag]
      const st = createMockStockTag({ id: 'st-1', stockId: 'stock-1', tagId: 'my-tag' })
      store.stockTags = [st]

      const result = await store.removeTagFromStock('stock-1', 'my-tag')

      expect(result).toBe(true)
      expect(stockDB.deleteStockTag).toHaveBeenCalledWith('st-1')
      expect(store.stockTags.find(s => s.id === 'st-1')).toBeUndefined()
    })

    it('should reject removing an auto tag from a stock', async () => {
      const { stockDB } = await import('@/db')

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'auto-hk', name: '港股', isAuto: true })
      ]
      store.stockTags = [
        createMockStockTag({ id: 'st-1', stockId: 'stock-1', tagId: 'auto-hk' })
      ]

      const result = await store.removeTagFromStock('stock-1', 'auto-hk')

      expect(result).toBe(false)
      expect(stockDB.deleteStockTag).not.toHaveBeenCalled()
    })
  })

  describe('getStockTags', () => {
    it('should return Tag objects for a given stock', () => {
      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'tag-1', name: 'Tag1', color: '#22C55E' }),
        createMockTag({ id: 'tag-2', name: 'Tag2', color: '#EF4444' }),
        createMockTag({ id: 'tag-3', name: 'Tag3', color: '#3B82F6' })
      ]
      store.stockTags = [
        createMockStockTag({ id: 'st-1', stockId: 'stock-1', tagId: 'tag-1' }),
        createMockStockTag({ id: 'st-2', stockId: 'stock-1', tagId: 'tag-3' }),
        createMockStockTag({ id: 'st-3', stockId: 'stock-2', tagId: 'tag-2' })
      ]

      const result = store.getStockTags('stock-1')

      expect(result).toHaveLength(2)
      expect(result.map(t => t.id)).toEqual(['tag-1', 'tag-3'])
    })

    it('should return empty array for stock with no tags', () => {
      const store = useTagStore()
      store.tags = [createMockTag({ id: 'tag-1' })]
      store.stockTags = []

      const result = store.getStockTags('nonexistent-stock')
      expect(result).toEqual([])
    })
  })

  describe('getStocksByTagIds', () => {
    it('should return stock IDs that have ALL specified tags (AND logic)', () => {
      const store = useTagStore()
      store.stockTags = [
        createMockStockTag({ id: '1', stockId: 's1', tagId: 't1' }),
        createMockStockTag({ id: '2', stockId: 's1', tagId: 't2' }),
        createMockStockTag({ id: '3', stockId: 's2', tagId: 't1' }),
        createMockStockTag({ id: '4', stockId: 's2', tagId: 't3' }),
        createMockStockTag({ id: '5', stockId: 's3', tagId: 't1' }),
        createMockStockTag({ id: '6', stockId: 's3', tagId: 't2' }),
        createMockStockTag({ id: '7', stockId: 's3', tagId: 't3' })
      ]

      // s1 has t1+t2, s3 has t1+t2+t3
      const result = store.getStocksByTagIds(['t1', 't2'])
      expect(result).toEqual(['s1', 's3'])
    })

    it('should return empty array when no stocks have all tags', () => {
      const store = useTagStore()
      store.stockTags = [
        createMockStockTag({ id: '1', stockId: 's1', tagId: 't1' })
      ]

      const result = store.getStocksByTagIds(['t1', 'nonexistent'])
      expect(result).toEqual([])
    })

    it('should return all tagged stocks when querying a single tag', () => {
      const store = useTagStore()
      store.stockTags = [
        createMockStockTag({ id: '1', stockId: 's1', tagId: 't1' }),
        createMockStockTag({ id: '2', stockId: 's2', tagId: 't1' }),
        createMockStockTag({ id: '3', stockId: 's3', tagId: 't2' })
      ]

      const result = store.getStocksByTagIds(['t1'])
      expect(result).toEqual(['s1', 's2'])
    })
  })

  describe('syncAutoTags', () => {
    function createMockStock(overrides: Record<string, any> = {}): any {
      return {
        id: 'stock-1',
        name: 'Test Stock',
        code: '00700',
        market: 'HK',
        marketCap: 1000,
        netCash: 100,
        freeCashFlow: 50,
        netProfit: 30,
        currentRatio: null,
        peRatio: null,
        valuation1: 5,
        valuation2: 8,
        yearlyData: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        baseCurrency: 'HKD',
        totalShares: null,
        targetPriceConfig: null,
        prrBase: null,
        prrAdjusted: null,
        ...overrides
      }
    }

    it('should add auto tags based on stock valuation data', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [...DEFAULT_AUTO_TAGS.map(t => ({ ...t }))]

      await store.syncAutoTags(createMockStock())

      // HK market + val1=5 (low) + val2=8 (low) = 3 auto tags
      expect(stockDB.addStockTag).toHaveBeenCalledTimes(3)
    })

    it('should remove outdated auto tags that no longer apply', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [...DEFAULT_AUTO_TAGS.map(t => ({ ...t }))]

      // Stock was previously tagged with auto-val1-high but now val1=5
      store.stockTags = [
        createMockStockTag({ id: 'st-1', stockId: 'stock-1', tagId: 'auto-val1-high' })
      ]

      await store.syncAutoTags(createMockStock())

      // Should remove the stale auto-val1-high
      expect(stockDB.deleteStockTag).toHaveBeenCalledWith('st-1')
      // Should add new tags (auto-market-hk, auto-val1-low, auto-val2-low)
      expect(stockDB.addStockTag).toHaveBeenCalledTimes(3)
    })

    it('should preserve correct auto tags that still apply', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [...DEFAULT_AUTO_TAGS.map(t => ({ ...t }))]

      // Stock already has auto-market-hk which is still correct
      store.stockTags = [
        createMockStockTag({ id: 'st-1', stockId: 'stock-1', tagId: 'auto-market-hk' })
      ]

      await store.syncAutoTags(createMockStock())

      // Should NOT delete auto-market-hk (still applies)
      expect(stockDB.deleteStockTag).not.toHaveBeenCalled()
      // Should add the missing val1-low and val2-low
      expect(stockDB.addStockTag).toHaveBeenCalledTimes(2)
    })

    it('should handle stocks with prr and target price data', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [...DEFAULT_AUTO_TAGS.map(t => ({ ...t }))]

      // A HK stock with low valuation, low prr, and enabled traditional target config
      await store.syncAutoTags(createMockStock({
        prrBase: 0.3,
        targetPriceConfig: {
          enabled: true,
          valuationType: 1,
          targetValuation: 15,
          buyTargetValuation: 10,
          sellTargetValuation: 20
        }
      }))

      // Expected: market-hk + val1-low + val2-low + prr-low + target-buy = 5 tags
      expect(stockDB.addStockTag).toHaveBeenCalledTimes(5)
    })
  })

  describe('updateAllAutoTags', () => {
    beforeEach(() => {
      // Mock stockListStore for updateAllAutoTags
      vi.mock('@/stores/stockListStore', () => ({
        useStockListStore: vi.fn()
      }))
    })

    it('should process all stocks from stockListStore', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.addStockTag).mockResolvedValue()
      vi.mocked(stockDB.deleteStockTag).mockResolvedValue()

      const { useStockListStore } = await import('@/stores/stockListStore')
      const mockStocks = [
        { id: 's1', name: 'Stock1', market: 'HK', valuation1: 5, valuation2: 8, marketCap: 100, netCash: 10, freeCashFlow: 5, netProfit: 8, yearlyData: [], createdAt: Date.now(), updatedAt: Date.now(), baseCurrency: 'HKD', currentRatio: null, peRatio: null, totalShares: null, targetPriceConfig: null, prrBase: null, prrAdjusted: null },
        { id: 's2', name: 'Stock2', market: 'A', valuation1: 25, valuation2: 30, marketCap: 200, netCash: 20, freeCashFlow: 10, netProfit: 15, yearlyData: [], createdAt: Date.now(), updatedAt: Date.now(), baseCurrency: 'CNY', currentRatio: null, peRatio: null, totalShares: null, targetPriceConfig: null, prrBase: null, prrAdjusted: null }
      ]
      vi.mocked(useStockListStore).mockReturnValue({ stocks: mockStocks } as any)

      const store = useTagStore()
      store.tags = [...DEFAULT_AUTO_TAGS.map(t => ({ ...t }))]

      await store.updateAllAutoTags()

      // 2 stocks, each should get tags added
      expect(stockDB.addStockTag).toHaveBeenCalled()
    })
  })

  describe('reorderTags', () => {
    it('should move a tag to the first position and reorder others', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'a', sortOrder: 0, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 1, name: 'B' }),
        createMockTag({ id: 'c', sortOrder: 2, name: 'C' }),
        createMockTag({ id: 'd', sortOrder: 3, name: 'D' }),
        createMockTag({ id: 'e', sortOrder: 4, name: 'E' })
      ]

      // Move E to position 0
      await store.reorderTags('e', 0)

      const sorted = [...store.tags].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted.map(t => t.name)).toEqual(['E', 'A', 'B', 'C', 'D'])
      expect(sorted.map(t => t.sortOrder)).toEqual([0, 1, 2, 3, 4])
    })

    it('should move a tag to the last position and reorder others', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'a', sortOrder: 0, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 1, name: 'B' }),
        createMockTag({ id: 'c', sortOrder: 2, name: 'C' }),
        createMockTag({ id: 'd', sortOrder: 3, name: 'D' }),
        createMockTag({ id: 'e', sortOrder: 4, name: 'E' })
      ]

      // Move A to last position (4)
      await store.reorderTags('a', 4)

      const sorted = [...store.tags].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted.map(t => t.name)).toEqual(['B', 'C', 'D', 'E', 'A'])
      expect(sorted.map(t => t.sortOrder)).toEqual([0, 1, 2, 3, 4])
    })

    it('should move a tag to a middle position and reorder others', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'a', sortOrder: 0, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 1, name: 'B' }),
        createMockTag({ id: 'c', sortOrder: 2, name: 'C' }),
        createMockTag({ id: 'd', sortOrder: 3, name: 'D' }),
        createMockTag({ id: 'e', sortOrder: 4, name: 'E' })
      ]

      // Move C to position 1
      await store.reorderTags('c', 1)

      const sorted = [...store.tags].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted.map(t => t.name)).toEqual(['A', 'C', 'B', 'D', 'E'])
      expect(sorted.map(t => t.sortOrder)).toEqual([0, 1, 2, 3, 4])
    })

    it('should persist changed tags to IndexedDB', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'a', sortOrder: 0, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 1, name: 'B' }),
        createMockTag({ id: 'c', sortOrder: 2, name: 'C' })
      ]

      await store.reorderTags('c', 0)

      // C (was order 2 now 0), A (was 0 now 1), B (was 1 now 2) — all 3 changed
      expect(stockDB.putTag).toHaveBeenCalledTimes(3)
    })

    it('should be a no-op when moving to current position', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTag).mockResolvedValue()

      const store = useTagStore()
      store.tags = [
        createMockTag({ id: 'a', sortOrder: 0, name: 'A' }),
        createMockTag({ id: 'b', sortOrder: 1, name: 'B' })
      ]

      await store.reorderTags('a', 0)

      expect(stockDB.putTag).not.toHaveBeenCalled()
      expect(store.tags.find(t => t.id === 'a')!.sortOrder).toBe(0)
      expect(store.tags.find(t => t.id === 'b')!.sortOrder).toBe(1)
    })

    it('should throw for non-existent tag', async () => {
      const store = useTagStore()
      store.tags = [createMockTag({ id: 'a', sortOrder: 0, name: 'A' })]

      await expect(store.reorderTags('nonexistent', 0)).rejects.toThrow('标签不存在')
    })
  })

  describe('reorderTagPools', () => {
    it('should move a pool to the first position and reorder others', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTagPool).mockResolvedValue()

      const store = useTagStore()
      store.tagPools = [
        createMockTagPool({ id: 'pool-a', sortOrder: 0, name: 'PoolA' }),
        createMockTagPool({ id: 'pool-b', sortOrder: 1, name: 'PoolB' }),
        createMockTagPool({ id: 'pool-c', sortOrder: 2, name: 'PoolC' })
      ]

      await store.reorderTagPools('pool-c', 0)

      const sorted = [...store.tagPools].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted.map(p => p.name)).toEqual(['PoolC', 'PoolA', 'PoolB'])
      expect(sorted.map(p => p.sortOrder)).toEqual([0, 1, 2])
    })

    it('should move a pool to the last position and reorder others', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTagPool).mockResolvedValue()

      const store = useTagStore()
      store.tagPools = [
        createMockTagPool({ id: 'pool-a', sortOrder: 0, name: 'PoolA' }),
        createMockTagPool({ id: 'pool-b', sortOrder: 1, name: 'PoolB' }),
        createMockTagPool({ id: 'pool-c', sortOrder: 2, name: 'PoolC' })
      ]

      await store.reorderTagPools('pool-a', 2)

      const sorted = [...store.tagPools].sort((a, b) => a.sortOrder - b.sortOrder)
      expect(sorted.map(p => p.name)).toEqual(['PoolB', 'PoolC', 'PoolA'])
      expect(sorted.map(p => p.sortOrder)).toEqual([0, 1, 2])
    })

    it('should persist changed pools to IndexedDB', async () => {
      const { stockDB } = await import('@/db')
      vi.mocked(stockDB.putTagPool).mockResolvedValue()

      const store = useTagStore()
      store.tagPools = [
        createMockTagPool({ id: 'pool-a', sortOrder: 0, name: 'PoolA' }),
        createMockTagPool({ id: 'pool-b', sortOrder: 1, name: 'PoolB' })
      ]

      await store.reorderTagPools('pool-a', 1)

      expect(stockDB.putTagPool).toHaveBeenCalledTimes(2)
    })
  })
})
