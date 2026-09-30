/**
 * 关闭行为原语（headless，无样式）
 *
 * 管两件事：**按 Esc 关闭** 与 **点外部关闭**。弹窗、下拉、气泡、日期面板都要它。
 *
 * ## 为什么要有全局层栈
 *
 * 多层同时打开时（弹窗里开一个下拉、下拉里再开一个气泡），Esc 只能关掉最上面那层，
 * 不能一次把三层全关了；点外部同理。所以每个使用者注册成一层，
 * **只有最上面那一层响应**。若各组件自己挂 `document` 监听，Esc 一次会把所有层都关掉。
 *
 * 「最上面」= 最近注册且仍启用的一层，也就是「最近打开的那个」。
 *
 * ## 点击外部的判定
 *
 * 目标节点落在本层容器内 → 不算外部。另外允许用 `ignore` 声明**额外算作内部**的节点：
 * 触发器按钮、`Teleport` 到 `body` 的下拉面板都属于这类——它们不在容器 DOM 子树里，
 * 但视觉上明显属于这一层，不声明就会出现「点面板自己就关了」。
 *
 * 监听用 `pointerdown` 的捕获阶段：这样点击落在别的组件的处理器之前就完成了关闭判断，
 * 不会出现「已经关闭了又触发一次打开」的双跳。
 */

import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

export type DismissReason = 'escape' | 'outside'

export interface DismissableOptions {
  /** 本层的容器。落在这里面的事件不算「点外部」。 */
  element: MaybeRefOrGetter<HTMLElement | null>
  /** 被要求关闭时的回调。会同时用于 Esc 与点外部，用 `reason` 区分。 */
  onDismiss: (reason: DismissReason) => void
  /** 本层是否生效，默认 `true`。传 ref/getter 可在关闭动画期间先停用。 */
  enabled?: MaybeRefOrGetter<boolean>
  /** 按 Esc 关闭，默认 `true`。可传 ref/getter 让它随条件变化。 */
  closeOnEscape?: MaybeRefOrGetter<boolean>
  /** 点外部关闭，默认 `true`。可传 ref/getter 让它随条件变化。 */
  closeOnOutside?: MaybeRefOrGetter<boolean>
  /**
   * 额外算作「内部」的节点。用于 `Teleport` 到 `body` 的面板、以及触发本层的按钮——
   * 不声明它们，点触发器会把「已关闭」再翻成「打开」，看起来像点了没反应。
   */
  ignore?: MaybeRefOrGetter<Array<HTMLElement | null | undefined>>
}

interface ResolvedDismissOptions {
  element: () => HTMLElement | null
  onDismiss: (reason: DismissReason) => void
  closeOnEscape: () => boolean
  closeOnOutside: () => boolean
  ignore: () => Array<HTMLElement | null | undefined>
}

interface Layer {
  /** 注册序号，越大越靠上 */
  id: number
  options: ResolvedDismissOptions
}

/** 已启用的层，按注册顺序排列，最后一个是「最上面」那层 */
const layers: Layer[] = []
let sequence = 0
let listening = false

function topLayer(): Layer | undefined {
  return layers[layers.length - 1]
}

function isInside(layer: Layer, target: Node): boolean {
  if (layer.options.element()?.contains(target)) return true
  return layer.options.ignore().some((node) => node?.contains(target) === true)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const layer = topLayer()
  if (!layer?.options.closeOnEscape()) return
  event.stopPropagation()
  layer.options.onDismiss('escape')
}

function onPointerDown(event: PointerEvent): void {
  // 只处理主键，右键菜单与中键不参与关闭
  if (event.button !== 0) return
  const target = event.target
  if (!(target instanceof Node)) return

  const layer = topLayer()
  if (!layer?.options.closeOnOutside()) return
  if (isInside(layer, target)) return
  layer.options.onDismiss('outside')
}

function startListening(): void {
  if (listening) return
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('pointerdown', onPointerDown, true)
  listening = true
}

function stopListening(): void {
  if (!listening) return
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('pointerdown', onPointerDown, true)
  listening = false
}

function register(layer: Layer): void {
  if (layers.includes(layer)) return
  layers.push(layer)
  startListening()
}

function unregister(layer: Layer): void {
  const index = layers.indexOf(layer)
  if (index >= 0) layers.splice(index, 1)
  if (layers.length === 0) stopListening()
}

/**
 * 把当前组件注册成一层「可被关闭」的层。
 *
 * 层在组件卸载（`onScopeDispose`）时自动注销，`enabled` 转假时也会先注销——
 * 关闭动画期间传 `enabled: false` 可以避免用户连点两次时又关一次。
 */
export function useDismissable(options: DismissableOptions): void {
  sequence += 1
  const layer: Layer = {
    id: sequence,
    options: {
      element: () => toValue(options.element),
      onDismiss: options.onDismiss,
      closeOnEscape: () => toValue(options.closeOnEscape) ?? true,
      closeOnOutside: () => toValue(options.closeOnOutside) ?? true,
      ignore: () => toValue(options.ignore) ?? [],
    },
  }

  watch(
    () => toValue(options.enabled) ?? true,
    (enabled) => {
      if (enabled) register(layer)
      else unregister(layer)
    },
    { immediate: true },
  )

  onScopeDispose(() => unregister(layer))
}

/** 当前打开了几层。仅用于调试与测试断言。 */
export function dismissableLayerCount(): number {
  return layers.length
}
