/** 弹窗关闭的原因，透传给 `close` 事件 */
export type TDialogCloseReason = 'close-button' | 'escape' | 'mask' | 'api'

export interface TDialogProps {
  /**
   * 是否打开。用 `v-model:open` 双向绑定：
   *
   * ```vue
   * <TDialog v-model:open="visible" title="充值">…</TDialog>
   * ```
   *
   * 相对 Element 的 `v-model="visible"` 多一个修饰名，是为了和 `TSelect`、
   * `TDropdown` 这些同样以「打开」为状态的东西保持一致命名。
   */
  open?: boolean
  /** 标题。`#title` 插槽优先。不给标题时必须给 `ariaLabel`。 */
  title?: string
  /** 宽度，数字按 px 处理，默认 480。窄屏下由 `max-width` 兜底，不会溢出。 */
  width?: number | string
  /** 是否显示右上角关闭按钮，默认 `true` */
  closable?: boolean
  /** 点遮罩关闭，默认 `true` */
  maskClosable?: boolean
  /** 按 Esc 关闭，默认 `true` */
  escapeClosable?: boolean
  /** 打开时锁定背景滚动，默认 `true` */
  lockScroll?: boolean
  /** Teleport 目标，默认 `body`。传 `false` 就地渲染（用于测试或特殊布局）。 */
  teleportTo?: string | HTMLElement | false
  /** 无可见标题时的无障碍名称 */
  ariaLabel?: string
}

export interface TDialogEmits {
  (e: 'update:open', open: boolean): void
  /** 关闭时触发，`reason` 说明是谁关的（Esc / 点遮罩 / 关闭按钮 / 代码调用） */
  (e: 'close', reason: TDialogCloseReason): void
  /** 打开动画结束 */
  (e: 'opened'): void
  /** 关闭动画结束 */
  (e: 'closed'): void
}
