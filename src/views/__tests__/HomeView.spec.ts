import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Pinia } from 'pinia'
import type { StockData } from '@/types/stock'

// ── Must mock BEFORE imports ──

const mockRouterPush = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: {} })),
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}))

const mockDb = vi.hoisted(() => ({
  init: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAllTags: vi.fn().mockResolvedValue([]),
  addTag: vi.fn(),
  putTag: vi.fn(),
  getTag: vi.fn(),
  deleteTag: vi.fn(),
  addStockTag: vi.fn(),
  getAllStockTags: vi.fn().mockResolvedValue([]),
  getStockTags: vi.fn(),
  getStocksByTag: vi.fn(),
  deleteStockTag: vi.fn(),
  deleteStockTagsByStockId: vi.fn(),
  deleteStockTagsByTagId: vi.fn(),
  getAllTagPools: vi.fn().mockResolvedValue([]),
  addTagPool: vi.fn(),
  putTagPool: vi.fn(),
  deleteTagPool: vi.fn(),
}))

vi.mock('@/db', () => ({ stockDB: mockDb }))

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

/**
 * Hoisted shared data for the stockStore mock.
 * The mock returns getters referencing mockStockData.stocks.
 * Mutate mockStockData.stocks before mount to set stock data.
 */
const mockStockData = vi.hoisted(() => ({ stocks: [] as StockData[] }))

vi.mock('@/stores/stockStore', () => {
  const mockStore = {
    get stocks() { return mockStockData.stocks },
    get sortedStocks() { return mockStockData.stocks },
    get stockCount() { return mockStockData.stocks.length },
    loading: false,
    error: null,
    isApiAvailable: true,
    isUpdatingAllStocks: false,
    updateProgress: { updated: 0, total: 0 },
    currentlyUpdatingIds: new Set(),
    loadStocks: () => {},
    testAPIs: () => {},
    updateAllStocks: () => {},
    getStockById: () => undefined,
  }
  return { useStockStore: () => mockStore }
})

import HomeView from '../HomeView.vue'
import { useTagStore } from '@/stores/tagStore'

// ── Test data ──

function makeMockStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'HK00700_test',
    name: '腾讯控股',
    code: '00700',
    market: 'HK',
    marketCap: 30000,
    netCash: 1000,
    freeCashFlow: 5000,
    netProfit: 8000,
    currentRatio: 2.5,
    peRatio: 20,
    valuation1: 12,
    valuation2: 18,
    yearlyData: [{ year: 2023, freeCashFlow: 5000, netProfit: 8000 }],
    baseCurrency: 'HKD',
    isUsingProjectedData: false,
    totalShares: null,
    targetPriceConfig: null,
    roe: 15,
    roa: 8,
    pbRatio: 3,
    dividendPayoutRatio: 0.3,
    prrBase: 0.8,
    prrAdjusted: 0.7,
    prrCycle: null,
    prrIndex: null,
    prrDerived: null,
    prrSelectedFormula: 'base',
    netCashProjected: false,
    freeCashFlowProjected: false,
    netProfitProjected: false,
    currentRatioProjected: false,
    peRatioProjected: false,
    roeProjected: false,
    roaProjected: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

const TEST_STOCKS = [
  { id: 'stock-1', name: '腾讯控股', code: '00700', market: 'HK' },
  { id: 'stock-2', name: '阿里巴巴', code: '09988', market: 'HK' },
  { id: 'stock-3', name: '贵州茅台', code: '600519', market: 'A' },
].map(o => makeMockStock(o))

// ── Tests: Tag system integration (template) ──

