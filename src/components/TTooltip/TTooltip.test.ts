import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TTooltip } from './index'

const mounted: Array<ReturnType<typeof mount>> = []

function mountTooltip(props: Record<string, unknown> = {}) {
  const wrapper = mount(TTooltip, {
    // 两个延迟都归零：否则要跟定时器赛跑，测的就不是「触发方式是否接对」了
    props: { content: '仅支持 JPG', showDelay: 0, hideDelay: 0, ...props },
    slots: { default: () => h('button', { class: 'anchor' }, '格式') },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

function panel(): HTMLElement | null {
  return document.body.querySelector('.t73-tooltip__panel')
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TTooltip', () => {
  it('悬停显示提示，移开收起', async () => {
    const wrapper = mountTooltip()
    await nextTick()

    await wrapper.find('.t73-tooltip').trigger('pointerenter')
    await nextTick()
    expect(panel()?.textContent).toContain('仅支持 JPG')
    expect(panel()?.getAttribute('role')).toBe('tooltip')

    await wrapper.find('.t73-tooltip').trigger('pointerleave')
    await nextTick()
    expect(panel()).toBe(null)
  })

  it('打开时锚点挂 aria-describedby，收起后撤掉', async () => {
    const wrapper = mountTooltip()
    await nextTick()
    const anchor = wrapper.find('.t73-tooltip')
    expect(anchor.attributes('aria-describedby')).toBeUndefined()

    await anchor.trigger('pointerenter')
    await nextTick()
    const describedBy = wrapper.find('.t73-tooltip').attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(panel()?.id).toBe(describedBy)

    await wrapper.find('.t73-tooltip').trigger('pointerleave')
    await nextTick()
    expect(wrapper.find('.t73-tooltip').attributes('aria-describedby')).toBeUndefined()
  })

  it('默认也吃 focus：键盘 Tab 过去就能看到提示', async () => {
    const wrapper = mountTooltip()
    await nextTick()

    await wrapper.find('.t73-tooltip').trigger('focusin')
    await nextTick()

    expect(panel()).not.toBe(null)
  })

  it('disabled 时悬停与聚焦都不显示', async () => {
    const wrapper = mountTooltip({ disabled: true })
    await nextTick()

    await wrapper.find('.t73-tooltip').trigger('pointerenter')
    await wrapper.find('.t73-tooltip').trigger('focusin')
    await nextTick()

    expect(panel()).toBe(null)
  })

  it('placement 决定尖角画在哪一侧，maxWidth 数字按 px 落地', async () => {
    const wrapper = mountTooltip({ placement: 'bottom', maxWidth: 200 })
    await nextTick()
    await wrapper.find('.t73-tooltip').trigger('pointerenter')
    await nextTick()

    // 类名跟着实际落位（jsdom 里没有布局，不触发翻转，就是 bottom）
    expect(panel()?.classList.contains('t73-tooltip__panel--bottom')).toBe(true)
    expect(panel()?.getAttribute('style') ?? '').toContain('max-width: 200px')
  })

  /**
   * 缺陷用例：`useOverlay` 在非受控模式下从不回调 `onAfterOpen` / `onAfterClose`，
   * 所以 `open` / `close` 事件永远发不出来。
   */
  it.fails('显示后应发出 open 事件（当前缺陷）', async () => {
    const wrapper = mountTooltip()
    await nextTick()

    await wrapper.find('.t73-tooltip').trigger('pointerenter')
    await nextTick()

    expect(wrapper.emitted('open')).toBeDefined()
  })
})
