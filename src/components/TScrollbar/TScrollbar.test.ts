import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TScrollbar } from './index'

/**
 * jsdom 没有布局，`scrollHeight` / `clientHeight` 恒为 0，组件会判定「没有溢出」而不画滚动条。
 * 这里把尺寸直接钉在滚动元素上，让溢出判定成立——测的是「溢出之后组件怎么反应」。
 */
function stubOverflow(wrapper: ReturnType<typeof mount>): HTMLElement {
  const wrap = wrapper.find('.t73-scrollbar__wrap').element as HTMLElement
  Object.defineProperty(wrap, 'scrollHeight', { value: 400, configurable: true })
  Object.defineProperty(wrap, 'clientHeight', { value: 100, configurable: true })
  Object.defineProperty(wrap, 'scrollWidth', { value: 300, configurable: true })
  Object.defineProperty(wrap, 'clientWidth', { value: 100, configurable: true })
  return wrap
}

describe('TScrollbar', () => {
  it('滚动时发出 scroll，并按溢出情况画出两侧滚动条', async () => {
    const wrapper = mount(TScrollbar, { slots: { default: '内容' } })
    const wrap = stubOverflow(wrapper)

    await wrapper.find('.t73-scrollbar__wrap').trigger('scroll')

    expect(wrapper.emitted('scroll')).toHaveLength(1)
    expect(wrapper.find('.t73-scrollbar__bar--vertical').exists()).toBe(true)
    expect(wrapper.find('.t73-scrollbar__bar--horizontal').exists()).toBe(true)
    // thumb 长度 = 视口² / 内容长，100² / 400 = 25px
    const thumb = wrapper.find('.t73-scrollbar__thumb').attributes('style') ?? ''
    expect(thumb).toContain('height: 25px')
    expect(wrap).toBeTruthy()
  })

  it('内容不够长时不画滚动条，换成 native 后一律不画', async () => {
    const noOverflow = mount(TScrollbar, { slots: { default: '内容' } })
    await noOverflow.find('.t73-scrollbar__wrap').trigger('scroll')
    expect(noOverflow.find('.t73-scrollbar__bar').exists()).toBe(false)

    const native = mount(TScrollbar, { props: { native: true }, slots: { default: '内容' } })
    stubOverflow(native)
    await native.find('.t73-scrollbar__wrap').trigger('scroll')
    expect(native.find('.t73-scrollbar__bar').exists()).toBe(false)
    expect(native.classes()).toContain('t73-scrollbar--native')
  })

  it('指针移入/移出切换 active（滚动条显隐）', async () => {
    const wrapper = mount(TScrollbar, { slots: { default: '内容' } })
    stubOverflow(wrapper)
    await wrapper.find('.t73-scrollbar__wrap').trigger('scroll')

    await wrapper.trigger('pointerenter')
    expect(wrapper.classes()).toContain('t73-scrollbar--active')

    await wrapper.trigger('pointerleave')
    expect(wrapper.classes()).not.toContain('t73-scrollbar--active')
  })

  it('maxHeight / maxWidth 数字按 px 落到行内样式', () => {
    const wrapper = mount(TScrollbar, { props: { maxHeight: 240, maxWidth: '50%' } })
    const style = wrapper.attributes('style') ?? ''
    expect(style).toContain('max-height: 240px')
    expect(style).toContain('max-width: 50%')
  })
})
