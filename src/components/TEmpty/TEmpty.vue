<script setup lang="ts">
/**
 * TEmpty
 *
 * 接替 `<el-empty>`（user_client 里 2 处）**以及**仓库里那一堆手写的空态块：
 * `.dev-empty-state`、`.wb-empty` 的「还没有记录」形态。它们本来就是同一个东西在
 * 不同页面上重写了多遍，这里收成一个组件。
 *
 * ## 规格来源
 *
 * `.dev-empty-state`（`dev-base.css`）：
 *
 * ```css
 * padding: 24px; font-size: 13px; border-radius: var(--dev-radius-inner);
 * border: 1px dashed var(--dev-line); background: rgba(255, 255, 255, 0.56);
 * text-align: center; color: var(--dev-muted);
 * ```
 *
 * 两处刻意的处理：
 *
 * 1. **字号显式写在组件上，不靠继承。** 那个源文件的注释里记着这个坑：
 *    工单中心的空态是卡片里的裸 `div`，没有 `.dev-table .el-table__empty-text`
 *    那一层兜底，于是落到根字号 16px——同一个「还没有记录」在两页两种大小。
 * 2. **不画插图。** `<el-empty>` 默认带一张灰色插画，而仓库里所有空态都只有文字。
 *    照搬插画会让每一处空态都变高一块，这不是收敛。
 */
import type { TEmptyProps } from './types'

defineOptions({ name: 'TEmpty' })

withDefaults(defineProps<TEmptyProps>(), {
  description: '暂无数据',
  size: 'md',
  variant: 'dashed',
})
</script>

<template>
  <div
    class="t73-empty t73"
    :class="[`t73-empty--${size}`, `t73-empty--${variant}`]"
    role="status"
  >
    <div v-if="$slots.default" class="t73-empty__graphic"><slot /></div>
    <p class="t73-empty__description">
      <slot name="description">{{ description }}</slot>
    </p>
  </div>
</template>

<style scoped>
.t73-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 24px;
  border-radius: var(--73-radius-inner);
  background: color-mix(in srgb, var(--73-surface-strong) 56%, transparent);
  color: var(--73-ink-muted);
  font-family: var(--73-font-family);
  /* 显式声明：不靠继承，否则卡片里与表格里会得到两种字号 */
  font-size: var(--73-font-size-body);
  text-align: center;
}

.t73-empty--dashed {
  border: 1px dashed var(--73-border);
}

.t73-empty--plain {
  border: none;
  background: transparent;
  padding: 16px;
}

.t73-empty--sm {
  padding: 14px;
  font-size: var(--73-font-size-sm);
}

.t73-empty__graphic {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--73-ink-placeholder);
  font-size: 24px;
}

.t73-empty__description {
  margin: 0;
  line-height: 1.6;
}
</style>
