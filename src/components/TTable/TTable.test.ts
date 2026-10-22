import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TTable, TTableColumn } from './index'

const rows = [
  { id: 1, user: { name: '张三' }, amount: 128 },
  { id: 2, user: { name: '李四' }, amount: 256 },
]

async function mountTable(props: Record<string, unknown> = {}, columns?: () => unknown) {
  const wrapper = mount(TTable, {
    props,
    slots: {
      default:
        columns ??
        (() => [
          h(TTableColumn, { prop: 'user.name', label: '用户' }),
          h(TTableColumn, { prop: 'amount', label: '金额' }),
        ]),
    },
  })
  // 列是在各列自己的 onMounted 里注册给表格的，表头与单元格要等下一拍才画出来
  await nextTick()
  return wrapper
}

describe('TTable', () => {
  it('列声明渲染成表头与单元格，prop 支持 a.b.c 路径', async () => {
    const wrapper = await mountTable({ data: rows })

    expect(wrapper.findAll('.t73-table__th').map((node) => node.text())).toEqual(['用户', '金额'])
    const cells = wrapper.findAll('.t73-table__td').map((node) => node.text())
    expect(cells).toEqual(['张三', '128', '李四', '256'])
  })

  it('#default 插槽拿到 { row, index, value } 作用域', async () => {
    const wrapper = await mountTable(
      { data: rows },
      () => [
        h(
          TTableColumn,
          { prop: 'amount', label: '金额' },
          {
            default: ({ row, index, value }: { row: { id: number }; index: number; value: number }) =>
              h('span', { class: 'money' }, `#${index}-${value}-${row.id}`),
          },
        ),
      ],
    )

    expect(wrapper.findAll('.money').map((node) => node.text())).toEqual(['#0-128-1', '#1-256-2'])
  })

  it('没有数据时渲染空态，loading 时盖遮罩并标 aria-busy', async () => {
    const empty = await mountTable({ data: [] })
    expect(empty.find('.t73-table__empty').exists()).toBe(true)
    expect(empty.find('.t73-empty__description').text()).toBe('暂无数据')

    await empty.setProps({ loading: true })
    expect(empty.find('.t73-table__mask').exists()).toBe(true)
    expect(empty.attributes('aria-busy')).toBe('true')
    // 加载中不展示空态：否则加载完的两态会闪一下
    expect(empty.find('.t73-table__empty').exists()).toBe(false)
  })

  it('show-overflow-tooltip 把完整文本挂到原生 title 上', async () => {
    const wrapper = await mountTable(
      { data: rows },
      () => [h(TTableColumn, { prop: 'user.name', label: '用户', showOverflowTooltip: true })],
    )

    expect(wrapper.findAll('.t73-table__td')[0]!.attributes('title')).toBe('张三')
    expect(wrapper.findAll('.t73-table__td')[0]!.classes()).toContain('t73-table__cell--ellipsis')
  })

  it('stripe / border / size 落类名，fixed 列带 sticky 偏移', async () => {
    const wrapper = await mountTable(
      { data: rows, stripe: true, border: true, size: 'sm', ariaLabel: '需求列表' },
      () => [
        h(TTableColumn, { prop: 'id', label: 'ID', width: 80 }),
        h(TTableColumn, { prop: 'amount', label: '金额', fixed: 'right', width: 120 }),
      ],
    )

    expect(wrapper.classes()).toContain('t73-table--stripe')
    expect(wrapper.classes()).toContain('t73-table--border')
    expect(wrapper.classes()).toContain('t73-table--sm')
    expect(wrapper.classes()).toContain('t73-table--fixed')
    expect(wrapper.find('table').attributes('aria-label')).toBe('需求列表')
    expect(wrapper.findAll('.t73-table__td')[1]!.attributes('style')).toContain('right: 0px')
  })

  it('拖动表头右边缘改列宽，松手时发出 resize', async () => {
    const wrapper = await mountTable(
      { data: rows },
      () => [h(TTableColumn, { prop: 'id', label: 'ID', width: 100, resizable: true })],
    )

    const resizer = wrapper.find('.t73-table__resizer')
    expect(resizer.exists()).toBe(true)

    // jsdom 里 clientX 只能靠真实 PointerEvent 带进来，VTU 的 trigger 传不进去
    resizer.element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, pointerId: 1, bubbles: true }),
    )
    resizer.element.dispatchEvent(new PointerEvent('pointermove', { clientX: 160, pointerId: 1 }))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('col')[0]!.attributes('style')).toContain('width: 160px')
    expect(wrapper.classes()).toContain('t73-table--resizing')

    resizer.element.dispatchEvent(new PointerEvent('pointerup', { clientX: 160, pointerId: 1 }))
    // resize 是列抛给调用方的事件（列才知道自己被拖宽了多少），不是表格的事件
    const column = wrapper.findComponent(TTableColumn)
    expect(column.emitted('resize')).toHaveLength(1)
    expect(column.emitted('resize')?.[0]).toEqual([160])
  })

  it('rowKey 支持字段名，行 key 稳定', async () => {
    const wrapper = await mountTable({ data: rows, rowKey: 'id' })
    expect(wrapper.findAll('.t73-table__row')).toHaveLength(2)
  })

  it('放在 TTable 外面直接用 TTableColumn 会报错', () => {
    expect(() => mount(TTableColumn, { props: { label: '孤立' } })).toThrow(/必须放在 TTable 内使用/)
  })
})
