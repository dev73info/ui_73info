<script setup lang="ts">
/**
 * TCard
 *
 * 规格照搬 `.dev-surface-card` + `.dev-card-head`（`dev-base.css`）：
 * 1px 描边、24px 圆角、半透明卡片底、一层卡片阴影、24px 内边距；
 * 卡头一行标题 + 右侧操作，标题 18px/700，说明 13px。
 *
 * 与 user_client 现状的一处**刻意统一**：卡片圆角原来有 16px（门户 `.glass-panel`）、
 * 18px、22px、24px 四种，这个组件只认 `--73-radius-card`（24px）。
 * 门户侧的卡片会因此比原来圆一点，这是收敛的结果，不是漏改。
 */
import { useSlots } from 'vue'
import type { TCardProps } from './types'

defineOptions({ name: 'TCard' })

withDefaults(defineProps<TCardProps>(), {
  title: undefined,
  description: undefined,
  hoverable: false,
  padded: true,
  bordered: true,
})

const slots = useSlots()
</script>

<template>
  <section
    class="t73-card t73"
    :class="{
      't73-card--hoverable': hoverable,
      't73-card--bordered': bordered,
      't73-card--padded': padded,
    }"
  >
    <header v-if="slots.header || title || description || slots.actions" class="t73-card__head">
      <slot name="header">
        <div class="t73-card__title-block">
          <h3 v-if="title || slots.title" class="t73-card__title">
            <slot name="title">{{ title }}</slot>
          </h3>
          <p v-if="description || slots.description" class="t73-card__desc">
            <slot name="description">{{ description }}</slot>
          </p>
        </div>
      </slot>
      <div v-if="slots.actions" class="t73-card__actions"><slot name="actions" /></div>
    </header>

    <div class="t73-card__body"><slot /></div>

    <footer v-if="slots.footer" class="t73-card__footer"><slot name="footer" /></footer>
  </section>
</template>

<style scoped>
.t73-card {
  display: block;
  min-width: 0;
  border-radius: var(--73-radius-card);
  background: var(--73-surface);
  box-shadow: var(--73-shadow-card);
  transition: box-shadow var(--73-transition);
}

.t73-card--bordered {
  border: 1px solid var(--73-border);
}

.t73-card--padded {
  padding: 24px;
}

.t73-card--hoverable:hover {
  box-shadow: var(--73-shadow-card-hover);
}

/* --- 卡头：来自 .dev-card-head --- */
.t73-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.t73-card__title-block {
  min-width: 0;
}

.t73-card__title {
  margin: 0;
  font-size: var(--73-font-size-title);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.3;
  color: var(--73-ink);
}

.t73-card__desc {
  margin: 6px 0 0;
  font-size: var(--73-font-size-body);
  line-height: var(--73-line-height);
  color: var(--73-ink-muted);
}

.t73-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.t73-card__body {
  min-width: 0;
}

.t73-card__footer {
  margin-top: 18px;
}
</style>
