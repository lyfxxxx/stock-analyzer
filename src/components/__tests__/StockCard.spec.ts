import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StockCard from '../StockCard.vue'
import { useTagStore } from '@/stores/tagStore'
import type { StockData } from '@/types/stock'
import type { Tag, StockTag } from '@/types/tag'

// Mock dependencies
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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
    putTagPool: vi.fn(),
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock API modules that stockStore depends on
vi.mock('@/api/eastmoney', () => ({
  fetchEastMoneyStockInfo: vi.fn(),
  testEastMoneyAPI: vi.fn().mockResolvedValue({ source: 'eastmoney', status: 'success', message: 'OK' }),
  searchStocksByName: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/tencent', () => ({
  testTencentAPI: vi.fn().mockResolvedValue({ source: 'tencent', status: 'success', message: 'OK' }),
  fetchTencentHKFinancialReport: vi.fn(),
}))

vi.mock('@/api/financialReportA', () => ({
  fetchAStockFinancialReport: vi.fn(),
}))

vi.mock('@/api/financialReportHK', () => ({
  fetchHKStockFinancialReport: vi.fn(),
}))

vi.mock('@/utils/calculator', () => ({
  calculateNetCash: vi.fn().mockReturnValue(1000),
  calculateFreeCashFlow: vi.fn().mockReturnValue(500),
  calculateValuations: vi.fn().mockReturnValue({ valuation1: 10, valuation2: 15 }),
  calculatePERatio: vi.fn().mockReturnValue(20),
}))

// ── Factory functions ──

function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Tag',
    color: '#22C55E',
    isAuto: false,
    sortOrder: 0,
    createdAt: Date.now(),
    ...overrides,
  }
}

function createStockTag(overrides: Partial<StockTag> = {}): StockTag {
  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stockId: 'stock-1',
    tagId: 'tag-1',
    createdAt: Date.now(),
    ...overrides,
  }
}

function createMockStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'stock-1',
    name: '腾讯控股',
    code: '00700',
    market: 'HK',
    marketCap: 50000,
    netCash: 1000,
    freeCashFlow: 500,
    netProfit: 300,
    currentRatio: 2.5,
    peRatio: 20,
    valuation1: 10,
    valuation2: 15,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    totalShares: 100,
    targetPriceConfig: null,
    ...overrides,
  }
}

// ── Test Helpers ──

async function setupStore(options: {
  tags?: Tag[]
  stockTags?: StockTag[]
} = {}) {
  const tagStore = useTagStore()
  const { tags = [], stockTags: stockTagsData = [] } = options

  // Manually seed store data
  ;(tagStore as any).tags = tags
  ;(tagStore as any).stockTags = stockTagsData
  ;(tagStore as any).initialized = true

  return tagStore
}

// ── Tests ──

describe('StockCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders stock name and code', () => {
    const stock = createMockStock()
    const wrapper = mount(StockCard, {
      props: { stock },
    })
    expect(wrapper.text()).toContain('腾讯控股')
    expect(wrapper.text()).toContain('00700')
  })

  it('renders market badge for HK stock', () => {
    const stock = createMockStock({ market: 'HK' })
    const wrapper = mount(StockCard, {
      props: { stock },
    })
    const badge = wrapper.find('.market-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('港股')
  })

  it('renders market badge for A stock', () => {
    const stock = createMockStock({ market: 'A' })
    const wrapper = mount(StockCard, {
      props: { stock },
    })
    const badge = wrapper.find('.market-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('A股')
  })

  describe('tag row', () => {
    it('does not render tag row when stock has no tags', () => {
      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })
      const tagRow = wrapper.find('.tag-row')
      expect(tagRow.exists()).toBe(false)
    })

    it('renders tag row when stock has tags', async () => {
      const tag1 = createTag({ id: 'tag-1', name: '科技', color: '#22C55E', isAuto: false })
      const tag2 = createTag({ id: 'tag-2', name: '港股', color: '#3B82F6', isAuto: true })

      await setupStore({
        tags: [tag1, tag2],
        stockTags: [
          createStockTag({ stockId: 'stock-1', tagId: 'tag-1' }),
          createStockTag({ stockId: 'stock-1', tagId: 'tag-2' }),
        ],
      })

      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })
      const tagRow = wrapper.find('.tag-row')
      expect(tagRow.exists()).toBe(true)
    })

    it('renders TagChip for each tag', async () => {
      const tag1 = createTag({ id: 'tag-1', name: '科技', isAuto: false })
      const tag2 = createTag({ id: 'tag-2', name: '高估', isAuto: true })

      await setupStore({
        tags: [tag1, tag2],
        stockTags: [
          createStockTag({ stockId: 'stock-1', tagId: 'tag-1' }),
          createStockTag({ stockId: 'stock-1', tagId: 'tag-2' }),
        ],
      })

      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })
      const chips = wrapper.findAllComponents({ name: 'TagChip' })
      expect(chips.length).toBe(2)
    })

    it('shows overflow count when more than 3 tags', async () => {
      const tags = [
        createTag({ id: 't1', name: '标签1', isAuto: false }),
        createTag({ id: 't2', name: '标签2', isAuto: false }),
        createTag({ id: 't3', name: '标签3', isAuto: false }),
        createTag({ id: 't4', name: '标签4', isAuto: false }),
        createTag({ id: 't5', name: '标签5', isAuto: false }),
      ]

      await setupStore({
        tags,
        stockTags: tags.map(t => createStockTag({ stockId: 'stock-1', tagId: t.id })),
      })

      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })
      const overflow = wrapper.find('.tag-overflow')
      expect(overflow.exists()).toBe(true)
      expect(overflow.text()).toBe('+2')
    })

    it('opens TagConfigPopover when clicking tag chips', async () => {
      const tag1 = createTag({ id: 'tag-1', name: '科技', isAuto: false })

      await setupStore({
        tags: [tag1],
        stockTags: [createStockTag({ stockId: 'stock-1', tagId: 'tag-1' })],
      })

      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })

      // TagConfigPopover should wrap the tag chips
      const popover = wrapper.findComponent({ name: 'TagConfigPopover' })
      expect(popover.exists()).toBe(true)
      expect(popover.props('stockId')).toBe('stock-1')
      expect(popover.props('trigger')).toBe('click')

      // The wrapper inside the popover should contain the tag chips
      const chipsWrapper = popover.find('.tag-chips-wrapper')
      expect(chipsWrapper.exists()).toBe(true)
      expect(chipsWrapper.text()).toContain('科技')
    })

    it('auto tags have no remove button', async () => {
      const autoTag = createTag({ id: 'auto-1', name: '港股', isAuto: true })
      const manualTag = createTag({ id: 'manual-1', name: '科技', isAuto: false })

      await setupStore({
        tags: [autoTag, manualTag],
        stockTags: [
          createStockTag({ stockId: 'stock-1', tagId: 'auto-1' }),
          createStockTag({ stockId: 'stock-1', tagId: 'manual-1' }),
        ],
      })

      const stock = createMockStock()
      const wrapper = mount(StockCard, {
        props: { stock },
      })
      const chips = wrapper.findAllComponents({ name: 'TagChip' })

      const autoChip = chips.find(c => c.props('tag').isAuto)
      const manualChip = chips.find(c => !c.props('tag').isAuto)

      expect(autoChip?.props('removable')).toBe(false)
      expect(manualChip?.props('removable')).toBe(true)
    })
  })
})
