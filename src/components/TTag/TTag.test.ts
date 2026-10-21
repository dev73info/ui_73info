import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TTag } from './index'

describe('TTag', () => {
  it('closable 时点关闭按钮发出 close，并把原生事件带出来', async () => {
    const wrapper = mount(TTag, { props: { closable: true }, slots: { default: '待审' } })

    await wrapper.find('.t73-tag__close').trigger('click')

    const emitted = wrapper.emitted('close')
    expect(emitted).toHaveLength(1)
    // 载荷必须是原生 MouseEvent：调用方要靠它定位/阻止冒泡
    expect(emitted?.[0]?.[0]).toBeInstanceOf(MouseEvent)
  })

  it('不可关闭时不渲染关闭按钮', () => {
    const wrapper = mount(TTag, { slots: { default: '已通过' } })
    expect(wrapper.find('.t73-tag__close').exists()).toBe(false)
  })

  it('tone / variant / size 映射到类名，默认 neutral + soft + md', () => {
    const fallback = mount(TTag, { slots: { default: '默认' } })
    expect(fallback.classes()).toContain('t73-tag--tone-neutral')
    expect(fallback.classes()).toContain('t73-tag--soft')
    expect(fallback.classes()).toContain('t73-tag--md')

    const custom = mount(TTag, {
      props: { tone: 'danger', variant: 'outline', size: 'sm' },
      slots: { default: '已驳回' },
    })
    expect(custom.classes()).toContain('t73-tag--tone-danger')
    expect(custom.classes()).toContain('t73-tag--outline')
    expect(custom.classes()).toContain('t73-tag--sm')
  })

  it('prefix 插槽排在文案前面（角标用法）', () => {
    const wrapper = mount(TTag, {
      slots: { default: '新', prefix: '<i class="dot" />' },
    })
    expect(wrapper.find('.t73-tag__affix .dot').exists()).toBe(true)
    expect(wrapper.find('.t73-tag__label').text()).toBe('新')
  })
})
