import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TDropdown, TDropdownItem, TDropdownMenu } from './index'

const mounted: Array<ReturnType<typeof mount>> = []

function mountDropdown(props: Record<string, unknown> = {}, command: unknown = 'archive') {
  const wrapper = mount(TDropdown, {
    props,
    slots: {
      default: () => h('button', { class: 'trigger' }, '操作'),
      dropdown: () =>
        h(TDropdownMenu, {}, () => [
          h(TDropdownItem, { command }, () => '归档'),
          h(TDropdownItem, { command: 'remove', tone: 'danger', divided: true }, () => '删除'),
          h(TDropdownItem, { command: 'disabled-one', disabled: true }, () => '不可用'),
        ]),
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** 点触发元素展开菜单。多根组件挂载后要等一拍根节点才稳定 */
async function openMenu(wrapper: ReturnType<typeof mount>) {
  await nextTick()
  await wrapper.find('.t73-dropdown').trigger('click')
  await nextTick()
}

function items(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.t73-dropdown-item'))
}

function panel(): HTMLElement | null {
  return document.body.querySelector('.t73-dropdown__panel')
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TDropdown', () => {
  it('点菜单项把 command 原样回抛，并按 hideOnClick 收起', async () => {
    const wrapper = mountDropdown({}, { action: 'archive', id: 7 })
    await openMenu(wrapper)

    items()[0]!.click()
    await nextTick()

    // command 是对象也要原样回抛，不能被字符串化
    expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'archive', id: 7 }])
    expect(panel()).toBe(null)
  })

  it('禁用项点了不发 command，danger / divided 落到类名上', async () => {
    const wrapper = mountDropdown()
    await openMenu(wrapper)

    expect(items()[1]!.classList.contains('t73-dropdown-item--danger')).toBe(true)
    expect(items()[1]!.classList.contains('t73-dropdown-item--divided')).toBe(true)

    items()[2]!.click()
    await nextTick()
    expect(wrapper.emitted('command')).toBeUndefined()
  })

  it('hideOnClick=false 时选完不收起（多选式菜单）', async () => {
    const wrapper = mountDropdown({ hideOnClick: false })
    await openMenu(wrapper)

    items()[0]!.click()
    await nextTick()

    expect(wrapper.emitted('command')).toHaveLength(1)
    expect(panel()).not.toBe(null)
  })

  it('disabled 时点触发器不展开', async () => {
    const wrapper = mountDropdown({ disabled: true })
    await openMenu(wrapper)

    expect(panel()).toBe(null)
    expect(wrapper.find('.t73-dropdown').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.t73-dropdown').classes()).toContain('t73-dropdown--disabled')
  })

  it('Esc 收起菜单', async () => {
    const wrapper = mountDropdown()
    await openMenu(wrapper)
    expect(panel()).not.toBe(null)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(panel()).toBe(null)
  })

  it('TDropdownMenu 的 maxHeight 数字按 px 落地', async () => {
    const wrapper = mount(TDropdown, {
      slots: {
        default: () => h('button', { class: 'trigger' }, '操作'),
        dropdown: () =>
          h(TDropdownMenu, { maxHeight: 240 }, () => [h(TDropdownItem, { command: 'a' }, () => '归档')]),
      },
      attachTo: document.body,
    })
    mounted.push(wrapper)
    await openMenu(wrapper)

    const menu = document.body.querySelector('.t73-dropdown-menu') as HTMLElement | null
    expect(menu?.getAttribute('style') ?? '').toContain('max-height: 240px')
  })

  /**
   * 缺陷用例：`useOverlay` 在非受控模式下从不回调 `onAfterOpen` / `onAfterClose`，
   * 于是菜单的 `open` / `close` / `visible-change` 三个事件全都发不出来。
   */
  it.fails('展开菜单应发出 open 与 visible-change(true)（当前缺陷）', async () => {
    const wrapper = mountDropdown()
    await openMenu(wrapper)

    expect(wrapper.emitted('open')).toBeDefined()
    expect(wrapper.emitted('visible-change')?.[0]).toEqual([true])
  })
})
