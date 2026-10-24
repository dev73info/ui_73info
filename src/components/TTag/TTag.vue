<script setup lang="ts">
/**
 * TTag
 *
 * 接替 user_client 里的三类东西：`.wb-badge`、`.dev-chip`、以及 Element 的
 * `<el-tag>`（25 处）。前两者的规格本来就完全相同——28px 高、999px 胶囊、
 * 12px/700、0 12px 内边距——这里收成一个组件。
 *
 * 状态色的取值走 `tone` × 主题：门户侧的「成功」是绿、开发者侧是青，
 * 调用方只写 `tone="success"`，不关心当前在哪套主题下。
 */
import { computed } from 'vue'
import type { Tone } from '../../types/common'
import type { TTagEmits, TTagProps, TTagVariant } from './types'

defineOptions({ name: 'TTag' })

const props = withDefaults(defineProps<TTagProps>(), {
  tone: 'neutral',
  variant: 'soft',
  size: 'md',
  closable: false,
})

const emit = defineEmits<TTagEmits>()

const classes = computed(() => [
  't73-tag',
  't73',
  `t73-tag--tone-${props.tone satisfies Tone}`,
  `t73-tag--${props.variant satisfies TTagVariant}`,
  `t73-tag--${props.size}`,
])

function onClose(event: MouseEvent): void {
  emit('close', event)
}
</script>

<template>
  <span :class="classes">
    <span v-if="$slots.prefix" class="t73-tag__affix"><slot name="prefix" /></span>
    <span class="t73-tag__label"><slot /></span>
    <button
      v-if="closable"
      type="button"
      class="t73-tag__close"
      aria-label="移除"
      @click="onClose"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>
  </span>
</template>

<style scoped>
/* --- 规格：.wb-badge 与 .dev-chip 的共同值 --- */
.t73-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: var(--73-chip-height);
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--73-radius-pill);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-sm);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.4;
  white-space: nowrap;
}

.t73-tag--sm {
  min-height: 22px;
  padding: 0 8px;
  font-size: var(--73-font-size-xs);
}

.t73-tag__label {
  display: inline-flex;
  align-items: center;
}

.t73-tag__affix {
  display: inline-flex;
  align-items: center;
}

/* --- 语义色：每个 tone 喂给同一组内部变量，变体规则只写一次 --- */
.t73-tag--tone-accent {
  --t73-tag-soft: var(--73-accent-soft);
  --t73-tag-line: var(--73-accent-line);
  --t73-tag-ink: var(--73-accent);
  --t73-tag-solid: var(--73-accent);
  --t73-tag-contrast: var(--73-accent-contrast);
}

.t73-tag--tone-success {
  --t73-tag-soft: var(--73-success-soft);
  --t73-tag-line: var(--73-success-line);
  --t73-tag-ink: var(--73-success-text);
  --t73-tag-solid: var(--73-success);
  --t73-tag-contrast: var(--73-ink-inverse);
}

.t73-tag--tone-warning {
  --t73-tag-soft: var(--73-warning-soft);
  --t73-tag-line: var(--73-warning-line);
  --t73-tag-ink: var(--73-warning-text);
  --t73-tag-solid: var(--73-warning);
  --t73-tag-contrast: var(--73-ink-inverse);
}

.t73-tag--tone-danger {
  --t73-tag-soft: var(--73-danger-soft);
  --t73-tag-line: var(--73-danger-line);
  --t73-tag-ink: var(--73-danger-text);
  --t73-tag-solid: var(--73-danger);
  --t73-tag-contrast: var(--73-ink-inverse);
}

.t73-tag--tone-info {
  --t73-tag-soft: color-mix(in srgb, var(--73-info) 12%, transparent);
  --t73-tag-line: color-mix(in srgb, var(--73-info) 32%, transparent);
  --t73-tag-ink: var(--73-info);
  --t73-tag-solid: var(--73-info);
  --t73-tag-contrast: var(--73-ink-inverse);
}

/* 中性胶囊的浅底是 rgba(148,163,184,0.12)（.wb-badge 的原值），
   即占位符色 #94a3b8 的 12%。 */
.t73-tag--tone-neutral {
  --t73-tag-soft: color-mix(in srgb, var(--73-ink-placeholder) 12%, transparent);
  --t73-tag-line: var(--73-border);
  --t73-tag-ink: var(--73-ink-muted);
  --t73-tag-solid: var(--73-ink-soft);
  --t73-tag-contrast: var(--73-ink-inverse);
}

/* --- 变体 --- */
.t73-tag--soft {
  background: var(--t73-tag-soft);
  color: var(--t73-tag-ink);
}

.t73-tag--outline {
  background: var(--t73-tag-soft);
  border-color: var(--t73-tag-line);
  color: var(--t73-tag-ink);
}

.t73-tag--solid {
  background: var(--t73-tag-solid);
  color: var(--t73-tag-contrast);
}

/* --- 关闭按钮 --- */
.t73-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: -4px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-pill);
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.72;
  transition:
    opacity var(--73-transition),
    background-color var(--73-transition);
}

.t73-tag__close:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 18%, transparent);
}

.t73-tag__close:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-tag__close svg {
  width: 10px;
  height: 10px;
}
</style>
