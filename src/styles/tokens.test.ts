/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { THEMES } from '../theme'

/**
 * 令牌完整性：每套主题必须声明同一组 `--73-*`。
 *
 * 漏一条不会报错，只会让那个槽位在某个主题下回落到 `:root` 的默认值（portal）——
 * 例如只给 `dev` 写了 `--73-danger-text`，别的主题的深字就会变成门户的深红。
 * 这类问题肉眼很难发现（要逐页切主题比对），所以用静态解析把「每套主题都齐全」钉死。
 *
 * 第 2 节那批派生令牌（表格底色、info / neutral 三件套、tooltip 等）声明在
 * `:root, [data-73-theme]` 上，公式对所有主题成立，不算进各主题的清单；这里单独
 * 确认那个块还在——它没了，派生令牌会整体失效。
 */

/**
 * 直接读源文件而不是 `import './tokens.css?raw'`：Vitest 对 `.css` 的导入会按
 * 「样式模块」处理（默认返回空串），`?raw` 在这里拿不到原文。测试跑在 Node 里，
 * 用 `node:fs` 读最直接；文件头的 `/// <reference types="node" />` 只给本文件
 * 引入 Node 类型，不影响应用代码的 `types: []` 口径。
 *
 * 路径按 `pnpm test` 的约定从仓库根算（vitest 的工作目录就是仓库根）；
 * `import.meta.url` 在这里是 http 地址，不能直接转成文件路径。
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

/** 取 `[data-73-theme='x'] { … }` 的块内容；按花括号配对，避免被注释里的花括号带偏。 */
function blockOf(theme: string): string {
  const match = new RegExp(`\\[data-73-theme='${theme}'\\]\\s*\\{`).exec(css)
  if (!match) {
    return ''
  }
  const start = match.index + match[0].length
  let depth = 1
  for (let index = start; index < css.length; index += 1) {
    const char = css[index]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return css.slice(start, index)
      }
    }
  }
  return ''
}

/** 块里声明的令牌名（只在声明位匹配：名字后面必须跟冒号，`var(--73-*)` 引用不算）。 */
function tokensOf(block: string): Set<string> {
  return new Set(block.match(/--73-[a-z0-9-]+(?=\s*:)/g) ?? [])
}

describe('主题令牌', () => {
  it('主题运行时里列出的每一套主题都有对应的 CSS 块', () => {
    for (const theme of THEMES) {
      expect(tokensOf(blockOf(theme)).size, `主题 ${theme} 缺 CSS 块`).toBeGreaterThan(0)
    }
  })

  it('各主题声明的令牌与 portal 完全一致（不缺、不多、不拼错）', () => {
    const base = tokensOf(blockOf('portal'))
    expect(base.size).toBeGreaterThan(0)

    for (const theme of THEMES) {
      if (theme === 'portal') {
        continue
      }
      const tokens = tokensOf(blockOf(theme))
      const missing = [...base].filter((token) => !tokens.has(token))
      const extra = [...tokens].filter((token) => !base.has(token))
      expect(missing, `主题 ${theme} 缺少令牌`).toEqual([])
      expect(extra, `主题 ${theme} 多出 portal 没有的令牌`).toEqual([])
    }
  })

  it('派生令牌块还在（表格底色 / info / neutral / tooltip 靠它）', () => {
    const derived = /:root,\s*\[data-73-theme\]\s*\{[\s\S]*?\}/.exec(css)?.[0] ?? ''
    expect(tokensOf(derived).size).toBeGreaterThan(0)
    for (const token of [
      '--73-table-header-bg',
      '--73-info-soft',
      '--73-neutral-line',
      '--73-tooltip-bg',
      '--73-track',
    ]) {
      expect(derived, `派生令牌块缺少 ${token}`).toContain(`${token}:`)
    }
  })
})
