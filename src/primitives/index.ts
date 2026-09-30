/**
 * 行为原语出口
 *
 * 这一层是**无样式**的：只管交互行为（焦点、关闭、滚动、id），不产出任何视觉。
 * 组件层负责把令牌套上去。分层的好处是行为可以单独被别的组件复用——
 * 下拉、气泡、日期面板要的「点外部关闭 + Esc 关闭 + 焦点陷阱」是同一套。
 *
 * 这里的原语全部自己实现（本项目不引第三方 UI 依赖，交互行为也不引）。
 */

// 稳定 id 用于 a11y 关联（label/for、aria-labelledby、aria-describedby），
// 直接用 Vue 3.5 内置的 useId：它在服务端渲染与客户端一致，且同一个组件实例内稳定。
// 不自己造一个计数器版本，那会撞 SSR 的水合不匹配。
export { useId } from 'vue'

export { useBodyScrollLock, lockBodyScroll } from './useBodyScrollLock'
export { useDismissable, dismissableLayerCount } from './useDismissable'
export type { DismissableOptions, DismissReason } from './useDismissable'
export { useFocusTrap, getFocusableElements, isFocusable } from './useFocusTrap'
export type { FocusTrapOptions } from './useFocusTrap'
