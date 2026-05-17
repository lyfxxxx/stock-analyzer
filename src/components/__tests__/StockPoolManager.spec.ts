import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StockPoolManager from '../StockPoolManager.vue'
import type { TagPool } from '@/types/tag'

// Mock tagStore
const mockAddTagPool = vi.fn()
const mockPutTagPool = vi.fn()
const mockDeleteTagPool = vi.fn()

vi.mock('@/stores/tagStore', () => ({
  useTagStore: () => ({
    addTagPool: mockAddTagPool,
    putTagPool: mockPutTagPool,
    deleteTagPool: mockDeleteTagPool,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

function createTagPool(overrides: Partial<TagPool> = {}): TagPool {
  return {
    id: `pool-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Pool',
    tagIds: ['tag-1', 'tag-2'],
    isDefault: false,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('StockPoolManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function createWrapper(options: {
    currentTagIds?: string[]
    tagPools?: TagPool[]
  } = {}) {
    return mount(StockPoolManager, {
      props: {
        currentTagIds: options.currentTagIds ?? [],
        tagPools: options.tagPools ?? [],
      },
    })
  }

  it('renders empty state when no pools', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('暂无保存的股票池')
  })

  it('renders pool list', () => {
    const pools = [
      createTagPool({ name: '我的港股池', tagIds: ['hk'], sortOrder: 0 }),
      createTagPool({ name: '价值低估池', tagIds: ['val1'], sortOrder: 1 }),
    ]

    const wrapper = createWrapper({ tagPools: pools })
    expect(wrapper.text()).toContain('我的港股池')
    expect(wrapper.text()).toContain('价值低估池')
  })

  it('renders tag count for each pool', () => {
    const pools = [
      createTagPool({ name: '池A', tagIds: ['a', 'b', 'c'] }),
    ]

    const wrapper = createWrapper({ tagPools: pools })
    expect(wrapper.text()).toContain('3 个标签')
  })

  it('shows default badge for default pool', () => {
    const pools = [
      createTagPool({ name: '默认池', isDefault: true }),
      createTagPool({ name: '普通池', isDefault: false }),
    ]

    const wrapper = createWrapper({ tagPools: pools })
    const badges = wrapper.findAll('.pool-default-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0].text()).toBe('默认')
  })

  it('highlights pool matching currentTagIds', () => {
    const pools = [
      createTagPool({ name: '匹配池', tagIds: ['a', 'b'] }),
      createTagPool({ name: '不匹配', tagIds: ['a', 'c'] }),
    ]

    const wrapper = createWrapper({
      currentTagIds: ['a', 'b'],
      tagPools: pools,
    })

    const items = wrapper.findAll('.pool-item')
    expect(items[0].classes()).toContain('pool-item-active')
    expect(items[1].classes()).not.toContain('pool-item-active')
  })

  it('emits load-pool when clicking a pool', async () => {
    const pools = [
      createTagPool({ name: '池A', tagIds: ['x', 'y', 'z'] }),
    ]

    const wrapper = createWrapper({ tagPools: pools })
    await wrapper.find('.pool-item-main').trigger('click')

    expect(wrapper.emitted('load-pool')).toBeTruthy()
    expect(wrapper.emitted('load-pool')![0]).toEqual([['x', 'y', 'z']])
  })

  it('shows save input when clicking save button', async () => {
    const wrapper = createWrapper({
      currentTagIds: ['tag-1'],
    })

    await wrapper.find('.pool-save-btn').trigger('click')
    expect(wrapper.find('.pool-save-form').exists()).toBe(true)
    expect(wrapper.find('.pool-name-input').exists()).toBe(true)
  })

  it('save button is disabled when no tags selected', () => {
    const wrapper = createWrapper({ currentTagIds: [] })
    expect(wrapper.find('.pool-save-btn').attributes('disabled')).toBeDefined()
  })

  it('save button is enabled when tags are selected', () => {
    const wrapper = createWrapper({ currentTagIds: ['tag-1'] })
    expect(wrapper.find('.pool-save-btn').attributes('disabled')).toBeUndefined()
  })

  it('calls addTagPool when saving a new pool', async () => {
    mockAddTagPool.mockResolvedValue(undefined)

    const wrapper = createWrapper({
      currentTagIds: ['tag-1', 'tag-2'],
    })

    // Open save form
    await wrapper.find('.pool-save-btn').trigger('click')

    // Fill in name
    const input = wrapper.find('.pool-name-input')
    await input.setValue('我的筛选')

    // Click confirm
    await wrapper.find('.pool-btn-confirm').trigger('click')

    expect(mockAddTagPool).toHaveBeenCalledWith('我的筛选', ['tag-1', 'tag-2'], false)
  })

  it('calls addTagPool with isDefault=true when checkbox is checked', async () => {
    mockAddTagPool.mockResolvedValue(undefined)

    const wrapper = createWrapper({
      currentTagIds: ['tag-1'],
    })

    // Open save form
    await wrapper.find('.pool-save-btn').trigger('click')

    // Fill in name
    await wrapper.find('.pool-name-input').setValue('默认池')

    // Check "设为默认"
    const checkbox = wrapper.find('.pool-default-checkbox input[type="checkbox"]')
    await checkbox.setValue(true)

    // Click confirm
    await wrapper.find('.pool-btn-confirm').trigger('click')

    expect(mockAddTagPool).toHaveBeenCalledWith('默认池', ['tag-1'], true)
  })

  it('calls deleteTagPool when delete button is clicked', async () => {
    mockDeleteTagPool.mockResolvedValue(undefined)

    const pool = createTagPool({ name: '待删除' })
    const wrapper = createWrapper({ tagPools: [pool] })

    await wrapper.find('.pool-action-danger').trigger('click')

    expect(mockDeleteTagPool).toHaveBeenCalledWith(pool.id)
  })

  it('calls putTagPool when toggling default', async () => {
    mockPutTagPool.mockResolvedValue(undefined)

    const pool = createTagPool({ name: '池A', isDefault: false })
    const wrapper = createWrapper({ tagPools: [pool] })

    // First action button is the star toggle
    const actionBtns = wrapper.findAll('.pool-action-btn')
    await actionBtns[0].trigger('click')

    expect(mockPutTagPool).toHaveBeenCalledWith(
      expect.objectContaining({
        id: pool.id,
        isDefault: true,
      })
    )
  })

  it('sorts pools by sortOrder', () => {
    const pools = [
      createTagPool({ name: '第二个', sortOrder: 1 }),
      createTagPool({ name: '第一个', sortOrder: 0 }),
      createTagPool({ name: '第三个', sortOrder: 2 }),
    ]

    const wrapper = createWrapper({ tagPools: pools })
    const names = wrapper.findAll('.pool-item-name').map(el => el.text())

    expect(names).toEqual(['第一个', '第二个', '第三个'])
  })

  it('confirm button is disabled when name is empty', async () => {
    const wrapper = createWrapper({ currentTagIds: ['tag-1'] })

    await wrapper.find('.pool-save-btn').trigger('click')
    const confirmBtn = wrapper.find('.pool-btn-confirm')

    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })

  it('cancels save form when cancel is clicked', async () => {
    const wrapper = createWrapper({ currentTagIds: ['tag-1'] })

    await wrapper.find('.pool-save-btn').trigger('click')
    expect(wrapper.find('.pool-save-form').exists()).toBe(true)

    await wrapper.find('.pool-btn-cancel').trigger('click')
    expect(wrapper.find('.pool-save-form').exists()).toBe(false)
  })

  it('cancels save form when escape is pressed', async () => {
    const wrapper = createWrapper({ currentTagIds: ['tag-1'] })

    await wrapper.find('.pool-save-btn').trigger('click')
    expect(wrapper.find('.pool-save-form').exists()).toBe(true)

    const input = wrapper.find('.pool-name-input')
    await input.trigger('keydown.escape')

    expect(wrapper.find('.pool-save-form').exists()).toBe(false)
  })

  it('does not render save form initially', () => {
    const wrapper = createWrapper({ currentTagIds: ['tag-1'] })
    expect(wrapper.find('.pool-save-form').exists()).toBe(false)
  })
})
