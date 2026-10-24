<script setup lang="ts">
/**
 * TButton
 *
 * 规格照搬 user_client 现有的 `.dev-btn`（`dev-base.css`）：36px 高、10px 圆角、
 * 13px/700、内边距 0 16px、悬浮**只加一层投影不提亮底色**。四处变体
 * （`.dev-btn--primary / --ghost / --gold / --danger`）在这里收成
 * `variant`（形状）× `tone`（颜色）两个轴。
 *
 * 两处刻意的取舍：
 *
 * 1. **主按钮的底色来自 `--73-accent-gradient`。** 门户侧主按钮是渐变
 *    （`--primary-gradient`），开发者侧是平色；令牌层已经把这个差异吸收了
 *    （dev 主题下该令牌退化成纯色），组件不必分支。
 * 2. **禁用态只降透明度，不改颜色。** 与 `.dev-btn:disabled { opacity: 0.56 }` 一致；
 *    另做一套灰色会多出四个只用于禁用的色值。
 */
import { computed, useAttrs, type Component } from 'vue'
import type { ComponentSize, Tone } from '../../types/common'
import type { TButtonEmits, TButtonProps, TButtonVariant } from './types'

defineOptions({ name: 'TButton', inheritAttrs: false })

const props = withDefaults(defineProps<TButtonProps>(), {
  variant: 'outline',
  tone: 'neutral',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  block: false,
  iconOnly: false,
  as: 'button',
})

const emit = defineEmits<TButtonEmits>()
const attrs = useAttrs()

const isInteractive = computed(() => !props.disabled && !props.loading)

const classes = computed(() => [
  't73-button',
  't73',
  `t73-button--${props.variant satisfies TButtonVariant}`,
  `t73-button--tone-${props.tone satisfies Tone}`,
  `t73-button--${props.size satisfies ComponentSize}`,
  {
    't73-button--block': props.block,
    't73-button--icon-only': props.iconOnly,
    't73-button--loading': props.loading,
    't73-button--disabled': props.disabled,
  },
])

/** 只有原生 button 支持 `disabled`；换元素（如 RouterLink）时用 aria 表达 */
const nativeDisabled = computed(() =>
  props.as === 'button' && isInteractive.value === false ? true : undefined,
)

function ariaDisabled(): 'true' | undefined {
  return isInteractive.value ? undefined : 'true'
}

function onClick(event: MouseEvent): void {
  if (!isInteractive.value) {
    // `.dev-btn` 是 `<button>` 时由浏览器拦住；换成 RouterLink / a 时要自己拦，
    // 否则「禁用」的链接按钮照样会跳转
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="as"
    v-bind="attrs"
    :class="classes"
    :type="as === 'button' ? type : undefined"
    :disabled="nativeDisabled"
    :aria-disabled="ariaDisabled()"
    :aria-busy="loading ? 'true' : undefined"
    @click="onClick"
  >
    <span v-if="loading" class="t73-button__spinner" aria-hidden="true" />
    <!-- icon-only 加载时只留转圈：插槽图标再留着会和 spinner 并排挤进正方形，看起来像两个叠歪的刷新图标 -->
    <template v-if="!(loading && iconOnly)">
      <span v-if="$slots.prefix" class="t73-button__affix"><slot name="prefix" /></span>
      <span class="t73-button__label"><slot /></span>
      <span v-if="$slots.suffix" class="t73-button__affix"><slot name="suffix" /></span>
    </template>
  </component>
</template>

<style scoped>
/* --- 形状与尺寸：来自 .dev-btn --- */
.t73-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--73-control-height);
  min-height: var(--73-control-height);
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--73-radius-control);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition:
    box-shadow var(--73-transition),
    background-color var(--73-transition),
    border-color var(--73-transition),
    color var(--73-transition);
}

.t73-button--sm {
  height: var(--73-control-height-sm);
  min-height: var(--73-control-height-sm);
  padding: 0 12px;
  font-size: var(--73-font-size-sm);
}

/* 只放图标：正方形。宽度取控件高度，左右内边距归零——
   留着 16px 内边距的话，「16px 的图标 + 32px 内边距」会撑成 48px 宽的长方形。 */
.t73-button--icon-only {
  width: var(--73-control-height);
  padding: 0;
}

.t73-button--icon-only.t73-button--sm {
  width: var(--73-control-height-sm);
}

