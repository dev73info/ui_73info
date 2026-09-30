/**
 * 列表键盘导航原语（headless，无样式）
 *
 * 下拉选择、下拉菜单、日期面板的键盘语义是同一套：↑↓ 移动高亮、Home/End 到两端、
 * Enter 选中、字母键做 typeahead、禁用项跳过、循环与否可配。
 * 各写一遍必然出现「这个下拉能循环、那个不能」这类不一致。
 *
 * ## 注册式而不是索引式
 *
 * 高亮项用**注册顺序**而不是模板里的下标：`TOption` 可能被 `v-for` 包一层、
 * 也可能散落在 `TOptionGroup` 里，写下标就要每个调用方自己算偏移。组件挂载时注册、
 * 卸载时注销，顺序就是渲染顺序；被 `v-if` 摘掉的项自动从序列里消失，
 * 高亮也不会停在一个不存在的下标上。
 *
 * ## 高亮用 id 而不是下标
 *
 * 面板内容异步变化（选项列表重新请求）时下标会错位，id 不会。`aria-activedescendant`
 * 要的也正好是 id。
 *
 * ## 高亮项要滚进视野
 *
 * 选项多于可视高度时，键盘移到下面的项必须滚动跟随，否则高亮跑出了滚动区，
 * 键盘用户看到的还是原来那几行。用 `block: 'nearest'` —— 已经在视野里的项不动，
 * 避免每按一次方向键整个列表都跳一下。
 */

import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export interface ListboxItemHandle {
  /** 稳定 id，用作 `aria-activedescendant` 与 `aria-selected` 的关联 */
  id: string
  /** 禁用项不可被高亮，也不能被选中 */
  disabled: () => boolean
  /** 用于 typeahead 匹配的文本（取可见文本） */
  label: () => string
  /** 被键盘选中时调用 */
  select: () => void
  /** 元素取法，用于滚动跟随 */
  element: () => HTMLElement | null
}

export interface ListboxContext {
  activeId: Ref<string | null>
  /** 挂载中的项，顺序即渲染顺序 */
  items: () => ListboxItemHandle[]
  register: (item: ListboxItemHandle) => void
  unregister: (item: ListboxItemHandle) => void
  setActive: (id: string | null) => void
  move: (delta: number) => void
  moveTo: (edge: 'first' | 'last') => void
  /** 选中当前高亮项；没有高亮项时返回 false */
  selectActive: () => boolean
  /** 重置高亮到第一个可用项（打开面板时用） */
  resetActive: () => void
}

export const LISTBOX_CONTEXT: InjectionKey<ListboxContext> = Symbol('t73-listbox')

export function createListbox(options: { loop?: boolean } = {}): ListboxContext {
  const activeId = ref<string | null>(null)
  const registry: ListboxItemHandle[] = []

  function items(): ListboxItemHandle[] {
    return registry
  }

  function enabledItems(): ListboxItemHandle[] {
    return registry.filter((item) => !item.disabled())
  }

  function scrollIntoView(item: ListboxItemHandle): void {
    item.element()?.scrollIntoView({ block: 'nearest' })
  }

  function setActive(id: string | null): void {
    activeId.value = id
    if (id === null) return
    const item = registry.find((entry) => entry.id === id)
    if (item) scrollIntoView(item)
  }

  function move(delta: number): void {
    const list = enabledItems()
    if (list.length === 0) return

    const currentIndex = list.findIndex((item) => item.id === activeId.value)
    let nextIndex: number

    if (currentIndex === -1) {
      // 还没有高亮项时：↓ 从头开始，↑ 从尾开始
      nextIndex = delta > 0 ? 0 : list.length - 1
    } else {
      nextIndex = currentIndex + delta
      const loop = options.loop ?? true
      if (nextIndex < 0) nextIndex = loop ? list.length - 1 : 0
      if (nextIndex >= list.length) nextIndex = loop ? 0 : list.length - 1
    }

    setActive(list[nextIndex]?.id ?? null)
  }

  function moveTo(edge: 'first' | 'last'): void {
    const list = enabledItems()
    if (list.length === 0) return
    setActive((edge === 'first' ? list[0] : list[list.length - 1])?.id ?? null)
  }

  function selectActive(): boolean {
    const item = registry.find((entry) => entry.id === activeId.value)
    if (!item || item.disabled()) return false
    item.select()
    return true
  }

  function resetActive(): void {
    setActive(enabledItems()[0]?.id ?? null)
  }

  return {
    activeId,
    items,
    register: (item) => {
      const existing = registry.findIndex((entry) => entry.id === item.id)
      if (existing >= 0) registry.splice(existing, 1)
      registry.push(item)
    },
    unregister: (item) => {
      const index = registry.indexOf(item)
      if (index >= 0) registry.splice(index, 1)
      // 高亮项被摘掉（`v-if` 过滤掉了它）时把高亮移走，别留一个悬空的 id
      if (activeId.value === item.id) activeId.value = null
    },
    setActive,
    move,
    moveTo,
    selectActive,
    resetActive,
  }
}

