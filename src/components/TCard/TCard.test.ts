import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { TCard } from './index'

describe('TCard', () => {
  it('title 与 description 进头部，内容进 body', () => {
    const wrapper = mount(TCard, {
      props: { title: '违规记录', description: '近 30 天' },
      slots: { default: '内容' },
    })

    expect(wrapper.find('.t73-card__title').text()).toBe('违规记录')
    expect(wrapper.find('.t73-card__desc').text()).toBe('近 30 天')
    expect(wrapper.find('.t73-card__body').text()).toBe('内容')
  })

  it('没有标题、描述、头部或操作插槽时不渲染头部', () => {
    expect(mount(TCard, { slots: { default: '内容' } }).find('.t73-card__head').exists()).toBe(false)

    const withActions = mount(TCard, {
      slots: { actions: () => h('button', { class: 'act' }, '更多') },
    })
    expect(withActions.find('.t73-card__head').exists()).toBe(true)
    expect(withActions.find('.t73-card__actions .act').exists()).toBe(true)
  })

  it('padded / bordered / hoverable 的默认值与类名映射', () => {
    const fallback = mount(TCard, {})
    expect(fallback.classes()).toContain('t73-card--padded')
    expect(fallback.classes()).toContain('t73-card--bordered')
    // 默认不抬升：开发者侧没有悬浮阴影档
    expect(fallback.classes()).not.toContain('t73-card--hoverable')

    const tight = mount(TCard, { props: { padded: false, bordered: false, hoverable: true } })
    expect(tight.classes()).not.toContain('t73-card--padded')
    expect(tight.classes()).not.toContain('t73-card--bordered')
    expect(tight.classes()).toContain('t73-card--hoverable')
  })

  it('footer 插槽渲染在内容之后', () => {
    const wrapper = mount(TCard, {
      slots: { default: '内容', footer: () => h('span', { class: 'foot' }, '底部') },
    })
    expect(wrapper.find('.t73-card__footer .foot').text()).toBe('底部')
  })
})
