import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Pinia } from 'pinia'
import type { StockData } from '@/types/stock'
import AddStockView from '../AddStockView.vue'
import { useTagStore } from '@/stores/tagStore'
import { useStockListStore } from '@/stores/stockListStore'
import { useStockStore } from '@/stores/stockStore'

// ── Hoisted mocks ──

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}))

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
}))

vi.mock('@/db', () => ({ stockDB: mockDb }))

// ── Other module mocks ──

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/utils/validator', () => ({
  validateStockCode: vi.fn(() => ({ isValid: true, message: '' })),
}))

vi.mock('@/api/exchangeRate', () => ({
  fetchExchangeRates: vi.fn().mockResolvedValue({ rates: { HKD: 1, CNY: 0.9, USD: 7.8 } }),
}))

vi.mock('@/utils/prr-formatter', () => ({
  formatPRR: vi.fn(() => '1.0'),
  getPrrValuationBgClass: vi.fn(() => ''),
  getPrrFormulaText: vi.fn(() => ''),
  getPrrFormulaDescription: vi.fn(() => ''),
  getPrrValuationLevel: vi.fn(() => 'medium' as const),
}))

vi.mock('@/composables/useExcelParser', () => ({
  useExcelParser: vi.fn(() => ({
    parseFiles: vi.fn(),
    validationResult: { isValid: true },
    validationErrors: [],
  })),
  useValuation: vi.fn(() => ({
    calculate: vi.fn(),
  })),
}))

vi.mock('@/api/eastmoney', () => ({
  testEastMoneyAPI: vi.fn().mockResolvedValue({ source: 'eastmoney', status: 'success' }),
  fetchEastMoneyStockInfo: vi.fn(),
  searchStocksByName: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/tencent', () => ({
  testTencentAPI: vi.fn().mockResolvedValue({ source: 'tencent', status: 'success' }),
}))

vi.mock('@/api/financialReportA', () => ({
  fetchAStockFinancialReport: vi.fn(),
}))

vi.mock('@/api/financialReportHK', () => ({
  fetchHKStockFinancialReport: vi.fn(),
}))

vi.mock('@/utils/calculator', () => ({
  calculateNetCash: vi.fn(),
  calculateFreeCashFlow: vi.fn(),
  calculateValuations: vi.fn(),
  calculatePERatio: vi.fn(),
  calculateCurrentRatio: vi.fn(),
}))

vi.mock('@/api/financialIndicatorsA', () => ({
  fetchAllIndicatorsA: vi.fn(),
}))
vi.mock('@/api/financialIndicatorsHK', () => ({
  fetchHKFinancialIndicators: vi.fn(),
}))

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

// ── Tests ──

describe('AddStockView - tag integration', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  /** Mount wrapper with store mocks set up before component mounts.
   *  Stores are initialized FIRST so the facade captures spied methods. */
  async function createWrapperWithMocks(
    routeParams: Record<string, string> = {},
    setupStores?: (tagStore: ReturnType<typeof useTagStore>, listStore: ReturnType<typeof useStockListStore>) => void,
  ) {
    // Eagerly create stores so facade captures correctly
    const tagStore = useTagStore()
    const listStore = useStockListStore()
    useStockStore()

    setupStores?.(tagStore, listStore)

    const { useRoute } = await import('vue-router')
    vi.mocked(useRoute).mockReturnValue({ params: routeParams } as any)

    const wrapper = shallowMount(AddStockView, {
      global: { plugins: [pinia], stubs: { TagConfigPopover: true } },
    })

    await vi.dynamicImportSettled()
    await nextTick()
    return { wrapper, tagStore, listStore }
  }

  // ── Template: TagConfigPopover visibility ──

  it('不显示 TagConfigPopover（新增模式）', async () => {
    const { wrapper } = await createWrapperWithMocks({})
    expect(wrapper.findComponent({ name: 'TagConfigPopover' }).exists()).toBe(false)
  })

  it('显示 TagConfigPopover（编辑模式）', async () => {
    mockDb.get.mockResolvedValue(makeMockStock({ id: 'stock-edit-1' }))

    const { wrapper } = await createWrapperWithMocks({ id: 'stock-edit-1' })

    expect(wrapper.findComponent({ name: 'TagConfigPopover' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TagConfigPopover' }).props('stockId')).toBe('stock-edit-1')
  })

  // ── saveStock + syncAutoTags ──

  it('编辑模式下保存后调用 syncAutoTags', async () => {
    const existingStock = makeMockStock({ id: 'stock-edit-1' })
    mockDb.get.mockResolvedValue(existingStock)
    mockDb.getAll.mockResolvedValue([existingStock])

    const { wrapper, tagStore } = await createWrapperWithMocks(
      { id: 'stock-edit-1' },
      (tagStore) => {
        // Direct assignment (avoids Pinia action wrapping issues)
        ;(tagStore as any).syncAutoTags = vi.fn().mockResolvedValue(undefined)
      },
    )

    // Use saveStock via vm (same approach as add mode test)
    const vm = wrapper.vm as any
    expect(typeof vm.saveStock).toBe('function')
    await vm.saveStock()

    expect(tagStore.syncAutoTags).toHaveBeenCalledTimes(1)
    expect(tagStore.syncAutoTags).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stock-edit-1', code: '00700' }),
    )
  })

  it('新增模式下保存后调用 syncAutoTags', async () => {
    const { wrapper, tagStore } = await createWrapperWithMocks(
      {},
      (tagStore, listStore) => {
        // Replace addStock
        ;(listStore as any).addStock = vi.fn().mockImplementation(
          async (stock: any) => {
            ;(listStore as any).stocks = [stock]
          },
        )

        ;(tagStore as any).syncAutoTags = vi.fn().mockResolvedValue(undefined)
      },
    )

    const vm = wrapper.vm as any
    vm.previewData = makeMockStock()
    await nextTick()
    await vm.saveStock()

    expect(tagStore.syncAutoTags).toHaveBeenCalledTimes(1)
    expect(tagStore.syncAutoTags).toHaveBeenCalledWith(
      expect.objectContaining({ code: '00700', market: 'HK' }),
    )
  })

  it('tagStore 未初始化时自动初始化', async () => {
    const { wrapper, tagStore } = await createWrapperWithMocks(
      {},
      (tagStore, listStore) => {
        ;(listStore as any).addStock = vi.fn().mockImplementation(
          async (stock: any) => {
            ;(listStore as any).stocks = [stock]
          },
        )
      },
    )

    tagStore.initialized = false
    ;(tagStore as any).init = vi.fn().mockResolvedValue(undefined)
    ;(tagStore as any).syncAutoTags = vi.fn().mockResolvedValue(undefined)

    const vm = wrapper.vm as any
    vm.previewData = makeMockStock()
    await nextTick()
    await vm.saveStock()

    expect(tagStore.init).toHaveBeenCalledTimes(1)
    expect(tagStore.syncAutoTags).toHaveBeenCalledTimes(1)
  })
})
