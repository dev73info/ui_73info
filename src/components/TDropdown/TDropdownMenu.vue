<script setup lang="ts">
/**
 * TDropdownMenu
 *
 * 菜单容器。**单独存在不是冗余**：菜单项是 `<li>`，必须有一个 `<ul>` 包着才合法；
 * 而面板本身（`.t73-dropdown__panel`）还要承担定位、描边、投影与加载/空状态，
 * 不能同时当那个 `<ul>`。源页面里 `.el-popper` 与 `.el-dropdown-menu` 也是两层。
 */
import { computed } from 'vue'
import type { TDropdownMenuProps } from './types'

defineOptions({ name: 'TDropdownMenu' })

const props = withDefaults(defineProps<TDropdownMenuProps>(), {
  maxHeight: undefined,
})

const style = computed(() => {
  if (props.maxHeight === undefined) return undefined
  const value =
    typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  return { maxHeight: value }
})
</script>

<template>
  <ul class="t73-dropdown-menu" role="menu" :style="style">
    <slot />
  </ul>
</template>

<style scoped>
.t73-dropdown-menu {
  display: block;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
</style>
