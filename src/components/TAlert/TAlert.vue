<script setup lang="ts">
/**
 * TAlert
 *
 * 接替 `<el-alert>`（user-client 里 10 处）。规格来自
 * `.dev-recharge-dialog__limit-alert`（`dev-wallet.css`），那是仓库里唯一一处
 * 把 alert 完整改写过的地方：
 *
 * ```css
 * padding: 12px 14px; border: 1px solid rgba(185,129,43,.24);
 * border-radius: 10px; background: rgba(185,129,43,.08);
 * .el-alert__title { color: var(--dev-gold); font-size: 13px; font-weight: 800 }
 * ```
 *
 * 那一处的金色是 **`tone="warning"`**：门户侧会解析成琥珀、开发者侧解析成金，
 * 正是主题该干的活。描边与浅底不再抄字面量，改用 `--73-{tone}-line` / `--73-{tone}-soft`
 * ——它们本来就是同一组「基色 32% 透明度」「基色 12%」的口径。
 *
 * ## 一处刻意的差异
 *
 * `<el-alert>` 的 `title` 是**必填**，`description` 才会换行；这里两个都是可选，
 * 且 `description` 没有也照常渲染。迁移时把只写 `title` 的写法直接搬过来即可。
 *
 * ## `actions` 插槽
 *
 * 提示框自带一个动作时（例如「去签署协议」），把按钮放进 `#actions`：它排在文案
 * 右侧、竖向居中，不落在 `#default` 里——默认插槽是 `<p>`，塞进去会排在说明文字
 * 下面，观感也不对。
 */
import { computed } from 'vue'
import type { Tone } from '../../types/common'
import type { TAlertEmits, TAlertProps } from './types'

defineOptions({ name: 'TAlert' })

const props = withDefaults(defineProps<TAlertProps>(), {
  title: undefined,
  description: undefined,
  tone: 'info',
  variant: 'soft',
  closable: false,
  showIcon: true,
})

const emit = defineEmits<TAlertEmits>()

const classes = computed(() => [
  't73-alert',
  't73',
  `t73-alert--tone-${props.tone satisfies Tone}`,
  `t73-alert--${props.variant}`,
])
</script>

<template>
  <div :class="classes" role="alert">
    <span v-if="showIcon" class="t73-alert__icon" aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path
          d="M10 6.2v4.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <circle cx="10" cy="13.8" r="1" fill="currentColor" />
      </svg>
    </span>

    <div class="t73-alert__content">
      <p v-if="title || $slots.title" class="t73-alert__title">
        <slot name="title">{{ title }}</slot>
      </p>
      <p v-if="description || $slots.default" class="t73-alert__description">
        <slot>{{ description }}</slot>
      </p>
    </div>

    <div v-if="$slots.actions" class="t73-alert__actions">
      <slot name="actions" />
    </div>

    <button
      v-if="closable"
      type="button"
      class="t73-alert__close"
      aria-label="关闭"
      @click="emit('close')"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.t73-alert {
  display: flex;
  align-items: flex-start;
  /* 窄屏时动作区整块换到下一行，不去挤说明文字 */
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: var(--73-radius-control);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
}

/* 每个 tone 把三支色喂给同一组内部变量，变体规则只写一次 */
.t73-alert--tone-accent {
  --t73-alert-soft: var(--73-accent-soft);
  --t73-alert-line: var(--73-accent-line);
  --t73-alert-ink: var(--73-accent);
}

.t73-alert--tone-success {
  --t73-alert-soft: var(--73-success-soft);
  --t73-alert-line: var(--73-success-line);
  --t73-alert-ink: var(--73-success-text);
}

.t73-alert--tone-warning {
  --t73-alert-soft: var(--73-warning-soft);
  --t73-alert-line: var(--73-warning-line);
  --t73-alert-ink: var(--73-warning-text);
}

.t73-alert--tone-danger {
  --t73-alert-soft: var(--73-danger-soft);
  --t73-alert-line: var(--73-danger-line);
  --t73-alert-ink: var(--73-danger-text);
}

.t73-alert--tone-info {
  --t73-alert-soft: var(--73-info-soft);
  --t73-alert-line: var(--73-info-line);
  --t73-alert-ink: var(--73-info-text);
}

.t73-alert--tone-neutral {
  --t73-alert-soft: var(--73-neutral-soft);
  --t73-alert-line: var(--73-neutral-line);
  --t73-alert-ink: var(--73-neutral-text);
}

.t73-alert--soft {
  border-color: var(--t73-alert-line);
  background: var(--t73-alert-soft);
}

.t73-alert--outline {
  border-color: var(--t73-alert-line);
  background: transparent;
}

.t73-alert__icon {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  color: var(--t73-alert-ink);
}

.t73-alert__icon svg {
  width: 18px;
  height: 18px;
}

.t73-alert__content {
  flex: 1 1 auto;
  min-width: 0;
}

.t73-alert__title {
  margin: 0;
  color: var(--t73-alert-ink);
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.55;
}

.t73-alert__description {
  margin: 4px 0 0;
  color: var(--73-ink-soft);
  font-size: var(--73-font-size-sm);
  line-height: 1.6;
}

.t73-alert__title + .t73-alert__description {
  margin-top: 6px;
}

/* 动作区：排在文案右侧、竖向居中；文案仍吃掉剩余宽度 */
.t73-alert__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  align-self: center;
  gap: 8px;
}

.t73-alert__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-top: -1px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--t73-alert-ink);
  cursor: pointer;
  opacity: 0.78;
  transition:
    opacity var(--73-transition),
    background-color var(--73-transition);
}

.t73-alert__close:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.t73-alert__close:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-alert__close svg {
  width: 14px;
  height: 14px;
}
</style>
