import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TInputNumber } from './index'

describe('TInputNumber', () => {
  it('点加号按 step 步进并发出 update:modelValue', async () => {
    const wrapper = mount(TInputNumber, { props: { modelValue: 5 } })

    await wrapper.find('.t73-input-number__control--increase').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])
    expect(wrapper.emitted('change')?.[0]).toEqual([6])
  })

  it('点减号按 step 退，step 可自定义', async () => {
    const wrapper = mount(TInputNumber, { props: { modelValue: 100, step: 10 } })

    await wrapper.find('.t73-input-number__control--decrease').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([90])
  })

  it('输入半成品不即时回写，失焦时才解析并按 precision 取整', async () => {
    const wrapper = mount(TInputNumber, { props: { modelValue: null, precision: 2 } })
    const input = wrapper.find('input')

    // 打小数点的过程中不能回写，否则 `1.` 会被解析成 1，小数永远打不出来
    await input.setValue('1.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await input.setValue('12.567')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await input.trigger('blur')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([12.57])
  })

  it('超出 min / max 时夹到边界，到边界后对应按钮禁用', async () => {
    const wrapper = mount(TInputNumber, { props: { modelValue: 0, min: 0, max: 10 } })

    expect(wrapper.find('.t73-input-number__control--decrease').attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('999')
    await wrapper.find('input').trigger('blur')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])

    await wrapper.setProps({ modelValue: 10 })
    expect(wrapper.find('.t73-input-number__control--increase').attributes('disabled')).toBeDefined()
  })

  it('上下方向键步进，disabled 时按了也不动', async () => {
    const wrapper = mount(TInputNumber, { props: { modelValue: 2 } })
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])

    const disabled = mount(TInputNumber, { props: { modelValue: 2, disabled: true } })
    await disabled.find('input').trigger('keydown', { key: 'ArrowDown' })
    expect(disabled.emitted('update:modelValue')).toBeUndefined()
  })

  it('controls=false 不渲染步进按钮；thousands 影响显示文本', () => {
    const noControls = mount(TInputNumber, { props: { controls: false } })
    expect(noControls.find('.t73-input-number__control--increase').exists()).toBe(false)
    expect(noControls.classes()).toContain('t73-input-number--no-controls')

    const grouped = mount(TInputNumber, { props: { modelValue: 1234567, thousands: true } })
    expect(grouped.find('input').element.value).toBe('1,234,567')
  })
})
