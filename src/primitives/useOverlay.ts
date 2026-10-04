/**
 * 浮层开合原语（headless，无样式）
 *
 * 把「一个锚点 + 一块 Teleport 到 body 的面板」这套开合行为收成一处：下拉、气泡、
 * 提示、日期面板、选择器要的都是同一件事，各写一遍就会出现四套不同的边界条件。
 *
 * ## 这个原语负责什么
 *
 * | 关注点 | 怎么处理 |
 * | --- | --- |
 * | 打开 / 关闭 / 切换 | 内部持有 `open`，也支持受控（传 `open` + `onOpenChange`） |
 * | 触发方式 | `click` / `hover` / `focus` / `manual` 四种 |
 * | 位置 | 交给 `useFloating`（翻转、收拢、滚动跟随） |
 * | Esc 与点外部 | 交给 `useDismissable`（多层时只有最上面那层响应） |
 * | 悬停延迟 | 鼠标扫过一排图标时不希望每个都弹一下，所以进出各有一个延迟 |
 *
 * ## 两个容易写漏的地方
 *
 * 1. **`ignore` 必须同时包含锚点与面板。** 两者都不在对方的 DOM 子树里，
 *    面板还 `Teleport` 到了 `body`。只声明面板，点触发器就会「关掉再打开」；
 *    只声明锚点，点面板内部会把它关掉。
 * 2. **`hover` 模式下要把「从锚点移进面板」当作没离开。** 两者之间有 4px 间距，
 *    指针穿过那段空隙会触发一次 `pointerleave`；有 `hideDelay` 才不会被判定成离开。
 *
 * ## 监听绑在哪儿
 *
 * 锚点与面板元素都由模板 ref 给进来，出现时机不同（锚点一开始就在，面板是打开后才
 * 挂上），所以用 `watch(elementRef, …, { flush: 'post', onCleanup })` 成对挂载与卸载。
 * 组件侧不需要写任何 `@pointerenter` —— 那些事件属于「浮层怎么开合」，
 * 不属于「这个控件长什么样」。
 */

import { computed, onScopeDispose, ref, toValue, watch, type CSSProperties, type MaybeRefOrGetter, type Ref } from 'vue'
import { useDismissable, type DismissReason } from './useDismissable'
import { useFloating, type Placement } from './useFloating'
import { acquireZIndex, type ZIndexHandle } from './useZIndex'

export type OverlayTrigger = 'click' | 'hover' | 'focus' | 'manual'

/** 关闭原因。`'api'` 是调用方自己调的 `hide()`，`'select'` 是选中后自动收起。 */
export type OverlayCloseReason = DismissReason | 'api' | 'select'

export interface OverlayOptions {
  /** 触发方式，默认 `'click'` */
  trigger?: MaybeRefOrGetter<OverlayTrigger>
  /** 期望位置，默认 `'bottom-start'` */
  placement?: MaybeRefOrGetter<Placement>
  /** 面板与锚点的间距，默认 4px（与 `--73-panel-gap` 同值） */
  gap?: MaybeRefOrGetter<number>
  /** 面板最小宽度对齐锚点，默认 `false` */
  matchWidth?: MaybeRefOrGetter<boolean>
  /** 按 Esc 关闭，默认 `true` */
  closeOnEscape?: MaybeRefOrGetter<boolean>
  /** 点外部关闭，默认 `true`。锚点与面板本身始终不算外部 */
  closeOnOutside?: MaybeRefOrGetter<boolean>
  /** `hover` 触发时，移入到打开之间的延迟（ms），默认 120 */
  showDelay?: MaybeRefOrGetter<number>
  /** `hover` 触发时，移出到关闭之间的延迟（ms），默认 120 */
  hideDelay?: MaybeRefOrGetter<number>
  /**
   * 受控模式：传了它就以它为准（`v-model:open` 的 prop 那一边）。
   * 不传时完全由内部状态管，`show()` / `hide()` 直接生效。
   */
  open?: MaybeRefOrGetter<boolean | undefined>
  /** 受控模式下把变更需求回抛给调用方 */
  onOpenChange?: (open: boolean, reason: OverlayCloseReason | 'trigger') => void
  /** 打开后的回调 */
  onAfterOpen?: () => void
  /** 关闭后的回调 */
  onAfterClose?: (reason: OverlayCloseReason) => void
}

