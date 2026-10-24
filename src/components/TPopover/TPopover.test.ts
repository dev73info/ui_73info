import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TPopover } from './index'

const mounted: Array<ReturnType<typeof mount>> = []

function mountPopover(props: Record<string, unknown> = {}) {
  const wrapper = mount(TPopover, {
    props,
    slots: {
      default: () => h('button', { class: 'anchor' }, '查看规则'),
      content: () => h('span', { class: 'body' }, '这条规则在锁定后不可修改'),
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** 点锚点展开面板。多根组件挂载后要等一拍根节点才稳定 */
async function clickAnchor(wrapper: ReturnType<typeof mount>) {
  await nextTick()
  await wrapper.find('.t73-popover').trigger('click')
  await nextTick()
}

/** 同时开着多个气泡时取最后挂上的那个（前面的仍在 DOM 里） */
function panel(): HTMLElement | null {
  const all = document.body.querySelectorAll('.t73-popover__panel')
  return (all[all.length - 1] as HTMLElement | undefined) ?? null
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TPopover', () => {
  it('点锚点展开面板，面板里有正文与 dialog 角色', async () => {
    const wrapper = mountPopover({ ariaLabel: '规则说明' })
    await clickAnchor(wrapper)

    expect(panel()).not.toBe(null)
    expect(panel()?.textContent).toContain('这条规则在锁定后不可修改')
    expect(panel()?.getAttribute('role')).toBe('dialog')
    expect(panel()?.getAttribute('aria-label')).toBe('规则说明')
  })

  it('再点一次锚点收起（toggle）', async () => {
    const wrapper = mountPopover()
    await clickAnchor(wrapper)
    expect(panel()).not.toBe(null)

    await wrapper.find('.t73-popover').trigger('click')
    await nextTick()
    expect(panel()).toBe(null)
  })

  it('Esc 收起面板', async () => {
    const wrapper = mountPopover()
    await clickAnchor(wrapper)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(panel()).toBe(null)
  })

  it('disabled 时点了不展开', async () => {
    const wrapper = mountPopover({ disabled: true })
    await clickAnchor(wrapper)

    expect(panel()).toBe(null)
  })

  it('title 渲染成面板头部，arrow 默认画尖角', async () => {
    const wrapper = mountPopover({ title: '规则' })
    await clickAnchor(wrapper)

    expect(panel()?.querySelector('.t73-popover__header')?.textContent).toBe('规则')
    expect(panel()?.querySelector('.t73-popover__arrow')).not.toBe(null)

    const noArrow = mountPopover({ arrow: false })
    await clickAnchor(noArrow)
    expect(panel()?.querySelector('.t73-popover__arrow')).toBe(null)
  })

  it('受控 open 直接决定展开态', async () => {
    const wrapper = mountPopover({ open: true })
    await nextTick()
    expect(panel()).not.toBe(null)

    await wrapper.setProps({ open: false })
    await nextTick()
    expect(panel()).toBe(null)
  })

  /**
   * 缺陷用例：`useOverlay` 在非受控模式下从不回调 `onAfterOpen` / `onAfterClose`，
   * 所以气泡的 `open` / `close` 事件永远发不出来（消费方拿不到「已展开」的通知）。
   */
  it.fails('展开后应发出 open 事件（当前缺陷）', async () => {
    const wrapper = mountPopover()
    await clickAnchor(wrapper)

    expect(wrapper.emitted('open')).toBeDefined()
  })
})
