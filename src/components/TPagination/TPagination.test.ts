import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TPagination } from './index'

describe('TPagination', () => {
  it('点页码发出 update:currentPage，并带 current-change 与 change 两个语义事件', async () => {
    const wrapper = mount(TPagination, { props: { total: 100, pageSize: 10, currentPage: 1 } })

    await wrapper.find('[aria-label="第 2 页"]').trigger('click')

    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([2])
    expect(wrapper.emitted('current-change')?.[0]).toEqual([2])
    expect(wrapper.emitted('change')?.[0]).toEqual([2, 10])
  })

  it('上一页在第一页禁用，下一页在最后一页禁用', async () => {
    const first = mount(TPagination, { props: { total: 30, pageSize: 10, currentPage: 1 } })
    expect(first.find('[aria-label="上一页"]').attributes('disabled')).toBeDefined()

    const last = mount(TPagination, { props: { total: 30, pageSize: 10, currentPage: 3 } })
    expect(last.find('[aria-label="下一页"]').attributes('disabled')).toBeDefined()
    expect(last.find('[aria-label="第 3 页"]').attributes('aria-current')).toBe('page')
  })

  it('disabled 时点页码不发事件', async () => {
    const wrapper = mount(TPagination, {
      props: { total: 100, pageSize: 10, currentPage: 1, disabled: true },
    })

    await wrapper.find('[aria-label="第 2 页"]').trigger('click')

    expect(wrapper.emitted('update:currentPage')).toBeUndefined()
    expect(wrapper.classes()).toContain('t73-pagination--disabled')
  })

  it('总数与页码按钮个数按页面窗口算：偶数 pagerCount 向上取到奇数', () => {
    const wrapper = mount(TPagination, {
      props: { total: 1000, pageSize: 10, currentPage: 50, pagerCount: 6 },
    })

    expect(wrapper.find('.t73-pagination__total').text()).toBe('共 1000 条')
    // 7 个页码按钮（6 向上取到 7），另有首尾两处省略号
    expect(wrapper.findAll('.t73-pagination__page')).toHaveLength(7)
    expect(wrapper.findAll('.t73-pagination__gap')).toHaveLength(2)
    // 首末页恒定在列
    expect(wrapper.find('[aria-label="第 1 页"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="第 100 页"]').exists()).toBe(true)
  })

  it('跳页框回车把页码发出去', async () => {
    const wrapper = mount(TPagination, {
      props: { total: 100, pageSize: 10, currentPage: 1, showJumper: true },
    })

    const jumper = wrapper.find('.t73-pagination__jumper-input')
    await jumper.setValue('7')
    await jumper.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([7])
  })

  it('改每页条数回到第一页，pageSize 与 currentPage 两个键都要发', async () => {
    const wrapper = mount(TPagination, {
      props: { total: 100, pageSize: 10, currentPage: 5, showSizeChanger: true },
      attachTo: document.body,
    })
    // 下拉面板是 Teleport 到 body 的，不在 wrapper 的 DOM 子树里
    await nextTick()

    await wrapper.find('.t73-select').trigger('click')
    const options = document.body.querySelectorAll('.t73-option')
    ;(options[1] as HTMLElement).click()
    await nextTick()

    expect(wrapper.emitted('update:pageSize')?.[0]).toEqual([20])
    expect(wrapper.emitted('size-change')?.[0]).toEqual([20])
    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([1])
    expect(wrapper.emitted('change')?.[0]).toEqual([1, 20])
    wrapper.unmount()
  })

  it('background 与 size 落类名', () => {
    const wrapper = mount(TPagination, { props: { total: 20, size: 'sm', background: true } })
    expect(wrapper.classes()).toContain('t73-pagination--sm')
    expect(wrapper.classes()).toContain('t73-pagination--background')
    expect(wrapper.attributes('aria-label')).toBe('分页')
  })
})
