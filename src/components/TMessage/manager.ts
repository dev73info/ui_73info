/**
 * 命令式提示的运行时
 *
 * ## 「谁持有容器」这个问题的答案
 *
 * `TDialog` 那类组件靠模板里的 `v-if` 决定生死，命令式 API 没有模板可挂，
 * 所以必须先回答「容器从哪来」。这里的选择是：**第一次调用时才建容器，之后复用**。
 *
 * - 容器是一个 `document.createElement('div')`，追加到 `body`，再由 `createApp` 挂载；
 * - 提示用一份 `reactive` 数组驱动（列表组件直接读它，改了就会重渲染），
 *   所以**只挂一次应用**，不是每次弹提示都 `createApp` 一遍；
 * - 容器与应用的引用留在模块作用域里，进程级单例——同一条页面弹十次提示也只有一份 DOM。
 *
 * ## 提示与确认框是两套运行时
 *
 * 提示可以同时存在多条（堆叠），确认框一次只能有一个（它是模态的），
 * 所以确认框那套带一个**队列**：调用方在前一个框还没关时再调 `confirm`，
 * 会排队而不是压在上面。
 *
 * ## SSR
 *
 * `typeof document === 'undefined'` 时所有入口直接返回一个空句柄，不抛错。
 * 提示本来就只在客户端有意义，在服务端渲染时炸掉整页是更糟的结果。
 */

import { createApp, reactive, type App } from 'vue'
import type { Tone } from '../../types/common'
import TMessageBoxPanel from './TMessageBox.vue'
import TMessageList from './TMessageList.vue'
import type {
  MessageBoxOptions,
  MessageHandle,
  MessageItem,
  MessageOptions,
  MessageType,
} from './types'

/* ---------------------------------------------------------------------------
   提示（可堆叠）
   --------------------------------------------------------------------------- */

/** 同时最多显示几条。超出时挤掉最旧的——一面墙的提示条比丢掉一条更糟 */
const MAX_VISIBLE = 5

const DEFAULT_DURATION = 3000

const messages = reactive<MessageItem[]>([])
const closeCallbacks = new Map<number, (() => void) | undefined>()
const timers = new Map<number, number>()

let messageApp: App | null = null
let messageContainer: HTMLElement | null = null
let seed = 0

function ensureMessageApp(): void {
  if (messageApp || typeof document === 'undefined') return
  messageContainer = document.createElement('div')
  messageContainer.className = 't73-message-host'
  document.body.appendChild(messageContainer)
  messageApp = createApp(TMessageList, { messages, onClose: closeMessage })
  messageApp.mount(messageContainer)
}

function clearTimer(id: number): void {
  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
}

/**
 * 排一条自动关闭的定时器。
 *
 * 时长与文案长度挂钩并设上限：短提示不该占满 3 秒，长提示也不该消失得比读完还快。
 * `duration <= 0` 表示常驻。
 */
function scheduleClose(item: MessageItem): void {
  clearTimer(item.id)
  if (item.duration <= 0 || typeof window === 'undefined') return
  const duration = Math.max(item.duration, Math.min(8000, item.message.length * 120))
  timers.set(
    item.id,
    window.setTimeout(() => closeMessage(item.id), duration),
  )
}

/** 关闭某一条。关闭按钮与定时器都走这里 */
function closeMessage(id: number): void {
  clearTimer(id)
  const index = messages.findIndex((item) => item.id === id)
  if (index < 0) return
  messages.splice(index, 1)
  const callback = closeCallbacks.get(id)
  closeCallbacks.delete(id)
  callback?.()
}

function openMessage(options: MessageOptions): MessageHandle {
  if (typeof document === 'undefined') return { id: 0, close: () => {} }

  ensureMessageApp()

  const type: MessageType = options.type ?? 'info'
  const duration = options.duration ?? DEFAULT_DURATION

  // 同名同类型合并：轮询失败那种场景会连着报同一句话十几次，
  // 合并成一条并重新计时，比堆十条更有用
  if (options.group) {
    const existing = messages.find((item) => item.message === options.message && item.type === type)
    if (existing) {
      existing.duration = duration
      scheduleClose(existing)
      return { id: existing.id, close: () => closeMessage(existing.id) }
    }
  }

  seed += 1
  const item: MessageItem = {
    id: seed,
    message: options.message,
    type,
    duration,
    closable: options.closable ?? true,
    group: options.group ?? false,
  }
  messages.push(item)
  if (options.onClose) closeCallbacks.set(item.id, options.onClose)
  scheduleClose(item)

  // 超出上限时关掉最旧的那条。注意要先于新条目计入，否则第一次就会挤掉自己
  while (messages.length > MAX_VISIBLE) {
    const oldest = messages[0]
    if (oldest) closeMessage(oldest.id)
    else break
  }

  return { id: item.id, close: () => closeMessage(item.id) }
}

