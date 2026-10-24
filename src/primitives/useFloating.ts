/**
 * 定位引擎（headless，无样式）
 *
 * 下拉、气泡、提示、日期面板要的是**同一件事**：把一块面板贴在一个锚点元素旁边，
 * 空间不够时翻转，贴着视口边时收回视线范围内，并且容器滚动/改尺寸时跟着走。
 * 零第三方依赖意味着这一层要自己写。
 *
 * ## 为什么是 `position: fixed` + 视口坐标
 *
 * 换成「相对定位 + 文档坐标」就必须处理滚动容器的偏移链，而 user_client 的滚动发生在
 * 外壳的 `el-scrollbar` 上（`AGENTS.md` 第六节记过这一条：页面内不要再套滚动容器）。
 * 用 `fixed` 加视口坐标，锚点滚出视口时面板要重算 —— 代价是监听滚动，
 * 收益是不必知道滚动容器是谁，也不会被祖先的 `transform` 带跑。
 *
 * ## 测量时机
 *
 * 面板刚挂上时 `offsetWidth/Height` 才有值，所以挂载与打开要各重算一次：
 * `watch([open, panel])` 覆盖「打开时面板还不存在」，`ResizeObserver` 覆盖
 * 「面板在了但内容是异步填进来的」——选项列表异步加载时高度会变，
 * 不重算就会把面板底部压到视口外。
 *
 * ## 翻转与收拢
 *
 * - **翻转**沿主轴（上/下 或 左/右）：bottom 放不下就看上面，反之亦然。
 *   只在「这一侧真的放不下」且「对面更宽敞」时才翻，避免临界点上反复横跳。
 * - **收拢**分两个轴，规则不同：
 *   - **交叉轴总是收拢**，把面板夹进 `[padding, 视口 - 面板尺寸 - padding]`。
 *     这只影响面板与锚点左右对齐，不会让它离开锚点那一行。
 *   - **主轴只在锚点自己也看得见时才收拢**。锚点滚出视口后（列表里点开下拉再往下滚）
 *     把面板硬拽回视口，会让它彻底脱离锚点，看起来像弹到了另一个元素上。
 *   面板比视口还宽时夹具会反向，所以先夹「最大可用宽」再夹位置。
 */

import {
  nextTick,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type CSSProperties,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

/** 面板贴在锚点的哪一侧、哪一端对齐 */
export type Placement =
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split('-') as [Side, Align | undefined]
  return { side, align: align ?? 'center' }
}

