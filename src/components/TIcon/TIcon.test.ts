import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, type Component } from 'vue'
import { TIcon } from './index'

const FakeIcon: Component = { name: 'FakeIcon', render: () => h('svg', { class: 'fake-icon' }) }

describe('TIcon', () => {
  it('给了 label 就是有语义的图标，没给则对辅助技术隐藏', () => {
    const labelled = mount(TIcon, { props: { label: '关闭', icon: FakeIcon } })
    expect(labelled.attributes('role')).toBe('img')
    expect(labelled.attributes('aria-label')).toBe('关闭')
    expect(labelled.attributes('aria-hidden')).toBeUndefined()

    // 图标旁边通常已有文字，重复朗读更吵，所以缺省对读屏隐藏
    const decorative = mount(TIcon, { props: { icon: FakeIcon } })
    expect(decorative.attributes('aria-hidden')).toBe('true')
    expect(decorative.attributes('role')).toBeUndefined()
  })

  it('icon prop 与默认插槽等价，都渲染出图标内容', () => {
    const byProp = mount(TIcon, { props: { icon: FakeIcon } })
    expect(byProp.find('.fake-icon').exists()).toBe(true)

    const bySlot = mount(TIcon, { slots: { default: () => h('svg', { class: 'slot-icon' }) } })
    expect(bySlot.find('.slot-icon').exists()).toBe(true)
  })

  it('size 数字按 px 处理、字符串原样交给 CSS；不传时不写行内尺寸', () => {
    const byNumber = mount(TIcon, { props: { size: 20 } })
    expect(byNumber.attributes('style')).toContain('font-size: 20px')

    const byString = mount(TIcon, { props: { size: '1.2em' } })
    expect(byString.attributes('style')).toContain('font-size: 1.2em')

    expect(mount(TIcon, {}).attributes('style')).toBeUndefined()
  })

  it('spin 加转圈类名', () => {
    expect(mount(TIcon, { props: { spin: true } }).classes()).toContain('t73-icon--spin')
    expect(mount(TIcon, {}).classes()).not.toContain('t73-icon--spin')
  })
})
