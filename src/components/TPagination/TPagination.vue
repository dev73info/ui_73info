<script setup lang="ts">
/**
 * TPagination
 *
 * 接替 `<el-pagination>`（user-client 里 21 处）。规格来自 `.dev-pager` 与 `.wb-pager`
 * 两处完全相同的改写（`dev-base.css` / `portal-workbench.css`）：
 *
 * ```css
 * .dev-pager { display: flex; align-items: center; justify-content: space-between;
 *              flex-wrap: wrap; gap: 12px; margin-top: 16px; font-size: 13px;
 *              color: var(--dev-muted); }
 * .dev-pager__size { width: 116px; }
 * .el-pagination { --el-pagination-font-size: 13px; --el-pagination-button-color: var(--dev-ink-soft);
 *                  --el-pagination-button-bg-color: rgba(241,244,251,.9);
 *                  --el-pagination-button-disabled-bg-color: rgba(241,244,251,.62);
 *                  --el-pagination-button-disabled-color: #94a3b8;
 *                  --el-pagination-hover-color: var(--dev-blue); }
 * .el-pagination button, .el-pager li { border-radius: var(--dev-radius-control); }
 * ```
 *
 * 那一处的注释里记着为什么必须改底色：Element 默认是暖灰 `#f5f7fa`，
 * 与体系里的冷灰蓝不同一支，禁用态的翻页按钮因此最容易被看出「这页的灰和别页不一样」。
 *
 * ## 页码窗口算法
 *
 * 条数多的时候不渲染全部页码，只渲染「首 + 一块围绕当前页的连续块 + 尾」，
 * 空档处用省略号。块的位置**被夹在 `[2, pageCount - 1]` 之间**，
 * 所以第 1 页与最后一页附近不会出现「省略号只隔一个数字」的怪相。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 区块 | `layout="prev, pager, next, total, sizes, jumper"` 串 | 显式布尔开关（对照表见 `types.ts`） |
 * | 页码上限 | `pager-count`，偶数时行为未定义 | 向上取到奇数并写清理由 |
 * | 每页条数下拉 | `el-select` 的默认皮肤（32px / 4px 圆角） | 与工具栏控件同档（36px / 10px 圆角） |
 */
import { computed, ref, watch } from 'vue'
import type { ComponentSize } from '../../types/common'
import { TSelect } from '../TSelect'
import type { SelectModelValue } from '../TSelect/types'
import type { TPaginationEmits, TPaginationProps } from './types'

defineOptions({ name: 'TPagination' })

const props = withDefaults(defineProps<TPaginationProps>(), {
  total: 0,
  pageSize: 10,
  currentPage: 1,
  pageSizes: () => [10, 20, 50, 100],
  pagerCount: 7,
  showTotal: true,
  showSizeChanger: false,
  showJumper: false,
  size: 'md',
  disabled: false,
  background: false,
  ariaLabel: '分页',
})

const emit = defineEmits<TPaginationEmits>()

/** 省略号占位。用带前缀的字符串而不是 `null`，模板里做 key 更直观 */
type Gap = 'gap-start' | 'gap-end'
type PageItem = number | Gap

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize))))

/** 页码按钮个数必须为奇数：偶数时「当前页在中间」没有唯一解 */
const pagerCount = computed(() => {
  const raw = Math.max(5, Math.floor(props.pagerCount))
  return raw % 2 === 0 ? raw + 1 : raw
})

const pages = computed<PageItem[]>(() => {
  const count = pageCount.value
  const limit = pagerCount.value
  if (count <= limit) return Array.from({ length: count }, (_, index) => index + 1)

  // 首尾各占一个按钮，中间的连续块就是剩下的容量
  const blockSize = limit - 2
  const half = Math.floor(blockSize / 2)
  // 夹在 [2, count - blockSize]：保证块不压到首页，也不越过末页
  const start = Math.min(Math.max(props.currentPage - half, 2), count - blockSize)
  const end = start + blockSize - 1

  const items: PageItem[] = [1]
  if (start > 2) items.push('gap-start')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < count - 1) items.push('gap-end')
  items.push(count)
  return items
})

/** 总数或每页条数变化后当前页可能越界，这里拉回来并通知调用方 */
watch([pageCount, () => props.currentPage], () => {
  if (props.currentPage > pageCount.value) go(pageCount.value, false)
  else if (props.currentPage < 1) go(1, false)
})

function go(page: number, notify = true): void {
  if (props.disabled) return
  const next = Math.min(Math.max(Math.round(page), 1), pageCount.value)
  if (next === props.currentPage && notify) return
  emit('update:currentPage', next)
  if (notify) {
    emit('current-change', next)
    emit('change', next, props.pageSize)
  }
}

const canPrev = computed(() => !props.disabled && props.currentPage > 1)
const canNext = computed(() => !props.disabled && props.currentPage < pageCount.value)

const sizeOptions = computed(() =>
  props.pageSizes.map((size) => ({ label: `${size} 条/页`, value: size })),
)

const pageSizeModel = computed<SelectModelValue>({
  get: () => props.pageSize,
  set: (value) => {
    const next = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(next) || next === props.pageSize) return
    emit('update:pageSize', next)
    // 每页条数变了以后，原页码大概率越界，统一回到第一页
    emit('size-change', next)
    emit('update:currentPage', 1)
    emit('change', 1, next)
  },
})

/** 页码按钮的点击入口。省略号占位与非法值都在这里被挡掉 */
function goPage(item: PageItem): void {
  if (typeof item !== 'number') return
  go(item)
}

/* --- 跳页输入框 --- */