function shortcut(type: MessageType) {
  return (message: string | MessageOptions, duration?: number): MessageHandle =>
    openMessage(
      typeof message === 'string'
        ? { message, type, duration }
        : { ...message, type: message.type ?? type },
    )
}

function closeAllMessages(): void {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
  messages.splice(0, messages.length).forEach((item) => closeCallbacks.get(item.id)?.())
  closeCallbacks.clear()
}

/* ---------------------------------------------------------------------------
   确认框（一次一个，排队）
   --------------------------------------------------------------------------- */

interface PendingBox {
  options: MessageBoxOptions
  resolve: (value: boolean) => void
}

const boxState = reactive({
  visible: false,
  title: '确认',
  content: '',
  confirmText: '确定',
  cancelText: '取消',
  tone: 'accent' as Tone,
  showCancel: true,
  maskClosable: false,
  resolve: null as ((value: boolean) => void) | null,
})

const queue: PendingBox[] = []
let boxApp: App | null = null
let boxContainer: HTMLElement | null = null

function ensureBoxApp(): void {
  if (boxApp || typeof document === 'undefined') return
  boxContainer = document.createElement('div')
  boxContainer.className = 't73-message-box-host'
  document.body.appendChild(boxContainer)
  boxApp = createApp(TMessageBoxPanel, { state: boxState })
  boxApp.mount(boxContainer)
}

/**
 * 放行队列里的下一个。
 *
 * 延迟 180ms 再弹下一个：前一个的离场动画还没走完就叠上来，
 * 会看到两个框在同一位置上互相盖一下。
 */
function pump(delay = 0): void {
  const run = (): void => {
    if (boxState.visible || queue.length === 0) return
    const next = queue.shift()
    if (!next) return

    ensureBoxApp()
    boxState.title = next.options.title ?? '确认'
    boxState.content = next.options.content ?? ''
    boxState.confirmText = next.options.confirmText ?? '确定'
    boxState.cancelText = next.options.cancelText ?? '取消'
    boxState.tone = next.options.tone ?? 'accent'
    boxState.showCancel = next.options.showCancel ?? true
    boxState.maskClosable = next.options.maskClosable ?? false
    boxState.resolve = (value: boolean) => {
      next.resolve(value)
      // visible 已由组件先置为 false，这里接着放行下一个
      pump(180)
    }
    boxState.visible = true
  }

  if (delay <= 0) run()
  else window.setTimeout(run, delay)
}

function requestBox(options: MessageBoxOptions): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    queue.push({ options, resolve })
    pump()
  })
}

/* ---------------------------------------------------------------------------
   对外 API
   --------------------------------------------------------------------------- */

export const TMessage = {
  /** 完整选项的入口 */
  open: openMessage,
  success: shortcut('success'),
  error: shortcut('error'),
  warning: shortcut('warning'),
  info: shortcut('info'),
  close: closeMessage,
  closeAll: closeAllMessages,
}

export const TMessageBox = {
  /** 完整的入口 */
  open: requestBox,
  /** 确定 + 取消两个出口，返回「是否点了确定」 */
  confirm: (options: MessageBoxOptions | string): Promise<boolean> =>
    requestBox(typeof options === 'string' ? { content: options, showCancel: true } : options),
  /** 只有一个确定（`showCancel` 强制为 false） */
  alert: (options: MessageBoxOptions | string): Promise<void> =>
    requestBox({
      ...(typeof options === 'string' ? { content: options } : options),
      showCancel: false,
    }).then(() => undefined),
}

/** 拆掉两套运行时。只给测试与热更新用，业务代码不需要调 */
export function destroyMessageHosts(): void {
  closeAllMessages()
  queue.splice(0, queue.length).forEach((pending) => pending.resolve(false))
  messageApp?.unmount()
  boxApp?.unmount()
  messageContainer?.remove()
  boxContainer?.remove()
  messageApp = null
  boxApp = null
  messageContainer = null
  boxContainer = null
  boxState.visible = false
  boxState.resolve = null
}

export type { MessageBoxOptions, MessageHandle, MessageOptions, MessageType }
