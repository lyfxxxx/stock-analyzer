import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TagChip from '../TagChip.vue'
import type { Tag } from '@/types/tag'

function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'test-1',
    name: '港股',
    color: '#3B82F6',
    isAuto: false,
    sortOrder: 0,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('TagChip', () => {
  it('renders tag name', () => {
    const tag = createTag({ name: '港股' })
    const wrapper = mount(TagChip, { props: { tag } })
    expect(wrapper.text()).toContain('港股')
  })

  it('renders lock icon for auto tags', () => {
    const tag = createTag({ isAuto: true })
    const wrapper = mount(TagChip, { props: { tag } })
    const lockSvg = wrapper.find('svg')
    expect(lockSvg.exists()).toBe(true)
  })

  it('does not render lock icon for non-auto tags', () => {
    const tag = createTag({ isAuto: false })
    const wrapper = mount(TagChip, { props: { tag } })
    const lockSvg = wrapper.find('svg')
    expect(lockSvg.exists()).toBe(false)
  })

  it('renders remove button when removable is true', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, removable: true } })
    const removeBtn = wrapper.find('.remove-btn')
    expect(removeBtn.exists()).toBe(true)
  })

  it('does not render remove button when removable is false (default)', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag } })
    const removeBtn = wrapper.find('.remove-btn')
    expect(removeBtn.exists()).toBe(false)
  })

  it('emits click event when clicked and clickable is true', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0]).toEqual([tag])
  })

  it('does not emit click when clickable is false', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: false } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('emits remove event when remove button clicked', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, removable: true } })
    await wrapper.find('.remove-btn').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual([tag])
  })

  it('emits click but not remove when chip body is clicked and removable', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, removable: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('applies sm classes by default', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag } })
    // sm: text-[11px] px-2 py-0.5
    expect(wrapper.classes()).toContain('text-[11px]')
    expect(wrapper.classes()).not.toContain('text-xs')
  })

  it('applies md classes when size is md', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, size: 'md' } })
    expect(wrapper.classes()).toContain('text-xs')
  })

  it('applies cursor-pointer when clickable is true', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: true } })
    expect(wrapper.classes()).toContain('cursor-pointer')
  })

  it('does not apply cursor-pointer when clickable is false', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: false } })
    expect(wrapper.classes()).not.toContain('cursor-pointer')
  })

  it('has role button and tabindex when clickable', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: true } })
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
  })

  it('has tabindex -1 when not clickable', () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: false } })
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })

  it('sets background color with opacity from tag.color', () => {
    const tag = createTag({ color: '#EF4444' })
    const wrapper = mount(TagChip, { props: { tag } })
    const style = wrapper.attributes('style') || ''
    // Background uses tag.color with ~10% opacity (1A hex alpha)
    expect(style).toContain('background-color: rgba(239, 68, 68')
    expect(style).toContain('color: rgb(239, 68, 68)')
  })

  it('handles keyboard Enter on chip', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: true } })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('handles keyboard Space on chip', async () => {
    const tag = createTag()
    const wrapper = mount(TagChip, { props: { tag, clickable: true } })
    await wrapper.trigger('keydown.space')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
