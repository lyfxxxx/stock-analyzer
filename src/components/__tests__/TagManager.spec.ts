import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import TagManager from '../TagManager.vue'
import { useTagStore } from '@/stores/tagStore'
import type { Tag } from '@/types/tag'

// Polyfill DataTransfer for jsdom (needed for HTML5 drag-and-drop tests)
if (typeof DataTransfer === 'undefined') {
  class DataTransferPolyfill {
    data: Record<string, string> = {}
    dropEffect: string = 'move'
    effectAllowed: string = 'move'
    files: File[] = []
    items: DataTransferItem[] = []
    types: string[] = []
    clearData(format?: string): void {
      if (format) { delete this.data[format] } else { this.data = {} }
    }
    getData(format: string): string { return this.data[format] || '' }
    setData(format: string, data: string): void { this.data[format] = data }
    setDragImage(_img: Element, _xOffset: number, _yOffset: number): void { /* no-op */ }
  }
  vi.stubGlobal('DataTransfer', DataTransferPolyfill)
}

// Mock dependencies
vi.mock('@/db', () => ({
  stockDB: {
    init: vi.fn(),
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
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }
}))

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

describe('TagManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('should render when visible is true', () => {
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-manager-overlay').exists()).toBe(true)
      expect(wrapper.find('.tag-manager-drawer').exists()).toBe(true)
    })

    it('should not render when visible is false', () => {
      const wrapper = mount(TagManager, { props: { visible: false } })
      expect(wrapper.find('.tag-manager-overlay').exists()).toBe(false)
      expect(wrapper.find('.tag-manager-drawer').exists()).toBe(false)
    })

    it('should emit close when overlay is clicked', async () => {
      const wrapper = mount(TagManager, { props: { visible: true } })
      await wrapper.find('.tag-manager-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when close button is clicked', async () => {
      const wrapper = mount(TagManager, { props: { visible: true } })
      await wrapper.find('.tag-manager-close').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('tag list', () => {
    it('should display tags sorted by sortOrder', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 't1', name: 'Beta', sortOrder: 1 }),
        createTag({ id: 't2', name: 'Alpha', sortOrder: 0 }),
        createTag({ id: 't3', name: 'Gamma', sortOrder: 2 }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      const tagNames = wrapper.findAll('.tag-item-name').map(el => el.text())
      expect(tagNames).toEqual(['Alpha', 'Beta', 'Gamma'])
    })

    it('should show lock icon for auto tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'a1', name: 'Auto Tag', isAuto: true }),
        createTag({ id: 'm1', name: 'Manual Tag', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      const lockIcons = wrapper.findAll('.tag-item-lock')
      expect(lockIcons).toHaveLength(1)
    })

    it('should apply muted styling to auto tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'a1', name: 'Auto', isAuto: true }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      const autoItem = wrapper.find('.tag-item-auto')
      expect(autoItem.exists()).toBe(true)
    })

    it('should show empty state when no tags exist', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = []
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.text()).toContain('暂无标签')
    })
  })

  describe('create tag', () => {
    it('should show create form with name input and color palette', () => {
      const store = useTagStore()
      store.initialized = true
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-create-input').exists()).toBe(true)
      expect(wrapper.find('.tag-create-color-palette').exists()).toBe(true)
      expect(wrapper.find('.tag-create-btn').exists()).toBe(true)
    })

    it('should call createTag on store when form submitted', async () => {
      const store = useTagStore()
      store.initialized = true
      store.createTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-create-input').setValue('New Tag')
      // Click the first color in the palette
      const colorSwatches = wrapper.findAll('.tag-color-swatch')
      await colorSwatches[0].trigger('click')
      await wrapper.find('.tag-create-btn').trigger('click')

      expect(store.createTag).toHaveBeenCalledWith('New Tag', expect.any(String))
    })

    it('should not call createTag when name is empty', async () => {
      const store = useTagStore()
      store.initialized = true
      store.createTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-create-input').setValue('')
      await wrapper.find('.tag-create-btn').trigger('click')

      expect(store.createTag).not.toHaveBeenCalled()
    })

    it('should clear input after successful creation', async () => {
      const store = useTagStore()
      store.initialized = true
      store.createTag = vi.fn().mockResolvedValue(createTag({ name: 'New Tag' }))
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-create-input').setValue('New Tag')
      await wrapper.find('.tag-create-btn').trigger('click')

      // Wait for async createTag to complete
      await nextTick()
      await nextTick()

      const input = wrapper.find('.tag-create-input').element as HTMLInputElement
      expect(input.value).toBe('')
    })

    it('should show error message when createTag throws', async () => {
      const store = useTagStore()
      store.initialized = true
      store.createTag = vi.fn().mockRejectedValue(new Error('标签名称已存在'))
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-create-input').setValue('Dupe')
      await wrapper.find('.tag-create-btn').trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('标签名称已存在')
    })

    it('should allow custom hex color input', () => {
      const store = useTagStore()
      store.initialized = true
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-color-hex-input').exists()).toBe(true)
    })

    it('should use selected palette color when creating', async () => {
      const store = useTagStore()
      store.initialized = true
      store.createTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-create-input').setValue('Custom Color')
      // Find and click a specific color swatch
      const colorSwatches = wrapper.findAll('.tag-color-swatch')
      await colorSwatches[3].trigger('click') // 4th color
      const selectedStyle = colorSwatches[3].attributes('style') || ''
      const match = selectedStyle.match(/background-color:\s*(#[A-Fa-f0-9]+)/)
      const expectedColor = match ? match[1] : '#3B82F6'

      await wrapper.find('.tag-create-btn').trigger('click')
      expect(store.createTag).toHaveBeenCalledWith('Custom Color', expectedColor)
    })
  })

  describe('edit tag', () => {
    it('should show edit button for manual tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Manual', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-item-edit').exists()).toBe(true)
    })

    it('should not show edit button for auto tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'a1', name: 'Auto', isAuto: true }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-item-edit').exists()).toBe(false)
    })

    it('should enter edit mode when edit button clicked', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'My Tag', color: '#22C55E', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-edit').trigger('click')
      expect(wrapper.find('.tag-edit-form').exists()).toBe(true)
      expect(wrapper.find('.tag-edit-cancel').exists()).toBe(true)
      expect(wrapper.find('.tag-edit-save').exists()).toBe(true)
    })

    it('should call updateTag on save', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Old Name', color: '#22C55E', isAuto: false }),
      ]
      store.updateTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-edit').trigger('click')
      const nameInput = wrapper.find('.tag-edit-name-input')
      await nameInput.setValue('New Name')
      await wrapper.find('.tag-edit-save').trigger('click')

      expect(store.updateTag).toHaveBeenCalledWith('m1', { name: 'New Name', color: expect.any(String) })
    })

    it('should cancel editing without saving', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'My Tag', color: '#22C55E', isAuto: false }),
      ]
      store.updateTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-edit').trigger('click')
      // Edit form should be visible (display form is hidden)
      expect(wrapper.find('.tag-edit-form').exists()).toBe(true)

      const cancelBtn = wrapper.find('.tag-edit-cancel')
      await cancelBtn.trigger('click')

      expect(wrapper.find('.tag-edit-form').exists()).toBe(false)
      expect(store.updateTag).not.toHaveBeenCalled()
    })
  })

  describe('delete tag', () => {
    it('should show delete button for manual tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Manual', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-item-delete').exists()).toBe(true)
    })

    it('should not show delete button for auto tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'a1', name: 'Auto', isAuto: true }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-item-delete').exists()).toBe(false)
    })

    it('should show confirmation dialog before deleting', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Delete Me', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-delete').trigger('click')
      expect(wrapper.find('.tag-delete-confirm').exists()).toBe(true)
      expect(wrapper.text()).toContain('确认删除')
      expect(wrapper.text()).toContain('Delete Me')
    })

    it('should call deleteTag when confirm button clicked', async () => {
      const store = useTagStore()
      const tag = createTag({ id: 'm1', name: 'Delete Me', isAuto: false })
      store.initialized = true
      store.tags = [tag]
      store.deleteTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-delete').trigger('click')
      await wrapper.find('.tag-delete-confirm-btn').trigger('click')

      expect(store.deleteTag).toHaveBeenCalledWith('m1')
    })

    it('should cancel deletion without calling deleteTag', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Delete Me', isAuto: false }),
      ]
      store.deleteTag = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-item-delete').trigger('click')
      await wrapper.find('.tag-delete-cancel-btn').trigger('click')

      expect(wrapper.find('.tag-delete-confirm').exists()).toBe(false)
      expect(store.deleteTag).not.toHaveBeenCalled()
    })
  })

  describe('drag-and-drop reorder', () => {
    it('should not show drag handle for auto tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'a1', name: 'Auto', isAuto: true }),
        createTag({ id: 'm1', name: 'Manual', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      const autoDragHandles = wrapper.find('.tag-item-auto .tag-drag-handle')
      expect(autoDragHandles.exists()).toBe(false)
    })

    it('should show drag handle for manual tags', () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 'm1', name: 'Manual', isAuto: false }),
      ]
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-drag-handle').exists()).toBe(true)
    })

    it('should call reorderTags on drop', async () => {
      const store = useTagStore()
      store.initialized = true
      store.tags = [
        createTag({ id: 't1', name: 'First', sortOrder: 0, isAuto: false }),
        createTag({ id: 't2', name: 'Second', sortOrder: 1, isAuto: false }),
        createTag({ id: 't3', name: 'Third', sortOrder: 2, isAuto: false }),
      ]
      store.reorderTags = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      // Simulate dragstart on t3's drag handle
      const items = wrapper.findAll('.tag-manager-item')
      const dragEvent = new DataTransfer()

      // Start dragging the third item (sortOrder 2 → target position 0)
      const dragHandle = items[2].find('.tag-drag-handle')
      if (dragHandle.exists()) {
        await dragHandle.trigger('dragstart', { dataTransfer: dragEvent })
      }

      await items[0].trigger('dragover', { dataTransfer: dragEvent })
      await items[0].trigger('drop', { dataTransfer: dragEvent })

      expect(store.reorderTags).toHaveBeenCalled()
    })
  })

  describe('sync auto tags', () => {
    it('should render sync auto tags button', () => {
      const store = useTagStore()
      store.initialized = true
      const wrapper = mount(TagManager, { props: { visible: true } })
      expect(wrapper.find('.tag-sync-btn').exists()).toBe(true)
    })

    it('should call updateAllAutoTags when sync button clicked', async () => {
      const store = useTagStore()
      store.initialized = true
      store.updateAllAutoTags = vi.fn()
      const wrapper = mount(TagManager, { props: { visible: true } })

      await wrapper.find('.tag-sync-btn').trigger('click')
      expect(store.updateAllAutoTags).toHaveBeenCalled()
    })
  })

  describe('component lifecycle', () => {
    it('should init store on mount', () => {
      const store = useTagStore()
      store.init = vi.fn()
      store.initialized = false
      mount(TagManager, { props: { visible: true } })
      expect(store.init).toHaveBeenCalled()
    })

    it('should not init store if already initialized', () => {
      const store = useTagStore()
      store.init = vi.fn()
      store.initialized = true
      mount(TagManager, { props: { visible: true } })
      expect(store.init).not.toHaveBeenCalled()
    })
  })
})
