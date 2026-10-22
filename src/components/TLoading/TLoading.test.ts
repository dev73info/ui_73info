import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TLoading } from './index'

describe('TLoading', () => {
  it('loading 时挂遮罩、标 aria-busy，关掉后遮罩消失', async () => {
    const wrapper = mount(TLoading, {
      props: { loading: true, text: '正在加载' },
      slots: { default: '内容' },
    })

    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.t73-loading__mask').exists()).toBe(true)
    expect(wrapper.find('.t73-loading__text').text()).toBe('正在加载')
    expect(wrapper.classes()).toContain('t73-loading--active')

    await wrapper.setProps({ loading: false })
    expect(wrapper.find('.t73-loading__mask').exists()).toBe(false)
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.classes()).not.toContain('t73-loading--active')
  })

  it('tag 把宿主元素换成对应标签，页面自己的 class 照旧落上去', () => {
    const wrapper = mount(TLoading, {
      props: { tag: 'section' },
      attrs: { class: 'dev-meta-strip' },
    })

    // 宿主元素本身就是组件根节点：页面选择器不该因为换成组件而错位
    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.classes()).toContain('dev-meta-strip')
    expect(wrapper.classes()).toContain('t73-loading')
  })

  it('不加载时不留任何遮罩节点，内容原样保留', () => {
    const wrapper = mount(TLoading, { slots: { default: '正文' } })
    expect(wrapper.text()).toBe('正文')
    expect(wrapper.find('.t73-loading__mask').exists()).toBe(false)
  })
})
