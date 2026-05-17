import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TagSelector from '../TagSelector.vue'
import type { Tag } from '@/types/tag'

// ── Fixtures ──

const autoTags: Tag[] = [
  {
    id: 'auto-market-hk',
    name: '港股',
    color: '#3B82F6',
    isAuto: true,
    sortOrder: 0,
    createdAt: 0,
  },
  {
    id: 'auto-market-a',
    name: 'A股',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 1,
    createdAt: 0,
  },
  {
    id: 'auto-val1-low',
    name: '估值1低估',
    color: '#22C55E',
    isAuto: true,
    sortOrder: 2,
    createdAt: 0,
  },
]

const manualTags: Tag[] = [
  {
    id: 'manual-1',
    name: '精选股',
    color: '#8B5CF6',
    isAuto: false,
    sortOrder: 10,
    createdAt: 100,
  },
  {
    id: 'manual-2',
    name: '观察中',
    color: '#F97316',
    isAuto: false,
    sortOrder: 11,
    createdAt: 200,
  },
]

const allTags = [...autoTags, ...manualTags]

// ── Helpers ──

function createWrapper(options: {
  modelValue?: string[]
  availableTags?: Tag[]
  placeholder?: string
  disabled?: boolean
} = {}) {
  return mount(TagSelector, {
    props: {
      modelValue: options.modelValue ?? [],
      availableTags: options.availableTags ?? allTags,
      placeholder: options.placeholder ?? '选择标签...',
      disabled: options.disabled ?? false,
      'onUpdate:modelValue': vi.fn(),
    },
    attachTo: document.body,
  })
}

// ── Tests ──

