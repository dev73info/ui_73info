import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { TDescriptions, TDescriptionsItem } from './index'

describe('TDescriptions', () => {
  it('每一组渲染成 dt / dd 一对，标签与值都取自 props', () => {
    const wrapper = mount(TDescriptions, {
      slots: {
        default: () => [
          h(TDescriptionsItem, { label: '订单号', span: 1 }, () => 'A20261022'),
          h(TDescriptionsItem, { label: '金额' }, () => '¥128.00'),
        ],
      },
    })

    expect(wrapper.findAll('.t73-descriptions__label').map((node) => node.text())).toEqual([
      '订单号',
      '金额',
    ])
    expect(wrapper.findAll('.t73-descriptions__value').map((node) => node.text())).toEqual([
      'A20261022',
      '¥128.00',
    ])
  })

  it('column 夹到 1–4：越界值不会生成没有样式的属性', async () => {
    const wrapper = mount(TDescriptions, { props: { column: 9 } })
    expect(wrapper.attributes('data-columns')).toBe('4')

    await wrapper.setProps({ column: 0 })
    expect(wrapper.attributes('data-columns')).toBe('1')
  })

  it('border、direction、size 与 title 映射到类名与文案', () => {
    const wrapper = mount(TDescriptions, {
      props: { border: true, direction: 'vertical', size: 'sm', title: '违约案信息' },
    })

    expect(wrapper.classes()).toContain('t73-descriptions--border')
    expect(wrapper.classes()).toContain('t73-descriptions--vertical')
    expect(wrapper.classes()).toContain('t73-descriptions--sm')
    expect(wrapper.find('.t73-descriptions__title').text()).toBe('违约案信息')
    expect(wrapper.attributes('role')).toBe('group')
  })

  it('span 换算成网格列数：跨 2 组的值要跨 2n-1 条轨道', () => {
    const wrapper = mount(TDescriptions, {
      slots: { default: () => [h(TDescriptionsItem, { label: '备注', span: 2 }, () => '占满一行')] },
    })

    const value = wrapper.find('.t73-descriptions__value')
    expect(value.attributes('style')).toContain('grid-column: span 3')
  })

  it('放在 TDescriptions 外面直接用会报错（没有网格可落）', () => {
    expect(() => mount(TDescriptionsItem, { props: { label: '孤立' } })).toThrow(/必须放在 TDescriptions 内使用/)
  })
})
