/**
 * 日期格式化与解析（纯函数，不依赖 Vue）
 *
 * 单独放一个文件是为了能直接写单元测试：格式串的解析与生成是最容易出现
 * 「YYYYMMDD 里 08 被当成八进制」这类隐蔽 bug 的地方，留在组件里就测不到。
 *
 * ## 格式串的记号
 *
 * 与 Element / dayjs 一致，只支持仓库里用到的这些：
 *
 * | 记号 | 含义 | 例子 |
 * | --- | --- | --- |
 * | `YYYY` | 四位年 | 2026 |
 * | `MM` | 两位月 | 09 |
 * | `DD` | 两位日 | 30 |
 * | `HH` | 两位时（24 小时制） | 09 |
 * | `mm` | 两位分 | 05 |
 * | `ss` | 两位秒 | 07 |
 *
 * 其它字符一律当作字面量（`-`、`/`、`.` 都是）。**不做 `YY` 或 `M`/`D` 这类简写**：
 * 简写会让「解析出来的月份到底是几」依赖上下文，是错值的常见来源。
 *
 * ## 解析失败不抛错
 *
 * 一律返回 `null`。调用方（表单里）更常见的处理是「当作没填」，抛错只会让
 * 一个格式串写错就把整页渲染打断。
 */

const TOKEN_PATTERN: Array<{ token: string; regex: string }> = [
  { token: 'YYYY', regex: '(\\d{4})' },
  { token: 'MM', regex: '(\\d{1,2})' },
  { token: 'DD', regex: '(\\d{1,2})' },
  { token: 'HH', regex: '(\\d{1,2})' },
  { token: 'mm', regex: '(\\d{1,2})' },
  { token: 'ss', regex: '(\\d{1,2})' },
]

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

/**
 * 按格式串输出。
 *
 * 逐字符扫描而不是先找出所有记号再 `replace`：`replace` 的写法在格式串里出现
 * 类似记号的字面量（比如中文「年月日」里夹着 `Y`）时会替换错位置。
 */
export function formatDate(date: Date, pattern: string): string {
  const parts: Record<string, string> = {
    YYYY: pad(date.getFullYear(), 4),
    MM: pad(date.getMonth() + 1, 2),
    DD: pad(date.getDate(), 2),
    HH: pad(date.getHours(), 2),
    mm: pad(date.getMinutes(), 2),
    ss: pad(date.getSeconds(), 2),
  }

  let result = ''
  let index = 0
  while (index < pattern.length) {
    const matched = TOKEN_PATTERN.find((entry) => pattern.startsWith(entry.token, index))
    if (matched) {
      result += parts[matched.token] ?? ''
      index += matched.token.length
    } else {
      // `pattern[index]` 的类型是 `string | undefined`（`noUncheckedIndexedAccess`）；
      // 循环条件已经保证它在范围内，所以这里的 `?? ''` 只是让类型说得通
      result += pattern[index] ?? ''
      index += 1
    }
  }
  return result
}

/**
 * 按格式串解析。失败返回 `null`。
 *
 * 用 `\d{1,2}` 而不是 `\d{2}` 匹配月/日/时/分/秒：真实数据里 `2026-9-30`
 * 与 `2026-09-30` 都会出现，只认后者会让一部分行明明能显示却选不回去。
 * 用 `Number.parseInt(..., 10)` 取值——**带上进制**，否则 `'08'` 会被当八进制。
 */
export function parseDate(text: string, pattern: string): Date | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  let source = '^'
  let index = 0
  const captures: string[] = []

  while (index < pattern.length) {
    const matched = TOKEN_PATTERN.find((entry) => pattern.startsWith(entry.token, index))
    if (matched) {
      source += matched.regex
      captures.push(matched.token)
      index += matched.token.length
    } else {
      // 字面量里的正则元字符要转义，否则 `2026.09.30` 里的 `.` 会匹配任意字符
      source += (pattern[index] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      index += 1
    }
  }
  source += '$'

  const result = new RegExp(source).exec(trimmed)
  if (!result) return null

  const values: Record<string, number> = { YYYY: 1970, MM: 1, DD: 1, HH: 0, mm: 0, ss: 0 }
  captures.forEach((token, captureIndex) => {
    const raw = result[captureIndex + 1]
    if (raw !== undefined) values[token] = Number.parseInt(raw, 10)
  })

  const year = values.YYYY as number
  const month = values.MM as number
  const day = values.DD as number
  const date = new Date(
    year,
    month - 1,
    day,
    values.HH as number,
    values.mm as number,
    values.ss as number,
  )

  // 日期溢出要判掉：`2026-02-31` 会被 Date 悄悄滚到 3 月 3 日，
  // 不判的话界面上会显示一个用户从没选过的日期。
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addMonths(date: Date, delta: number): Date {
  // 用「先归到 1 号再加月」避免 1 月 31 日加一个月滚到 3 月 2 日
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function addYears(date: Date, delta: number): Date {
  return new Date(date.getFullYear() + delta, date.getMonth(), 1)
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** 某个月第一天是周几，**以周一为一周第一天**（0 = 周一） */
export function weekdayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 生成日历网格：固定 6 行 × 7 列 = 42 格。
 *
 * 固定行数是刻意的：按月份不同生成 4/5/6 行会让面板高度在切月时跳动，
 * 鼠标位置跟着挪，连续点几下很容易点错格。
 */
export function monthMatrix(year: number, month: number): Date[] {
  const offset = weekdayOffset(year, month)
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return startOfDay(date)
  })
}

/** 周一为第一天（与 `weekdayOffset` 同口径） */
export const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

export const MONTHS = [
  '1 月',
  '2 月',
  '3 月',
  '4 月',
  '5 月',
  '6 月',
  '7 月',
  '8 月',
  '9 月',
  '10 月',
  '11 月',
  '12 月',
] as const