export interface OverlayReturn {
  open: Ref<boolean>
  /** 绑到触发元素上的 ref */
  anchorRef: Ref<HTMLElement | null>
  /** 绑到面板根元素上的 ref */
  panelRef: Ref<HTMLElement | null>
  /** 面板的 `position: fixed` 坐标，直接绑 `style` */
  panelStyle: Ref<CSSProperties>
  resolvedPlacement: Ref<Placement>
  show: () => void
  hide: (reason?: OverlayCloseReason) => void
  toggle: () => void
}

export function useOverlay(options: OverlayOptions = {}): OverlayReturn {
  const anchorRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const innerOpen = ref(false)
  const open = ref(false)

  /**
   * 受控时以 prop 为准，否则看内部状态。
   *
   * **这个判断必须是动态的，不能只在 setup 里算一次。** `TTooltip` / `TPopover` 为了
   * 同时支持「受控」与「自己管」两种用法，会传一个 `props.open === undefined ?
   * undefined : props.open` 的 getter——如果只在 setup 里判一次「传了 open 就是受控」，
   * 那么没绑 `v-model:open` 的时候也会被当成受控，`show()` 只会发一个
   * `update:open` 出去，自己永远不打开（表现就是「提示和气泡点了没反应」）。
   */
  const controlledOpen = computed(() =>
    options.open === undefined ? undefined : toValue(options.open),
  )

  function commit(next: boolean, reason: OverlayCloseReason | 'trigger'): void {
    if (controlledOpen.value !== undefined) {
      // 受控：不改真值来源，只通知调用方去改，避免「镜像说开、prop 说关」
      options.onOpenChange?.(next, reason)
      return
    }
    innerOpen.value = next
    // 同步写 `open`（而不是等下面的 watch）：调用方常常在 `show()` 之后立刻读
    // `open.value` 来决定后续动作，等到下一个 flush 就晚了。
    // watch 那一侧有「值没变就直接返回」的守卫，所以不会重复触发回调。
    open.value = next
  }

  watch(
    () => (controlledOpen.value !== undefined ? controlledOpen.value : innerOpen.value),
    (next) => {
      const resolved = next ?? false
      if (resolved === open.value) return
      open.value = resolved
      if (resolved) options.onAfterOpen?.()
      else options.onAfterClose?.('api')
    },
    { immediate: true },
  )

  const { style: floatingStyle, resolvedPlacement } = useFloating({
    anchor: anchorRef,
    panel: panelRef,
    open,
    placement: options.placement,
    gap: options.gap,
    matchWidth: options.matchWidth,
  })

  /**
   * 浮层层级：打开时从层级管理器取一个，面板比「先开的对话框」高，比「后开的层」低。
   *
   * 不能用组件样式里写死的 `--73-z-dropdown`：对话框的遮罩是 `--73-z-dialog`（3000），
   * 面板固定 2000 时会被整块压在底下，弹窗里打开下拉就看不见选项。
   */
  const layer = ref<ZIndexHandle | null>(null)

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        if (!layer.value) layer.value = acquireZIndex()
        return
      }
      layer.value?.release()
      layer.value = null
    },
    { immediate: true },
  )

  /** 位置由 `useFloating` 给，层级由层级管理器给 */
  const panelStyle = computed<CSSProperties>(() =>
    layer.value ? { ...floatingStyle.value, zIndex: layer.value.zIndex } : floatingStyle.value,
  )

  useDismissable({
    element: panelRef,
    enabled: open,
    closeOnEscape: options.closeOnEscape,
    closeOnOutside: options.closeOnOutside,
    // 触发器也算「内部」：否则点它会被判成点外部，先关再开，看起来像没反应
    ignore: () => [anchorRef.value],
    onDismiss: (reason) => hide(reason),
  })

  function show(): void {
    if (open.value) return
    commit(true, 'trigger')
  }

  function hide(reason: OverlayCloseReason = 'api'): void {
    if (!open.value) return
    commit(false, reason)
  }

  function toggle(): void {
    if (open.value) hide('api')
    else show()
  }

  /* ---------- hover 触发 ---------- */

  let showTimer = 0
  let hideTimer = 0
  /** 指针是不是还在锚点或面板上。定时器走完时用它决定「离开」是否成立 */
  let pointerInside = false

  function clearTimers(): void {
    if (showTimer) window.clearTimeout(showTimer)
    if (hideTimer) window.clearTimeout(hideTimer)
    showTimer = 0
    hideTimer = 0
  }

  function onPointerEnter(): void {
    pointerInside = true
    clearTimers()
    if (open.value) return
    const delay = toValue(options.showDelay) ?? 120
    if (delay <= 0) show()
    else showTimer = window.setTimeout(show, delay)
  }

  function onPointerLeave(): void {
    pointerInside = false
    clearTimers()
    const delay = toValue(options.hideDelay) ?? 120
    if (delay <= 0) hide('outside')
    else {
      hideTimer = window.setTimeout(() => {
        // 定时器走完前指针又回到了锚点或面板上就不关
        if (!pointerInside) hide('outside')
      }, delay)
    }
  }

  function onFocusIn(): void {
    show()
  }

  function onFocusOut(): void {
    // 焦点移到面板内部时不算离开。等一拍再判断：`focusout` 早于新的 `focusin`
    window.setTimeout(() => {
      const active = document.activeElement
      if (active && (panelRef.value?.contains(active) || anchorRef.value?.contains(active))) return
      hide('outside')
    }, 0)
  }

  function onAnchorClick(event: MouseEvent): void {
    if (event.defaultPrevented) return
    toggle()
  }

  /** 按当前触发方式给一个元素挂监听，返回解绑函数 */
  function listen(el: HTMLElement, isAnchor: boolean): () => void {
    const mode = toValue(options.trigger) ?? 'click'

    if (mode === 'hover') {
      el.addEventListener('pointerenter', onPointerEnter)
      el.addEventListener('pointerleave', onPointerLeave)
      return () => {
        el.removeEventListener('pointerenter', onPointerEnter)
        el.removeEventListener('pointerleave', onPointerLeave)
      }
    }

    if (mode === 'focus') {
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
      return () => {
        el.removeEventListener('focusin', onFocusIn)
        el.removeEventListener('focusout', onFocusOut)
      }
    }

    if (mode === 'click' && isAnchor) {
      // 键盘触发（Enter / Space / ArrowDown）不在这里：组件要顺带把高亮项挪进面板，
      // 那属于控件自己的键盘语义，不属于「点一下开合」。
      el.addEventListener('click', onAnchorClick)
      return () => el.removeEventListener('click', onAnchorClick)
    }

    return () => {}
  }

  watch(anchorRef, (el, _old, onCleanup) => {
    if (!el) return
    onCleanup(listen(el, true))
  })

  watch(panelRef, (el, _old, onCleanup) => {
    if (!el) return
    onCleanup(listen(el, false))
  })

  // 关闭时把定时器清掉，否则「刚关就自己又打开」
  watch(open, (isOpen) => {
    if (!isOpen) clearTimers()
  })

  onScopeDispose(() => {
    clearTimers()
    // 组件被卸载时也要把层级交回去，否则残留的层会把后续浮层的层级抬高
    layer.value?.release()
    layer.value = null
  })

  return {
    open,
    anchorRef,
    panelRef,
    panelStyle,
    resolvedPlacement,
    show,
    hide,
    toggle,
  }
}
