<script setup lang="ts">
/**
 * TInputNumber
 *
 * 接替 `<el-input-number>`（user-client 里 5 处：充值金额、提现金额、悬赏积分、积分转让）。
 *
 * ## 规格来源
 *
 * 两侧步进按钮来自 `.dev-recharge-dialog__amount-input`（`dev-wallet.css`）：
 *
 * ```css
 * .el-input-number__decrease, .el-input-number__increase {
 *   width: 48px; border-color: var(--dev-line);
 *   background: rgba(241, 244, 251, 0.9); color: var(--dev-muted);
 * }
 * .el-input-number__decrease { border-radius: 10px 0 0 10px; }
 * .el-input-number__increase { border-radius: 0 10px 10px 0; }
 * .el-input-number__decrease:hover, .el-input-number__increase:hover { color: var(--dev-blue); }
 * ```
 *
 * 那一处的 48px 宽与 48px 高是「充值弹窗里的大金额输入框」这个局部形态，
 * 通用档收到控件高度 36px、按钮宽 32px，圆角仍取 `--73-radius-control`（10px）。
 * 调用方要让某个金额框变大，用 `class` 覆盖即可——与源地做法一致。
 *
 * ## 输入中的半成品值
 *
 * `1.`、`-`、空串都是「还没输完」，不能立刻解析成数字并回写，否则用户打不出小数。
 * 所以内部另存一份文本，只在**失焦/回车**时解析、夹取到 `[min, max]`、按 `precision`
 * 取整，然后才发 `update:modelValue`。这是 `<el-input-number>` 的行为，
 * 也是「打不出小数点」那类 bug 的根源，所以单独记一笔。
 */
import { computed, inject, ref, useAttrs, useId, watch } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import type { TInputNumberEmits, TInputNumberProps } from './types'

defineOptions({ name: 'TInputNumber', inheritAttrs: false })

const props = withDefaults(defineProps<TInputNumberProps>(), {
  modelValue: null,
  min: undefined,
  max: undefined,
  step: 1,
  precision: undefined,
  thousands: false,
  disabled: false,
  readonly: false,
  controls: true,
  size: undefined,
  placeholder: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
  autofocus: false,
})

const emit = defineEmits<TInputNumberEmits>()
const attrs = useAttrs()

const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()
const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)

const isDisabled = computed(() => props.disabled || (item?.disabled.value ?? false))
const size = computed<ComponentSize>(() => props.size ?? item?.size.value ?? 'md')
const isInvalid = computed(() => (item ? item.state.value === 'error' : false))
const inputId = computed(() => props.id ?? item?.inputId ?? fallbackId)

/** 显示文本。区分「外部值变了」与「用户正在输入」两件事：后者不被覆盖 */
const text = ref('')

function clamp(value: number): number {
  let next = value
  if (props.min !== undefined && next < props.min) next = props.min
  if (props.max !== undefined && next > props.max) next = props.max
  return next
}

function round(value: number): number {
  if (props.precision === undefined) return value
  // 用 toFixed 而不是 Math.round(v*10^n)/10^n：后者在 1.005 这类值上会因
  // 二进制表示误差少进一位
  return Number(value.toFixed(props.precision))
}

