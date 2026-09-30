<script setup lang="ts">
/**
 * 提示条列表（命令式 API 的渲染层）
 *
 * 由 `manager.ts` 用 `createApp` 挂到一个自建的容器上，**不是给页面直接用的组件**。
 * 它只做一件事：把 `messages` 数组画出来，关闭动作回抛给 manager。
 *
 * **定时器不在这里**。原稿把它放在组件里（想在卸载时一并清掉），但那需要 manager
 * 反过来拿到组件实例去调 `schedule`，多出一条容易出错的耦合。改由 manager 持有：
 * 它的生命周期与提示本身一致，关闭时清掉即可。
 */
import TButton from '../TButton/TButton.vue'
import { messageTone, type MessageItem, type MessageType } from './types'

defineProps<{
  /** 响应式数组，直接改它就会重渲染 */
  messages: MessageItem[]
  /** 关闭某一条（关闭按钮、或 manager 的定时器到点） */
  onClose: (id: number) => void
}>()

/** 每种语气的图标路径。画在同一枚圆环里，只换中间的笔画 */
const ICON_PATHS: Record<MessageType, string> = {
  info: 'M8 7.2v4.6M8 5.2v.6',
  success: 'M4.6 8.4l2.2 2.2 4.6-5',
  warning: 'M8 5v3.6M8 10.8v.6',
  error: 'M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8',
}
</script>

<template>
  <TransitionGroup name="t73-message" tag="div" class="t73-message-stack">
    <div
      v-for="item in messages"
      :key="item.id"
      class="t73-message t73"
      :class="`t73-message--tone-${messageTone(item.type)}`"
      role="alert"
    >
      <span class="t73-message__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4" />
          <path
            :d="ICON_PATHS[item.type]"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span class="t73-message__text">{{ item.message }}</span>
      <TButton
        v-if="item.closable"
        class="t73-message__close"
        variant="text"
        tone="neutral"
        size="sm"
        aria-label="关闭"
        @click="onClose(item.id)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </TButton>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.t73-message-stack {
  position: fixed;
  top: 20px;
  left: 50%;
  z-index: var(--73-z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  /* 容器不遮住下面的内容：只有提示条自己吃点击 */
  pointer-events: none;
  transform: translateX(-50%);
}

.t73-message {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(560px, calc(100vw - 40px));
  padding: 10px 14px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-panel);
  color: var(--73-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  line-height: 1.5;
  pointer-events: auto;
}

.t73-message--tone-success {
  --t73-message-ink: var(--73-success-text);
}

.t73-message--tone-warning {
  --t73-message-ink: var(--73-warning-text);
}

.t73-message--tone-danger {
  --t73-message-ink: var(--73-danger-text);
}

.t73-message--tone-info {
  --t73-message-ink: var(--73-info-text);
}

.t73-message--tone-neutral {
  --t73-message-ink: var(--73-neutral-text);
}

.t73-message__icon {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: var(--t73-message-ink);
}

.t73-message__icon svg {
  width: 16px;
  height: 16px;
}

.t73-message__text {
  min-width: 0;
  word-break: break-word;
}

.t73-message__close {
  flex: 0 0 auto;
  min-height: 22px;
  height: 22px;
  padding: 0 4px;
  color: var(--73-ink-muted);
}

.t73-message__close svg {
  width: 12px;
  height: 12px;
}

/* 进场从上方落下一点，与「通知」的语义一致；出场直接淡出 */
.t73-message-enter-active,
.t73-message-leave-active {
  transition:
    opacity var(--73-transition),
    transform var(--73-transition);
}

.t73-message-enter-from,
.t73-message-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 移动端：贴到安全区下方，宽度几乎占满 */
@media (max-width: 640px) {
  .t73-message-stack {
    top: calc(12px + env(safe-area-inset-top, 0px));
    right: 12px;
    left: 12px;
    transform: none;
  }

  .t73-message {
    width: 100%;
    max-width: 100%;
  }
}
</style>
