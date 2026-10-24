<script setup lang="ts">
/**
 * TRadioButton
 *
 * 按钮形态的单选，接替 `<el-radio-button>`（user_client 里 2 处，支付渠道选择）。
 *
 * 规格来自 `.dev-recharge-dialog__channels .el-radio-button` 那一组改写
 * （`dev-wallet.css`）：
 *
 * ```css
 * --el-radio-button-checked-bg-color: var(--el-color-primary-light-9);
 * --el-radio-button-checked-text-color: var(--dev-blue);
 * --el-radio-button-checked-border-color: var(--dev-blue);
 * /* 选中态再加一圈 inset 描边，让选中比悬浮更实 *\/
 * box-shadow: inset 0 0 0 1px var(--el-radio-button-checked-border-color);
 * ```
 *
 * 那一处还把按钮撑到 48px 高（因为它是「支付渠道卡片」而不是普通分段控件），
 * 属于局部排版，留给调用方用 `class` 覆盖。这里给的是通用档：
 * 控件高度 36px、10px 圆角。
 *
 * ## 与 Element 的差异
 *
 * `<el-radio-button>` 默认把相邻按钮**拼成一条**（只留一个外框）；
 * 这里每颗独立成块、靠 `gap` 分开。理由是仓库里的按钮本来就各有描边与圆角
 * （`.dev-btn` 就是 10px 圆角 + 独立描边），拼条会与页面其余部分不一致。
 */
import { computed, inject, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import { isSameValue } from '../TSelect/context'
import type { SelectValue } from '../TSelect/types'
import { RADIO_GROUP_CONTEXT } from './context'
import type { TRadioButtonProps } from './types'

defineOptions({ name: 'TRadioButton' })

const props = withDefaults(defineProps<TRadioButtonProps>(), {
  value: undefined,
  modelValue: undefined,
  label: undefined,
  disabled: false,
  size: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
  iconOnly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectValue): void
  (e: 'change', value: SelectValue): void
}>()

const group = inject(RADIO_GROUP_CONTEXT, null)
const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()

if (group && props.value === undefined) {
  throw new Error(
    '[ui_73info] TRadioButton 放在 TRadioGroup 里时必须给 `value`：组靠它判断这一项是否被选中。',
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
    class="t73-radio-button t73"
    :class="{
      't73-radio-button--checked': checked,
      't73-radio-button--disabled': isDisabled,
      't73-radio-button--sm': size === 'sm',
      't73-radio-button--icon-only': iconOnly,
    }"
  >
    <input
      class="t73-radio-button__input"
      type="radio"
      :id="id ?? fallbackId"
      :checked="checked"
      :disabled="isDisabled"
      :name="group?.name ?? name"
      :value="value === undefined ? undefined : String(value)"
      :aria-label="ariaLabel"
      @change="onSelect"
    />
    <span class="t73-radio-button__inner">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.t73-radio-button {
  display: inline-flex;
  min-width: 0;
  font-family: var(--73-font-family);
  cursor: pointer;
}

.t73-radio-button__input {
  position: absolute;
  width: var(--73-control-height);
  height: var(--73-control-height);
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.t73-radio-button__inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: var(--73-control-height);
  padding: 0 16px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  color: var(--73-ink-soft);
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1;
  white-space: nowrap;
  transition:
    border-color var(--73-transition),
    background-color var(--73-transition),
    color var(--73-transition),
    box-shadow var(--73-transition);
}

.t73-radio-button--sm .t73-radio-button__inner {
  min-height: var(--73-control-height-sm);
  padding: 0 12px;
  font-size: var(--73-font-size-sm);
}

.t73-radio-button:hover:not(.t73-radio-button--disabled) .t73-radio-button__inner {
  border-color: var(--73-border-hover);
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

/* 选中：主色描边 + 浅底 + 主色字，再补一圈 inset 描边让选中比悬浮更实
   （与源地那一处的 box-shadow 同口径）。 */
.t73-radio-button--checked .t73-radio-button__inner {
  border-color: var(--73-accent);
  background: var(--73-accent-soft);
  color: var(--73-accent);
  box-shadow: inset 0 0 0 1px var(--73-accent);
}

.t73-radio-button__input:focus-visible + .t73-radio-button__inner {
  box-shadow: var(--73-focus-ring);
}

.t73-radio-button--checked .t73-radio-button__input:focus-visible + .t73-radio-button__inner {
  box-shadow:
    inset 0 0 0 1px var(--73-accent),
    var(--73-focus-ring);
}

.t73-radio-button--disabled {
  cursor: not-allowed;
}

.t73-radio-button--disabled .t73-radio-button__inner {
  border-color: var(--73-border);
  background: var(--73-inset);
  color: var(--73-ink-disabled);
  box-shadow: none;
}
</style>