function format(value: number | null): string {
  if (value === null) return ''
  const base = props.precision === undefined ? String(value) : value.toFixed(props.precision)
  if (!props.thousands) return base
  const [intPart, decimalPart] = base.split('.')
  const withSeparator = (intPart ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimalPart === undefined ? withSeparator : `${withSeparator}.${decimalPart}`
}

/** 外部值 → 显示文本。聚焦时不覆盖，避免打断用户正在敲的字 */
watch(
  () => props.modelValue,
  (value) => {
    if (focused.value) return
    text.value = format(value)
  },
  { immediate: true },
)

function parse(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function commit(value: number | null): void {
  const next = value === null ? null : round(clamp(value))
  text.value = format(next)
  emit('update:modelValue', next)
  emit('change', next)
  item?.notify('change')
}

function onInput(event: Event): void {
  // 输入过程中只改文本，不回写——否则 `1.` 会被解析成 `1` 而打不出小数
  text.value = (event.target as HTMLInputElement).value
}

function onBlur(event: FocusEvent): void {
  focused.value = false
  commit(parse(text.value))
  emit('blur', event)
  item?.notify('blur')
}

function onFocus(event: FocusEvent): void {
  focused.value = true
  emit('focus', event)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    commit(parse(text.value))
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    nudge(props.step)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    nudge(-props.step)
  }
}

/** 步进基准：优先解析当前文本，用户刚敲的来源优先于外部值 */
function nudge(delta: number): void {
  if (isDisabled.value || props.readonly) return
  const base = parse(text.value) ?? props.modelValue ?? 0
  commit(base + delta)
}

function stepUp(): void {
  nudge(props.step)
}

function stepDown(): void {
  nudge(-props.step)
}

const canDecrease = computed(() => {
  if (isDisabled.value || props.readonly) return false
  if (props.min === undefined) return true
  return (props.modelValue ?? Number.NEGATIVE_INFINITY) > props.min
})

const canIncrease = computed(() => {
  if (isDisabled.value || props.readonly) return false
  if (props.max === undefined) return true
  return (props.modelValue ?? Number.POSITIVE_INFINITY) < props.max
})

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<template>
  <div
    class="t73-input-number t73"
    v-bind="attrs"
    :class="{
      't73-input-number--sm': size === 'sm',
      't73-input-number--disabled': isDisabled,
      't73-input-number--invalid': isInvalid,
      't73-input-number--focused': focused,
      't73-input-number--no-controls': !controls,
    }"
  >
    <button
      v-if="controls"
      type="button"
      class="t73-input-number__control t73-input-number__control--decrease"
      aria-label="减少"
      :disabled="!canDecrease"
      tabindex="-1"
      @click="stepDown"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>

    <input
      ref="inputRef"
      class="t73-input-number__control-input"
      type="text"
      inputmode="decimal"
      role="spinbutton"
      autocomplete="off"
      :id="inputId"
      :name="name"
      :value="text"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="readonly"
      :autofocus="autofocus"
      :aria-label="ariaLabel"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="isInvalid ? item?.errorId : undefined"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="modelValue ?? undefined"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <button
      v-if="controls"
      type="button"
      class="t73-input-number__control t73-input-number__control--increase"
      aria-label="增加"
      :disabled="!canIncrease"
      tabindex="-1"
      @click="stepUp"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 4v8M4 8h8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.t73-input-number {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  height: var(--73-control-height);
  /* 外框只画一次（下面的内部元素不画外描边），否则三层描边会叠成双线 */
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  color: var(--73-ink);
  overflow: hidden;
  transition:
    border-color var(--73-transition),
    box-shadow var(--73-transition);
}

.t73-input-number--sm {
  height: var(--73-control-height-sm);
}

.t73-input-number--focused {
  border-color: var(--73-accent);
  box-shadow: var(--73-focus-ring);
}

.t73-input-number--invalid {
  border-color: var(--73-danger);
}

.t73-input-number--invalid.t73-input-number--focused {
  box-shadow: 0 0 0 3px var(--73-danger-line);
}

.t73-input-number--disabled {
  background: var(--73-inset);
  border-color: var(--73-border);
  color: var(--73-ink-disabled);
}

.t73-input-number__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  padding: 0;
  border: none;
  background: var(--73-table-header-bg);
  color: var(--73-ink-muted);
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

.t73-input-number__control svg {
  width: 14px;
  height: 14px;
}

.t73-input-number__control:hover:not(:disabled) {
  color: var(--73-accent);
  background: var(--73-accent-soft);
}

.t73-input-number__control:disabled {
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

/* 步进按钮与输入框之间的分隔线，只画一条 */
.t73-input-number__control--decrease {
  border-right: 1px solid var(--73-border-soft);
}

.t73-input-number__control--increase {
  border-left: 1px solid var(--73-border-soft);
}

.t73-input-number__control-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: var(--73-font-size-body);
  /* 金额与计数一律等宽数字，避免输入时整行抖动 */
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
}

.t73-input-number--no-controls .t73-input-number__control-input {
  text-align: left;
}

.t73-input-number__control-input::placeholder {
  color: var(--73-ink-placeholder);
}

.t73-input-number--disabled .t73-input-number__control-input {
  cursor: not-allowed;
}

.t73-input-number--disabled .t73-input-number__control-input::placeholder {
  color: var(--73-ink-disabled);
}
</style>
