import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TCheckbox, TCheckboxGroup } from './index'

describe('TCheckbox', () => {
  it('勾选时发出 update:modelValue 与 change，载荷是布尔', async () => {
    const wrapper = mount(TCheckbox, { props: { modelValue: false }, slots: { default: '我已阅读' } })
    const input = wrapper.find('input')

    await input.setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(wrapper.emitted('change')?.[0]).toEqual([true])
  })

  it('disabled 时不发事件，原生输入的 disabled 与类名都到位', async () => {
    const wrapper = mount(TCheckbox, { props: { disabled: true } })

    await wrapper.find('input').trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('t73-checkbox--disabled')
  })

  it('indeterminate 走 DOM 属性，aria-checked 报 mixed', async () => {
    const wrapper = mount(TCheckbox, { props: { indeterminate: true } })
    // 这个状态是 `watchEffect` 直接写 DOM 属性的，挂载后要等一拍
    await nextTick()
    const input = wrapper.find('input').element as HTMLInputElement

    expect(input.indeterminate).toBe(true)
    expect(wrapper.find('input').attributes('aria-checked')).toBe('mixed')
  })

  it('label 与默认插槽二选一，点文字（label 包裹）也能勾', async () => {
    const byProp = mount(TCheckbox, { props: { label: '记住我' } })
    expect(byProp.find('.t73-checkbox__label').text()).toBe('记住我')

    const bySlot = mount(TCheckbox, { slots: { default: '同意协议' } })
    expect(bySlot.find('.t73-checkbox__label').text()).toBe('同意协议')
  })
})

describe('TCheckboxGroup', () => {
  function mountGroup(modelValue: Array<string | number | boolean | null>) {
    return mount(TCheckboxGroup, {
      props: { modelValue, ariaLabel: '通知渠道' },
      slots: {
        default: () => [
          h(TCheckbox, { value: 'sms', label: '短信' }),
          h(TCheckbox, { value: 'email', label: '邮件' }),
        ],
      },
    })
  }

  it('组内勾选把新数组发回调用方（不是单项的布尔）', async () => {
    const wrapper = mountGroup(['sms'])
    const inputs = wrapper.findAll('input')

    await inputs[1]!.setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['sms', 'email']])
    expect(wrapper.emitted('change')?.[0]).toEqual([['sms', 'email']])
  })

  it('取消勾选从数组里移除', async () => {
    const wrapper = mountGroup(['sms', 'email'])

    await wrapper.findAll('input')[0]!.setValue(false)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['email']])
  })

  it('组禁用时整组都不发事件，role=group 带无障碍名', async () => {
    const wrapper = mountGroup(['sms'])
    await wrapper.setProps({ disabled: true })

    await wrapper.findAll('input')[1]!.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('通知渠道')
    expect(wrapper.findAll('input').every((input) => input.attributes('disabled') !== undefined)).toBe(
      true,
    )
  })

  it('组内项没给 value 时直接报错（组靠它判断是否勾选）', () => {
    expect(() =>
      mount(TCheckboxGroup, {
        props: { modelValue: [] },
        slots: { default: () => [h(TCheckbox, { label: '缺 value' })] },
      }),
    ).toThrow(/必须给 `value`/)
  })
})
