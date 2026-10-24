/**
 * 锁定背景滚动（headless，无样式）
 *
 * 弹窗打开时背景不该跟着滚。看似简单，两个坑：
 *
 * 1. **引用计数。** 两层弹窗叠在一起时，第一层关闭不该解锁——里面那层还开着。
 *    所以只记计数，归零才真正解锁。
 * 2. **滚动条补偿。** `overflow: hidden` 会让页面滚动条消失，内容整体右移约 15px，
 *    看起来像「打开弹窗时页面抖了一下」。锁定时补上等宽 `padding-right`，解锁时还原。
 *
 * ## 本项目的实际情况
 *
 * user_client 的滚动发生在 `App.vue` 外壳的 `el-scrollbar` 上（见设计规范第五节），
 * `body` 本身通常不滚，`innerWidth - clientWidth` 算出来是 0，补偿那一步自然不生效。
 * 逻辑仍然保留：即便当前用不上，换宿主或页面变长时它就该起作用。
 */

import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

/** 关掉滚动条补偿时的属性值 */
function releaseScrollbarCompensation(): void {
  document.body.style.overflow = savedOverflow
  document.body.style.paddingRight = savedPaddingRight
}

/**
 * 锁定 `document.body` 的滚动，返回解锁函数（幂等，重复调用只解锁一次）。
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}

  const body = document.body
  if (lockCount === 0) {
    savedOverflow = body.style.overflow
    savedPaddingRight = body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
  }

  lockCount += 1

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount -= 1
    if (lockCount === 0) releaseScrollbarCompensation()
  }
}

/**
 * `active` 为真时锁背景滚动。组件卸载时自动解锁，不会因为「弹窗被直接销毁、
 * 没走关闭流程」而把页面永久锁死。
 */
export function useBodyScrollLock(active: MaybeRefOrGetter<boolean>): void {
  let release: (() => void) | null = null

  watch(
    () => toValue(active),
    (shouldLock) => {
      if (shouldLock) {
        release ??= lockBodyScroll()
      } else {
        release?.()
        release = null
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    release?.()
    release = null
  })
}