/** 在面板里提供一套列表导航能力，供内部的项注入 */
export function provideListbox(options: { loop?: boolean } = {}): ListboxContext {
  const context = createListbox(options)
  provide(LISTBOX_CONTEXT, context)
  return context
}

/** 项侧注入。拿不到上下文时返回 null（项不在面板里时不报错，只是不参与键盘导航） */
export function useListboxContext(): ListboxContext | null {
  return inject(LISTBOX_CONTEXT, null)
}

/* ---------------------------------------------------------------------------
   typeahead
   --------------------------------------------------------------------------- */

let searchBuffer = ''
let searchTimer = 0

/**
 * 处理一次字符输入，返回这次要匹配的查询串。
 *
 * 缓冲区 500ms 后失效。连续输入同一个字符按「重复按同一键 → 在匹配项之间轮转」处理，
 * 与原生 `<select>` 一致；`repeated` 表示这次是不是重复键，匹配项要从**下一项**开始找，
 * 否则连按 `a` 会一直停在第一个匹配项上。
 */
export function typeahead(key: string): { query: string; repeated: boolean } {
  const repeated = searchBuffer !== '' && searchBuffer.split('').every((ch) => ch === key)
  const query = repeated ? key : searchBuffer + key
  searchBuffer = query
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    searchBuffer = ''
    searchTimer = 0
  }, 500)
  return { query, repeated }
}

/** 从当前高亮项之后开始，找第一个文本以 `query` 开头的项 */
export function findByTypeahead(
  list: ListboxItemHandle[],
  query: string,
  activeId: string | null,
): ListboxItemHandle | undefined {
  const lowered = query.toLowerCase()
  const currentIndex = list.findIndex((item) => item.id === activeId)
  // 从高亮项的下一项开始找，这样连按同一个字母能依次跳到各个匹配项
  const ordered = [...list.slice(currentIndex + 1), ...list.slice(0, currentIndex + 1)]
  return ordered.find((item) => item.label().toLowerCase().startsWith(lowered))
}

/**
 * 列表上要处理的键盘事件，收在一处。
 *
 * 返回 `true` 表示已经消费掉这次按键，调用方不要再做自己的处理（尤其别让页面滚起来）。
 * Esc 刻意不在这里处理：那是「关闭浮层」，归 `useDismissable`。
 *
 * 三个开关给可输入过滤的下拉用：过滤框里的 `Home/End` 是「行首/行尾」，
 * 字母键是「输入文字」而不是 typeahead，`Enter` 则可能属于外层表单。
 * 不关掉它们，用户在一个筛选框里打字就会被列表导航抢走按键。
 */
export function handleListboxKeydown(
  event: KeyboardEvent,
  context: ListboxContext,
  options: { loop?: boolean; typeahead?: boolean; homeEnd?: boolean; enter?: boolean } = {},
): boolean {
  const { typeahead: useTypeahead = true, homeEnd = true, enter = true } = options

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      context.move(1)
      return true
    case 'ArrowUp':
      event.preventDefault()
      context.move(-1)
      return true
    case 'Home':
      if (!homeEnd) return false
      event.preventDefault()
      context.moveTo('first')
      return true
    case 'End':
      if (!homeEnd) return false
      event.preventDefault()
      context.moveTo('last')
      return true
    case 'Enter':
    case ' ':
      if (!enter) return false
      // 没有高亮项时把 Enter 让出去：调用方可能想用它「打开面板」
      if (context.activeId.value === null) return false
      event.preventDefault()
      return context.selectActive()
    default:
      break
  }

  if (!useTypeahead) return false

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const { query } = typeahead(event.key)
    const target = findByTypeahead(
      context.items().filter((item) => !item.disabled()),
      query,
      context.activeId.value,
    )
    if (target) {
      event.preventDefault()
      context.setActive(target.id)
      return true
    }
  }

  return false
}

/** 只用于测试：清掉 typeahead 的模块级缓冲 */
export function resetTypeahead(): void {
  searchBuffer = ''
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = 0
}
