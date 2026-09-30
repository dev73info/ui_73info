export interface TCardProps {
  /** 卡片标题。`#title` 插槽优先。 */
  title?: string
  /** 标题下的一行说明。只在承载必要信息时传（《设计规范》第四节：副标题非必要不用）。 */
  description?: string
  /**
   * 悬浮时抬升阴影。默认 `false`。
   *
   * 开发者侧的卡片不做悬浮抬升（`--dev-shadow` 只有一个值），门户侧有
   * `--portal-shadow-hover`；令牌层把两档都给了，组件照读，所以同一个开关
   * 在两套主题下各自表现正确。
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