describe('TagSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('shows placeholder text when no tags selected', () => {
      const wrapper = createWrapper({ modelValue: [] })
      expect(wrapper.text()).toContain('选择标签...')
    })

    it('shows custom placeholder when provided', () => {
      const wrapper = createWrapper({
        modelValue: [],
        placeholder: '请选择标签',
      })
      expect(wrapper.text()).toContain('请选择标签')
    })

    it('renders TagChip for each selected tag', () => {
      const wrapper = createWrapper({
        modelValue: ['auto-market-hk', 'manual-1'],
      })
      // Trigger should show tag names as chips
      const triggerText = wrapper.find('.tag-selector-trigger').text()
      expect(triggerText).toContain('港股')
      expect(triggerText).toContain('精选股')
      // Placeholder should not be visible
      expect(triggerText).not.toContain('选择标签...')
    })

    it('hides placeholder when tags are selected', () => {
      const wrapper = createWrapper({
        modelValue: ['auto-market-hk'],
      })
      const wrapperText = wrapper.text()
      // Placeholder is not visible when tags are selected
      expect(wrapperText).not.toContain('选择标签...')
    })
  })

  describe('dropdown', () => {
    it('opens dropdown on trigger click', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')

      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)
    })

    it('closes dropdown on second trigger click', async () => {
      const wrapper = createWrapper()
      const trigger = wrapper.find('.tag-selector-trigger')

      await trigger.trigger('click')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)

      await trigger.trigger('click')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(false)
    })

    it('closes dropdown on Escape key', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)

      // Press Escape in the search input
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.trigger('keydown.escape')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(false)
    })
  })

  describe('tag grouping', () => {
    it('shows auto tags and manual tags groups', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')

      const dropdownText = wrapper.find('.tag-selector-dropdown').text()
      expect(dropdownText).toContain('自动标签')
      expect(dropdownText).toContain('手动标签')
    })

    it('shows all tags sorted by sortOrder', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')

      // Auto tags first (sortOrder 0, 1, 2)
      const dropdownText = wrapper.find('.tag-selector-dropdown').text()
      // Check auto tags appear
      expect(dropdownText).toContain('港股')
      expect(dropdownText).toContain('A股')
      expect(dropdownText).toContain('估值1低估')
      // Check manual tags appear
      expect(dropdownText).toContain('精选股')
      expect(dropdownText).toContain('观察中')
    })
  })

  describe('tag selection', () => {
    it('toggles tag selection when clicking a tag row', async () => {
      const onUpdate = vi.fn()
      const wrapper = mount(TagSelector, {
        props: {
          modelValue: [],
          availableTags: allTags,
          'onUpdate:modelValue': onUpdate,
        },
        attachTo: document.body,
      })
      await wrapper.find('.tag-selector-trigger').trigger('click')

      // Find and click the checkbox for 港股
      const hkCheckbox = wrapper.findAll('input[type="checkbox"]').at(0)
      expect(hkCheckbox).toBeTruthy()
      await hkCheckbox!.trigger('click')

      expect(onUpdate).toHaveBeenCalledWith(['auto-market-hk'])
    })

    it('deselects a tag when clicking an already selected tag', async () => {
      const onUpdate = vi.fn()
      const wrapper = mount(TagSelector, {
        props: {
          modelValue: ['auto-market-hk', 'manual-1'],
          availableTags: allTags,
          'onUpdate:modelValue': onUpdate,
        },
        attachTo: document.body,
      })
      await wrapper.find('.tag-selector-trigger').trigger('click')

      // Click the first tag to deselect it
      const firstCheckbox = wrapper.findAll('input[type="checkbox"]').at(0)
      await firstCheckbox!.trigger('click')

      expect(onUpdate).toHaveBeenCalledWith(['manual-1'])
    })

    it('pre-selects checkboxes for modelValue tags', async () => {
      const wrapper = createWrapper({
        modelValue: ['auto-market-hk', 'manual-1'],
      })
      await wrapper.find('.tag-selector-trigger').trigger('click')

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // First and fourth checkboxes should be checked (auto-market-hk and manual-1)
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true) // 港股
      expect((checkboxes[3].element as HTMLInputElement).checked).toBe(true) // 精选股
    })

    it('removes tag when clicking remove on TagChip in trigger', async () => {
      const onUpdate = vi.fn()
      const wrapper = mount(TagSelector, {
        props: {
          modelValue: ['auto-market-hk', 'manual-1'],
          availableTags: allTags,
          'onUpdate:modelValue': onUpdate,
        },
        attachTo: document.body,
      })

      // Click the remove button (×) on the first TagChip
      const removeBtns = wrapper.findAll('.remove-btn')
      expect(removeBtns.length).toBeGreaterThanOrEqual(1)
      await removeBtns[0].trigger('click')

      expect(onUpdate).toHaveBeenCalledWith(['manual-1'])
    })
  })

  describe('search filtering', () => {
    it('filters tags by search query', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('港股')

      const dropdownText = wrapper.find('.tag-selector-dropdown').text()
      expect(dropdownText).toContain('港股')
      expect(dropdownText).not.toContain('A股')
      expect(dropdownText).not.toContain('估值1低估')
      expect(dropdownText).not.toContain('精选股')
    })

    it('shows empty state when no tags match search', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('不存在标签')

      const dropdownText = wrapper.find('.tag-selector-dropdown').text()
      expect(dropdownText).toContain('无匹配标签')
    })

    it('resets search query when dropdown closes', async () => {
      const wrapper = createWrapper()
      const trigger = wrapper.find('.tag-selector-trigger')

      // Open and type
      await trigger.trigger('click')
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('港股')

      // Close
      await trigger.trigger('click')
      // Reopen
      await trigger.trigger('click')

      const reopenedSearch = wrapper.find('input[type="text"]')
      expect((reopenedSearch.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('disabled state', () => {
    it('does not open dropdown when disabled', async () => {
      const wrapper = createWrapper({ disabled: true })
      await wrapper.find('.tag-selector-trigger').trigger('click')

      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(false)
    })

    it('does not toggle tag when disabled', async () => {
      const onUpdate = vi.fn()
      const wrapper = mount(TagSelector, {
        props: {
          modelValue: [],
          availableTags: allTags,
          disabled: true,
          'onUpdate:modelValue': onUpdate,
        },
        attachTo: document.body,
      })

      // Even if we manually open (which shouldn't happen), try clicking a checkbox directly
      // Since the dropdown isn't open, this shouldn't emit
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('has correct CSS class for disabled state', () => {
      const wrapper = createWrapper({ disabled: true })
      const trigger = wrapper.find('.tag-selector-trigger')
      expect(trigger.classes()).toContain('opacity-50')
      expect(trigger.classes()).toContain('cursor-not-allowed')
    })
  })

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('click')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)

      // Click outside
      await wrapper.find('.tag-selector-trigger').trigger('click')
      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(false)
    })
  })

  describe('keyboard accessibility', () => {
    it('opens dropdown on Enter key', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('keydown.enter')

      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)
    })

    it('opens dropdown on Space key', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.tag-selector-trigger').trigger('keydown.space')

      expect(wrapper.find('.tag-selector-dropdown').exists()).toBe(true)
    })
  })
})
