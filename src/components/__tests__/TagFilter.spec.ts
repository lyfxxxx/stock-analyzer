import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TagFilter from '../TagFilter.vue'
import type { Tag } from '@/types/tag'

/**
 * Teleport stub: renders content in-place instead of teleporting.
 * Avoids jsdom "insertBefore on null" errors in test environment.
 */
const TeleportStub = {
  props: ['to', 'disabled'],
  template: '<div><slot /></div>',
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

const autoTags: Tag[] = [
  createTag({ id: 'auto-1', name: '港股', isAuto: true, sortOrder: 0, color: '#3B82F6' }),
  createTag({ id: 'auto-2', name: 'A股', isAuto: true, sortOrder: 1, color: '#EF4444' }),
  createTag({ id: 'auto-3', name: '估值1低估', isAuto: true, sortOrder: 2, color: '#22C55E' }),
]

const manualTags: Tag[] = [
  createTag({ id: 'manual-1', name: '自选', isAuto: false, sortOrder: 0, color: '#8B5CF6' }),
  createTag({ id: 'manual-2', name: '关注', isAuto: false, sortOrder: 1, color: '#F59E0B' }),
]

const allTags = [...autoTags, ...manualTags]

function mountFilter(props: Record<string, unknown> = {}) {
  return mount(TagFilter, {
    props: {
      availableTags: allTags,
      modelValue: [],
      ...props,
    },
    global: {
      stubs: { Teleport: TeleportStub },
    },
    attachTo: document.body,
  })
}

describe('TagFilter', () => {
  let wrapper: ReturnType<typeof mountFilter>

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  describe('trigger button', () => {
    it('should render the filter button with no count when no tags selected', () => {
      wrapper = mountFilter()
      const btn = wrapper.find('.filter-trigger')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('筛选')
      expect(btn.find('.filter-count').exists()).toBe(false)
    })

    it('should show selected count when tags are selected', () => {
      wrapper = mountFilter({ modelValue: ['auto-1', 'manual-1'] })
      const count = wrapper.find('.filter-count')
      expect(count.exists()).toBe(true)
      expect(count.text()).toBe('2')
    })
  })

  describe('active chip bar', () => {
    it('should show removable chips for selected tags in the toolbar', () => {
      wrapper = mountFilter({ modelValue: ['auto-1', 'manual-1'] })
      const removeBtns = wrapper.findAll('.remove-btn')
      expect(removeBtns.length).toBe(2)
    })

    it('should not show chips when no tags selected', () => {
      wrapper = mountFilter()
      const removeBtns = wrapper.findAll('.remove-btn')
      expect(removeBtns.length).toBe(0)
    })

    it('should emit update:modelValue removing a tag when chip remove is clicked', async () => {
      wrapper = mountFilter({ modelValue: ['auto-1', 'auto-2'] })
      const removeBtns = wrapper.findAll('.remove-btn')
      await removeBtns[0].trigger('click')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1] as [string[]]
      expect(lastEmit[0]).toEqual(['auto-2'])
    })
  })

  describe('dropdown panel', () => {
    it('should open panel when trigger is clicked', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      expect(wrapper.find('.filter-panel').exists()).toBe(true)
    })

    it('should close panel when trigger is clicked again', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(true)

      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(false)
    })

    it('should close panel when clicking outside', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(true)

      document.body.click()
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(false)
    })

    it('should close panel on Escape key', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.find('.filter-panel').exists()).toBe(false)
    })

    it('should have high z-index on the panel', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const panel = wrapper.find('.filter-panel')
      // Check inline style attribute since jsdom doesn't compute z-index from inline styles
      expect(panel.attributes('style')).toContain('z-index')
    })
  })

  describe('tag rendering in dropdown', () => {
    it('should render auto tags and manual tags in separate groups', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const groups = wrapper.findAll('.tag-group')
      expect(groups.length).toBe(2)

      const groupLabels = wrapper.findAll('.group-label')
      expect(groupLabels[0].text()).toContain('自动标签')
      expect(groupLabels[1].text()).toContain('手动标签')
    })

    it('should render tags as clickable chip buttons in the dropdown', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const tagBtns = wrapper.findAll('.tag-chip-btn')
      expect(tagBtns.length).toBe(allTags.length)
    })

    it('should highlight selected tags with selected class', async () => {
      wrapper = mountFilter({ modelValue: ['auto-1', 'manual-1'] })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const selectedBtns = wrapper.findAll('.tag-chip-btn.selected')
      expect(selectedBtns.length).toBe(2)
    })

    it('should show empty state when no tags available', async () => {
      wrapper = mountFilter({ availableTags: [] })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      expect(wrapper.find('.empty-tags').exists()).toBe(true)
      expect(wrapper.find('.empty-tags').text()).toContain('暂无标签')
    })

    it('should not render group sections when no tags of that type exist', async () => {
      const onlyAuto = autoTags.slice(0, 1)
      wrapper = mountFilter({ availableTags: onlyAuto })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const groups = wrapper.findAll('.tag-group')
      expect(groups.length).toBe(1)
      expect(wrapper.find('.group-label').text()).toContain('自动标签')
    })
  })

  describe('user interactions', () => {
    it('should emit update:modelValue when a tag chip is clicked in dropdown', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const firstBtn = wrapper.find('.tag-chip-btn')
      await firstBtn.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue')![0] as [string[]]
      expect(emitted[0]).toHaveLength(1)
    })

    it('should deselect a tag when already-selected tag chip is clicked in dropdown', async () => {
      wrapper = mountFilter({ modelValue: ['auto-1'] })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      const tagBtns = wrapper.findAll('.tag-chip-btn')
      const auto1Btn = tagBtns.find(b => b.text().includes('港股'))
      expect(auto1Btn).toBeTruthy()
      expect(auto1Btn!.classes()).toContain('selected')

      await auto1Btn!.trigger('click')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1] as [string[]]
      expect(lastEmit[0]).toEqual([])
    })

    it('should clear all selections when clear button is clicked', async () => {
      wrapper = mountFilter({ modelValue: ['auto-1', 'auto-2', 'manual-1'] })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      await wrapper.find('.clear-btn').trigger('click')

      const emitted = wrapper.emitted('update:modelValue')
      const lastEmit = emitted![emitted!.length - 1] as [string[]]
      expect(lastEmit[0]).toEqual([])
    })

    it('should not show clear button when nothing is selected', async () => {
      wrapper = mountFilter()
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      expect(wrapper.find('.clear-btn').exists()).toBe(false)
    })

    it('should show clear button when tags are selected', async () => {
      wrapper = mountFilter({ modelValue: ['auto-1'] })
      await wrapper.find('.filter-trigger').trigger('click')
      await nextTick()

      expect(wrapper.find('.clear-btn').exists()).toBe(true)
    })
  })
})
