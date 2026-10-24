import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TSwitch } from './index'

describe('TSwitch', () => {
  it('点击切换发出 update:modelValue 与 change，载荷是取反后的布尔', async () => {
    const wrapper = mount(TSwitch, { props: { modelValue: false } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(wrapper.emitted('change')?.[0]).toEqual([true])
  })

  it('打开状态下再点发出 false，aria-checked 跟着绑定值走', async () => {
    const wrapper = mount(TSwitch, { props: { modelValue: true } })
    expect(wrapper.attributes('aria-checked')).toBe('true')

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])

    await wrapper.setProps({ modelValue: false })
    expect(wrapper.attributes('aria-checked')).toBe('false')
  })

  it('loading 时视觉保留当前状态但拒绝点击，一个事件都不发', async () => {
    const wrapper = mount(TSwitch, { props: { modelValue: true, loading: true } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('aria-checked')).toBe('true')
  })

  it('disabled 时不发事件，且原生按钮带 disabled', async () => {
    const wrapper = mount(TSwitch, { props: { disabled: true } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('t73-switch--disabled')
  })

  it('空格与回车都能切换（role="switch" 自己处理键盘）', async () => {
    const bySpace = mount(TSwitch, { props: { modelValue: false } })
    await bySpace.trigger('keydown', { key: ' ' })
    expect(bySpace.emitted('update:modelValue')?.[0]).toEqual([true])

    const byEnter = mount(TSwitch, { props: { modelValue: false } })
    await byEnter.trigger('keydown', { key: 'Enter' })
    expect(byEnter.emitted('update:modelValue')?.[0]).toEqual([true])

    const other = mount(TSwitch, { props: { modelValue: false } })
    await other.trigger('keydown', { key: 'Tab' })
    expect(other.emitted('update:modelValue')).toBeUndefined()
  })

  it('activeText / inactiveText 跟着当前状态显示', async () => {
    const wrapper = mount(TSwitch, {
      props: { modelValue: false, activeText: '已开启', inactiveText: '已关闭' },
    })
    expect(wrapper.find('.t73-switch__text').text()).toBe('已关闭')

    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('.t73-switch__text').text()).toBe('已开启')
  })
})
