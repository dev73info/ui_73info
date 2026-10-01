/**
 * TDropdown 的属性与事件
 */

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
  /**
   * 某一项被选中。参数就是那一项的 `command`（原样回抛，不做任何加工）。
   *
   * 类型是 `unknown` 而不是某个联合：`command` 是调用方自己定的标识，
   * 仓库里既有 `"latest"` 这样的字符串，也有 `{ action, resource }` 这样的整对象
   * （菜单里每一项都要携带自己的上下文）。库无从知道是哪种，硬收窄只会逼调用方
   * 到处 `as`。收窄这一步交给调用方 —— 与 `TTableColumn` 插槽里的 `row` 同一口径
   * （见 ui_73info/doc/开发指南.md 末尾）。
   */
  (e: 'command', command: unknown): void
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
  /**
   * 选中时回抛给 `@command` 的标识。
   *
   * 类型是 `unknown`（回抛时原样不动），理由见 `TDropdownEmits` 上 `command` 的注释。
   */
  command?: unknown
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
