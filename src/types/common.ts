/**
 * 跨组件共用的类型
 */

/**
 * 控件尺寸档。
 *
 * 只有两档，对应 `tokens.css` 里的 `--73-control-height`（36px）与
 * `--73-chip-height`（28px）。user_client 现状是各页各写 px，
 * 「同一种控件长得不一样」；这里刻意不提供 `lg`，避免又开出一档新高度。
 */
export type ComponentSize = 'sm' | 'md'

/**
 * 状态色语义。
 *
 * 与 `tokens.css` 里的五支状态令牌一一对应，**组件不接收色值，只接收语义**：
 *
 * | tone | 令牌 | 门户侧 | 开发者侧 |
 * | --- | --- | --- | --- |
 * | `accent` | `--73-accent` | 蓝 `#1f4ad1` | 蓝 `#1f4ad1` |
 * | `success` | `--73-success` | 绿 `#16805c` | 青 `#2aa6a4`（「已完成」） |
 * | `warning` | `--73-warning` | 琥珀 `#d97706` | 金 `#b9812b`（「金额与提示」） |
 * | `danger` | `--73-danger` | 深红 `#b42318` | 红 `#dc2626` |
 * | `info` | `--73-ink-muted` | 灰 `#64748b` | 灰 `#64748b` |
 * | `neutral` | `--73-ink-soft` | 墨 `#52627a` | 墨 `#475569` |
 *
 * 注意 `success` 与 `warning` 在两套主题下**不是同一个颜色族**（开发者侧是青与金，
 * 不是绿与琥珀）。这正是主题该干的事，调用方只管写语义。
 */
export type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** 允许调用方透传的原生属性 */
export type NativeAttrs = Record<string, unknown>
