/**
 * ui_73info — 73Info 自研 UI 组件库
 *
 * 令牌驱动的多主题组件，零第三方 UI 依赖。三层结构（自下而上）：
 *
 * ```
 * src/styles/tokens.css   令牌层   唯一的色值来源，组件层禁止写裸色值
 * src/primitives/         行为层   焦点陷阱、关闭行为、滚动锁定（无样式）
 * src/components/         组件层   只消费令牌
 * ```
 *
 * ## 用法
 *
 * ```ts
 * import 'ui_73info/styles.css'   // ① 令牌 + 样式底座，要在页面样式之前
 * import { TButton, applyTheme }  from 'ui_73info'
 *
 * applyTheme('dev')              // ② 在 <html> 上切主题
 * ```
 *
 * **样式不在这里自动引入**：加载顺序本身有语义（令牌必须早于页面样式，
 * 见 `user-client/doc/设计规范.md` 第二节），藏进 `import` 的副作用里会让顺序
 * 依赖调用方的书写位置。所以第 ① 步是显式的。
 *
 * 子路径**必须带 `.css` 后缀**：宿主的 `vite/client` 类型里只有
 * `declare module '*.css'`，它按后缀匹配，少写后缀 `vue-tsc` 会报找不到模块。
 *
 * 迁移期还需要 `import 'ui_73info/alias.css'`（旧变量名 → `--73-*` 的兼容层），
 * 用法与前置条件见该文件顶部。
 */

import type { App, Component } from 'vue'
import { TButton } from './components/TButton'
import { TCard } from './components/TCard'
import { TDialog } from './components/TDialog'
import { TForm, TFormItem } from './components/TForm'
import { TIcon } from './components/TIcon'
import { TInput } from './components/TInput'
import { TTag } from './components/TTag'

export * from './components'
export * from './primitives'
export * from './theme'
export * from './types/common'

/**
 * 全部组件，键名即组件名。
 *
 * 主要给需要遍历注册的场合用（下面的插件、或者测试里批量挂载）。
 * 日常业务代码建议按需具名导入，理由与 tree-shaking 无关——**显式导入让
 * 「这个页面用了哪些组件」在文件顶部一眼可见**，而全局注册会把依赖藏起来。
 */
export const components: Record<string, Component> = {
  TButton,
  TCard,
  TDialog,
  TForm,
  TFormItem,
  TIcon,
  TInput,
  TTag,
}

/**
 * 可选的全局注册插件：`app.use(Ui73info)`。
 *
 * 本项目**不推荐**在业务里用它（理由见上），保留它是为了方便快速试跑与
 * 那些确实需要动态组件名的场景。
 */
export const Ui73info = {
  install(app: App): void {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}

export default Ui73info
