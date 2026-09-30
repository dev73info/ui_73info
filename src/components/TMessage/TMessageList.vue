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
 *
 * ## 视觉口径来自宿主既有的 toast
 *
 * 结构对着 `user-client/src/components/AppToast.vue` + `src/styles/toast.css` 做：
 * 右下角、半透明语气色块 + 同色描边、粗体文案、常驻关闭按钮；≤640px 挪到顶部通栏。
 * 这样宿主把 55 处 `showToast` 换成 `TMessage` 时，看到的是同一个东西。
 *
 * 对着宿主抄结构，但**色值一律换成库的语气令牌**，所以有三处是刻意的收敛，
 * 不是抄漏：`info` 由蓝改中性灰（宿主的蓝是那一处的 Tailwind 字面量，本库的
 * `--73-info` 是登记过的中性色，也与 Element 的 `info` 一致）；描边由 50% 透明
 * 收到令牌的 32%；投影由那两层的纯黑改成 `--73-shadow-panel`。
 */
import { messageTone, type MessageItem, type MessageType } from './types'

defineProps<{
  /** 响应式数组，直接改它就会重渲染 */
  messages: MessageItem[]
  /** 关闭某一条（关闭按钮、或 manager 的定时器到点） */
  onClose: (id: number) => void
}>()

/**
 * 语气 → 无障碍角色。
 *
 * 提示是「说话」，不是「报错」：成功与信息用 `status`（礼貌播报，不打断读屏），
 * 只有警示与错误才用 `alert`（抢播）。宿主那条 toast 统一写的是 `status`，
 * 这里按语气分开——同一句话要不要打断，取决于它是「已保存」还是「支付失败」。
 */
function roleOf(type: MessageType): 'alert' | 'status' {
  return type === 'error' || type === 'warning' ? 'alert' : 'status'
}
</script>

<template>
  <TransitionGroup name="t73-message" tag="div" class="t73-message-stack">
    <div
      v-for="item in messages"
      :key="item.id"
      class="t73-message t73"
      :class="`t73-message--tone-${messageTone(item.type)}`"
      :role="roleOf(item.type)"
    >
      <span class="t73-message__text">{{ item.message }}</span>
      <button
        v-if="item.closable"
        class="t73-message__close"
        type="button"
        aria-label="关闭提示"
        @click="onClose(item.id)"
      >
        ×
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.t73-message-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--73-z-toast);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  max-width: min(360px, calc(100vw - 40px));
  /* 容器不遮住下面的内容：只有提示条自己吃点击 */
  pointer-events: none;
}

.t73-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  /* 宿主那条约多长的文案都占这么宽，短文案不至于缩成一小块 */
  min-width: 220px;
  max-width: min(360px, calc(100vw - 40px));
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: var(--73-radius-inner);
  /* 底色是半透明的语气色，压在任意页面上都要读得清 —— 模糊是它可读性的前提 */
  backdrop-filter: blur(var(--73-glass-blur));
  -webkit-backdrop-filter: blur(var(--73-glass-blur));
  box-shadow: var(--73-shadow-panel);
  /* 底座把根元素定在 13px，提示条用正文大一号 */
  font-size: var(--73-font-size-md);
  word-break: break-word;
  pointer-events: auto;
}

/* 五档语气：软底 + 同色描边 + 深字。三件套都取令牌，这里不出现色值 */
.t73-message--tone-success {
  background: var(--73-success-soft);
  border-color: var(--73-success-line);
  color: var(--73-success-text);
}

.t73-message--tone-warning {
  background: var(--73-warning-soft);
  border-color: var(--73-warning-line);
  color: var(--73-warning-text);
}

.t73-message--tone-danger {
  background: var(--73-danger-soft);
  border-color: var(--73-danger-line);
  color: var(--73-danger-text);
}

.t73-message--tone-info {
  background: var(--73-info-soft);
  border-color: var(--73-info-line);
  color: var(--73-info-text);
}

.t73-message--tone-neutral {
  background: var(--73-neutral-soft);
  border-color: var(--73-neutral-line);
  color: var(--73-neutral-text);
}

.t73-message__text {
  flex: 1;
  min-width: 0;
  font-weight: var(--73-font-weight-bold);
}

/* 关闭按钮刻意不用 TButton：宿主那枚只是个继承语气色的裸 ×，没有底色、没有内边距。
   换成 TButton 会带上自己的高度与悬停底，反而与宿主不是同一个东西。 */
.t73-message__close {
  flex: 0 0 auto;
  margin: -1px 0 0;
  padding: 0 2px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity var(--73-transition);
}

.t73-message__close:hover {
  opacity: 1;
}

.t73-message__close:focus-visible {
  outline: none;
  border-radius: var(--73-radius-sm);
  box-shadow: var(--73-focus-ring);
}

/* 进场从右侧带一点回弹地滑入（曲线与时长照抄宿主 toast.css 的 toastIn），
   出场直接往下淡出；中间条目的补位也跟着走，不然删一条会跳。 */
.t73-message-enter-active {
  transition:
    opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.t73-message-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.t73-message-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}

.t73-message-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.t73-message-move {
  transition: transform var(--73-transition);
}

/* 移动端：宿主把 toast 挪到安全区下方并撑满宽度，这里照做。
   进场方向也跟着换成自上而下 —— 它现在是从上边缘掉下来的。 */
@media (max-width: 640px) {
  .t73-message-stack {
    top: calc(12px + env(safe-area-inset-top, 0px));
    right: 12px;
    bottom: auto;
    left: 12px;
    align-items: stretch;
    max-width: none;
  }

  .t73-message {
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .t73-message-enter-from {
    transform: translateY(-10px) scale(0.98);
  }

  .t73-message-leave-to {
    transform: translateY(-8px);
  }
}
</style>