const jumpText = ref('')

const jumpValue = computed({
  get: () => (jumpText.value === '' ? props.currentPage : jumpText.value),
  set: (value: string | number) => {
    jumpText.value = String(value)
  },
})

function commitJump(): void {
  const parsed = Number.parseInt(String(jumpText.value), 10)
  jumpText.value = ''
  if (!Number.isFinite(parsed)) return
  go(parsed)
}

const classes = computed(() => [
  't73-pagination',
  't73',
  `t73-pagination--${props.size satisfies ComponentSize}`,
  {
    't73-pagination--background': props.background,
    't73-pagination--disabled': props.disabled,
  },
])
</script>

<template>
  <nav :class="classes" :aria-label="ariaLabel">
    <div v-if="showTotal || showSizeChanger" class="t73-pagination__lead">
      <span v-if="showTotal" class="t73-pagination__total">共 {{ total }} 条</span>
      <TSelect
        v-if="showSizeChanger"
        v-model="pageSizeModel"
        class="t73-pagination__size"
        :options="sizeOptions"
        :disabled="disabled"
        aria-label="每页条数"
        :fit-input-width="false"
      />
    </div>

    <ul class="t73-pagination__pages">
      <li>
        <button
          type="button"
          class="t73-pagination__button"
          :disabled="!canPrev"
          aria-label="上一页"
          @click="go(currentPage - 1)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 4l-4 4 4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>

      <li v-for="item in pages" :key="String(item)">
        <span v-if="item === 'gap-start' || item === 'gap-end'" class="t73-pagination__gap">…</span>
        <button
          v-else
          type="button"
          class="t73-pagination__button t73-pagination__page"
          :class="{ 't73-pagination__page--active': item === currentPage }"
          :disabled="disabled"
          :aria-current="item === currentPage ? 'page' : undefined"
          :aria-label="`第 ${item} 页`"
          @click="goPage(item)"
        >
          {{ item }}
        </button>
      </li>

      <li>
        <button
          type="button"
          class="t73-pagination__button"
          :disabled="!canNext"
          aria-label="下一页"
          @click="go(currentPage + 1)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>

      <li v-if="showJumper" class="t73-pagination__jumper">
        <span class="t73-pagination__jumper-label">前往</span>
        <input
          v-model="jumpValue"
          class="t73-pagination__jumper-input"
          type="text"
          inputmode="numeric"
          aria-label="跳转到页码"
          :disabled="disabled"
          @keydown.enter.prevent="commitJump"
          @blur="commitJump"
        />
        <span class="t73-pagination__jumper-label">页</span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.t73-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  color: var(--73-ink-muted);
}

.t73-pagination--disabled {
  cursor: not-allowed;
}

.t73-pagination__lead {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.t73-pagination__total {
  /* 计数用等宽数字，翻页时数字不跳 */
  font-variant-numeric: tabular-nums;
}

/* 每页条数下拉固定 116px（`.dev-pager__size`），免得随选项文字变宽 */
.t73-pagination__size {
  width: 116px;
}

.t73-pagination__pages {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.t73-pagination__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--73-control-height);
  height: var(--73-control-height);
  padding: 0 6px;
  border: none;
  border-radius: var(--73-radius-control);
  background: transparent;
  color: var(--73-ink-soft);
  font-family: inherit;
  font-size: var(--73-font-size-body);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

.t73-pagination--sm .t73-pagination__button {
  min-width: var(--73-control-height-sm);
  height: var(--73-control-height-sm);
}

.t73-pagination__button svg {
  width: 16px;
  height: 16px;
}

/* 带底色档：与工具栏控件同底色（冷灰蓝，不是 Element 的暖灰 #f5f7fa） */
.t73-pagination--background .t73-pagination__button {
  background: var(--73-pager-button-bg);
}

.t73-pagination--background .t73-pagination__button:hover:not(:disabled) {
  color: var(--73-accent);
}

.t73-pagination__button:hover:not(:disabled) {
  color: var(--73-accent);
}

.t73-pagination__button:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-pagination__button:disabled {
  color: var(--73-ink-placeholder);
  cursor: not-allowed;
}

.t73-pagination--background .t73-pagination__button:disabled {
  background: var(--73-pager-button-disabled-bg);
}

.t73-pagination__page--active,
.t73-pagination--background .t73-pagination__page--active {
  color: var(--73-accent);
  font-weight: var(--73-font-weight-bold);
}

.t73-pagination__gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--73-control-height);
  height: var(--73-control-height);
  color: var(--73-ink-placeholder);
}

.t73-pagination__jumper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.t73-pagination__jumper-label {
  white-space: nowrap;
}

.t73-pagination__jumper-input {
  width: 56px;
  height: var(--73-control-height);
  padding: 0 8px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  color: var(--73-ink);
  font-family: inherit;
  font-size: var(--73-font-size-body);
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
}

.t73-pagination__jumper-input:focus {
  border-color: var(--73-accent);
  box-shadow: var(--73-focus-ring);
}

/* 触屏档：按钮缩到 32px、间距收紧（`.dev-responsive.css` 的 `.dev-pager .el-pagination`），
   同时把「共 N 条」与每页条数藏掉——窄屏上它们会把页码挤到第二行。 */
@media (max-width: 640px) {
  .t73-pagination {
    justify-content: center;
  }

  .t73-pagination__lead {
    display: none;
  }

  .t73-pagination__pages {
    gap: 2px;
  }

  .t73-pagination__button,
  .t73-pagination__gap {
    min-width: 32px;
    height: 32px;
  }
}
</style>
