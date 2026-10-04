/**
 * 浮层层级管理
 *
 * **谁后打开谁在上面**：每个浮层打开时取一个层级号，同一批（全都关掉之前）只增不减，
 * 所以不会出现两个浮层同号；全部关掉后归零，取值只与「同时打开的层数」有关，
 * 不会因为开关次数多就一路涨到别的带上去。
 *
 * ## 为什么需要它
 *
 * 浮层原先各自写死层级（下拉 `--73-z-dropdown` 2000、对话框 `--73-z-dialog` 3000），
 * 于是对话框里打开下拉，面板恒定被压在对话框下面：实测在选项位置上
 * `document.elementFromPoint` 命中的是弹窗表单，选项既看不见也点不到。
 * Element Plus 用 `--el-index` 递增解决同一问题，这里给一个同口径的最小实现。
 *
 * 用法：打开时 `acquireZIndex()`，把 `zIndex` 绑到浮层根元素的行内 style 上；
 * 关闭时 `release()`。容器组件负责生命周期，浮层原语（`useOverlay`）已接好。
 */

/** 基准值，与 `--73-z-dropdown` 同源；动态分配从这里往上加 */
const Z_INDEX_BASE = 2000

/** 当前仍打开的浮层。用 Set 是为了各层独立释放，且全部关掉后能归零 */
const openLayers = new Set<symbol>()

/** 同一批浮层的递增游标。全部关闭时归零，避免越用越大 */
let sequence = 0

export interface ZIndexHandle {
  /** 绑到浮层根元素行内 style 上的 `z-index` */
  zIndex: number
  /** 关闭时调用。可重复调用，第二次起无副作用 */
  release: () => void
}

export function acquireZIndex(): ZIndexHandle {
  const token = Symbol('t73-layer')
  if (openLayers.size === 0) sequence = 0
  sequence += 1
  openLayers.add(token)

  return {
    zIndex: Z_INDEX_BASE + sequence,
    release: () => {
      openLayers.delete(token)
    },
  }
}
