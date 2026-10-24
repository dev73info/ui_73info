<script setup lang="ts">
/**
 * TCheckbox
 *
 * 接替 `<el-checkbox>`（user_client 里 5 处，包括「我已阅读并同意」这类协议勾选）。
 *
 * ## 为什么底下是真的 `<input type="checkbox">`
 *
 * 自绘方框最省事的做法是 `div` + `click`，代价是键盘（空格）、无障碍角色、表单语义、
 * `:focus-visible` 全都要自己补一遍。这里把原生输入框**视觉上藏掉但留在无障碍树里**
 * （`opacity: 0` 而不是 `display: none`），于是：
 * `<label>` 包住输入框 → 点文字也能勾；空格键原生可用；焦点环用相邻选择器
 * `input:focus-visible + .box` 就能画，不需要 `:has()`。
 *
 * ## `indeterminate` 只能走 DOM 属性
 *
 * 它是 `HTMLInputElement` 的**属性**而不是 HTML 特性，写在模板里会被忽略，
 * 所以用 `watchEffect` 直接写属性。用于「全选」在部分选中时显示一道横杠。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 组内取值 | `label` 兼作值 | 值走 **`value`**，`label` 只作文案（Element 2.6 起也已拆开） |
 * | 触屏命中区 | 不处理 | `≤640px` 时撑到 `min-height: 44px`（设计规范第六节） |
 */
import { computed, inject, ref, useId, watchEffect } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import { isSameValue } from '../TSelect/context'
import { CHECKBOX_GROUP_CONTEXT } from './context'
import type { TCheckboxEmits, TCheckboxProps } from './types'

defineOptions({ name: 'TCheckbox' })

const props = withDefaults(defineProps<TCheckboxProps>(), {
  modelValue: undefined,
  value: undefined,
  label: undefined,
  disabled: false,
  indeterminate: false,
  size: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TCheckboxEmits>()

const group = inject(CHECKBOX_GROUP_CONTEXT, null)
const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()
const inputRef = ref<HTMLInputElement | null>(null)

if (group && props.value === undefined) {
  throw new Error(
    '[ui_73info] TCheckbox 放在 TCheckboxGroup 里时必须给 `value`：组靠它判断这一项是否被勾选。',
  )
}

const checked = computed<boolean>(() => {
  if (!group) return props.modelValue ?? false
  return group.selected.value.some((current) => isSameValue(current, props.value))
})

const isDisabled = computed(
  () => props.disabled || (group?.disabled.value ?? false) || (item?.disabled.value ?? false),
)

const size = computed<ComponentSize>(
  () => props.size ?? group?.size.value ?? item?.size.value ?? 'md',
)

const isInvalid = computed(() => item?.state.value === 'error')

const inputId = computed(
  () => props.id ?? (group ? `${fallbackId}-${String(props.value)}` : (item?.inputId ?? fallbackId)),
)

function onChange(event: Event): void {
  const next = (event.target as HTMLInputElement).checked
  if (group) {
    // 组内必定有 `value`（上面已经拦过），这里再收窄一次让类型说得通
    if (props.value === undefined) return
    group.toggle(props.value)
  } else {
    emit('update:modelValue', next)
  }
  emit('change', next)
  item?.notify('change')
}

// `indeterminate` 是 DOM 属性，模板绑不上去
watchEffect(() => {
  if (inputRef.value) inputRef.value.indeterminate = props.indeterminate
})
</script>

<template>
  <label
    class="t73-checkbox t73"
    :class="{
      't73-checkbox--checked': checked,
      't73-checkbox--disabled': isDisabled,
      't73-checkbox--invalid': isInvalid,
      't73-checkbox--sm': size === 'sm',
    }"
  >
    <input
      ref="inputRef"
      class="t73-checkbox__input"
      type="checkbox"
      :id="inputId"
      :checked="checked"
      :disabled="isDisabled"
      :name="name ?? group?.name"
      :aria-label="ariaLabel"
      :aria-checked="indeterminate ? 'mixed' : checked ? 'true' : 'false'"
      :aria-invalid="isInvalid ? 'true' : undefined"
      @change="onChange"
    />
    <span class="t73-checkbox__box" aria-hidden="true">
      <svg v-if="indeterminate" viewBox="0 0 16 16">
        <path
          d="M4 8h8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else viewBox="0 0 16 16">
        <path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span v-if="label || $slots.default" class="t73-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.t73-checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 24px;
  padding: 4px 0;
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  color: var(--73-ink);
  cursor: pointer;
  user-select: none;
}

.t73-checkbox--disabled {
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

/* 视觉上藏掉但留在无障碍树里。不用 display:none —— 那会让它无法聚焦。 */
.t73-checkbox__input {
  position: absolute;
  width: var(--73-check-size);
  height: var(--73-check-size);
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.t73-checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--73-check-size);
  height: var(--73-check-size);
  /* 与方框对齐：行高 1.6 × 13px ≈ 21px，16px 的方框要略偏上才居中 */
  margin-top: 2px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-check);
  background: var(--73-surface-strong);
  color: var(--73-accent-contrast);
  transition:
    background-color var(--73-transition),
    border-color var(--73-transition);
}

.t73-checkbox__box svg {
  width: 12px;
  height: 12px;
  /* 未选中时不画勾 */
  opacity: 0;
  transition: opacity var(--73-transition);
}

.t73-checkbox--checked .t73-checkbox__box svg {
  opacity: 1;
}

.t73-checkbox--checked .t73-checkbox__box {
  border-color: var(--73-accent);
  background: var(--73-accent);
}

.t73-checkbox:hover:not(.t73-checkbox--disabled) .t73-checkbox__box {
  border-color: var(--73-border-hover);
}

.t73-checkbox__input:focus-visible + .t73-checkbox__box {
  box-shadow: var(--73-focus-ring);
}

.t73-checkbox--invalid .t73-checkbox__box {
  border-color: var(--73-danger);
}

.t73-checkbox--disabled .t73-checkbox__box {
  border-color: var(--73-border);
  background: var(--73-inset);
}

.t73-checkbox--disabled.t73-checkbox--checked .t73-checkbox__box {
  border-color: var(--73-ink-disabled);
  background: var(--73-ink-disabled);
}

.t73-checkbox__label {
  min-width: 0;
  line-height: 1.5;
}

.t73-checkbox--sm {
  font-size: var(--73-font-size-sm);
}

/* 触屏档：命中区到 44px（设计规范第六节的硬要求） */
@media (max-width: 640px) {
  .t73-checkbox {
    align-items: center;
    min-height: 44px;
    padding: 0;
  }

  .t73-checkbox__box {
    margin-top: 0;
  }
}
</style>
