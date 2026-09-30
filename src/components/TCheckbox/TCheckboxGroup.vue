<script setup lang="ts">
/**
 * TCheckboxGroup
 *
 * 一组复选框，接替 `<el-checkbox-group>`。组持有选中值与禁用态，
 * 组内的 `TCheckbox` 从上下文取——与 `TForm` / `TFormItem` 同一思路。
 *
 * 用 `role="group"` + `aria-label` 表达「这是一组」，
 * 而不是把整组塞进 `fieldset/legend`：仓库里的分组本来就已经有一个可见的
 * `TFormItem` 标签了，再加一层 `fieldset` 会让读屏重复念两遍同样的名字。
 */
import { computed, provide, type Ref } from 'vue'
import type { ComponentSize } from '../../types/common'
import { isSameValue } from '../TSelect/context'
import type { SelectValue } from '../TSelect/types'
import { CHECKBOX_GROUP_CONTEXT } from './context'
import type { TCheckboxGroupEmits, TCheckboxGroupProps } from './types'

defineOptions({ name: 'TCheckboxGroup' })

const props = withDefaults(defineProps<TCheckboxGroupProps>(), {
  modelValue: () => [],
  disabled: false,
  size: undefined,
  direction: 'horizontal',
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TCheckboxGroupEmits>()

const selected = computed<SelectValue[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)

const disabled = computed(() => props.disabled)
const size = computed<ComponentSize>(() => props.size ?? 'md')

function toggle(value: SelectValue): void {
  if (disabled.value) return
  const next = selected.value.filter((current) => !isSameValue(current, value))
  // 已经在选中集合里 → 这次是取消勾选；不在 → 追加
  if (next.length === selected.value.length) next.push(value)
  emit('update:modelValue', next)
  emit('change', next)
}

provide(CHECKBOX_GROUP_CONTEXT, {
  selected: selected as Ref<SelectValue[]>,
  disabled,
  size,
  name: props.name,
  toggle,
})
</script>

<template>
  <div
    class="t73-checkbox-group t73"
    :class="`t73-checkbox-group--${direction}`"
    role="group"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<style scoped>
.t73-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.t73-checkbox-group--vertical {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 4px;
}

/* 竖排时把每一项拉满宽度，方便点击时整行都是热区 */
.t73-checkbox-group--vertical :deep(.t73-checkbox) {
  display: flex;
  width: 100%;
}
</style>