function opposite(side: Side): Side {
  switch (side) {
    case 'top':
      return 'bottom'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

/** 主轴是不是竖直方向 */
function isVertical(side: Side): boolean {
  return side === 'top' || side === 'bottom'
}

export interface FloatingOptions {
  /** 锚点元素（触发面板的那个控件） */
  anchor: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** 面板元素。面板通过 `v-if` 控制时，关闭期间是 `null` */
  panel: Ref<HTMLElement | null>
  /** 面板是否可见。不可见时不做测量与监听，省掉无谓的重排 */
  open: MaybeRefOrGetter<boolean>
  /** 期望位置，默认 `'bottom-start'` */
  placement?: MaybeRefOrGetter<Placement>
  /**
   * 面板与锚点的间距。默认 4px，与 `--73-panel-gap` 同值——
   * 这里拿不到 CSS 变量（测量发生在样式解析之外），所以给常量并让两边注释互指。
   */
  gap?: MaybeRefOrGetter<number>
  /** 面板宽度对齐锚点宽度（下拉、日期面板要；提示气泡不要） */
  matchWidth?: MaybeRefOrGetter<boolean>
  /** 与视口边缘至少留出的距离 */
  viewportPadding?: number
  /** 主轴上空间不足时翻到对面，默认允许 */
  flip?: MaybeRefOrGetter<boolean>
  /** 交叉轴上超出视口时平移回来，默认允许 */
  shift?: MaybeRefOrGetter<boolean>
}

export interface FloatingReturn {
  /** 直接绑到面板根元素上的 `style` */
  style: Ref<CSSProperties>
  /** 实际生效的位置（可能与传入的不同——翻转之后） */
  resolvedPlacement: Ref<Placement>
  /** 手动重算。锚点位置被别的脚本改过时用得上 */
  update: () => void
}

export function useFloating(options: FloatingOptions): FloatingReturn {
  const { panel, viewportPadding = 8 } = options

  const style = ref<CSSProperties>({})
  const resolvedPlacement = ref<Placement>(toValue(options.placement) ?? 'bottom-start')

  let frame = 0

  function compute(): void {
    const anchorEl = toValue(options.anchor)
    const panelEl = panel.value
    if (!anchorEl || !panelEl || !toValue(options.open)) return

    const anchorRect = anchorEl.getBoundingClientRect()
    const panelWidth = panelEl.offsetWidth
    const panelHeight = panelEl.offsetHeight
    const gap = toValue(options.gap) ?? 4
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const requested = toValue(options.placement) ?? 'bottom-start'
    let { side, align } = parsePlacement(requested)

    // --- 主轴翻转 ---
    if (toValue(options.flip) ?? true) {
      if (isVertical(side)) {
        const spaceBelow = viewportHeight - anchorRect.bottom - gap
        const spaceAbove = anchorRect.top - gap
        // 只在「这一侧真的放不下」且「对面更宽敞」时翻，避免临界点上反复横跳
        if (side === 'bottom' && panelHeight > spaceBelow && spaceAbove > spaceBelow) {
          side = opposite(side)
        } else if (side === 'top' && panelHeight > spaceAbove && spaceBelow > spaceAbove) {
          side = opposite(side)
        }
      } else {
        const spaceRight = viewportWidth - anchorRect.right - gap
        const spaceLeft = anchorRect.left - gap
        if (side === 'right' && panelWidth > spaceRight && spaceLeft > spaceRight) {
          side = opposite(side)
        } else if (side === 'left' && panelWidth > spaceLeft && spaceRight > spaceLeft) {
          side = opposite(side)
        }
      }
    }

    // --- 主轴上的位置 ---
    let top = 0
    let left = 0
    if (isVertical(side)) {
      top = side === 'bottom' ? anchorRect.bottom + gap : anchorRect.top - gap - panelHeight
    } else {
      left = side === 'right' ? anchorRect.right + gap : anchorRect.left - gap - panelWidth
    }

    // --- 交叉轴上的对齐 ---
    if (isVertical(side)) {
      if (align === 'start') left = anchorRect.left
      else if (align === 'end') left = anchorRect.right - panelWidth
      else left = anchorRect.left + (anchorRect.width - panelWidth) / 2
    } else {
      if (align === 'start') top = anchorRect.top
      else if (align === 'end') top = anchorRect.bottom - panelHeight
      else top = anchorRect.top + (anchorRect.height - panelHeight) / 2
    }

    // --- 收拢进视口。先保证可用宽度不小于 0，再夹位置，否则面板比视口宽时会被夹成负数。 ---
    const maxLeft = Math.max(viewportPadding, viewportWidth - panelWidth - viewportPadding)
    const maxTop = Math.max(viewportPadding, viewportHeight - panelHeight - viewportPadding)

    /**
     * 锚点是不是（部分）在视口里。
     *
     * 它决定**主轴**要不要收拢：锚点滚出视口时（列表里点开下拉再往下滚），
     * 把面板硬拽回视口内会让它彻底脱离锚点，看起来像弹到了另一个元素上。
     * 交叉轴不受这条限制——交叉轴收拢只是让面板与锚点左右对齐，
     * 不会让它离开锚点所在的那一行。
     */
    const anchorVisible =
      anchorRect.bottom > 0 &&
      anchorRect.top < viewportHeight &&
      anchorRect.right > 0 &&
      anchorRect.left < viewportWidth

    if (toValue(options.shift) ?? true) {
      if (isVertical(side)) {
        left = Math.min(Math.max(left, viewportPadding), maxLeft)
        if (anchorVisible) top = Math.min(Math.max(top, viewportPadding), maxTop)
      } else {
        top = Math.min(Math.max(top, viewportPadding), maxTop)
        if (anchorVisible) left = Math.min(Math.max(left, viewportPadding), maxLeft)
      }
    }

    resolvedPlacement.value = (align === 'center' ? side : `${side}-${align}`) as Placement

    style.value = {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      // 对齐锚点宽度时用 min-width，面板自身仍可因内容更宽而变宽
      ...(toValue(options.matchWidth)
        ? { minWidth: `${Math.round(anchorRect.width)}px`, maxWidth: `${maxLeft - viewportPadding}px` }
        : { maxWidth: `${viewportWidth - viewportPadding * 2}px` }),
    }
  }

  function schedule(): void {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      compute()
    })
  }

  let resizeObserver: ResizeObserver | undefined
  let listening = false

  function startListening(): void {
    if (listening) return
    // capture 阶段：user_client 的滚动发生在外壳的 el-scrollbar 内部容器上，
    // 那个容器的滚动事件不冒泡到 window，只在捕获阶段能看到。
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    if (typeof ResizeObserver !== 'undefined' && panel.value) {
      resizeObserver = new ResizeObserver(schedule)
      resizeObserver.observe(panel.value)
    }
    listening = true
  }

  function stopListening(): void {
    if (!listening) return
    window.removeEventListener('scroll', schedule, true)
    window.removeEventListener('resize', schedule)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    listening = false
  }

  watch(
    () => toValue(options.open),
    (open) => {
      if (open) {
        // 面板是 Teleport + v-if 出来的，等一帧拿到元素再测；先给一个「在视口外」的
        // 兜底坐标，避免第一次测量之前面板在左上角闪一下。
        if (!style.value.position) {
          style.value = { position: 'fixed', top: '0px', left: '-9999px' }
        }
        void nextTick(() => {
          compute()
          startListening()
        })
      } else {
        stopListening()
      }
    },
    { immediate: true },
  )

  // 面板元素换过一次（v-if 重挂）也要重新观察
  watch(panel, (element) => {
    if (!toValue(options.open)) return
    resizeObserver?.disconnect()
    resizeObserver = undefined
    if (listening) {
      listening = false
      stopListening()
      startListening()
    }
    if (element) schedule()
  })

  // 位置或对齐方式被调用方改过时立即生效（如 placement 随条件变化）
  watch(
    () => toValue(options.placement),
    () => {
      if (toValue(options.open)) schedule()
    },
  )

  onScopeDispose(() => {
    stopListening()
    if (frame) window.cancelAnimationFrame(frame)
  })

  return {
    style,
    resolvedPlacement,
    update: () => {
      compute()
    },
  }
}