/* 放在 `--block` **之前**：两个都写时撑满宽度优先（见 types.ts 的说明）。
   写在后面会把 `width: 100%` 覆盖成正方形。 */
.t73-button--block {
  width: 100%;
}

/* 触屏档：图标按钮撑到 44px 见方。36px 低于设计规范第六节的触摸目标下限，
   在组件里补齐，省得每页再写一条媒体查询。与 TCheckbox / TSwitch 同口径。 */
@media (max-width: 640px) {
  .t73-button--icon-only {
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
  }
}

.t73-button--disabled {
  opacity: 0.56;
  cursor: not-allowed;
  box-shadow: none;
}

.t73-button:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

/* --- 语义色：每个 tone 把五支色喂给同一组内部变量，变体规则只写一次 --- */
.t73-button--tone-accent {
  --t73-btn-solid: var(--73-accent);
  --t73-btn-text: var(--73-accent);
  --t73-btn-soft: var(--73-accent-soft);
  --t73-btn-line: var(--73-accent-line);
  --t73-btn-contrast: var(--73-accent-contrast);
}

.t73-button--tone-success {
  --t73-btn-solid: var(--73-success);
  --t73-btn-text: var(--73-success-text);
  --t73-btn-soft: var(--73-success-soft);
  --t73-btn-line: var(--73-success-line);
  --t73-btn-contrast: var(--73-ink-inverse);
}

.t73-button--tone-warning {
  --t73-btn-solid: var(--73-warning);
  --t73-btn-text: var(--73-warning-text);
  --t73-btn-soft: var(--73-warning-soft);
  --t73-btn-line: var(--73-warning-line);
  --t73-btn-contrast: var(--73-ink-inverse);
}

.t73-button--tone-danger {
  --t73-btn-solid: var(--73-danger);
  --t73-btn-text: var(--73-danger-text);
  --t73-btn-soft: var(--73-danger-soft);
  --t73-btn-line: var(--73-danger-line);
  --t73-btn-contrast: var(--73-ink-inverse);
}

.t73-button--tone-info {
  --t73-btn-solid: var(--73-info);
  --t73-btn-text: var(--73-info);
  --t73-btn-soft: color-mix(in srgb, var(--73-info) 12%, transparent);
  --t73-btn-line: color-mix(in srgb, var(--73-info) 32%, transparent);
  --t73-btn-contrast: var(--73-ink-inverse);
}

.t73-button--tone-neutral {
  --t73-btn-solid: var(--73-ink-soft);
  --t73-btn-text: var(--73-ink-soft);
  --t73-btn-soft: var(--73-inset);
  --t73-btn-line: var(--73-border);
  --t73-btn-contrast: var(--73-ink-inverse);
}

/* --- 变体：solid --- */
.t73-button--solid {
  background-color: var(--t73-btn-solid);
  border-color: var(--t73-btn-solid);
  color: var(--t73-btn-contrast);
}

/* 只有强调色在门户侧带渐变；其余 tone 用平色 */
.t73-button--solid.t73-button--tone-accent {
  background-image: var(--73-accent-gradient);
}

.t73-button--solid:not(.t73-button--disabled):hover,
.t73-button--solid:not(.t73-button--disabled):focus-visible {
  box-shadow: var(--73-shadow-control);
}

/* --- 变体：outline（默认）---
   悬浮口径与 .dev-btn--ghost 一致：换描边、加浅底、文字转强调色，再加一层淡投影。 */
.t73-button--outline {
  background: var(--73-surface-strong);
  border-color: var(--t73-btn-line);
  color: var(--t73-btn-text);
}

.t73-button--outline:not(.t73-button--disabled):hover {
  border-color: var(--t73-btn-line);
  background: var(--t73-btn-soft);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--t73-btn-solid) 10%, transparent);
}

/* --- 变体：text --- */
.t73-button--text {
  background: transparent;
  border-color: transparent;
  color: var(--t73-btn-text);
  padding: 0 8px;
}

.t73-button--text:not(.t73-button--disabled):hover {
  background: var(--t73-btn-soft);
}

/* --- 前缀/后缀与转圈 --- */
.t73-button__affix {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.t73-button__label {
  display: inline-flex;
  align-items: center;
}

.t73-button--loading {
  cursor: progress;
}

.t73-button__spinner {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: t73-button-spin 620ms linear infinite;
}

@keyframes t73-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
