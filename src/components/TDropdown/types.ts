/**
 * TDropdown 的属性与事件
 */

import type { SelectValue } from '../TSelect/types'

export interface TDropdownProps {
  /** 触发方式。`hover` 用于「鼠标移上去展开」的导航类菜单，`click` 用于操作菜单 */
  trigger?: 'click' | 'hover' | 'manual'
  placement?:
    | 'bottom-start'
    | 'bottom'
    | 'bottom-end'
    | 'top-start'
    | 'top'
    | 'top-end'
  disabled?: boolean
  /** 选中一项后是否收起，默认 `true`。多选式菜单（如列显示开关）传 `false` */
  hideOnClick?: boolean
  /** 菜单项最小宽度。默认 `--73-panel-min-width`（112px） */
  minWidth?: string | number
  /** 悬停触发的延迟（ms），默认 120 */
  showDelay?: number
  hideDelay?: number
  ariaLabel?: string
}

export interface TDropdownEmits {
  /** 某一项被选中。参数就是那一项的 `command` */
  (e: 'command', command: SelectValue | undefined): void
  (e: 'visible-change', open: boolean): void
  (e: 'open'): void
  (e: 'close'): void
}

export interface TDropdownInstance {
  open: () => void
  close: () => void
  toggle: () => void
}

export interface TDropdownMenuProps {
  /** 菜单最大高度，超出滚动。默认不限高 */
  maxHeight?: string | number
}

export interface TDropdownItemProps {
  /** 选中时回抛给 `@command` 的标识 */
  command?: SelectValue
  disabled?: boolean
  /** 上方画一条分隔线，用于把破坏性操作与普通项分开（源页面就是这么做「终止合作」的） */
  divided?: boolean
  /** 语义色。`danger` 对应源页面的 `.is-danger`（终止合作 / 取消需求这类） */
  tone?: 'default' | 'danger'
  /** 当前是否是选中项。源页面用 `.is-active` 标排序模式的当前值 */
  active?: boolean
  /** 是否只显示图标（此时必须给 `aria-label`） */
  iconOnly?: boolean
  ariaLabel?: string
}

export interface TDropdownItemEmits {
  (e: 'click'): void
}
