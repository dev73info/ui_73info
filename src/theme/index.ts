/**
 * 主题运行时
 *
 * 一套主题 = `tokens.css` 里一组 `--73-*` 的取值，包在 `[data-73-theme='…']` 选择器下。
 * 所以「切主题」就是在根元素上换一个属性值——纯 CSS，没有 JS 重算，也没有
 * 「把样式表重新注入一遍」那种做法。这里只提供这个动作的封装与当前值的一份响应式镜像。
 *
 * ## 两套主题
 *
 * | 主题 | 说明 | 主色 |
 * | --- | --- | --- |
 * | `workbench`（默认） | 亮色：画布 `#f8fafc`、白色表面 | `#2563eb` |
 * | `workbench-dark` | 暗色：画布 `#0b1120`、三层深色表面 | `#3b82f6` |
 *
 * 两套共用同一组 `--73-*` 令牌名，组件只认令牌，不关心自己当前在哪套主题下。
 * 取值来源与版式规则见 `tokens.css` 顶部。
 *
 * ## 为什么属性通常落在 `<html>` 上
 *
 * CSS 自定义属性在**声明它的那个元素**上求值，后代拿到的是已经算好的结果。组件自身读
 * `var(--73-*)`，所以把主题属性挂到任意子树都能让那棵子树换主题；`applyTheme()`
 * 默认写到 `<html>`，整页生效。
 */

import { readonly, ref, type Ref } from 'vue'

/** 承载主题的 HTML 属性名 */
export const THEME_ATTRIBUTE = 'data-73-theme'

/** 可选主题名：亮色（默认）与暗色。 */
export const THEMES = ['workbench', 'workbench-dark'] as const

export type ThemeName = (typeof THEMES)[number]

/** 不写属性时的主题（也是 `tokens.css` 里 `:root` 给的那一套） */
export const DEFAULT_THEME: ThemeName = 'workbench'

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

function rootElement(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement
}

/** 读当前生效的主题名；没设置或设置了不认识的值时返回默认主题 */
export function getTheme(target?: Element | null): ThemeName {
  const el = target ?? rootElement()
  const raw = el?.getAttribute(THEME_ATTRIBUTE)
  return isThemeName(raw) ? raw : DEFAULT_THEME
}

/** 把主题写到元素上；target 省略时写 `<html>` */
export function setTheme(theme: ThemeName, target?: Element | null): void {
  const el = target ?? rootElement()
  el?.setAttribute(THEME_ATTRIBUTE, theme)
}

/** 抹掉属性，回到 `:root` 的默认主题 */
export function clearTheme(target?: Element | null): void {
  const el = target ?? rootElement()
  el?.removeAttribute(THEME_ATTRIBUTE)
}

/** 当前主题的响应式镜像。初始值从 DOM 读，尊重 index.html 里预先写死的属性。 */
const currentTheme = ref<ThemeName>(getTheme())

/**
 * 应用主题：写 DOM + 更新响应式镜像。
 *
 * 这是应用入口处唯一需要调用的函数。切换主题不需要重挂组件树。
 */
export function applyTheme(theme: ThemeName): void {
  setTheme(theme)
  currentTheme.value = theme
}

/**
 * 把镜像同步成 DOM 上的实际值。
 *
 * 适用于有人在模板/服务端渲染里直接写了属性、或用了别的机制改属性、需要让响应式镜像
 * 跟上来的场合。挂载时调一次即可。
 */
export function syncThemeFromDOM(): ThemeName {
  const theme = getTheme()
  currentTheme.value = theme
  return theme
}

/**
 * 组件里读当前主题。
 *
 * 返回的是只读镜像，改主题一律走 `applyTheme`——两处都能写会出现
 * 「镜像说 workbench-dark、DOM 上还是 workbench」的状态。
 */
export function useTheme(): { theme: Readonly<Ref<ThemeName>> } {
  return { theme: readonly(currentTheme) as Readonly<Ref<ThemeName>> }
}
