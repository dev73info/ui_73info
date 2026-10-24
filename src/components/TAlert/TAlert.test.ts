import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { TAlert } from './index'

describe('TAlert', () => {
  it('closable 时才渲染关闭按钮，点它发出 close', async () => {
    const plain = mount(TAlert, { props: { title: '额度不足' } })
    expect(plain.find('.t73-alert__close').exists()).toBe(false)
    expect(plain.emitted('close')).toBeUndefined()

    const wrapper = mount(TAlert, { props: { title: '额度不足', closable: true } })
    await wrapper.find('.t73-alert__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('title 与 description 分两块渲染，缺省时不渲染空段落', () => {
    const both = mount(TAlert, { props: { title: '标题', description: '说明' } })
    expect(both.find('.t73-alert__title').text()).toBe('标题')
    expect(both.find('.t73-alert__description').text()).toBe('说明')

    const titleOnly = mount(TAlert, { props: { title: '只有标题' } })
    expect(titleOnly.find('.t73-alert__description').exists()).toBe(false)
  })

  it('tone 与 variant 落到类名，默认 info + soft，且角色是 alert', () => {
    const fallback = mount(TAlert, {})
    expect(fallback.classes()).toContain('t73-alert--tone-info')
    expect(fallback.classes()).toContain('t73-alert--soft')
    expect(fallback.attributes('role')).toBe('alert')

    const custom = mount(TAlert, { props: { tone: 'danger', variant: 'outline' } })
    expect(custom.classes()).toContain('t73-alert--tone-danger')
    expect(custom.classes()).toContain('t73-alert--outline')
  })

  it('showIcon=false 时不留图标占位', () => {
    expect(mount(TAlert, {}).find('.t73-alert__icon').exists()).toBe(true)
    expect(mount(TAlert, { props: { showIcon: false } }).find('.t73-alert__icon').exists()).toBe(false)
  })
})
