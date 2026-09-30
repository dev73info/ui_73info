<script setup lang="ts">
/**
 * TFormItem
 *
 * 一个字段的标签、控件、错误提示三件套，并持有这个字段的校验状态。
 *
 * 它**必须放在 `TForm` 里**：没有 `model` 就没有可校验的值。放在外面会直接抛错，
 * 而不是安静地什么都不做——那种失败方式最难排查。
 *
 * ## 校验时机与竞态
 *
 * 规则可以声明 `trigger`。控件通过 `notify('blur' | 'change')` 通知本项，
 * 本项按时机过滤规则；提交时用 `'submit'`。
 *
 * 异步校验器（远程查重这类）会引入竞态：用户快速改两次，第二次先返回、
 * 第一次后返回，界面就会显示已经过期的错误。这里给每次校验发一个自增令牌，
 * 结果回来时令牌对不上就丢弃——**不是防抖，是丢弃过期结果**，两者要一起用才够。
 */
import { computed, inject, onMounted, onScopeDispose, provide, ref, useId } from 'vue'
import type { ComponentSize } from '../../types/common'
import { FORM_CONTEXT, FORM_ITEM_CONTEXT, type FormContext, type FormField, type FormItemContext } from './context'
import type { TFormItemProps } from './types'
import {
  getValueByPath,
  hasRuleForTrigger,
  ruleMatchesTrigger,
  runRules,
  type FieldValidateState,
  type Rules,
  type ValidateTrigger,
} from './validate'

defineOptions({ name: 'TFormItem' })

const props = withDefaults(defineProps<TFormItemProps>(), {
  prop: undefined,
  label: undefined,
  rules: undefined,
  required: undefined,
  help: undefined,
  labelWidth: undefined,
  disabled: false,
  showMessage: true,
})

const injectedForm = inject(FORM_CONTEXT, null)

if (!injectedForm) {
  throw new Error(
    '[ui_73info] TFormItem 必须放在 TForm 内使用：没有 TForm 提供的 model，字段就没有可校验的值。',
  )
}

/**
 * 绑到一个显式的非空类型上。
 *
 * 不能直接在下面的函数里写 `form.model`：`form` 是 `FormContext | null`，
 * 而它被用在了**函数声明**（`doValidate` 等）内部——TS 不会把 `if (!form) throw`
 * 的收窄带进函数体，于是每个引用点都要报「可能为 null」。
 * 换成一个已声明类型的局部常量，收窄问题一次性消失。
 */
const form: FormContext = injectedForm

const rootRef = ref<HTMLElement | null>(null)
const state = ref<FieldValidateState>('')
const errorMessage = ref('')

const inputId = useId()
const errorId = `${inputId}-error`

/** 参与校验的路径。没有它这一项就只做排版，不参与校验（见 `TFormItemProps.prop`） */
const fieldProp = computed(() => props.prop)

/** 表单级规则在前、本项规则在后？不，本项优先——本项写的是更具体的约束。 */
const mergedRules = computed<Rules>(() => {
  const own = props.rules ?? []
  if (!fieldProp.value) return own
  const fromForm = form.rules[fieldProp.value] ?? []
  return own.length > 0 ? [...own, ...fromForm] : fromForm
})

const required = computed(
  () => props.required ?? mergedRules.value.some((rule) => rule.required === true),
)

const disabled = computed(() => props.disabled || form.disabled)
const size = computed<ComponentSize>(() => form.size)
const labelWidthCss = computed(() =>
  typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : props.labelWidth,
)

/** 每次校验一个令牌，用来丢弃过期结果 */
let validationToken = 0

/**
 * 当前是否处于错误态。
 *
 * 单独包成函数是有原因的：`doValidate` 里刚写过 `state.value = 'validating'`，
 * TS 会把 `state.value` 收窄成 `'validating'`，于是后面那句
 * `state.value !== 'error'` 会被判成「两个类型不可能相等」（TS2367）——
 * 编译器看不到 `await` 期间状态已经被别处改过。走一层函数调用，收窄即失效。
 */
