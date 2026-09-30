<script setup lang="ts">
/**
 * TOptionGroup
 *
 * 选项分组，接替 `<el-option-group>`。仓库里目前没有用到，补上是为了让
 * 「下拉里按类别分组」这个常见形态在迁移时不必绕道自研。
 *
 * 只做两件事：画一行组标题、把组的禁用态广播给组内选项。
 * 组内选项照旧注册进同一个列表导航，所以 `↑↓` 会跨组连续移动，不会在一组里循环。
 */
import { computed, provide } from 'vue'
import { OPTION_GROUP_CONTEXT } from './context'
import type { TOptionGroupProps } from './types'

defineOptions({ name: 'TOptionGroup' })

const props = withDefaults(defineProps<TOptionGroupProps>(), {
  disabled: false,
})

provide(OPTION_GROUP_CONTEXT, { disabled: computed(() => props.disabled) })
</script>

<template>
  <li class="t73-option-group t73" role="group" :aria-label="label">
    <div class="t73-option-group__title" aria-hidden="true">{{ label }}</div>
    <ul class="t73-option-group__list">
      <slot />
    </ul>
  </li>
</template>

<style scoped>
.t73-option-group {
  margin: 0;
  padding: 0;
  list-style: none;
}

.t73-option-group__title {
  padding: 8px 10px 4px;
  color: var(--73-ink-muted);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-xs);
  font-weight: var(--73-font-weight-bold);
  letter-spacing: 0.08em;
}

.t73-option-group__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 组与组之间靠一条淡分隔线分开，不靠额外留白——
   留白会让「三组各一项」的下拉变得很高。 */
.t73-option-group + .t73-option-group {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--73-border-soft);
}
</style>
