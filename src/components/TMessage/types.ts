/**
 * TMessage / TMessageBox 的类型
 *
 * 这两个是**命令式 API**（`TMessage.success('...')`），不是模板里写的组件，
 * 所以类型描述的是「调用时传什么、返回什么」。
 */

import type { Tone } from '../../types/common'

/** 提示的语气。`error` 映射到 `danger`（Element 的 `type` 也是这个映射） */
export type MessageType = 'info' | 'success' | 'warning' | 'error'

export interface MessageOptions {
  /** 文案。单行，超长会换行 */
  message: string
  type?: MessageType
  /** 自动消失的毫秒数，默认 3000。传 `0` 表示不自动消失 */
  duration?: number
  /** 是否显示关闭按钮，默认 `false` */
  closable?: boolean
  /** 同一条内容重复弹出时是否合并（后一条顶掉前一条），默认 `false` */
  group?: boolean
  /** 关闭时的回调 */
  onClose?: () => void
}

/** `TMessage.xxx()` 的返回值，用来手动关掉这一条 */
export interface MessageHandle {
  id: number
  close: () => void
}

export interface MessageBoxOptions {
  title?: string
  /** 正文。可以是多段文字，但不要长到需要滚动 */
  content?: string
  /** 确定按钮文案，默认「确定」 */
  confirmText?: string
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string
  /** 确定按钮的语气，默认 `accent`。破坏性操作用 `danger` */
  tone?: Tone
  /** 隐藏取消按钮（就是 `alert`）。`confirm` 默认显示 */
  showCancel?: boolean
  /** 点遮罩是否等同取消，默认 `false`——确认框上误触遮罩的风险比提示大 */
  maskClosable?: boolean
}

/** 提示列表内部用的一条记录 */
export interface MessageItem {
  id: number
  message: string
  type: MessageType
  duration: number
  closable: boolean
  group: boolean
}

/**
 * 提示条的语气映射。
 *
 * 与其他组件的 `tone` 口径统一：`error` → `danger`。
 * 单独写一个函数而不是在每个使用点内联，是为了让「error 到底是不是红」只有一处答案。
 */
export function messageTone(type: MessageType): Tone {
  switch (type) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'danger'
    case 'info':
    default:
      return 'info'
  }
}
