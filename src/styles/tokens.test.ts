/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { THEMES } from '../theme'

/**
 * 令牌完整性：每套主题必须声明同一组 `--73-*`。
 *
 * 漏一条不会报错，只会让那个槽位在某个主题下回落到 `:root` 的默认值（workbench）——
 * 例如只给 `workbench-dark` 写了 `--73-danger-text`，亮色的深红就会漏进暗色主题。
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

/** 第一段 `:root { … }`（第 1 节与主题无关的尺寸 / 字号令牌）。 */
function rootTokens(): Set<string> {
  const match = /:root\s*\{/.exec(css)
  if (!match) {
    return new Set()
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
        return tokensOf(css.slice(start, index))
      }
    }
  }
  return new Set()
}

/** 第 2 节派生块（公式对所有主题生效）。 */
const derivedBlock = /:root,\s*\[data-73-theme\]\s*\{[\s\S]*?\}/.exec(css)?.[0] ?? ''

describe('主题令牌', () => {
  it('主题运行时里列出的每一套主题都有对应的 CSS 块', () => {
    for (const theme of THEMES) {
      expect(tokensOf(blockOf(theme)).size, `主题 ${theme} 缺 CSS 块`).toBeGreaterThan(0)
    }
  })

  it('各主题覆盖 workbench 的全部令牌，且不出现未登记的令牌', () => {
    const base = tokensOf(blockOf('workbench'))
    expect(base.size).toBeGreaterThan(0)
    /**
     * 已知令牌 = 共享尺寸/字号（`:root`）+ 派生公式 + workbench 的完整色板。
     * 主题块可以**覆盖**其中任何一个（例如暗色主题单独覆盖 tooltip），但不允许
     * 凭空出现一个谁都没定义过的名字——那多半是拼写错误。
     */
    const known = new Set([...rootTokens(), ...tokensOf(derivedBlock), ...base])

    for (const theme of THEMES) {
      if (theme === 'workbench') {
        continue
      }
      const tokens = tokensOf(blockOf(theme))
      const missing = [...base].filter((token) => !tokens.has(token))
      const extra = [...tokens].filter((token) => !known.has(token))
      expect(missing, `主题 ${theme} 缺少令牌`).toEqual([])
      expect(extra, `主题 ${theme} 出现未登记的令牌`).toEqual([])
    }
  })

  it('派生令牌块还在（表格底色 / info / neutral / tooltip 靠它）', () => {
    expect(tokensOf(derivedBlock).size).toBeGreaterThan(0)
    for (const token of [
      '--73-table-header-bg',
      '--73-info-soft',
      '--73-neutral-line',
      '--73-tooltip-bg',
      '--73-track',
      '--73-grid-line',
      '--73-hero-glow',
    ]) {
      expect(derivedBlock, `派生令牌块缺少 ${token}`).toContain(`${token}:`)
    }
  })
})