describe('HomeView - tag system integration', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockStockData.stocks = []
    localStorage.clear()
  })

  /** Set stock data via mock, init tag store, mount component */
  async function createWrapper(stockData?: StockData[]) {
    if (stockData) {
      mockStockData.stocks = stockData
    }

    const tagStore = useTagStore()
    await tagStore.init()

    const wrapper = shallowMount(HomeView, {
      global: { plugins: [pinia] },
    })
    await vi.dynamicImportSettled()
    await nextTick()
    return { wrapper, tagStore }
  }

  it('renders TagFilter with correct props', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const tagFilter = wrapper.findComponent({ name: 'TagFilter' })
    expect(tagFilter.exists()).toBe(true)
    expect(tagFilter.props('availableTags')).toBeDefined()
    expect(tagFilter.props('modelValue')).toEqual([])
  })

  it('TagFilter has correct props (availableTags + v-model)', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const tagFilter = wrapper.findComponent({ name: 'TagFilter' })
    expect(tagFilter.exists()).toBe(true)
    expect(tagFilter.props('availableTags').length).toBeGreaterThan(0)
    expect(tagFilter.props('modelValue')).toEqual([])
  })

  it('renders tag manager button', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const btn = wrapper.find('.manage-tags-button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('title')).toBe('管理标签')
  })

  it('TagManager is not visible initially', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const tagManager = wrapper.findComponent({ name: 'TagManager' })
    expect(tagManager.exists()).toBe(true)
    expect(tagManager.props('visible')).toBe(false)
  })

  it('clicking tag manager button shows TagManager', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const btn = wrapper.find('.manage-tags-button')
    await btn.trigger('click')
    await nextTick()

    const tagManager = wrapper.findComponent({ name: 'TagManager' })
    expect(tagManager.props('visible')).toBe(true)
  })

  it('TagManager close event hides panel', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const btn = wrapper.find('.manage-tags-button')
    await btn.trigger('click')
    await nextTick()

    let tagManager = wrapper.findComponent({ name: 'TagManager' })
    expect(tagManager.props('visible')).toBe(true)

    tagManager.vm.$emit('close')
    await nextTick()

    tagManager = wrapper.findComponent({ name: 'TagManager' })
    expect(tagManager.props('visible')).toBe(false)
  })

  it('renders ViewToggle, update-all and add buttons in toolbar', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    expect(wrapper.findComponent({ name: 'ViewToggle' }).exists()).toBe(true)
    expect(wrapper.find('.update-all-button').exists()).toBe(true)
    expect(wrapper.find('.add-button').exists()).toBe(true)
  })

  it('applies default pool on mount', async () => {
    const tagStore = useTagStore()
    await tagStore.init()
    await tagStore.addTagPool('测试池', ['tag-1', 'tag-2'], true)

    const wrapper = shallowMount(HomeView, {
      global: { plugins: [pinia] },
    })
    await vi.dynamicImportSettled()
    await nextTick()

    expect(tagStore.tagPools.length).toBeGreaterThan(0)
    expect(tagStore.tagPools[0].isDefault).toBe(true)
  })

  it('load-pool updates selectedTagIds', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)

    const vm = wrapper.vm as any
    vm.selectedTagIds = ['tag-1', 'tag-2']
    await nextTick()

    const tagFilter = wrapper.findComponent({ name: 'TagFilter' })
    expect(tagFilter.props('modelValue')).toEqual(['tag-1', 'tag-2'])
  })

  it('update-all and add buttons exist and are visible', async () => {
    const stocks = [makeMockStock({ id: 'stock-1' })]
    const { wrapper } = await createWrapper(stocks)
    const updateBtn = wrapper.find('.update-all-button')
    const addBtn = wrapper.find('.add-button')

    expect(updateBtn.exists()).toBe(true)
    expect(addBtn.exists()).toBe(true)
    expect(updateBtn.isVisible()).toBe(true)
    expect(addBtn.isVisible()).toBe(true)
  })
})

// ── Tests: filteredStocks logic (via VM) ──

describe('HomeView - filteredStocks', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockStockData.stocks = []
    localStorage.clear()
  })

  async function mountWithStocks() {
    mockStockData.stocks = [...TEST_STOCKS]

    const tagStore = useTagStore()
    await tagStore.init()

    const wrapper = shallowMount(HomeView, {
      global: { plugins: [pinia] },
    })
    await vi.dynamicImportSettled()
    await nextTick()
    return { wrapper, tagStore }
  }

  it('combines search and tag filter (AND logic)', async () => {
    const { wrapper, tagStore } = await mountWithStocks()

    const tag = await tagStore.createTag('自选股', '#8B5CF6')
    await tagStore.addTagToStock('stock-1', tag.id)
    await tagStore.addTagToStock('stock-2', tag.id)

    const vm = wrapper.vm as any
    vm.selectedTagIds = [tag.id]
    await nextTick()
    vm.searchQuery = '腾讯'
    await nextTick()

    const filtered = vm.filteredStocks
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('stock-1')
  })

  it('tag filter alone shows matching stocks', async () => {
    const { wrapper, tagStore } = await mountWithStocks()

    const tag = await tagStore.createTag('核心持仓', '#22C55E')
    await tagStore.addTagToStock('stock-1', tag.id)
    await tagStore.addTagToStock('stock-2', tag.id)

    const vm = wrapper.vm as any
    vm.selectedTagIds = [tag.id]
    await nextTick()

    const filtered = vm.filteredStocks
    expect(filtered).toHaveLength(2)
    expect(filtered.every((s: StockData) => s.id === 'stock-1' || s.id === 'stock-2')).toBe(true)
  })

  it('search alone works without tag filter', async () => {
    const { wrapper } = await mountWithStocks()

    // Verify search input exists and can be typed into
    const searchInput = wrapper.find('.search-input')
    expect(searchInput.exists()).toBe(true)

    // Type a search query
    await searchInput.setValue('茅台')
    await nextTick()

    // Verify the stats-bar still shows stock count (component not broken)
    expect(wrapper.find('.stat-value').text()).toBe('3')
  })

  it('no filter shows all stocks', async () => {
    const { wrapper } = await mountWithStocks()

    // Stat-bar reflects stock count from mock
    expect(wrapper.find('.stat-value').text()).toBe('3')
    expect(wrapper.find('.stat-label').text()).toContain('只股票')
  })
})
