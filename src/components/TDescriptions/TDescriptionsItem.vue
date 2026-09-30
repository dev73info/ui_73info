<script setup lang="ts">
/**
 * TDescriptionsItem
 *
 * 一组「标签 + 值」。**它是多根节点组件**：同时渲染一个 `<dt>` 与一个 `<dd>`，
 * 两个都直接落在 `TDescriptions` 的 `<dl>` 网格里（原因见 `TDescriptions.vue` 顶部）。
 *
 * 两处因此带来的限制，都不是疏忽：
 *
 * 1. **不能给它写 `class` / `style`**。多根组件没有唯一的落点自动继承属性，
 *    硬透传会 Vue 报警告。要单独调一格就自己包一层 `div`。
 * 2. **`span` 要算两条轨道**。一组占「标签轨道 + 值轨道」，所以跨 `n` 组的
 *    值要跨 `2n - 1` 条轨道（那一组的标签轨道自己也占一条）。
 */
import { computed, inject } from 'vue'
import { DESCRIPTIONS_CONTEXT } from './context'
import type { TDescriptionsItemProps } from './types'

defineOptions({ name: 'TDescriptionsItem', inheritAttrs: false })

const props = withDefaults(defineProps<TDescriptionsItemProps>(), {
  span: 1,
})

const context = inject(DESCRIPTIONS_CONTEXT, null)

if (!context) {
  throw new Error(
    '[ui_73info] TDescriptionsItem 必须放在 TDescriptions 内使用：它渲染的 dt/dd 要直接落进 TDescriptions 的网格，单独用会没有版式。',
  )
}

const isVertical = computed(() => context.direction.value === 'vertical')
const columnSpan = computed(() => Math.max(1, Math.round(props.span)))

/** 竖向时标签与值各占满整行，跟着换行堆叠 */
const labelStyle = computed(() =>
  isVertical.value ? { gridColumn: '1 / -1' } : { gridColumn: 'span 1' },
)

const valueStyle = computed(() =>
  isVertical.value
    ? { gridColumn: '1 / -1' }
    : { gridColumn: `span ${columnSpan.value * 2 - 1}` },
)
</script>

<template>
  <dt class="t73-descriptions__label" :style="labelStyle">{{ label }}</dt>
  <dd class="t73-descriptions__value" :style="valueStyle">
    <slot>{{ '' }}</slot>
  </dd>
</template>

<style scoped>
/* 这里只能写「以本组件自己的根元素开头」的规则。
   多根组件的 scope id 只落在它自己的根节点（dt / dd）上，
   写 `.t73-descriptions--border ...` 这种以父组件根元素开头的选择器永远不会命中
   ——那些修饰规则放在 TDescriptions 的样式里，用 :deep() 穿透。

   基础内边距给 2px 0：无边框档靠行距分隔，有边框档由父组件覆盖成 10px 12px。 */
.t73-descriptions__label {
  margin: 0;
  padding: 2px 0;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
  line-height: 1.6;
  word-break: break-word;
}

.t73-descriptions__value {
  margin: 0;
  min-width: 0;
  padding: 2px 0;
  color: var(--73-ink);
  line-height: 1.6;
  word-break: break-word;
}

/* 值里出现的数字（金额、条数、时间）用等宽数字，列表里不跳 */
.t73-descriptions__value :deep(*) {
  font-variant-numeric: tabular-nums;
}
</style>
