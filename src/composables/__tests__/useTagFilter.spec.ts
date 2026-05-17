import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useTagFilter } from '../useTagFilter'
import type { StockData } from '@/types/stock'

// Mock tagStore
vi.mock('@/stores/tagStore', () => ({
  useTagStore: vi.fn()
}))

import { useTagStore } from '@/stores/tagStore'

function createMockStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'stock-1',
    name: 'Test Stock',
    code: '00001',
    market: 'HK',
    marketCap: 100,
    netCash: 10,
    freeCashFlow: 5,
    netProfit: 8,
    currentRatio: null,
    peRatio: null,
    valuation1: null,
    valuation2: 10,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    totalShares: null,
    targetPriceConfig: null,
    ...overrides
  }
}

describe('useTagFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default mock: tagStore with mock getStocksByTagIds
    const tagStoreMock = {
      getStocksByTagIds: vi.fn()
    }
    vi.mocked(useTagStore).mockReturnValue(tagStoreMock as any)
  })

  it('should return all stocks when no tags selected', () => {
    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1', name: 'Stock 1' }),
      createMockStock({ id: 's2', name: 'Stock 2' }),
      createMockStock({ id: 's3', name: 'Stock 3' })
    ])
    const selectedTagIds = ref<string[]>([])

    const { filteredStocks } = useTagFilter(stocks, selectedTagIds)

    expect(filteredStocks.value).toHaveLength(3)
    expect(filteredStocks.value).toEqual(stocks.value)
  })

  it('should not call getStocksByTagIds when no tags selected', () => {
    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1' })
    ])
    const selectedTagIds = ref<string[]>([])

    useTagFilter(stocks, selectedTagIds)

    const tagStoreMock = vi.mocked(useTagStore)()
    expect(tagStoreMock.getStocksByTagIds).not.toHaveBeenCalled()
  })

  it('should filter stocks by a single tag', () => {
    const tagStoreMock = vi.mocked(useTagStore)()
    vi.mocked(tagStoreMock.getStocksByTagIds).mockReturnValue(['s1', 's3'])

    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1', name: 'Stock 1' }),
      createMockStock({ id: 's2', name: 'Stock 2' }),
      createMockStock({ id: 's3', name: 'Stock 3' })
    ])
    const selectedTagIds = ref<string[]>(['tag-1'])

    const { filteredStocks } = useTagFilter(stocks, selectedTagIds)

    expect(filteredStocks.value).toHaveLength(2)
    expect(filteredStocks.value[0].id).toBe('s1')
    expect(filteredStocks.value[1].id).toBe('s3')
    expect(tagStoreMock.getStocksByTagIds).toHaveBeenCalledWith(['tag-1'])
  })

  it('should filter stocks by multiple tags (AND logic)', () => {
    const tagStoreMock = vi.mocked(useTagStore)()
    vi.mocked(tagStoreMock.getStocksByTagIds).mockReturnValue(['s2'])

    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1', name: 'Stock 1' }),
      createMockStock({ id: 's2', name: 'Stock 2' }),
      createMockStock({ id: 's3', name: 'Stock 3' })
    ])
    const selectedTagIds = ref<string[]>(['tag-1', 'tag-2'])

    const { filteredStocks } = useTagFilter(stocks, selectedTagIds)

    expect(filteredStocks.value).toHaveLength(1)
    expect(filteredStocks.value[0].id).toBe('s2')
    expect(tagStoreMock.getStocksByTagIds).toHaveBeenCalledWith(['tag-1', 'tag-2'])
  })

  it('should return empty array when no stocks match', () => {
    const tagStoreMock = vi.mocked(useTagStore)()
    vi.mocked(tagStoreMock.getStocksByTagIds).mockReturnValue([])

    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1' }),
      createMockStock({ id: 's2' })
    ])
    const selectedTagIds = ref<string[]>(['nonexistent-tag'])

    const { filteredStocks } = useTagFilter(stocks, selectedTagIds)

    expect(filteredStocks.value).toHaveLength(0)
  })

  it('should reactively update when selectedTagIds changes', () => {
    const tagStoreMock = vi.mocked(useTagStore)()
    const getStocksByTagIdsMock = vi.mocked(tagStoreMock.getStocksByTagIds)
    getStocksByTagIdsMock.mockReturnValue(['s1'])

    const stocks = ref<StockData[]>([
      createMockStock({ id: 's1', name: 'Stock 1' }),
      createMockStock({ id: 's2', name: 'Stock 2' }),
      createMockStock({ id: 's3', name: 'Stock 3' })
    ])
    const selectedTagIds = ref<string[]>(['tag-1'])

    const { filteredStocks } = useTagFilter(stocks, selectedTagIds)

    expect(filteredStocks.value).toHaveLength(1)
    expect(filteredStocks.value[0].id).toBe('s1')

    // Change selected tags — computed should re-evaluate
    getStocksByTagIdsMock.mockReturnValue(['s2'])
    selectedTagIds.value = ['tag-2']

    expect(filteredStocks.value).toHaveLength(1)
    expect(filteredStocks.value[0].id).toBe('s2')
    expect(getStocksByTagIdsMock).toHaveBeenCalledWith(['tag-2'])
  })
})
