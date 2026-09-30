<script setup lang="ts">
/**
 * 确认框（命令式 API 的渲染层）
 *
 * 由 `manager.ts` 挂到一个自建容器上，**不是给页面直接用的组件**。
 *
 * ## 为什么直接用 `TDialog`
 *
 * 命令式弹层最容易漏的正是 `TDialog` 已经做好的那三件事：焦点陷阱、Esc 与点遮罩关闭、
 * 背景滚动锁定。自己再写一个「轻量弹层」等于把这些坑重踩一遍，
 * 所以这里只是把 `TDialog` 包一层，接上「确定 / 取消」两个出口。
 *
 * ## 反复 resolve 是安全的
 *
 * `TDialog` 在点关闭按钮、按 Esc、点遮罩、点确定四条路径上都会走到 `finish`，
 * `finish` 里先把 `resolve` 取走并置空，所以第二条路径进来时已经无事可做。
 * 队列里等待的下一个框也就在这一刻被放行（见 `manager.ts` 的 `pump`）。
 */
import TButton from '../TButton/TButton.vue'
import TDialog from '../TDialog/TDialog.vue'

interface BoxState {
  visible: boolean
  title: string
  content: string
  confirmText: string
  cancelText: string
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  showCancel: boolean
  maskClosable: boolean
  resolve: ((value: boolean) => void) | null
}

const props = defineProps<{ state: BoxState }>()

function finish(value: boolean): void {
  const resolve = props.state.resolve
  // 先收起、再取走回调、最后才通知调用方：调用方在回调里常常会立刻再弹一个框，
  // 顺序反了就变成两个框叠在一起
  props.state.visible = false
  props.state.resolve = null
  resolve?.(value)
}
</script>

<template>
  <TDialog
    :open="state.visible"
    :title="state.title"
    :width="420"
    :mask-closable="state.maskClosable"
    :escape-closable="true"
    @update:open="finish(false)"
    @close="finish(false)"
  >
    <p class="t73-message-box__content">{{ state.content }}</p>
    <template #footer>
      <TButton v-if="state.showCancel" variant="outline" @click="finish(false)">
        {{ state.cancelText }}
      </TButton>
      <TButton variant="solid" :tone="state.tone" @click="finish(true)">
        {{ state.confirmText }}
      </TButton>
    </template>
  </TDialog>
</template>

<style scoped>
.t73-message-box__content {
  margin: 0;
  color: var(--73-ink-soft);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  line-height: 1.7;
  white-space: pre-line;
}
</style>
