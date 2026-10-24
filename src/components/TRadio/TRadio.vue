<script setup lang="ts">
/**
 * TRadio
 *
 * 接替 `<el-radio>`（user_client 里 7 处）。与 `TCheckbox` 同一套做法：
 * 底下是真的 `<input type="radio">`，视觉上藏起来但留在无障碍树里。
 *
 * **组内必须用同名的原生 `radio`**，否则「↑↓ 在同一组里换选」这个浏览器自带的行为
 * 就没有了——`name` 由 `TRadioGroup` 统一给出，组内每一项共用。
 */
import { computed, inject, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import { isSameValue } from '../TSelect/context'
import type { SelectValue } from '../TSelect/types'
import { RADIO_GROUP_CONTEXT } from './context'
import type { TRadioEmits, TRadioProps } from './types'

defineOptions({ name: 'TRadio' })

const props = withDefaults(defineProps<TRadioProps>(), {
  value: undefined,
  modelValue: undefined,
  label: undefined,
  disabled: false,
  size: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TRadioEmits>()

const group = inject(RADIO_GROUP_CONTEXT, null)
const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()

if (group && props.value === undefined) {
  throw new Error(
    '[ui_73info] TRadio 放在 TRadioGroup 里时必须给 `value`：组靠它判断这一项是否被选中。',
  )
}

const checked = computed<boolean>(() => {
  if (!group) return isSameValue(props.modelValue, props.value)
  return isSameValue(group.selected.value, props.value)
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

function onSelect(): void {
  if (isDisabled.value) return
  // 没有 `value` 就没有「这一项代表什么」可言（组内已在上面拦过）
  const value = props.value
  if (value === undefined) return
  if (group) group.select(value)
  else emit('update:modelValue', value)
  emit('change', value)
  item?.notify('change')
}
</script>

<template>
  <label
    class="t73-radio t73"
    :class="{
      't73-radio--checked': checked,
      't73-radio--disabled': isDisabled,
      't73-radio--invalid': isInvalid,
      't73-radio--sm': size === 'sm',
    }"
  >
    <input
      class="t73-radio__input"
      type="radio"
      :id="inputId"
      :checked="checked"
      :disabled="isDisabled"
      :name="group?.name ?? name"
      :value="value === undefined ? undefined : String(value)"
      :aria-label="ariaLabel"
      :aria-invalid="isInvalid ? 'true' : undefined"
      @change="onSelect"
    />
    <span class="t73-radio__dot" aria-hidden="true" />
    <span v-if="label || $slots.default" class="t73-radio__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.t73-radio {
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

.t73-radio--disabled {
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

.t73-radio__input {
  position: absolute;
  width: var(--73-check-size);
  height: var(--73-check-size);
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

/* 圆点：外圈 + 内点，用 box-shadow 画内点，避免多一层元素 */
.t73-radio__dot {
  position: relative;
  flex: 0 0 auto;
  width: var(--73-check-size);
  height: var(--73-check-size);
  margin-top: 2px;
  border: 1px solid var(--73-border);
  border-radius: 50%;
  background: var(--73-surface-strong);
  transition:
    border-color var(--73-transition),
    box-shadow var(--73-transition);
}

.t73-radio--checked .t73-radio__dot {
  border-color: var(--73-accent);
  background: var(--73-accent);
  /* 内点取「当前主题的表面色」，白底主题下就是白色圆点 */
  box-shadow: inset 0 0 0 4px var(--73-surface-strong);
}

.t73-radio:hover:not(.t73-radio--disabled) .t73-radio__dot {
  border-color: var(--73-border-hover);
}

.t73-radio__input:focus-visible + .t73-radio__dot {
  box-shadow: var(--73-focus-ring);
}

.t73-radio--checked .t73-radio__input:focus-visible + .t73-radio__dot {
  box-shadow:
    inset 0 0 0 4px var(--73-surface-strong),
    var(--73-focus-ring);
}

.t73-radio--invalid .t73-radio__dot {
  border-color: var(--73-danger);
}

.t73-radio--disabled .t73-radio__dot {
  border-color: var(--73-border);
  background: var(--73-inset);
}

.t73-radio--disabled.t73-radio--checked .t73-radio__dot {
  border-color: var(--73-ink-disabled);
  background: var(--73-ink-disabled);
  box-shadow: inset 0 0 0 4px var(--73-surface-strong);
}

.t73-radio__label {
  min-width: 0;
  line-height: 1.5;
}

.t73-radio--sm {
  font-size: var(--73-font-size-sm);
}

@media (max-width: 640px) {
  .t73-radio {
    align-items: center;
    min-height: 44px;
    padding: 0;
  }

  .t73-radio__dot {
    margin-top: 0;
  }
}
</style>
