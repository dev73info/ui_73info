import type { Component } from 'vue'
import type { ComponentSize, Tone } from '../../types/common'

/**
 * 按钮的**形状**（强调层级）。
 *
 * 与 `variant` 分开的 `tone` 管颜色，两个轴可以自由组合——因为迁移时遇到的组合
 * （`el-button type="success" plain` 这类）用单轴枚举表达不了。
 */
export type TButtonVariant = 'solid' | 'outline' | 'text'

export interface TButtonProps {
  /**
   * 形状。默认 `outline`。
   *
   * 与 user-client 现有类名的对应关系（迁移时是改名，不是重新设计）：
   *
   * | 旧写法 | 新写法 |
   * | --- | --- |
   * | `.dev-btn--primary` | `variant="solid" tone="accent"` |
   * | `.dev-btn--ghost` | `variant="outline"`（默认） |
   * | `.dev-btn--gold` | `variant="solid" tone="warning"` |
   * | `.dev-btn--danger` | `variant="outline" tone="danger"` |
   * | `el-button type="primary"` | `variant="solid" tone="accent"` |
   * | `el-button plain` | `variant="outline"` |
   * | `el-button link` / `text` | `variant="text"` |
   */
  variant?: TButtonVariant
  /** 语义色，默认 `neutral`。只给语义，不给色值——见 `types/common.ts` 的 `Tone`。 */
  tone?: Tone
  /** 尺寸档，默认 `md`（36px）。 */
  size?: ComponentSize
  /** 原生 `type`，只在 `as="button"` 时有意义。默认 `button`（避免误触发表单提交）。 */
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  /** 加载中：显示转圈、屏蔽点击，`aria-busy="true"`。 */
  loading?: boolean
  /** 撑满父容器宽度 */
  block?: boolean
  /**
   * 只放图标：正方形、去掉左右内边距。
   *
   * 这是仓库里反复出现的一个形状——工作台各菜单页顶部的「刷新」按钮、
   * 卡头右侧的图标动作都是它（`.wb-toolbar__icon-btn` / `.dev-toolbar__icon-btn`
   * 在 user-client 里有十几处）。不给这个属性时，调用方只能自己补
   * `width / padding` 两条 CSS，等于把同一个形状在每页重写一遍。
   *
   * **必须同时给 `aria-label`**：按钮里没有文字，读屏只能靠它。
   * 组件不去校验（也校验不了插槽里到底放的是什么），但这是硬要求。
   *
   * 与 `block` 同时给时以 `block` 为准（撑满宽度优先）。
   */
  iconOnly?: boolean
  /**
   * 渲染成什么元素/组件，默认 `button`。
   *
   * 传 `RouterLink` 可以当链接按钮用——user-client 里 `.dev-btn` 本来就大量挂在
   * `RouterLink` 上（见 `dev-base.css` 该段的注释）。`to`、`href` 这类属性
   * 通过透传落到根元素上，不需要在这里重新声明一遍。
   */
  as?: string | Component
}

export interface TButtonEmits {
  (e: 'click', event: MouseEvent): void
}
