import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TDialog } from './index'

const mounted: Array<ReturnType<typeof mount>> = []

/**
 * `teleportTo: false` 让弹窗就地渲染：否则 panel 会挂到 body，
 * 断言要全部走 document。行为（焦点陷阱 / Esc / 遮罩）与 teleport 无关。
 */
function mountDialog(
  props: Record<string, unknown> = {},
  slots?: Record<string, () => unknown>,
) {
  // 不 attachTo：`teleportTo: false` 已经把面板留在组件子树里，
  // 挂到 body 反而会让两个弹窗的焦点陷阱互相抢焦点（jsdom 里会栈溢出）
  const wrapper = mount(TDialog, { props: { open: true, teleportTo: false, ...props }, slots })
  mounted.push(wrapper)
  return wrapper
}

function panel(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[role="dialog"]')
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TDialog', () => {
  it('open=false 什么都不渲染，open=true 渲染带标题的 dialog', async () => {
    const closed = mountDialog({ open: false })
    await nextTick()
    expect(panel(closed).exists()).toBe(false)

    const opened = mountDialog({ title: '充值' })
    await nextTick()
    expect(panel(opened).exists()).toBe(true)
    expect(panel(opened).attributes('aria-modal')).toBe('true')
    expect(panel(opened).find('.t73-dialog__title').text()).toBe('充值')
  })

  it('点关闭按钮发出 update:open=false 与 close("close-button")', async () => {
    const wrapper = mountDialog({ title: '充值' })
    await nextTick()

    await panel(wrapper).find('.t73-dialog__close').trigger('click')

    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['close-button'])
  })

  it('按 Esc 关闭，原因记为 escape', async () => {
    const wrapper = mountDialog()
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')?.[0]).toEqual(['escape'])
  })

  it('点遮罩关闭记为 mask；maskClosable=false 时点了不关', async () => {
    const wrapper = mountDialog()
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('close')?.[0]).toEqual(['mask'])

    const locked = mountDialog({ maskClosable: false })
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
    await nextTick()
    expect(locked.emitted('close')).toBeUndefined()
  })

  it('escapedClosable=false 时 Esc 不关', async () => {
    const wrapper = mountDialog({ escapeClosable: false })
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('代码方式关闭走同一套事件，原因记为 api', async () => {
    const wrapper = mountDialog()
    await nextTick()

    ;(wrapper.vm as unknown as { close: () => void }).close()

    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['api'])
  })

  it('footer 插槽渲染在正文之后；无标题时必须靠 aria-label 命名', async () => {
    const wrapper = mountDialog({ ariaLabel: '确认删除' }, {
      default: () => h('p', '正文'),
      footer: () => h('button', { class: 'ok' }, '确定'),
    })
    await nextTick()

    expect(panel(wrapper).find('.ok').exists()).toBe(true)
    expect(panel(wrapper).attributes('aria-label')).toBe('确认删除')
    expect(panel(wrapper).attributes('aria-labelledby')).toBeUndefined()
  })

  it('width 数字按 px 落到面板宽度变量上', async () => {
    const wrapper = mountDialog({ width: 640 })
    await nextTick()
    expect(panel(wrapper).attributes('style') ?? '').toContain('--t73-dialog-width: 640px')
  })
})
