import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TButton } from './index'

describe('TButton', () => {
  it('渲染文案并在点击时派发 click 事件', async () => {
    const wrapper = mount(TButton, { slots: { default: '保存' } })

    expect(wrapper.text()).toBe('保存')
    expect(wrapper.element.tagName).toBe('BUTTON')

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('disabled 时不派发 click，且标记原生 disabled', async () => {
    const wrapper = mount(TButton, { props: { disabled: true }, slots: { default: '保存' } })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('t73-button--disabled')
  })

  it('loading 时 aria-busy 为真且同样屏蔽点击', async () => {
    const wrapper = mount(TButton, { props: { loading: true } })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('variant 与 tone 落到类名上，主题差异由令牌吸收', () => {
    const wrapper = mount(TButton, { props: { variant: 'solid', tone: 'accent' } })

    expect(wrapper.classes()).toContain('t73-button--solid')
    expect(wrapper.classes()).toContain('t73-button--tone-accent')
  })
})
