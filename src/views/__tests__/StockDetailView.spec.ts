import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import StockDetailView from '../StockDetailView.vue'
import { useTagStore } from '@/stores/tagStore'
import type { Tag, StockTag } from '@/types/tag'
import type { StockData } from '@/types/stock'

// Mock IndexedDB
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

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/api/exchangeRate', () => ({
  fetchExchangeRates: vi.fn().mockResolvedValue({ rates: { HKD: 1, USD: 0.127, CNY: 0.9 } }),
}))

// Mock useTheme - provide isDark as a ref since components use .value
vi.mock('@/composables/useTheme', () => {
  const isDark = { value: false }
  return {
    useTheme: () => ({
      mode: { value: 'light' },
      resolved: { value: 'light' },
      isDark,
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    }),
  }
})

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/api/exchangeRate', () => ({
  fetchExchangeRates: vi.fn().mockResolvedValue({ rates: { HKD: 1, USD: 0.127, CNY: 0.9 } }),
}))

// Mock useTheme to avoid module-level side effects
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    mode: 'light',
    resolved: 'light',
    setMode: vi.fn(),
    toggle: vi.fn(),
  }),
}))

// ── Factories ──

function createStock(overrides: Partial<StockData> = {}): StockData {
  return {
    id: 'test-stock-1',
    name: '测试股票',
    code: '0001.HK',
    market: 'HK',
    marketCap: 100,
    netCash: 10,
    freeCashFlow: 5,
    netProfit: 8,
    currentRatio: null,
    peRatio: null,
    valuation1: null,
    valuation2: 0,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    totalShares: null,
    targetPriceConfig: null,
    roe: null,
    roa: null,
    pbRatio: null,
    dividendPayoutRatio: null,
    prrBase: null,
    prrAdjusted: null,
    ...overrides,
  }
}

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
    stockId: 'test-stock-1',
    tagId: 'tag-1',
    createdAt: Date.now(),
    ...overrides,
  }
}

// ── Helpers ──

/** Set up store with predefined data for testing */
function setupStore(options: {
  autoTags?: Tag[]
  manualTags?: Tag[]
  selectedManualTagIds?: string[]
} = {}) {
  const {
    autoTags = [
      createTag({ id: 'auto-hk', name: '港股', isAuto: true, color: '#3B82F6', sortOrder: 0 }),
    ],
    manualTags = [
      createTag({ id: 'manual-1', name: '科技', color: '#22C55E', sortOrder: 10 }),
      createTag({ id: 'manual-2', name: '金融', color: '#F59E0B', sortOrder: 11 }),
    ],
    selectedManualTagIds = ['manual-1'],
  } = options

  const store = useTagStore()

  const allTags: Tag[] = [...autoTags, ...manualTags]
  store.tags = allTags as any

  const stockId = 'test-stock-1'
  const stockTagEntries: StockTag[] = [
    ...autoTags.map(t => createStockTag({ id: `st-${t.id}`, stockId, tagId: t.id })),
    ...selectedManualTagIds.map(tagId => createStockTag({ id: `st-${tagId}`, stockId, tagId })),
  ]
  store.stockTags = stockTagEntries as any

  store.initialized = true

  // Mock store methods
  store.removeTagFromStock = vi.fn().mockResolvedValue(true)

  return store
}

describe('StockDetailView - Tag Area', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function createWrapper() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
    })

    return mount(StockDetailView, {
      props: {
        previewMode: true,
        previewData: createStock(),
      },
      global: {
        plugins: [router],
        stubs: {
          'router-link': true,
          'router-view': true,
          ValuationChart: true,
          RoeChart: true,
          DividendChart: true,
          TargetPriceConfig: true,
          TagConfigPopover: {
            template: '<div class="tag-config-popover-stub"><slot /></div>',
          },
        },
      },
    })
  }

  it('renders tag bar when stock has tags', () => {
    setupStore()

    const wrapper = createWrapper()

    // The tag-bar should exist
    expect(wrapper.find('.tag-bar').exists()).toBe(true)
    // Should show "管理标签" button
    expect(wrapper.find('.tag-manage-btn').exists()).toBe(true)
    expect(wrapper.find('.tag-manage-btn').text()).toBe('管理标签')
  })

  it('renders TagChip for each stock tag', () => {
    setupStore({
      autoTags: [createTag({ id: 'auto-hk', name: '港股', isAuto: true, color: '#3B82F6' })],
      manualTags: [createTag({ id: 'manual-1', name: '科技', color: '#22C55E' })],
      selectedManualTagIds: ['manual-1'],
    })

    const wrapper = createWrapper()

    const chips = wrapper.findAllComponents({ name: 'TagChip' })
    // Both auto and manual tags should render
    expect(chips.length).toBe(2)
  })

  it('auto tag has lock icon and no remove button', () => {
    setupStore({
      autoTags: [createTag({ id: 'auto-hk', name: '港股', isAuto: true, color: '#3B82F6' })],
      manualTags: [],
      selectedManualTagIds: [],
    })

    const wrapper = createWrapper()

    const chips = wrapper.findAllComponents({ name: 'TagChip' })
    expect(chips.length).toBe(1)

    const autoChip = chips[0]

    // Auto tag should have a lock icon (svg with lock path inside the chip)
    const lockIcon = autoChip.find('path[d="M7 11V7a5 5 0 0 1 10 0v4"]')
    expect(lockIcon.exists()).toBe(true)

    // Auto tag should NOT have remove button
    const removeBtn = autoChip.find('.remove-btn')
    expect(removeBtn.exists()).toBe(false)
  })

  it('manual tag has remove button and no lock icon', () => {
    setupStore({
      autoTags: [],
      manualTags: [createTag({ id: 'manual-1', name: '科技', color: '#22C55E' })],
      selectedManualTagIds: ['manual-1'],
    })

    const wrapper = createWrapper()

    const chips = wrapper.findAllComponents({ name: 'TagChip' })
    expect(chips.length).toBe(1)

    const manualChip = chips[0]

    // Manual tag should NOT have lock icon (remove button svg should not match lock path)
    const lockIcon = manualChip.find('path[d="M7 11V7a5 5 0 0 1 10 0v4"]')
    expect(lockIcon.exists()).toBe(false)

    // Manual tag should have remove button
    const removeBtn = manualChip.find('.remove-btn')
    expect(removeBtn.exists()).toBe(true)
  })

  it('clicking remove on manual tag calls tagStore.removeTagFromStock', async () => {
    const store = setupStore({
      autoTags: [],
      manualTags: [createTag({ id: 'manual-1', name: '科技', color: '#22C55E' })],
      selectedManualTagIds: ['manual-1'],
    })

    const wrapper = createWrapper()

    const chips = wrapper.findAllComponents({ name: 'TagChip' })
    const manualChip = chips[0]

    // Click the remove button
    const removeBtn = manualChip.find('.remove-btn')
    await removeBtn.trigger('click')

    expect(store.removeTagFromStock).toHaveBeenCalledWith('test-stock-1', 'manual-1')
  })

  it('renders tag-bar even when no tags exist (empty state)', () => {
    setupStore({
      autoTags: [],
      manualTags: [],
      selectedManualTagIds: [],
    })

    const wrapper = createWrapper()

    expect(wrapper.find('.tag-bar').exists()).toBe(true)
    // No TagChip when no tags
    const chips = wrapper.findAllComponents({ name: 'TagChip' })
    expect(chips.length).toBe(0)
    // "管理标签" button should still be there
    expect(wrapper.find('.tag-manage-btn').exists()).toBe(true)
  })
})
