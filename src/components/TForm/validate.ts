/**
 * 表单校验引擎（纯函数，不依赖 Vue）
 *
 * 刻意做成纯函数：规则求值、取值、判空这三件事与渲染无关，单独放一个文件就能
 * 直接写单元测试，也让 `TFormItem` 只剩「注册 / 订阅 / 渲染错误文案」这点事。
 *
 * ## 与 Element Plus 的差异（迁移时要改的地方）
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | `validate()` 失败 | **reject**，必须 try/catch 或 `.catch()` | resolve **false**，直接 `if (!ok) return` |
 * | 规则 `trigger` | `blur` / `change` | 同上，另加 `'submit'`（只在提交时校验） |
 * | 自定义校验器 | `(rule, value, callback)` 回调式 | **`(value, ctx)` 返回值式**：返回字符串即错误，或返回 Promise |
 * | 异步竞态 | 自己处理 | 引擎按字段发令牌，过期结果直接丢弃 |
 *
 * 回调式改成返回值式是有意的：回调式在 `async` 校验器里极容易「忘了调 callback」，
 * 表现为校验永远不结束（提交按钮一直转圈）。返回值式不可能忘。
 */

/** 什么时候触发这条规则 */
export type ValidateTrigger = 'blur' | 'change' | 'submit'

/** 字段的校验状态 */
export type FieldValidateState = '' | 'validating' | 'error' | 'success'

export interface RuleContext {
  /** 整份表单模型，用于跨字段规则（如「确认密码」要和「密码」比） */
  model: Record<string, unknown>
  /** 当前字段的路径，如 `'user.name'` */
  field: string
  rule: RuleItem
}

export interface RuleItem {
  /** 值不得为空 */
  required?: boolean
  /** 自定义错误文案；不传时按规则类型给默认文案 */
  message?: string
  type?: 'string' | 'number' | 'integer' | 'email' | 'url' | 'tel' | 'array'
  /** 字符串/数组看长度，数字看大小 */
  min?: number
  /** 字符串/数组看长度，数字看大小 */
  max?: number
  /** 精确长度 */
  len?: number
  pattern?: RegExp
  /**
   * 自定义校验器。返回字符串表示校验失败（即错误文案），返回空表示通过；
   * 也可以返回 Promise。抛出的错误会被当成错误文案。
   */
  validator?: (value: unknown, context: RuleContext) => void | string | Promise<void | string>
  /** 先对值做一次变换再校验（如把字符串 trim 掉） */
  transform?: (value: unknown) => unknown
  /** 这条规则在哪些时机生效，默认 `['blur', 'change', 'submit']` 全都生效 */
  trigger?: ValidateTrigger | ValidateTrigger[]
}

export type Rules = readonly RuleItem[]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i
/** 中国大陆手机号 */
const TEL_PATTERN = /^1[3-9]\d{9}$/

/**
 * 按点号路径从模型里取值。`prop="user.name"` 对应 `model.user.name`。
 * 中间任何一段是 null/undefined 都安全返回 undefined，不抛错。
 */
export function getValueByPath(source: unknown, path: string): unknown {
  if (!path) return source
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

/**
 * 判空。
 *
 * `0` 和 `false` **不算空**——否则「数量填 0」「开关关掉」会被当成没填。
 * 空数组算空（多选没选）。
 */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function interpolate(template: string, rule: RuleItem): string {
  return template
    .replace(/\{min\}/g, String(rule.min ?? ''))
    .replace(/\{max\}/g, String(rule.max ?? ''))
    .replace(/\{len\}/g, String(rule.len ?? ''))
}

/** 值能否满足 `type` 声明；返回错误文案或 undefined */
function checkType(value: unknown, rule: RuleItem): string | undefined {
  switch (rule.type) {
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) return '请输入数字'
      return undefined
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) return '请输入整数'
      return undefined
    case 'array':
      if (!Array.isArray(value)) return '请选择至少一项'
      return undefined
    case 'email':
      if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) return '请输入正确的邮箱地址'
      return undefined
    case 'url':
      if (typeof value !== 'string' || !URL_PATTERN.test(value)) return '请输入正确的网址'
      return undefined
    case 'tel':
      if (typeof value !== 'string' || !TEL_PATTERN.test(value)) return '请输入正确的手机号'
      return undefined
    case 'string':
    case undefined:
      return undefined
    default:
      return undefined
  }
}

