<script setup lang="ts">
/**
 * TScrollbar
 *
 * 接替 `<el-scrollbar>`（user_client 里真正用到组件形态的是工作台侧栏与外壳，
 * 另有若干处是 `document.querySelector('.el-scrollbar__wrap')` 这样的字符串引用）。
 *
 * ## 类名刻意沿用 Element 的形状
 *
 * 根 `.t73-scrollbar`、滚动元素 `.t73-scrollbar__wrap`、内容层 `.t73-scrollbar__view`、
 * 滚动条 `.t73-scrollbar__bar`。理由很实际：仓库里已有 `:deep(.el-scrollbar__bar)`
 * 这样的选择器，迁移时把 `.el-` 换成 `.t73-` 就行，不必再去读一遍组件结构。
 *
 * ## 自绘滚动条为什么不是「隐藏原生再画一根」
 *
 * 关键在**轨道与滚动元素的尺寸关系**：thumb 的长度 = 视口长² / 内容长，
 * 位置 = 滚动位移 × (视口长 − thumb 长) / (内容长 − 视口长)。
 * 这两条式子只有在「内容长 > 视口长」时才有意义，所以内容不够长时整条隐藏，
 * 而不是留一根占满轨道的灰条。
 *
 * 内容尺寸会变（列表异步填充、字段展开），所以除了监听 `scroll`，
 * 还要用 `ResizeObserver` 盯住**滚动元素与内容层两个**——只盯滚动元素的话，
 * 容器没变、内容变高这种情况不会触发，滚动条长度就会算错。
 *
 * ## 触屏上建议用 `native`
 *
 * 自绘滚动条没有惯性、没有边缘回弹、也不能在滚动时收起地址栏。
 * 手机上这些都很明显，所以给了 `native` 开关。
 */
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { TScrollbarEmits, TScrollbarInstance, TScrollbarProps } from './types'

defineOptions({ name: 'TScrollbar' })

const props = withDefaults(defineProps<TScrollbarProps>(), {
  maxHeight: undefined,
  maxWidth: undefined,
  always: false,
  native: false,
  watchContent: true,
  ariaLabel: undefined,
})

const emit = defineEmits<TScrollbarEmits>()

const rootRef = ref<HTMLElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const viewRef = ref<HTMLElement | null>(null)

/** 滚动相关的尺寸快照。滚动时更新，用来算 thumb 的长度与位置 */
const metrics = ref({
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 0,
  clientHeight: 0,
  scrollWidth: 0,
  clientWidth: 0,
})

/** 鼠标在容器内 / 正在滚动 / `always` 时显示滚动条 */
const active = ref(false)
let hideTimer = 0

const THUMB_MIN = 20

function sync(): void {
  const el = wrapRef.value
  if (!el) return
  metrics.value = {
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }
}

const overflowY = computed(() => metrics.value.scrollHeight > metrics.value.clientHeight + 1)
const overflowX = computed(() => metrics.value.scrollWidth > metrics.value.clientWidth + 1)

const thumbVertical = computed(() => {
  const { clientHeight, scrollHeight, scrollTop } = metrics.value
  if (clientHeight === 0 || scrollHeight <= clientHeight) return undefined
  const height = Math.max(THUMB_MIN, (clientHeight * clientHeight) / scrollHeight)
  const track = clientHeight - height
  const offset = (scrollTop / (scrollHeight - clientHeight)) * track
  return { height: `${height}px`, transform: `translateY(${offset}px)` }
})

const thumbHorizontal = computed(() => {
  const { clientWidth, scrollWidth, scrollLeft } = metrics.value
  if (clientWidth === 0 || scrollWidth <= clientWidth) return undefined
  const width = Math.max(THUMB_MIN, (clientWidth * clientWidth) / scrollWidth)
  const track = clientWidth - width
  const offset = (scrollLeft / (scrollWidth - clientWidth)) * track
  return { width: `${width}px`, transform: `translateX(${offset}px)` }
})

function onScroll(event: Event): void {
  sync()
  flash()
  emit('scroll', event)
}

function flash(): void {
  active.value = true
  if (hideTimer) window.clearTimeout(hideTimer)
  // 停手 1 秒后收起，与 Element 的观感一致
  hideTimer = window.setTimeout(() => {
    active.value = false
  }, 1000)
}

function onPointerEnter(): void {
  active.value = true
  if (hideTimer) window.clearTimeout(hideTimer)
}

function onPointerLeave(): void {
  if (props.always) return
  active.value = false
}

/* ---------- 拖动 thumb ---------- */

function dragThumb(event: PointerEvent, axis: 'y' | 'x'): void {
  if (event.button !== 0) return
  event.preventDefault()
  const el = wrapRef.value
  if (!el) return

  const handle = event.currentTarget as HTMLElement
  const start = axis === 'y' ? event.clientY : event.clientX
  const startScroll = axis === 'y' ? el.scrollTop : el.scrollLeft
  const track =
    axis === 'y'
      ? el.clientHeight
      : el.clientWidth
  const thumb = axis === 'y' ? (thumbVertical.value ? parseThumb(thumbVertical.value.height) : 0) : parseThumb(thumbHorizontal.value?.width)
  const scrollable = axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
  const movable = track - thumb

  handle.setPointerCapture(event.pointerId)

  const onMove = (moveEvent: PointerEvent): void => {
    const delta = (axis === 'y' ? moveEvent.clientY : moveEvent.clientX) - start
    // 位移 → 滚动量：thumb 走 movable，内容就要走 scrollable
    const next = startScroll + (movable === 0 ? 0 : (delta / movable) * scrollable)
    if (axis === 'y') el.scrollTop = next
    else el.scrollLeft = next
  }

  const onEnd = (): void => {
    handle.releasePointerCapture(event.pointerId)
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onEnd)
    handle.removeEventListener('pointercancel', onEnd)
  }

  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onEnd)
  handle.addEventListener('pointercancel', onEnd)
}

