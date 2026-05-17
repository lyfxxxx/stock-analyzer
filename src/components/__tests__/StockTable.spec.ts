import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StockTable from '../StockTable.vue'
import { useTagStore } from '@/stores/tagStore'
import type { Tag, StockTag } from '@/types/tag'
import type { StockData } from '@/types/stock'

// ── Mock IndexedDB (needed by tagStore) ──

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
    putTagPool: vi.fn(),
  },
}))

vi.mock('@/stores/stockListStore', () => ({
  useStockListStore: vi.fn(() => ({
    stocks: [],
    getTargetPrice: vi.fn(() => ({ buyPrice: null, sellPrice: null, error: null })),
    updatePrrFormula: vi.fn(),
  })),
}))

vi.mock('@/api/eastmoney', () => ({
  fetchStockTotalShares: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/utils/targetPriceCalculator', () => ({
  calculateTargetPrice: vi.fn(() => ({ buyPrice: null, sellPrice: null, error: null })),
}))

vi.mock('@/utils/prr-target-price', () => ({
  calculatePRRTargetPrice: vi.fn(() => ({ buyPrice: null, sellPrice: null })),
}))

// ── Factories ──

function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '测试标签',
    color: '#22C55E',
    isAuto: false,
    sortOrder: 0,
    createdAt: Date.now(),
    ...overrides,
  }
}

function createStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: `stock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '测试股票',
    code: '000001',
    market: 'A',
    marketCap: 100,
    totalShares: null,
    netCash: 10,
    freeCashFlow: 5,
    netProfit: 8,
    valuation1: 15,
    valuation2: 12,
    currentRatio: 2.0,
    peRatio: 16,
    prrBase: 0.8,
    roe: 12.5,
    roa: 5.5,
    dividendPayoutRatio: 0.3,
    pbRatio: 1.5,
    yearlyData: [],
    baseCurrency: 'CNY',
    targetPriceConfig: null,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  }
}

// ── Tag store setup ──

function setupTagStore(stockTagsMap: Record<string, Tag[]>) {
  const store = useTagStore()

  const allTags: Tag[] = []
  const allStockTags: StockTag[] = []

  for (const [stockId, tags] of Object.entries(stockTagsMap)) {
    for (const tag of tags) {
      if (!allTags.find(t => t.id === tag.id)) {
        allTags.push(tag)
      }
      allStockTags.push({
        id: `st-${tag.id}-${stockId}`,
        stockId,
        tagId: tag.id,
        createdAt: Date.now(),
      })
    }
  }

  store.tags = allTags as any
  store.stockTags = allStockTags as any
  store.initialized = true

  return store
}

// ── Tests ──

describe('StockTable - 标签列', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders "标签" column header', () => {
    const wrapper = mount(StockTable, {
      props: { stocks: [], updatingIds: new Set() },
    })
    const header = wrapper.findAll('th').filter(w => w.text().trim() === '标签')
    expect(header).toHaveLength(1)
    expect(wrapper.find('.col-tag').exists()).toBe(true)
    expect(wrapper.find('.col-tag').text()).toBe('标签')
  })

  it('shows "-" for stocks without tags', () => {
    setupTagStore({})
    const stock = createStock({ id: 'stock-no-1' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    // First .col-tag is the <th>, second is the <td>
    const cells = wrapper.findAll('.col-tag')
    expect(cells).toHaveLength(2)
    expect(cells[1].text()).toContain('-')
  })

  it('renders TagChips for stocks with tags', () => {
    const tag1 = createTag({ name: '科技', color: '#3B82F6' })
    setupTagStore({ 'stock-tagged': [tag1] })
    const stock = createStock({ id: 'stock-tagged' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    const cells = wrapper.findAll('.col-tag')
    expect(cells[1].text()).toContain('科技')
    expect(cells[1].text()).not.toContain('-')
  })

  it('shows at most 2 TagChips and displays "+N" for extra tags', () => {
    const tag1 = createTag({ name: '标签A', color: '#EF4444' })
    const tag2 = createTag({ name: '标签B', color: '#3B82F6' })
    const tag3 = createTag({ name: '标签C', color: '#22C55E' })
    setupTagStore({ 'stock-extra': [tag1, tag2, tag3] })
    const stock = createStock({ id: 'stock-extra' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    const cellText = wrapper.findAll('.col-tag')[1].text()
    expect(cellText).toContain('标签A')
    expect(cellText).toContain('标签B')
    expect(cellText).toContain('+1')
    // Should NOT contain 标签C (it's the 3rd tag, only shown as +1)
    expect(cellText).not.toContain('标签C')
  })

  it('renders ".tag-extra" element when tags exceed 2', () => {
    const tag1 = createTag({ name: 'X', color: '#EF4444' })
    const tag2 = createTag({ name: 'Y', color: '#3B82F6' })
    const tag3 = createTag({ name: 'Z', color: '#22C55E' })
    setupTagStore({ 'stock-extra2': [tag1, tag2, tag3] })
    const stock = createStock({ id: 'stock-extra2' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    const extra = wrapper.find('.tag-extra')
    expect(extra.exists()).toBe(true)
    expect(extra.text()).toBe('+1')
  })

  it('does not show ".tag-extra" when tags are 2 or fewer', () => {
    const tag1 = createTag({ name: 'A', color: '#EF4444' })
    const tag2 = createTag({ name: 'B', color: '#3B82F6' })
    setupTagStore({ 'stock-two-tags': [tag1, tag2] })
    const stock = createStock({ id: 'stock-two-tags' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    expect(wrapper.find('.tag-extra').exists()).toBe(false)
  })

  it('shows correct "+N" count when more than 2 tags', () => {
    const tags = Array.from({ length: 5 }, (_, i) =>
      createTag({ id: `multi-${i}`, name: `T${i}`, color: '#000' })
    )
    setupTagStore({ 'stock-5': tags })
    const stock = createStock({ id: 'stock-5' })
    const wrapper = mount(StockTable, {
      props: { stocks: [stock], updatingIds: new Set() },
    })
    const extra = wrapper.find('.tag-extra')
    expect(extra.exists()).toBe(true)
    expect(extra.text()).toBe('+3')
  })
})
