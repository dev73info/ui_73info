export interface TCardProps {
  /** 卡片标题。`#title` 插槽优先。 */
  title?: string
  /** 标题下的一行说明。只在承载必要信息时传（《设计规范》第四节：副标题非必要不用）。 */
  description?: string
  /**
   * 悬浮时抬升阴影。默认 `false`。
   *
   * 两档阴影分别取 `--73-shadow-card` 与 `--73-shadow-card-hover`；
   * 亮色抬升明显，暗色只做层次分隔。组件照读令牌，不关心当前主题。
   */
  hoverable?: boolean
  /**
   * 是否给内容区加内边距，默认 `true`。
   *
   * 传 `false` 用于内容自己贴边的场景（表格、列表），此时只有卡片外壳的圆角与描边。
   */
  padded?: boolean
  /** 是否要描边，默认 `true` */
  bordered?: boolean
}
