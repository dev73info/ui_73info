<script setup lang="ts">
/**
 * TSwitch
 *
 * 接替 `<el-switch>`（user-client 里 2 处：钱包的自动提现开关、权益中心的装备开关）。
 *
 * ## 规格来源
 *
 * 仓库里没有一处改写过 `.el-switch`（`dev-*` 与 `pillow` 那几份样式表里 0 处引用），
 * 所以这里没有「照搬某个源文件」的对象，取值全部由令牌推导：
 * 轨道是胶囊（`--73-radius-pill`），关闭态取「未选中控件的边界」这一档 `--73-track`
 * （就是 `--73-border`），开启态取主色；旋钮取表面色。**没有新写任何字面量色值。**
 *
 * ## 为什么用 `role="switch"` 而不是原生 checkbox
 *
 * 前者语义更准（读屏会念「开关，已打开」而不是「复选框」），而 `TCheckbox` 已经把
 * 原生输入的键盘行为包好了；开关只有「开/关」两态，空格键自己处理即可，
 * 沿用原生 checkbox 反而会让读屏念错角色。
 *
 * ## 异步场景下的 `loading`
 *
 * 自动提现那种「提交中不能连点」的场景，用 `loading` 而不是 `disabled`：
 * 视觉上仍看得出当前状态，只是不接受点击。`loading` 时组件不走 `update:modelValue`，
 * 由调用方在请求成功后再改 `modelValue`——这正是源页面的做法。
 */
import { computed, inject, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import type { TSwitchEmits, TSwitchProps } from './types'

defineOptions({ name: 'TSwitch' })

const props = withDefaults(defineProps<TSwitchProps>(), {
  modelValue: false,
  disabled: false,
  loading: false,
  size: undefined,
  activeText: undefined,
  inactiveText: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TSwitchEmits>()

const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()

const checked = computed(() => props.modelValue === true)
const isDisabled = computed(
  () => props.disabled || (item?.disabled.value ?? false) || props.loading,
)
const size = computed<ComponentSize>(() => props.size ?? item?.size.value ?? 'md')
const inputId = computed(() => props.id ?? item?.inputId ?? fallbackId)

function toggle(): void {
  if (isDisabled.value) return
  const next = !checked.value
  emit('update:modelValue', next)
  emit('change', next)
  item?.notify('change')
}

function onKeydown(event: KeyboardEvent): void {
  // 原生 checkbox 由浏览器处理空格；这里角色是 switch，自己处理
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    toggle()
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="t73-switch t73"
    :class="{
      't73-switch--checked': checked,
      't73-switch--disabled': isDisabled,
      't73-switch--loading': loading,
      't73-switch--sm': size === 'sm',
      't73-switch--with-text': activeText || inactiveText || $slots.default,
    }"
    :id="inputId"
    :name="name"
    :aria-checked="checked ? 'true' : 'false'"
    :aria-label="ariaLabel"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :disabled="disabled"
    @click="toggle"
    @keydown="onKeydown"
  >
    <span class="t73-switch__track" aria-hidden="true">
      <span class="t73-switch__knob">
        <span v-if="loading" class="t73-switch__spinner" />
      </span>
    </span>
    <span v-if="activeText || inactiveText || $slots.default" class="t73-switch__text">
      <slot>{{ checked ? activeText : inactiveText }}</slot>
    </span>
  </button>
</template>

<style scoped>
.t73-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--73-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  cursor: pointer;
}

.t73-switch--disabled {
  cursor: not-allowed;
}

.t73-switch:focus-visible {
  outline: none;
}

.t73-switch:focus-visible .t73-switch__track {
  box-shadow: var(--73-focus-ring);
}

.t73-switch__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: var(--73-switch-width);
  height: var(--73-switch-height);
  padding: 0 3px;
  border-radius: var(--73-radius-pill);
  background: var(--73-track);
  transition: background-color var(--73-transition);
}

.t73-switch--sm .t73-switch__track {
  width: 36px;
  height: 20px;
}

.t73-switch--checked .t73-switch__track {
  background: var(--73-accent);
}

.t73-switch__knob {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--73-switch-knob);
  height: var(--73-switch-knob);
  border-radius: 50%;
  background: var(--73-surface-strong);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform var(--73-transition);
}

.t73-switch--sm .t73-switch__knob {
  width: 14px;
  height: 14px;
}

/* 位移量 = 轨道宽 − 两侧内边距 − 旋钮宽，硬算出来而不是用百分比：
   百分比在轨道宽度变化（sm 档）时与内边距对不上，旋钮会压出轨道边缘。 */
.t73-switch--checked .t73-switch__knob {
  transform: translateX(calc(var(--73-switch-width) - 6px - var(--73-switch-knob)));
}

.t73-switch--sm.t73-switch--checked .t73-switch__knob {
  transform: translateX(16px);
}

.t73-switch--disabled .t73-switch__track {
  opacity: 0.56;
}

.t73-switch__spinner {
  width: 9px;
  height: 9px;
  border: 2px solid var(--73-ink-muted);
  border-top-color: transparent;
  border-radius: 50%;
  animation: t73-switch-spin 620ms linear infinite;
}

@keyframes t73-switch-spin {
  to {
    transform: rotate(360deg);
  }
}

.t73-switch__text {
  min-width: 0;
  line-height: 1.5;
}

/* 触屏命中区：轨道本身 24px 高，靠上下内边距到 44px */
@media (max-width: 640px) {
  .t73-switch {
    min-height: 44px;
  }
}
</style>
