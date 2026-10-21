import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import { TSelect, TOption, TOptionGroup } from './index'

const OPTIONS = [
  { label: '支付宝', value: 'alipay' },
  { label: '微信', value: 'wechat' },
  { label: '银行卡', value: 'bank', disabled: true },
]

/** 挂载过的实例，逐个卸载：面板是 Teleport 到 body 的，不清理会串到下一个用例 */
const mounted: Array<ReturnType<typeof mount>> = []

function mountSelect(props: Record<string, unknown> = {}) {
  const wrapper = mount(TSelect, {
    props: { modelValue: null, options: OPTIONS, ...props },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** 点触发器展开面板。多根组件挂载后要等一拍根节点才稳定 */
async function openPanel(wrapper: ReturnType<typeof mount>) {
  await nextTick()
  await wrapper.find('.t73-select').trigger('click')
  await nextTick()
}

function optionElements(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.t73-option'))
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TSelect', () => {
  it('点选项发出 update:modelValue 与 change，单选收起面板', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    optionElements()[1]!.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['wechat'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['wechat'])
    expect(wrapper.find('.t73-select').classes()).not.toContain('t73-select--open')
  })

  it('点击时不给事件对象、禁用项不响应（键名与载荷都按契约走）', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    // 第三项是 disabled，点了不能发事件
    optionElements()[2]!.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    optionElements()[0]!.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['alipay'])
  })

  it('触发器显示已选项的中文，而不是原始值', () => {
    const wrapper = mountSelect({ modelValue: 'wechat' })
    expect(wrapper.find('.t73-select__value').text()).toBe('微信')

    // `''` 与 null 同等看待：都当未选择，显示占位文字
    const empty = mountSelect({ modelValue: '' })
    expect(empty.find('.t73-select__placeholder').text()).toBe('请选择')
  })

  it('多选：点两项发出数组，点芯片关闭发出 remove-tag 并移除该项', async () => {
    const wrapper = mountSelect({ modelValue: [], multiple: true, options: OPTIONS.slice(0, 2) })
    await openPanel(wrapper)

    optionElements()[0]!.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['alipay']])

    await wrapper.setProps({ modelValue: ['alipay'] })
    optionElements()[1]!.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['alipay', 'wechat']])

    await wrapper.setProps({ modelValue: ['alipay', 'wechat'] })
    await wrapper.find('.t73-select__tag-close').trigger('click')

    expect(wrapper.emitted('remove-tag')?.[0]).toEqual(['alipay'])
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual([['wechat']])
  })

  it('maxTagCount 之外的已选项折成 +N', async () => {
    const wrapper = mountSelect({
      modelValue: ['alipay', 'wechat', 'bank'],
      options: OPTIONS,
      multiple: true,
      maxTagCount: 1,
    })
    await nextTick()

    expect(wrapper.findAll('.t73-select__tag')).toHaveLength(2)
    expect(wrapper.find('.t73-select__tag--more').text()).toBe('+2')
  })

  it('clearable 的清除按钮把值清成 null 并发出 clear', async () => {
    const wrapper = mountSelect({ modelValue: 'alipay', clearable: true })
    await nextTick()

    await wrapper.find('.t73-select__clear').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('disabled 时点触发器不展开、不渲染清除按钮', async () => {
    const wrapper = mountSelect({ modelValue: 'alipay', disabled: true, clearable: true })
    await openPanel(wrapper)

    expect(wrapper.find('.t73-select').classes()).not.toContain('t73-select--open')
    expect(wrapper.find('.t73-select').attributes('aria-disabled')).toBe('true')
    expect(wrapper.find('.t73-select__clear').exists()).toBe(false)
  })

  it('filterable：输入过滤选项，无命中时给「无匹配项」', async () => {
    const wrapper = mountSelect({ filterable: true })
    await openPanel(wrapper)

    await wrapper.find('.t73-select__input').setValue('微信')
    await nextTick()
    const visible = optionElements().filter((el) => el.style.display !== 'none')
    expect(visible.map((el) => el.textContent?.trim())).toEqual(['微信'])

    await wrapper.find('.t73-select__input').setValue('不存在的渠道')
    await nextTick()
    const panel = document.body.querySelector('.t73-select-panel')
    expect(panel?.textContent).toContain('无匹配项')
  })

  it('键盘：ArrowDown 展开，再按 ArrowDown 高亮首项，Enter 选中', async () => {
    const wrapper = mountSelect()
    await nextTick()
    const trigger = wrapper.find('.t73-select')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(wrapper.find('.t73-select').classes()).toContain('t73-select--open')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['alipay'])
  })

  it('插槽写法与 options 写法等价，TOptionGroup 渲染组标题', async () => {
    const wrapper = mount(TSelect, {
      props: { modelValue: 'a' },
      slots: {
        default: () => [
          h(TOptionGroup, { label: '常用' }, () => [h(TOption, { value: 'a', label: '甲' })]),
        ],
      },
      attachTo: document.body,
    })
    mounted.push(wrapper)
    await nextTick()

    expect(document.body.querySelector('.t73-option-group__title')?.textContent).toBe('常用')
    expect(wrapper.find('.t73-select__value').text()).toBe('甲')
  })

  /**
   * 缺陷用例：`useOverlay` 在非受控模式下从不回调 `onAfterOpen` / `onAfterClose`
   * （见交付说明），于是 TSelect 的 `visible-change` 永远发不出来，
   * 打开时也不会把高亮落到已选项上。修 `useOverlay` 影响四个消费端，等主代理决定。
   */
  it.fails('visible-change 应在展开与收起时各发一次（当前缺陷）', async () => {
    const wrapper = mountSelect()
    await openPanel(wrapper)

    expect(wrapper.emitted('visible-change')).toBeDefined()
    expect(wrapper.emitted('visible-change')?.[0]).toEqual([true])
  })

  it.fails('展开时高亮应落在已选项上，好让回车确认原值（当前缺陷）', async () => {
    const wrapper = mountSelect({ modelValue: 'wechat' })
    await openPanel(wrapper)
    await nextTick()

    const activeId = wrapper.find('.t73-select').attributes('aria-activedescendant')
    expect(activeId).toBe(optionElements()[1]!.id)
  })
})
