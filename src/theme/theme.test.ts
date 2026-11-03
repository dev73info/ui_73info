import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEMES,
  applyTheme,
  getTheme,
  isThemeName,
  syncThemeFromDOM,
} from './index'

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
})

describe('主题运行时', () => {
  it('未设置属性时返回默认主题', () => {
    expect(getTheme()).toBe(DEFAULT_THEME)
  })

  it('两套主题都能应用并读回', () => {
    for (const theme of THEMES) {
      applyTheme(theme)
      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(theme)
      expect(getTheme()).toBe(theme)
    }
  })

  it('主题清单只保留工作台亮暗两套', () => {
    expect([...THEMES]).toEqual(['workbench', 'workbench-dark'])
    expect(THEMES.every((theme) => isThemeName(theme))).toBe(true)
  })

  it('不认识的主题值回落为默认主题', () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'unknown')
    expect(getTheme()).toBe(DEFAULT_THEME)
  })

  it('syncThemeFromDOM 让镜像跟上直接写在 DOM 上的值', () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'workbench-dark')
    expect(syncThemeFromDOM()).toBe('workbench-dark')
  })
})
