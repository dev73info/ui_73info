<script setup lang="ts">
/**
 * TDescriptions
 *
 * 接替 `<el-descriptions>` + `<el-descriptions-item>`（user-client 里 1 + 15 处，
 * 用在违约案这类「一堆字段名值对」的详情块上）。
 *
 * ## 为什么是 `<dl>` + `dt`/`dd`，而不是每个字段一个 div
 *
 * 每个字段一个 `div`（标签与值塞在里面）实现最简单，但会丢掉一个真实的收益：
 * **标签列能按内容自动对齐**。做成一个 CSS Grid、让 `dt` / `dd` 成为网格的**直接**
 * 子元素，`max-content` 轨道会按整张表里最宽的那个标签取值，于是所有行的标签右边界
 * 对齐——不需要量宽度、不需要写死 `label-width`。
 *
 * 代价是 `TDescriptionsItem` 必须是**多根节点组件**（它同时渲染一个 `dt` 与一个 `dd`），
 * 所以它上面**不能写 `class` / `style`**（Vue 的多根组件没有唯一的落点自动继承属性）。
 * 需要单独调一格就包一层自己的 `div`。
 *
 * ## 列数与响应式
 *
 * 列数用 `data-columns` 属性（1–4）驱动，不用内联 `style`：内联样式的优先级高于
 * 样式表，窄屏的媒体查询就覆盖不掉了。属性选择器 + 媒体查询可以正常降档。
 */
import { computed, provide } from 'vue'
import { DESCRIPTIONS_CONTEXT } from './context'
import type { TDescriptionsProps } from './types'

defineOptions({ name: 'TDescriptions' })

const props = withDefaults(defineProps<TDescriptionsProps>(), {
  column: 3,
  border: false,
  direction: 'horizontal',
  size: 'md',
  title: undefined,
  ariaLabel: undefined,
})

/** 夹到 1–4：样式表里为这四个值各写了一条属性选择器 */
const columns = computed(() => Math.min(Math.max(Math.round(props.column), 1), 4))

provide(DESCRIPTIONS_CONTEXT, {
  border: computed(() => props.border),
  direction: computed(() => props.direction),
})
</script>

<template>
  <div
    class="t73-descriptions t73"
    :class="[
      `t73-descriptions--${direction}`,
      `t73-descriptions--${size}`,
      { 't73-descriptions--border': border },
    ]"
    :data-columns="columns"
    role="group"
    :aria-label="ariaLabel"
  >
    <p v-if="title || $slots.title" class="t73-descriptions__title">
      <slot name="title">{{ title }}</slot>
    </p>
    <dl class="t73-descriptions__list">
      <slot />
    </dl>
  </div>
</template>

<style scoped>
.t73-descriptions {
  width: 100%;
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  color: var(--73-ink);
}

.t73-descriptions__title {
  margin: 0 0 12px;
  font-size: var(--73-font-size-md);
  font-weight: var(--73-font-weight-bold);
}

/* 列数：1–4 各一条。用属性选择器而不是内联 style，媒体查询才覆盖得动 */
.t73-descriptions[data-columns='1'] {
  --t73-desc-columns: 1;
}

.t73-descriptions[data-columns='2'] {
  --t73-desc-columns: 2;
}

.t73-descriptions[data-columns='3'] {
  --t73-desc-columns: 3;
}

.t73-descriptions[data-columns='4'] {
  --t73-desc-columns: 4;
}

.t73-descriptions__list {
  display: grid;
  margin: 0;
}

/* 横向：每组占「标签轨道 + 值轨道」两个轨道。
   标签轨道用 max-content，所以标签在整张表里右对齐。 */
.t73-descriptions--horizontal .t73-descriptions__list {
  grid-template-columns: repeat(
    var(--t73-desc-columns, 3),
    max-content minmax(0, 1fr)
  );
  align-items: baseline;
}

/* 竖向：每组占两行（标签一行、值一行），列数就是每组占几条轨道 */
.t73-descriptions--vertical .t73-descriptions__list {
  grid-template-columns: repeat(var(--t73-desc-columns, 3), minmax(0, 1fr));
}

.t73-descriptions--border .t73-descriptions__list {
  /* 描边用「1px 间隙 + 底色」画：不用给每个单元格算首行/末列，也不会双重描边 */
  gap: 1px;
  border: 1px solid var(--73-border-soft);
  border-radius: var(--73-radius-inner);
  background: var(--73-border-soft);
  overflow: hidden;
}

.t73-descriptions--border :deep(.t73-descriptions__label),
.t73-descriptions--border :deep(.t73-descriptions__value) {
  padding: 10px 12px;
  background: var(--73-surface-strong);
}

.t73-descriptions--border :deep(.t73-descriptions__label) {
  background: var(--73-inset);
}

/* 横向档：值那一列与标签之间留一点视觉间隔，避免两者贴着 */
.t73-descriptions--horizontal :deep(.t73-descriptions__label) {
  padding-right: 16px;
}

/* 竖向档：标签在上、值在下 */
.t73-descriptions--vertical :deep(.t73-descriptions__label) {
  padding-top: 4px;
  padding-right: 0;
}

.t73-descriptions--vertical :deep(.t73-descriptions__value) {
  padding-bottom: 8px;
}

/* 紧凑档：值那一列也降到次要字号（标签本来就是 12px） */
.t73-descriptions--sm :deep(.t73-descriptions__value) {
  font-size: var(--73-font-size-sm);
}

/* 窄屏降档：980 收两列，640 收到一列。
   选择器带 `[data-columns]` 是为了与上面的属性选择器同为 (0,2,0)，
   靠「写在后面」取胜——否则 `.t73-descriptions` 单独一条会被属性选择器盖住。 */
@media (max-width: 980px) {
  .t73-descriptions[data-columns] {
    --t73-desc-columns: 2;
  }
}

@media (max-width: 640px) {
  .t73-descriptions[data-columns] {
    --t73-desc-columns: 1;
  }
}
</style>
