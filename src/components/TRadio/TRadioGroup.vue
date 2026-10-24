<script setup lang="ts">
/**
 * TRadioGroup
 *
 * 一组单选项，接替 `<el-radio-group>`（user_client 里 4 处）。
 *
 * 组负责给出 `name`，让组内原生 `radio` 共用一个名字——浏览器因此自带
 * 「↑↓ 在同一组里换选」的行为，不必自己实现方向键导航。
 */
import { computed, provide, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import type { SelectValue } from '../TSelect/types'
import { RADIO_GROUP_CONTEXT } from './context'
import type { TRadioGroupEmits, TRadioGroupProps } from './types'

defineOptions({ name: 'TRadioGroup' })

const props = withDefaults(defineProps<TRadioGroupProps>(), {
  modelValue: undefined,
  disabled: false,
  size: undefined,
  direction: 'horizontal',
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TRadioGroupEmits>()

const selected = computed(() => props.modelValue)
const disabled = computed(() => props.disabled)
const size = computed<ComponentSize>(() => props.size ?? 'md')

// 没显式给 name 时自动生成一个：组内共用是原生 radio 行为的前提
const groupName = useId()

function select(value: SelectValue): void {
  if (disabled.value) return
  emit('update:modelValue', value)
  emit('change', value)
}

provide(RADIO_GROUP_CONTEXT, {
  selected,
  disabled,
  size,
  name: props.name ?? groupName,
  select,
})
</script>

<template>
  <div
    class="t73-radio-group t73"
    :class="`t73-radio-group--${direction}`"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<style scoped>
.t73-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.t73-radio-group--vertical {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 4px;
}

.t73-radio-group--vertical :deep(.t73-radio) {
  display: flex;
  width: 100%;
}
</style>
