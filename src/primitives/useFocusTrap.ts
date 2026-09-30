/**
 * 焦点陷阱（headless，无样式）
 *
 * 弹窗打开后键盘焦点必须留在弹窗里：Tab 到最后一个可聚焦元素要绕回第一个，
 * Shift+Tab 到第一个要绕回最后一个，而且焦点不能通过别的路径（脚本聚焦、
 * 浏览器地址栏返回、点空白区域）跑到弹窗外面去。
 *
 * 这是「零第三方依赖」策略下自己要写的那部分之一。三条容易写漏的地方：
 *
 * 1. **可聚焦元素要过滤可见性。** 光靠 `querySelectorAll` 选出来的节点里，
 *    有 `display: none`、`visibility: hidden`、`hidden` 属性、`inert` 子树里的，
 *    键盘停不到它们身上。把这类算进去，Tab 会在「看不见的位置」空转。
 * 2. **容器内一个可聚焦元素都没有时不能放行。** 例如纯文字提示弹窗，
 *    此时应把焦点留在容器本身（容器带 `tabindex="-1"`），而不是让 Tab 把焦点带到页面背后。
 * 3. **关闭后要把焦点还回去。** 打开前记下当时的 `activeElement`，关闭时还给它——
 *    否则焦点会落到 `body`，键盘用户要从头 Tab 一遍。
 */

import { onScopeDispose, watch, type Ref } from 'vue'

/**
 * 可聚焦元素选择器。与 `focus-trap` / `tabbable` 的口径一致：
 * 原生可聚焦元素 + 显式 `tabindex` + `contenteditable` + 带 controls 的媒体元素。
 * `[tabindex="-1"]` 排除在外——它只能被脚本聚焦，不参与 Tab 循环。
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** 元素是否真的能被键盘停上去 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  if (element.closest('[inert]')) return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  // 用 offsetParent 判「被祖先隐藏」：display:none 的祖先会让它变成 null。
  // position: fixed 的元素 offsetParent 也是 null，所以把它排除在这个判断之外。
  if (style.position !== 'fixed' && element.offsetParent === null) {
    // 兜底：极少数不可见但仍有尺寸的情形（如 opacity: 0 的过渡中元素）放行
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
  }

  return true
}

/** 取容器内可聚焦元素，按 DOM 顺序 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isFocusable(element) && !element.hasAttribute('data-73-focus-guard'),
  )
}

export interface FocusTrapOptions {
  /** 激活时是否把焦点移进容器，默认 `true` */
  autoFocus?: boolean
  /**
   * 激活时先聚焦谁。给 CSS 选择器、给元素、或 `false`（不自动聚焦，保持现状）。
   * 默认聚焦容器内第一个可聚焦元素，没有则聚焦容器自己。
   */
  initialFocus?: string | HTMLElement | false
  /** 关闭时把焦点还给打开前的元素，默认 `true` */
  restoreFocus?: boolean
}

/**
 * 在 `container` 上装焦点陷阱。`active` 为真时生效。
 *
 * 容器自身需要带 `tabindex="-1"`，否则「容器内没有可聚焦元素」时无处安放焦点。
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  options: FocusTrapOptions = {},
): void {
  const { autoFocus = true, initialFocus, restoreFocus = true } = options

  /** 激活前的焦点位置，关闭时还给它 */
  let previouslyFocused: HTMLElement | null = null

  function focusInitial(el: HTMLElement): void {
    if (initialFocus === false) return

    if (typeof initialFocus === 'string') {
      const target = el.querySelector<HTMLElement>(initialFocus)
      if (target) {
        target.focus()
        return
      }
    } else if (initialFocus instanceof HTMLElement) {
      initialFocus.focus()
      return
    }

    const first = getFocusableElements(el)[0]
    // 容器内没有可聚焦元素时聚焦容器自身，避免焦点留在弹窗外面
    ;(first ?? el).focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return
    const el = container.value
    if (!el) return

    const focusables = getFocusableElements(el)
    if (focusables.length === 0) {
      // 无处可去：拦住 Tab，让焦点停在容器上
      event.preventDefault()
      el.focus()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const current = document.activeElement

    if (!event.shiftKey && current === last) {
      // 正向走到最后一个 → 绕回第一个
      event.preventDefault()
      first?.focus()
      return
    }

    if (event.shiftKey && (current === first || current === el)) {
      // 反向走到第一个 → 绕回最后一个
      event.preventDefault()
      last?.focus()
      return
    }
  }

  function onFocusIn(event: FocusEvent): void {
    const el = container.value
    if (!el) return
    const target = event.target
    if (target instanceof Node && !el.contains(target)) {
      // 焦点从别的路径跑出去了，拽回来
      const first = getFocusableElements(el)[0]
      ;(first ?? el).focus()
    }
  }

  let attached = false

  function attach(): void {
    if (attached) return
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('focusin', onFocusIn, true)
    attached = true

    const el = container.value
    if (autoFocus && el) focusInitial(el)
  }

  function detach(): void {
    if (!attached) return
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('focusin', onFocusIn, true)
    attached = false

    if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus()
    previouslyFocused = null
  }

  watch(
    [active, container],
    ([isActive]) => {
      if (isActive) attach()
      else detach()
    },
    { immediate: true },
  )

  // 容器可能晚于 `active` 出现：弹窗走 `Teleport` + `Transition` 时，
  // `open` 先变真、面板要等下一个 tick 才挂上。attach() 那一刻拿不到容器，
  // 初始聚焦就得在这里补——否则焦点会留在打开弹窗的那颗按钮上，键盘用户
  // 按 Tab 会从页面头部重新开始。
  watch(container, (element) => {
    if (element && attached && autoFocus) focusInitial(element)
  })

  onScopeDispose(detach)
}
