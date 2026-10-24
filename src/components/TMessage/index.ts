/**
 * TMessage / TMessageBox —— 命令式 API
 *
 * 这两个不是模板里写的组件，而是**挂在 `window` 之外、进程内单例**的函数入口：
 *
 * ```ts
 * import { TMessage, TMessageBox } from 'ui_73info'
 *
 * TMessage.success('已保存')
 * if (await TMessageBox.confirm({ content: '确定删除这条需求吗？', tone: 'danger' })) {
 *   // …
 * }
 * ```
 *
 * 接替 `ElMessage`（user_client 里 7 处）与 `ElMessageBox`（2 处）。
 * 容器从哪来、为什么提示与确认框是两套运行时，见 `manager.ts` 顶部。
 *
 * **这两个不注册成全局组件**：它们没有模板形态，`components` 映射里也不登记，
 * 避免有人写 `<TMessage />` 然后发现什么都不出现。
 */

export { TMessage, TMessageBox, destroyMessageHosts } from './manager'
export type {
  MessageBoxOptions,
  MessageHandle,
  MessageItem,
  MessageOptions,
  MessageType,
} from './types'
export { messageTone } from './types'