/** 长度或大小；返回错误文案或 undefined */
function checkBounds(value: unknown, rule: RuleItem): string | undefined {
  const hasMin = rule.min !== undefined
  const hasMax = rule.max !== undefined
  const hasLen = rule.len !== undefined
  if (!hasMin && !hasMax && !hasLen) return undefined

  if (typeof value === 'number') {
    if (hasMin && value < (rule.min as number)) {
      return interpolate(rule.message ?? '不能小于 {min}', rule)
    }
    if (hasMax && value > (rule.max as number)) {
      return interpolate(rule.message ?? '不能大于 {max}', rule)
    }
    if (hasLen && value !== rule.len) {
      return interpolate(rule.message ?? '必须等于 {len}', rule)
    }
    return undefined
  }

  const isArray = Array.isArray(value)
  const length = typeof value === 'string' || isArray ? value.length : undefined
  if (length === undefined) return undefined

  const unit = isArray ? '项' : '个字符'
  if (hasMin && length < (rule.min as number)) {
    return interpolate(rule.message ?? (isArray ? '至少选择 {min} 项' : '至少 {min} 个字符'), rule)
  }
  if (hasMax && length > (rule.max as number)) {
    return interpolate(rule.message ?? (isArray ? '最多选择 {max} 项' : '最多 {max} 个字符'), rule)
  }
  if (hasLen && length !== rule.len) {
    return interpolate(rule.message ?? `长度必须为 {len} ${unit}`, rule)
  }
  return undefined
}

/** 跑单条规则；返回错误文案或 undefined */
async function runRule(value: unknown, rule: RuleItem, context: RuleContext): Promise<string | undefined> {
  if (rule.required && isEmptyValue(value)) {
    return rule.message ?? '该字段为必填项'
  }

  // 非必填且没填时，后面那些格式规则不该报错——
  // 否则「选填的邮箱」会被「请输入正确的邮箱地址」拦住，用户不明所以。
  if (isEmptyValue(value)) return undefined

  const typeError = checkType(value, rule)
  if (typeError) return rule.message ?? typeError

  const boundError = checkBounds(value, rule)
  if (boundError) return boundError

  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return rule.message ?? '格式不正确'
  }

  if (rule.validator) {
    try {
      const result = await rule.validator(value, context)
      if (typeof result === 'string' && result) return result
    } catch (error) {
      if (rule.message) return rule.message
      if (error instanceof Error) return error.message
      if (typeof error === 'string') return error
      return '校验未通过'
    }
  }

  return undefined
}

/** 某条规则是否在指定时机生效 */
export function ruleMatchesTrigger(rule: RuleItem, trigger: ValidateTrigger): boolean {
  if (!rule.trigger) return true
  const triggers = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger]
  return triggers.includes(trigger)
}

/**
 * 依次跑一组规则，返回**第一条**错误文案。
 *
 * 顺序执行而不是并发：多条同时失败时，报哪一条取决于谁先返回，文案会跳来跳去；
 * 顺序执行保证「先必填、后格式」这种直观的优先级。
 */
export async function runRules(
  value: unknown,
  rules: Rules,
  context: { model: Record<string, unknown>; field: string },
): Promise<string | undefined> {
  for (const rule of rules) {
    const context_: RuleContext = { ...context, rule }
    const transformed = rule.transform ? rule.transform(value) : value
    const message = await runRule(transformed, rule, context_)
    if (message) return message
  }
  return undefined
}

/**
 * 一组规则里是否有「会在该时机生效」的规则。
 *
 * 用途：某字段只在提交时校验（`trigger: 'submit'`）时，`blur` 就不该把它标红，
 * 也不该因为「没有 blur 规则」而把已有的错误清掉。
 */
export function hasRuleForTrigger(rules: Rules, trigger: ValidateTrigger): boolean {
  return rules.some((rule) => ruleMatchesTrigger(rule, trigger))
}
