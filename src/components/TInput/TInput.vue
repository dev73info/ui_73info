<script setup lang="ts">
/**
 * TInput
 *
 * 接替 `<el-input>`（user-client 里 95 处）与 `<el-input>` 的 `clearable` / `show-word-limit`
 * / 前缀后缀那几种用法。
 *
 * ## 与表单自动对接
 *
 * 放在 `TFormItem` 里时，本组件通过 `inject` 拿到字段上下文，于是自动获得：
 * 失焦即校验、输入即校验（按规则声明的 `trigger`）、`id` 与 `<label for>` 配对、
 * 错误时 `aria-invalid` 与 `aria-describedby`、整表禁用态。
 * **这些都不需要调用方写**——这是把「行为原语 + 上下文」做成一层的好处。
 *
 * ## 值类型
 *
 * 与原生 `<input>` 一致，`update:modelValue` **总是发出字符串**。
 * 需要数字语义请在外面转，或等 `TInputNumber`（未在第一批范围内）。
 */
import { computed, inject, ref, useAttrs, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import type { TInputEmits, TInputProps, TInputType } from './types'

defineOptions({ name: 'TInput', inheritAttrs: false })

const props = withDefaults(defineProps<TInputProps>(), {
  modelValue: '',
  type: 'text',
  size: undefined,
  placeholder: undefined,
  disabled: false,
  readonly: false,
  invalid: undefined,
  clearable: false,
  maxlength: undefined,
  showCount: false,
  autocomplete: undefined,
  name: undefined,
  id: undefined,
  ariaLabel: undefined,
  autofocus: false,
})

const emit = defineEmits<TInputEmits>()
const attrs = useAttrs()

const item = inject(FORM_ITEM_CONTEXT, null)
/** 无表单上下文时自己造一个 id，保证 `<label for>` 仍然可用 */
const fallbackId = useId()
const inputId = computed(() => props.id ?? item?.inputId ?? fallbackId)
const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)

const isDisabled = computed(() => props.disabled || (item?.disabled.value ?? false))
const size = computed<ComponentSize>(() => props.size ?? item?.size.value ?? 'md')
const isInvalid = computed(
  () => props.invalid ?? (item ? item.state.value === 'error' : false),
)

const currentValue = computed(() =>
  props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue),
)

const showClear = computed(
  () => props.clearable && !isDisabled.value && !props.readonly && currentValue.value.length > 0,
)

const describedBy = computed(() =>
  isInvalid.value && item ? item.errorId : undefined,
)

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', target.value)
  item?.notify('change')
}

function onChange(event: Event): void {
  emit('change', (event.target as HTMLInputElement).value)
}

function onFocus(event: FocusEvent): void {
  focused.value = true
  emit('focus', event)
}

function onBlur(event: FocusEvent): void {
  focused.value = false
  emit('blur', event)
  item?.notify('blur')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') emit('enter', event)
}

function clear(): void {
  emit('update:modelValue', '')
  emit('input', '')
  emit('clear')
  item?.notify('change')
  // 清除后把焦点留在输入框，否则用户要再点一次才能继续输入
  inputRef.value?.focus()
}

/** 供外面（如搜索框的快捷键）聚焦用 */
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  inputRef,
})
</script>

<template>
  <div
    class="t73-input t73"
    v-bind="attrs"
    :class="{
      't73-input--sm': size === 'sm',
      't73-input--invalid': isInvalid,
      't73-input--disabled': isDisabled,
      't73-input--focused': focused,
    }"
  >
    <span v-if="$slots.prefix" class="t73-input__affix t73-input__affix--prefix">
      <slot name="prefix" />
    </span>

    <input
      ref="inputRef"
      class="t73-input__control"
      :id="inputId"
      :type="type satisfies TInputType"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :name="name"
      :aria-label="ariaLabel"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      :autofocus="autofocus"
      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <span v-if="showCount && maxlength" class="t73-input__count" aria-hidden="true">
      {{ currentValue.length }}/{{ maxlength }}
    </span>

    <button
      v-if="showClear"
      type="button"
      class="t73-input__clear"
      aria-label="清除"
      @click="clear"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </button>

    <span v-if="$slots.suffix" class="t73-input__affix t73-input__affix--suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<style scoped>
.t73-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: var(--73-control-height);
  padding: 0 12px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  color: var(--73-ink);
  transition:
    border-color var(--73-transition),
    box-shadow var(--73-transition),
    background-color var(--73-transition);
}

.t73-input--sm {
  height: var(--73-control-height-sm);
  padding: 0 8px;
}

.t73-input__control {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: var(--73-font-size-body);
  line-height: 1.5;
  outline: none;
}

.t73-input--sm .t73-input__control {
  font-size: var(--73-font-size-sm);
}

.t73-input__control::placeholder {
  color: var(--73-ink-placeholder);
}

/* 聚焦环挂在容器上（:focus-within 不够用，因为要跟输入框自身状态一致），
   组件通过 focused 标记控制，样式仍是纯 CSS。 */
.t73-input--focused {
  border-color: var(--73-accent);
  box-shadow: var(--73-focus-ring);
}

.t73-input--invalid {
  border-color: var(--73-danger);
}

.t73-input--invalid.t73-input--focused {
  box-shadow: 0 0 0 3px var(--73-danger-line);
}

.t73-input--disabled {
  background: var(--73-inset);
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

.t73-input--disabled .t73-input__control {
  cursor: not-allowed;
}

.t73-input--disabled .t73-input__control::placeholder {
  color: var(--73-ink-disabled);
}

.t73-input__affix {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  color: var(--73-ink-muted);
}

.t73-input__count {
  flex: 0 0 auto;
  font-size: var(--73-font-size-sm);
  color: var(--73-ink-muted);
  font-variant-numeric: tabular-nums;
}

.t73-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-pill);
  background: color-mix(in srgb, var(--73-ink-muted) 16%, transparent);
  color: var(--73-ink-inverse);
  cursor: pointer;
  transition: background-color var(--73-transition);
}

.t73-input__clear:hover {
  background: var(--73-ink-muted);
}

.t73-input__clear:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-input__clear svg {
  width: 10px;
  height: 10px;
}
</style>
