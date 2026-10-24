import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEME_ATTRIBUTE, applyTheme, getTheme, syncThemeFromDOM } from './index'

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
})

describe('主题运行时', () => {
  it('未设置属性时返回默认主题', () => {
    expect(getTheme()).toBe(DEFAULT_THEME)
  })

  it('applyTheme 把主题写到 <html> 上并可读回', () => {
    applyTheme('dev')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dev')
    expect(getTheme()).toBe('dev')
  })

  it('不认识的主题值回落为默认主题', () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'unknown')
    expect(getTheme()).toBe(DEFAULT_THEME)
  })

  it('syncThemeFromDOM 让镜像跟上直接写在 DOM 上的值', () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'dev')
    expect(syncThemeFromDOM()).toBe('dev')
  })
})
