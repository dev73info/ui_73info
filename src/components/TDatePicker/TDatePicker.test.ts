import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TDatePicker } from './index'

const mounted: Array<ReturnType<typeof mount>> = []

function mountPicker(props: Record<string, unknown> = {}) {
  const wrapper = mount(TDatePicker, { props, attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

/** 展开面板。多根组件挂载后要等一拍根节点才稳定 */
async function openPanel(wrapper: ReturnType<typeof mount>) {
  await nextTick()
  await wrapper.find('.t73-date-picker').trigger('click')
  await nextTick()
}

/**
 * 从面板头部读当前年月，再算点某一天应该发出什么值。
 *
 * 不写死期望日期：面板停在哪个月受「今天」影响（另有缺陷用例专门盯这一条），
 * 这里只验证「点哪格就发哪一天」。
 */
function panelMonth(): { year: number; month: number } {
  const label = document.body.querySelector('.t73-date-picker__label')?.textContent ?? ''
  const matched = /(\d{4}) 年 (\d{1,2}) 月/.exec(label)
  if (!matched) throw new Error(`读不出面板年月：${label}`)
  return { year: Number(matched[1]), month: Number(matched[2]) }
}

function dayCell(day: number): HTMLElement {
  const cells = Array.from(
    document.body.querySelectorAll<HTMLElement>('.t73-date-picker__day'),
  ).filter((cell) => !cell.classList.contains('t73-date-picker__day--outside'))
  const target = cells.find((cell) => cell.textContent?.trim() === String(day))
  if (!target) throw new Error(`面板里没有 ${day} 号`)
  return target
}

function iso(day: number): string {
  const { year, month } = panelMonth()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('TDatePicker', () => {
  it('点某一天发出 update:modelValue 与 change，单选后收起面板', async () => {
    const wrapper = mountPicker()
    await openPanel(wrapper)

    const expected = iso(15)
    dayCell(15).click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([expected])
    expect(wrapper.emitted('change')?.[0]).toEqual([expected])
    expect(document.body.querySelector('.t73-date-picker__panel')).toBe(null)
  })

  it('valueFormat 与 format 分开：绑定 YYYYMMDD、显示 YYYY-MM-DD（源页面的用法）', async () => {
    const wrapper = mountPicker({
      modelValue: '20260310',
      valueFormat: 'YYYYMMDD',
      format: 'YYYY-MM-DD',
    })

    expect(wrapper.find('.t73-date-picker__value').text()).toBe('2026-03-10')

    await wrapper.find('.t73-date-picker__clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('daterange：点两天发出两元数组，倒着选会自动交换', async () => {
    const wrapper = mountPicker({ type: 'daterange' })
    await openPanel(wrapper)

    const later = iso(20)
    const earlier = iso(10)

    // 先点 20 再点 10：区间要按从小到大的顺序发出去
    dayCell(20).click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    dayCell(10).click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[earlier, later]])
  })

  it('disabledDate 命中的日子按钮禁用，点了不发事件', async () => {
    const wrapper = mountPicker({ disabledDate: (date: Date) => date.getDate() === 15 })
    await openPanel(wrapper)

    const cell = dayCell(15)
    expect(cell.hasAttribute('disabled')).toBe(true)
    cell.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('点标题往上一层视图，选月后回到日视图', async () => {
    const wrapper = mountPicker()
    await openPanel(wrapper)

    // 面板头部在 Teleport 出去的面板里，只能从 document 上拿
    const label = document.body.querySelector('.t73-date-picker__label') as HTMLElement
    label.click()
    await nextTick()
    expect(document.body.querySelector('.t73-date-picker__panel--month')).not.toBe(null)

    const chip = document.body.querySelector('.t73-date-picker__chip') as HTMLElement
    chip.click()
    await nextTick()
    expect(document.body.querySelector('.t73-date-picker__panel--day')).not.toBe(null)
  })

  it('disabled 时点触发器不展开', async () => {
    const wrapper = mountPicker({ disabled: true })
    await openPanel(wrapper)

    expect(document.body.querySelector('.t73-date-picker__panel')).toBe(null)
    expect(wrapper.find('.t73-date-picker').attributes('aria-disabled')).toBe('true')
  })

  /**
   * 缺陷用例：面板打开时应该停在「当前值所在月 / defaultMonth」，
   * 现在停在本月——因为 `useOverlay` 在非受控模式下从不回调 `onAfterOpen`，
   * `TDatePicker` 的 `handleOpened` 因此从不执行（见交付说明）。
   */
  it.fails('打开面板应停在当前值所在月（当前缺陷）', async () => {
    const wrapper = mountPicker({ modelValue: '2026-03-10' })
    await openPanel(wrapper)

    const label = document.body.querySelector('.t73-date-picker__label')?.textContent ?? ''
    expect(label).toContain('2026 年 3 月')
  })

  /** 同一个缺陷的另一面：`panel-change` 在打开时也不发。 */
  it.fails('打开面板应发出 panel-change（当前缺陷）', async () => {
    const wrapper = mountPicker({ defaultMonth: new Date(2026, 8, 1) })
    await openPanel(wrapper)

    expect(wrapper.emitted('panel-change')).toBeDefined()
  })
})
