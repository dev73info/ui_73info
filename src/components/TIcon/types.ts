import type { Component } from 'vue'

export interface TIconProps {
  /**
   * 直接给图标组件（如 `import { Plus } from 'ui_73info'`，图标与组件同一个来源）。
   * 也可以改用默认插槽放图标组件，两种写法等价。
   */
  icon?: Component
  /**
   * 尺寸。数字按 px 处理，字符串原样交给 CSS（如 `'1.2em'`）。
   * 不传时是 `1em`——即**跟随父元素字号**，与 `<el-icon>` 的口径一致，
   * 这样按钮里的图标不需要单独声明尺寸。
   */
  size?: number | string
  /**
   * 无障碍名称。传了就是「有语义的图标」（`role="img"` + `aria-label`）；
   * 不传则整个图标对辅助技术隐藏——这是绝大多数情况下的正确默认，
   * 因为图标旁边通常已经有文字，重复朗读反而更吵。
   */
  label?: string
  /** 转圈，用于加载态图标 */
  spin?: boolean
}
