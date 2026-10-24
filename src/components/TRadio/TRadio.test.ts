import { describe, expect, it } from 'vitest'
import { mount, type DOMWrapper } from '@vue/test-utils'
import { h } from 'vue'
import { TRadio, TRadioButton, TRadioGroup } from './index'

/** 原生 radio 的勾选只能靠 checked + change 两个步骤模拟 */
async function check(input: DOMWrapper<Element>) {
  ;(input.element as HTMLInputElement).checked = true
  await input.trigger('change')
}

describe('TRadio', () => {
  it('单独使用时点选发出 update:modelValue，载荷是本项的 value', async () => {
    const wrapper = mount(TRadio, { props: { value: 'alipay', modelValue: 'wechat' }, slots: { default: '支付宝' } })

    await check(wrapper.find('input'))

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['alipay'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['alipay'])
  })

  it('禁用时不发事件，原生输入带 disabled', async () => {
    const wrapper = mount(TRadio, { props: { value: 'a', modelValue: 'b', disabled: true } })

    await check(wrapper.find('input'))

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })
})

describe('TRadioGroup', () => {
  function mountGroup(modelValue: string, disabled = false) {
    return mount(TRadioGroup, {
      props: { modelValue, disabled, ariaLabel: '支付渠道' },
      slots: {
        default: () => [
          h(TRadio, { value: 'alipay', label: '支付宝' }),
          h(TRadio, { value: 'wechat', label: '微信' }),
        ],
      },
    })
  }

  it('组内换选把新值发回调用方，组内原生 radio 共用同一个 name', async () => {
    const wrapper = mountGroup('wechat')
    const inputs = wrapper.findAll('input')

    await check(inputs[0]!)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['alipay'])
    expect(inputs[0]!.attributes('name')).toBe(inputs[1]!.attributes('name'))
    expect(inputs[0]!.attributes('name')).toBeTruthy()
  })

  it('组禁用时整组不发事件', async () => {
    const wrapper = mountGroup('wechat', true)

    await check(wrapper.findAll('input')[0]!)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.attributes('role')).toBe('radiogroup')
    expect(wrapper.classes()).toContain('t73-radio-group--horizontal')
  })
})

describe('TRadioButton', () => {
  it('按钮形态同样发出 update:modelValue，键名与载荷都要对', async () => {
    const wrapper = mount(TRadioGroup, {
      props: { modelValue: 'wechat' },
      slots: {
        default: () => [
          h(TRadioButton, { value: 'alipay', label: '支付宝' }),
          h(TRadioButton, { value: 'wechat', label: '微信' }),
        ],
      },
    })

    await check(wrapper.findAll('input')[0]!)

    // 这一条是给「点微信却按支付宝下单」那类键名/值错位兜底的
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['alipay'])
  })

  it('iconOnly 与选中态落到类名上', async () => {
    const wrapper = mount(TRadioButton, { props: { value: 'a', modelValue: 'a', iconOnly: true } })

    expect(wrapper.classes()).toContain('t73-radio-button--checked')
    expect(wrapper.classes()).toContain('t73-radio-button--icon-only')
    expect(wrapper.find('input').attributes('checked')).toBeDefined()
  })
})
