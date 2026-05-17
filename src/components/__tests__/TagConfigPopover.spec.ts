import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TagConfigPopover from '../TagConfigPopover.vue'
import { useTagStore } from '@/stores/tagStore'
import type { Tag, StockTag } from '@/types/tag'

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

// ── Factories ──

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
      createTag({ id: 'manual-3', name: '消费', color: '#EC4899', sortOrder: 12 }),
    ],
    selectedManualTagIds = ['manual-1'],
  } = options

  const store = useTagStore()

  // Set store data directly (Pinia unwraps refs)
  const allTags: Tag[] = [...autoTags, ...manualTags]
  store.tags = allTags as any

  // Build stockTag entries
  const stockId = 'stock-1'
  const stockTagEntries: StockTag[] = [
    ...autoTags.map(t => createStockTag({ id: `st-${t.id}`, stockId, tagId: t.id })),
    ...selectedManualTagIds.map(tagId => createStockTag({ id: `st-${tagId}`, stockId, tagId })),
  ]
  store.stockTags = stockTagEntries as any

  // Mark as initialized
  store.initialized = true

  // Mock store methods
  store.addTagToStock = vi.fn().mockResolvedValue(undefined)
  store.removeTagFromStock = vi.fn().mockResolvedValue(true)

  return store
}

describe('TagConfigPopover', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Trigger slot ──

  it('renders trigger slot content', () => {
    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<span class="trigger-content">配置</span>' },
    })
    expect(wrapper.find('.trigger-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('配置')
  })

  it('should be closed by default', () => {
    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })
    expect(wrapper.find('.tag-config-popover').exists()).toBe(false)
  })

  // ── Open / Close ──

  it('opens popover on trigger click (default trigger)', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)
  })

  it('closes popover on second trigger click', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    // Open
    await wrapper.find('.tag-config-trigger').trigger('click')
    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)

    // Close
    await wrapper.find('.tag-config-trigger').trigger('click')
    // Wait for transition leave to complete
    await new Promise(r => setTimeout(r, 200))

    expect(wrapper.find('.tag-config-popover').exists()).toBe(false)
  })

  it('does not open on click when trigger is "hover"', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1', trigger: 'hover' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')
    expect(wrapper.find('.tag-config-popover').exists()).toBe(false)
  })

  // ── Auto tags display ──

  it('displays auto tags for the stock in the popover', async () => {
    const autoTags = [
      createTag({ id: 'auto-hk', name: '港股', isAuto: true, color: '#3B82F6' }),
      createTag({ id: 'auto-val1-low', name: '估值1低估', isAuto: true, color: '#22C55E' }),
    ]
    setupStore({ autoTags })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    expect(wrapper.text()).toContain('港股')
    expect(wrapper.text()).toContain('估值1低估')
  })

  it('shows empty state message when no auto tags for the stock', async () => {
    setupStore({ autoTags: [] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    expect(wrapper.text()).toContain('暂无可用的自动标签')
  })

  // ── Manual tags display ──

  it('displays all manual tags in the selection area', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    expect(wrapper.text()).toContain('科技')
    expect(wrapper.text()).toContain('金融')
    expect(wrapper.text()).toContain('消费')
  })

  it('shows empty state message when no manual tags exist', async () => {
    setupStore({ manualTags: [] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    expect(wrapper.text()).toContain('暂无手动标签')
  })

  // ── Selection state ──

  it('pre-checks already selected manual tags', async () => {
    setupStore({ selectedManualTagIds: ['manual-1'] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)

    const checked = checkboxes.filter(cb => cb.element.checked)
    expect(checked.length).toBe(1)
  })

  it('leaves unselected manual tags unchecked', async () => {
    setupStore({ selectedManualTagIds: ['manual-1'] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const unchecked = checkboxes.filter(cb => !cb.element.checked)
    expect(unchecked.length).toBe(2)
  })

  // ── Tag toggling ──

  it('calls addTagToStock when toggling an unselected manual tag', async () => {
    const store = setupStore({ selectedManualTagIds: ['manual-1'] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const unchecked = checkboxes.find(cb => !cb.element.checked)!
    expect(unchecked).toBeTruthy()

    await unchecked.trigger('change')

    expect(store.addTagToStock).toHaveBeenCalledWith('stock-1', expect.any(String))
    expect(store.removeTagFromStock).not.toHaveBeenCalled()
  })

  it('calls removeTagFromStock when toggling a selected manual tag', async () => {
    const store = setupStore({ selectedManualTagIds: ['manual-1'] })

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const checked = checkboxes.find(cb => cb.element.checked)!
    expect(checked).toBeTruthy()

    await checked.trigger('change')

    expect(store.removeTagFromStock).toHaveBeenCalledWith('stock-1', 'manual-1')
    expect(store.addTagToStock).not.toHaveBeenCalled()
  })

  // ── Click outside ──

  it('closes popover when clicking outside', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
      attachTo: document.body,
    })

    // Open popover
    await wrapper.find('.tag-config-trigger').trigger('click')
    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)

    // Click outside (on document body)
    document.body.click()
    await new Promise(r => setTimeout(r, 200))

    expect(wrapper.find('.tag-config-popover').exists()).toBe(false)
  })

  it('keeps popover open when clicking inside it', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
      attachTo: document.body,
    })

    await wrapper.find('.tag-config-trigger').trigger('click')
    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)

    // Click inside popover
    const popoverEl = wrapper.find('.tag-config-popover')
    popoverEl.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)
  })

  // ── Escape key ──

  it('closes popover on Escape key press', async () => {
    setupStore()

    const wrapper = mount(TagConfigPopover, {
      props: { stockId: 'stock-1' },
      slots: { default: '<button>触发</button>' },
    })

    await wrapper.find('.tag-config-trigger').trigger('click')
    expect(wrapper.find('.tag-config-popover').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await new Promise(r => setTimeout(r, 200))

    expect(wrapper.find('.tag-config-popover').exists()).toBe(false)
  })
})
