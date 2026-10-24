<script setup lang="ts">
/**
 * TLoading
 *
 * 接替 Element 的 `v-loading` 指令。数了一遍 user_client 的用法：表格那几处已经被
 * `TTable` 的 `loading` 属性接管，**剩下 16 处挂在普通容器上**（整页 main、统计条
 * `.dev-meta-strip`、面板 section、评论区列表、弹窗内的一小块），这个组件接的就是这 16 处。
 *
 * 与那个指令有三处不同，都是有意的：
 *
 * 1. **它是容器组件，不是指令。** 本库没有指令层（见 doc/架构.md 第八节）。
 *    用法是把原来挂 `v-loading` 的那**个元素本身**换成 TLoading，标签、class、内容
 *    原样带过来：
 *
 *    ```html
 *    <div class="dev-meta-strip" v-loading="loading">…</div>
 *    <TLoading tag="div" class="dev-meta-strip" :loading="loading">…</TLoading>
 *    ```
 *
 *    这不是写法偏好：换完之后宿主元素仍是同一个元素，只多了一个绝对定位的子节点，
 *    页面自己的选择器（`.dev-meta-strip > *`、grid／flex 子项、`:first-child`）全都不受影响。
 *    组件内部再套一层 `<div>` 的写法会把这些选择器全部错位。
 * 2. **`position: relative` 只在加载中出现。** Element 的指令是加载时给宿主补上
 *    `position: relative`、结束后还原成 `static`；这里照同样的口径写成
 *    `.t73-loading--active`，所以没在加载时页面的定位上下文与迁移前完全一致。
 * 3. **颜色全部取令牌。** 遮罩底色与转圈都读 `--73-*`，门户（白）与开发者（冷白）
 *    跟着主题走，调用方不必分端。
 *
 * 遮罩是**插槽内容的最后一个子节点**（与指令 appendChild 的位置一致），所以页面若写了
 * `> *` 这类选择器，它命中的成员集合与迁移前相同。
 */
import { computed, useAttrs } from 'vue'
import type { TLoadingProps } from './types'

defineOptions({ name: 'TLoading', inheritAttrs: false })

const props = withDefaults(defineProps<TLoadingProps>(), {
  loading: false,
  tag: 'div',
  text: undefined,
})

const attrs = useAttrs()

const classes = computed(() => [
  't73-loading',
  't73',
  { 't73-loading--active': props.loading },
])
</script>

<template>
  <component
    :is="tag"
    v-bind="attrs"
    :class="classes"
    :aria-busy="loading ? 'true' : undefined"
  >
    <slot />
    <span v-if="loading" class="t73-loading__mask">
      <span class="t73-loading__spinner" aria-hidden="true" />
      <span v-if="text" class="t73-loading__text">{{ text }}</span>
    </span>
  </component>
</template>

<style scoped>
/* 只在加载中成为定位上下文：这与 Element 指令的临时行为一致，加载结束后宿主
   回到 static，页面里那些依赖外层定位的绝对定位元素不会因此改变参考系。 */
.t73-loading--active {
  position: relative;
}

.t73-loading__mask {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* 跟着宿主的圆角走：宿主是卡片或弹窗里的小块时，方角遮罩会露出四角 */
  border-radius: inherit;
  /* 遮罩底色：源文件是 Element 的 `--el-mask-color`（白 90%）。这里取强表面色的 88%，
     与令牌层其余「同口径派生」的做法一致——换主题时遮罩跟着表面色走。 */
  background: color-mix(in srgb, var(--73-surface-strong) 88%, transparent);
}

/* 与 TButton 的加载圈同一套画法（2px 描边、620ms 匀速转），只是尺寸取 22px：
   按钮里是 13px，整块区域的遮罩里用同一尺寸会看着像没转起来。 */
.t73-loading__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--73-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: t73-loading-spin 620ms linear infinite;
}

.t73-loading__text {
  font-size: var(--73-font-size-sm);
  color: var(--73-ink-muted);
}

@keyframes t73-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
