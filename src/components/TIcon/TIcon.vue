<script setup lang="ts">
/**
 * TIcon
 *
 * 迁移期的实际用途：接替 `<el-icon>` 这个包装容器（user-client 里有 201 处）。
 * `<el-icon>` 本身不依赖 Element 运行时，它只是「让 SVG 跟字号走、并且能转圈」的一层壳，
 * 所以这里做的就是同一件事，只是颜色改读令牌。
 *
 * 图标本身由本库的 `src/icons/` 提供（59 个，与 Element Plus Icons 同名同画布），
 * 所以页面上不需要再引任何第三方图标包。
 *
 * 尺寸口径与 `<el-icon>` 一致：默认 `1em`，即跟随父元素字号；图标颜色取 `currentColor`，
 * 所以放进按钮里就是按钮的文字色，不用单独传色。**不提供颜色 prop**——
 * 那样又会开出一条写裸色值的路。
 */
import { computed } from 'vue'
import type { TIconProps } from './types'

defineOptions({ name: 'TIcon' })

const props = withDefaults(defineProps<TIconProps>(), {
  icon: undefined,
  size: undefined,
  label: undefined,
  spin: false,
})

const iconStyle = computed(() => {
  if (props.size === undefined || props.size === null) return undefined
  return { fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size }
})
</script>

<template>
  <span
    class="t73-icon t73"
    :class="{ 't73-icon--spin': spin }"
    :style="iconStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <component :is="icon" v-if="icon" />
    <slot v-else />
  </span>
</template>

<style scoped>
.t73-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  /* 宽度高度都取 1em：字号一改，图标跟着改，与 <el-icon> 同口径 */
  width: 1em;
  height: 1em;
  line-height: 0;
  color: currentColor;
}

/* 插槽里的 SVG 是调用方作用域的节点，带的是调用方的 scope id，
   所以这里必须用 :deep() 才能选中。 */
.t73-icon :deep(svg) {
  display: block;
  width: 1em;
  height: 1em;
  fill: currentColor;
}

.t73-icon--spin :deep(svg) {
  animation: t73-icon-spin 900ms linear infinite;
}

@keyframes t73-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
