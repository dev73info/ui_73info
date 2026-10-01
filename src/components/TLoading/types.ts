/**
 * TLoading —— 接替 Element 的 `v-loading` 指令。
 *
 * 这个组件是容器：原来挂 `v-loading` 的元素本身换成它，标签与 class 原样带过来。
 * 用法与两处刻意的差异写在 `TLoading.vue` 顶部注释里。
 */

export interface TLoadingProps {
  /** 是否盖遮罩。`false` 时组件只渲染容器本身，页面照旧 */
  loading?: boolean
  /**
   * 容器标签名。原来挂 `v-loading` 的元素是什么标签就传什么，默认 `div`。
   *
   * 之所以要这个 prop 而不是让组件自己套一层 `<div>`：套一层就会改 DOM 结构，
   * 调用方的 `> *`、grid／flex 子项、`:first-child` 这些选择器全部跟着错位。
   * 现在宿主元素本身就是组件根元素，页面 CSS 一个字都不用改。
   */
  tag?: string
  /** 遮罩下的一行文案，默认不显示（与 `v-loading` 的默认行为一致） */
  text?: string
}
