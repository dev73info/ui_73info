import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { iconPaths } from './paths'
import type { IconName } from './paths'

/**
 * 把「名字 + 路径数据」变成一个图标组件。
 *
 * 图标组件只渲染一个 `<svg>`，不写 class、不写尺寸、不读令牌：
 * 尺寸与颜色都由容器决定（`TIcon` 把 `svg` 定成 `1em` + `currentColor`，
 * 直接裸用 `<svg>` 时则跟随父元素的字号与文字色）。
 * 这是与 `<el-icon>` 同一套口径，所以换图标不会改变任何页面的视觉。
 *
 * **返回类型刻意收敛成 `Component`**：`defineComponent` 的原样推断会带上
 * 十几个类型参数（`DefineComponent<{}, () => VNode<…>, …>`）。页面把它们放进
 * `icon: Component` 这种字段时，`vue-tsc` 要做一次深比较，会报
 * `TS2321 Excessive stack depth comparing types`（`UserWorkbenchView` 的开发者菜单
 * 数组就是第一例）。写成 `Component` 之后调用方拿到的是同一个宽类型，不再深挖。
 */
export function createIcon(name: IconName): Component {
  const paths = iconPaths[name]
  return defineComponent({
    name,
    setup() {
      return () =>
        h(
          'svg',
          { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 1024 1024' },
          paths.map((d) => h('path', { d, fill: 'currentColor' })),
        )
    },
  })
}
