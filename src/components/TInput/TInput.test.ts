import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TInput } from './index'

describe('TInput', () => {
  it('输入时发出 update:modelValue，载荷始终是字符串', async () => {
    const wrapper = mount(TInput, { props: { modelValue: '' } })

    await wrapper.find('input').setValue('张三')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['张三'])
    expect(wrapper.emitted('input')?.[0]).toEqual(['张三'])
  })

  it('数字型初值按字符串回写（与原生 input 一致）', async () => {
    const wrapper = mount(TInput, { props: { modelValue: 42 } })
    expect(wrapper.find('input').element.value).toBe('42')

    await wrapper.find('input').setValue('43')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['43'])
  })

  it('clearable 且有值时点清除：回写空串并发出 clear', async () => {
    const wrapper = mount(TInput, { props: { modelValue: '要清掉', clearable: true } })

    await wrapper.find('.t73-input__clear').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('空值或只读时不出清除按钮', () => {
    expect(mount(TInput, { props: { modelValue: '', clearable: true } }).find('.t73-input__clear').exists()).toBe(
      false,
    )
    expect(
      mount(TInput, { props: { modelValue: 'x', clearable: true, readonly: true } }).find(
        '.t73-input__clear',
      ).exists(),
    ).toBe(false)
    expect(
      mount(TInput, { props: { modelValue: 'x', clearable: true, disabled: true } }).find(
        '.t73-input__clear',
      ).exists(),
    ).toBe(false)
  })

  it('回车发 enter、聚焦失焦发 focus / blur', async () => {
    const wrapper = mount(TInput, {})
    const input = wrapper.find('input')

    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')).toHaveLength(1)

    await input.trigger('focus')
    await input.trigger('blur')
    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
    expect(wrapper.classes()).not.toContain('t73-input--focused')
  })

  it('type="textarea" 换成多行输入框，rows 只在非自适应时生效', () => {
    const wrapper = mount(TInput, { props: { type: 'textarea', autosize: false, rows: 5 } })

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(textarea.attributes('rows')).toBe('5')
    expect(wrapper.classes()).toContain('t73-input--textarea')
  })

  it('invalid 与 disabled 落到 aria 与原生属性上', async () => {
    const invalid = mount(TInput, { props: { invalid: true } })
    expect(invalid.find('input').attributes('aria-invalid')).toBe('true')
    expect(invalid.classes()).toContain('t73-input--invalid')

    const disabled = mount(TInput, { props: { disabled: true } })
    expect(disabled.find('input').attributes('disabled')).toBeDefined()
    expect(disabled.classes()).toContain('t73-input--disabled')

    // 未传 invalid 且不在表单上下文里时不挂 aria-invalid
    expect(mount(TInput, {}).find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('inputmode 落在真正的输入框上（不是外层 div）', () => {
    const wrapper = mount(TInput, { props: { inputmode: 'numeric' } })
    expect(wrapper.find('input').attributes('inputmode')).toBe('numeric')
    expect(wrapper.attributes('inputmode')).toBeUndefined()
  })
})
