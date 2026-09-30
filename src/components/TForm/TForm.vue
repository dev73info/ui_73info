<script setup lang="ts">
/**
 * TForm
 *
 * 表单容器：持有 `model` 与规则表，负责「校验全部字段」并把结果收敛成一个布尔值
 * （失败 resolve `false`，不 reject——见 `validate.ts` 顶部与 Element Plus 的对照表）。
 *
 * 字段是通过 `provide` / `inject` 自注册的：`TFormItem` 挂载时把自己交给表单，
 * 表单不必知道中间隔了几层布局组件。校验顺序按注册顺序，也就是 DOM 顺序
 * ——「滚动到第一个错误」依赖这一点。
 */
import { computed, provide, toRaw } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_CONTEXT, type FormContext, type FormField } from './context'
import type { TFormInstance, TFormProps } from './types'

defineOptions({ name: 'TForm' })

const props = withDefaults(defineProps<TFormProps>(), {
  rules: () => ({}),
  labelWidth: undefined,
  labelPosition: 'top',
  size: 'md',
  disabled: false,
  scrollToError: true,
})

const emit = defineEmits<{
  /** 原生提交且校验通过 */
  (e: 'submit'): void
  /** 原生提交但校验失败 */
  (e: 'invalid'): void
}>()

/**
 * 已注册的字段。用普通数组而不是响应式数组：校验是命令式调用的
 * （用户点提交、控件失焦），不需要驱动渲染，反而能避开 reactive 数组里
 * 对象身份比较的坑。
 */
const fields: FormField[] = []

function addField(field: FormField): void {
  const existing = fields.findIndex((item) => item.prop === field.prop)
  if (existing >= 0) fields.splice(existing, 1)
  fields.push(field)
}

function removeField(field: FormField): void {
  const index = fields.indexOf(field)
  if (index >= 0) fields.splice(index, 1)
}

function selectFields(target?: string | string[]): FormField[] {
  if (!target || (Array.isArray(target) && target.length === 0)) return [...fields]
  const wanted = Array.isArray(target) ? target : [target]
  return fields.filter((field) => wanted.includes(field.prop))
}

function focusFirstError(element: HTMLElement | null): void {
  if (!element) return
  element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const control = element.querySelector<HTMLElement>(
    'input:not([type="hidden"]),textarea,select,button,[tabindex]:not([tabindex="-1"])',
  )
  // preventScroll：滚动已经在上面发起，聚焦不要再插一脚，否则两个动画会打架
  control?.focus({ preventScroll: true })
}

async function validate(): Promise<boolean> {
  const results = await Promise.all(
    fields.map(async (field) => ({ field, ok: await field.validate('submit') })),
  )
  const firstFailed = results.find((item) => !item.ok)
  if (firstFailed && props.scrollToError) focusFirstError(firstFailed.field.getElement())
  return !firstFailed
}

async function validateField(target?: string | string[]): Promise<boolean> {
  const results = await Promise.all(selectFields(target).map((field) => field.validate('submit')))
  return results.every(Boolean)
}

function clearValidate(target?: string | string[]): void {
  selectFields(target).forEach((field) => field.clearValidate())
}

/* --- 初始值快照：resetFields 用 --- */

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  // structuredClone 在 Node ≥17 与所有现代浏览器都有；退路是 JSON 一份
  try {
    return structuredClone(toRaw(value)) as T
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const initialModel = cloneValue(props.model)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 把 source 的值递归写回 target，保留 target 的对象身份（reactive 代理不会被打断） */
function restoreInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key]
  }
  for (const [key, value] of Object.entries(source)) {
    const current = target[key]
    if (isPlainObject(current) && isPlainObject(value)) restoreInto(current, value)
    else target[key] = cloneValue(value)
  }
}

function resetFields(): void {
  restoreInto(props.model, cloneValue(initialModel))
  clearValidate()
}

defineExpose<TFormInstance>({ validate, validateField, clearValidate, resetFields })

/**
 * 拦截原生提交：先校验，通过才 emit `submit`。
 *
 * 这样调用方写 `<TForm @submit="save">` 就够了，不必每处都写
 * `if (!(await form.validate())) return`。想自己接管就 `.native` —— 也就是不加
 * `@submit`，校验仍可通过模板 ref 手动调。
 */
async function onSubmit(event: Event): Promise<void> {
  event.preventDefault()
  if (await validate()) emit('submit')
  else emit('invalid')
}

const computedSize = computed<ComponentSize>(() => props.size)

const context: FormContext = {
  get model() {
    return props.model
  },
  get rules() {
    return props.rules
  },
  get labelWidth() {
    return props.labelWidth
  },
  get labelPosition() {
    return props.labelPosition
  },
  get size() {
    return computedSize.value
  },
  get disabled() {
    return props.disabled
  },
  addField,
  removeField,
}

provide(FORM_CONTEXT, context)

/** 左标签模式下把标签宽度交给表单项读 */
const labelWidthCss = computed(() =>
  props.labelPosition === 'left'
    ? typeof props.labelWidth === 'number'
      ? `${props.labelWidth}px`
      : (props.labelWidth ?? '120px')
    : undefined,
)
</script>

<template>
  <form
    class="t73-form t73"
    :class="`t73-form--label-${labelPosition}`"
    :style="labelWidthCss ? { '--t73-form-label-width': labelWidthCss } : undefined"
    novalidate
    @submit="onSubmit"
  >
    <slot />
  </form>
</template>

<style scoped>
.t73-form {
  display: block;
}

.t73-form--label-left :deep(.t73-form-item__label) {
  width: var(--t73-form-label-width, 120px);
  flex: 0 0 auto;
  padding-top: 9px;
}

.t73-form--label-left :deep(.t73-form-item__body) {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
