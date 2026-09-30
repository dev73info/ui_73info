/**
 * TAlert 的属性与事件
 */

import type { Tone } from '../../types/common'

export interface TAlertProps {
  /** 主文案。承载必要信息，不写装饰性的「提示」两个字 */
  title?: string
  /** 补充说明。可以是多行，但不要长到需要滚动 */
  description?: string
  /** 语义色。`el-alert` 的 `type` 映射：info→info、success→success、warning→warning、error→danger */
  tone?: Tone
  /** `soft`（浅底 + 描边，默认）/ `outline`（只有描边） */
  variant?: 'soft' | 'outline'
  closable?: boolean
  showIcon?: boolean
}

export interface TAlertEmits {
  (e: 'close'): void
}