/** 从 CSS 长度串里取数字。thumb 的长度都是组件自己算出来的 px，解析很安全 */
function parseThumb(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/* ---------- 尺寸监听 ---------- */

let observer: ResizeObserver | undefined

function observe(): void {
  if (typeof ResizeObserver === 'undefined') return
  observer?.disconnect()
  observer = new ResizeObserver(sync)
  if (wrapRef.value) observer.observe(wrapRef.value)
  // 内容层也要盯：容器不变、内容变高时只有它触发
  if (props.watchContent && viewRef.value) observer.observe(viewRef.value)
}

onMounted(() => {
  sync()
  observe()
})

onScopeDispose(() => {
  observer?.disconnect()
  observer = undefined
  if (hideTimer) window.clearTimeout(hideTimer)
})

watch(() => props.watchContent, observe)

const rootStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.maxHeight !== undefined) {
    style.maxHeight =
      typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  }
  if (props.maxWidth !== undefined) {
    style.maxWidth =
      typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
  }
  return style
})

const showBars = computed(() => !props.native && (active.value || props.always))

defineExpose<TScrollbarInstance>({
  wrapRef: () => wrapRef.value,
  setScrollTop: (value: number) => {
    if (wrapRef.value) wrapRef.value.scrollTop = value
  },
  setScrollLeft: (value: number) => {
    if (wrapRef.value) wrapRef.value.scrollLeft = value
  },
  update: sync,
})
</script>

<template>
  <div
    ref="rootRef"
    class="t73-scrollbar t73"
    :class="{ 't73-scrollbar--native': native, 't73-scrollbar--active': showBars }"
    :style="rootStyle"
    :aria-label="ariaLabel"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <div ref="wrapRef" class="t73-scrollbar__wrap" @scroll="onScroll">
      <div ref="viewRef" class="t73-scrollbar__view">
        <slot />
      </div>
    </div>

    <template v-if="!native">
      <div
        v-if="overflowY"
        class="t73-scrollbar__bar t73-scrollbar__bar--vertical"
        :class="{ 'is-visible': showBars }"
      >
        <div
          class="t73-scrollbar__thumb"
          :style="thumbVertical"
          role="scrollbar"
          aria-orientation="vertical"
          :aria-hidden="showBars ? undefined : 'true'"
          @pointerdown="dragThumb($event, 'y')"
        />
      </div>

      <div
        v-if="overflowX"
        class="t73-scrollbar__bar t73-scrollbar__bar--horizontal"
        :class="{ 'is-visible': showBars }"
      >
        <div
          class="t73-scrollbar__thumb"
          :style="thumbHorizontal"
          role="scrollbar"
          aria-orientation="horizontal"
          :aria-hidden="showBars ? undefined : 'true'"
          @pointerdown="dragThumb($event, 'x')"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.t73-scrollbar {
  position: relative;
  overflow: hidden;
}

.t73-scrollbar__wrap {
  width: 100%;
  height: 100%;
  max-height: inherit;
  max-width: inherit;
  overflow: auto;
  /* 藏掉原生滚动条，扣掉它的宽度也用同一句话解决：
     自绘 thumb 不会占宽度，所以不必再补 padding-right（`useBodyScrollLock` 里
     那个「滚动条消失导致内容右移」的坑在这里不存在）。 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.t73-scrollbar__wrap::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.t73-scrollbar--native .t73-scrollbar__wrap {
  scrollbar-width: auto;
}

.t73-scrollbar--native .t73-scrollbar__wrap::-webkit-scrollbar {
  width: auto;
  height: auto;
}

.t73-scrollbar__view {
  /* 内容层不做任何约束：它只用来给 ResizeObserver 一个「内容尺寸」的对象 */
  min-width: 0;
}

.t73-scrollbar__bar {
  position: absolute;
  z-index: 1;
  opacity: 0;
  transition: opacity var(--73-transition);
}

.t73-scrollbar__bar.is-visible {
  opacity: 1;
}

.t73-scrollbar__bar--vertical {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}

.t73-scrollbar__bar--horizontal {
  right: 2px;
  bottom: 2px;
  left: 2px;
  height: 6px;
}

.t73-scrollbar__thumb {
  width: 100%;
  height: 100%;
  border-radius: var(--73-radius-pill);
  background: var(--73-scrollbar-thumb);
  cursor: pointer;
  /* 拖动时不要触发原生滚动与文本选择 */
  touch-action: none;
  user-select: none;
  transition: background-color var(--73-transition);
}

.t73-scrollbar__thumb:hover {
  background: var(--73-scrollbar-thumb-hover);
}
</style>
