import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { TEmpty } from './index'

describe('TEmpty', () => {
  it('不给文案时用「暂无数据」兜底，并带 status 角色', () => {
    const wrapper = mount(TEmpty)
    expect(wrapper.find('.t73-empty__description').text()).toBe('暂无数据')
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('size 与 variant 落类名，默认 md + dashed', () => {
    const fallback = mount(TEmpty)
    expect(fallback.classes()).toContain('t73-empty--md')
    expect(fallback.classes()).toContain('t73-empty--dashed')

    const plain = mount(TEmpty, { props: { size: 'sm', variant: 'plain' } })
    expect(plain.classes()).toContain('t73-empty--sm')
    expect(plain.classes()).toContain('t73-empty--plain')
  })

  it('description 插槽覆盖文案，默认插槽换成图形区', () => {
    const wrapper = mount(TEmpty, {
      slots: {
        default: () => h('span', { class: 'graphic' }, '图'),
        description: () => h('span', { class: 'custom' }, '还没有记录'),
      },
    })

    expect(wrapper.find('.t73-empty__graphic .graphic').exists()).toBe(true)
    expect(wrapper.find('.t73-empty__description .custom').text()).toBe('还没有记录')
  })
})