function hasError(): boolean {
  return state.value === 'error'
}

async function doValidate(trigger: ValidateTrigger): Promise<boolean> {
  // 没有 `prop` 的纯排版项不参与校验：它没有可校验的值
  if (!fieldProp.value) return true

  const applicable = mergedRules.value.filter((rule) => ruleMatchesTrigger(rule, trigger))

  // 该时机没有规则：既不做校验，也**不清掉已有错误**。
  // 否则一个只在 submit 生效的必填项，会因为一次 blur 把已经标好的红清掉。
  if (applicable.length === 0) return !hasError()

  validationToken += 1
  const token = validationToken
  state.value = 'validating'

  const value = getValueByPath(form.model, fieldProp.value)
  const message = await runRules(value, applicable, { model: form.model, field: fieldProp.value })

  if (token !== validationToken) return !hasError()

  if (message) {
    state.value = 'error'
    errorMessage.value = message
    return false
  }

  state.value = 'success'
  errorMessage.value = ''
  return true
}

function clearValidate(): void {
  // 令牌自增：把还在路上的校验结果一并作废，避免它回来又把错误标上
  validationToken += 1
  state.value = ''
  errorMessage.value = ''
}

function notify(trigger: ValidateTrigger): void {
  if (!hasRuleForTrigger(mergedRules.value, trigger)) return
  void doValidate(trigger)
}

const field: FormField | null = fieldProp.value
  ? {
      prop: fieldProp.value,
      getRules: () => mergedRules.value,
      validate: doValidate,
      clearValidate,
      getElement: () => rootRef.value,
    }
  : null

onMounted(() => {
  if (field) form.addField(field)
})
onScopeDispose(() => {
  if (field) form.removeField(field)
})

provide<FormItemContext>(FORM_ITEM_CONTEXT, {
  inputId,
  errorId,
  state,
  errorMessage,
  required,
  disabled,
  size,
  notify,
})
</script>

<template>
  <div
    ref="rootRef"
    class="t73-form-item"
    :class="{
      't73-form-item--error': state === 'error',
      't73-form-item--validating': state === 'validating',
      't73-form-item--disabled': disabled,
    }"
    :style="labelWidthCss ? { '--t73-form-item-label-width': labelWidthCss } : undefined"
  >
    <label v-if="label" class="t73-form-item__label" :for="inputId">
      <span v-if="required" class="t73-form-item__asterisk" aria-hidden="true">*</span>
      <span v-if="required" class="t73-form-item__sr-only">必填</span>
      {{ label }}
    </label>

    <div class="t73-form-item__body">
      <slot :id="inputId" :state="state" :error-id="errorId" :disabled="disabled" />

      <p v-if="showMessage && state === 'error'" :id="errorId" class="t73-form-item__message">
        {{ errorMessage }}
      </p>
      <p v-else-if="help" class="t73-form-item__help">{{ help }}</p>
    </div>
  </div>
</template>

<style scoped>
.t73-form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.t73-form-item__label {
  display: inline-flex;
  align-items: center;
  width: var(--t73-form-item-label-width, auto);
  margin-bottom: 6px;
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.5;
  color: var(--73-ink-soft);
}

.t73-form-item__asterisk {
  margin-right: 4px;
  color: var(--73-danger);
  line-height: 1;
}

.t73-form-item__body {
  min-width: 0;
}

.t73-form-item__message {
  margin: 6px 0 0;
  font-size: var(--73-font-size-sm);
  line-height: 1.5;
  color: var(--73-danger-text);
}

.t73-form-item__help {
  margin: 6px 0 0;
  font-size: var(--73-font-size-sm);
  line-height: 1.5;
  color: var(--73-ink-muted);
}

.t73-form-item--disabled {
  opacity: 0.72;
}

/* 视觉上藏起来但读屏能读到。不用 display: none —— 那会把内容从无障碍树里摘掉。 */
.t73-form-item__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
