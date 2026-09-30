<script setup lang="ts">
/**
 * playground：把每个组件、每档语义色、两套主题都摆出来，用来肉眼比对。
 *
 * 它不是文档站，刻意不做导航与折叠——目的是「一屏看完、切主题时盯着看变化」。
 * 区块按**族**排（基础 / 表单 / 浮层 / 数据 / 反馈），与 `doc/架构.md` 的清单一致，
 * 新加组件时把演示放在对应族里。
 *
 * ## 这个文件本身也是本库的消费方
 *
 * 样式只走 `--73-*`，一处裸色值都没有。所以如果哪天看到 playground 里颜色写死了，
 * 那不是「演示代码无所谓」，是这条约定被破了。
 *
 * ## 类型上的两处约定
 *
 * 1. **表格的单元格作用域里 `row` 是 `unknown`**。列的插槽由列表组件拿着，
 *    而列组件不知道行的类型，所以这里显式转一次（`asRow`）——这正是业务代码
 *    迁移时要写的形状，放在这里是为了让代价可见。
 * 2. **`v-model` 的目标类型要写宽**（`SelectModelValue` / `DatePickerValue`）。
 *    这些控件的 `update:modelValue` 是联合类型，绑到 `string | null` 这种窄类型上
 *    类型检查会拦下来。
 */
import { computed, reactive, ref } from 'vue'
import {
  applyTheme,
  TAlert,
  TButton,
  TCard,
  TCheckbox,
  TCheckboxGroup,
  TDatePicker,
  TDescriptions,
  TDescriptionsItem,
  TDialog,
  TDropdown,
  TDropdownItem,
  TDropdownMenu,
  TEmpty,
  TForm,
  TFormItem,
  TIcon,
  TInput,
  TInputNumber,
  TMessage,
  TMessageBox,
  TOption,
  TOptionGroup,
  TPagination,
  TPopover,
  TRadio,
  TRadioButton,
  TRadioGroup,
  TScrollbar,
  TSelect,
  TSwitch,
  TTable,
  TTableColumn,
  TTag,
  TTooltip,
  type DatePickerRangeValue,
  type DatePickerValue,
  type SelectModelValue,
  type SelectValue,
  type TFormInstance,
  type ThemeName,
  type Tone,
} from '../src'

/* ============ 主题 ============ */

const THEMES: Array<{ value: ThemeName; label: string }> = [
  { value: 'portal', label: 'portal（门户，默认）' },
  { value: 'dev', label: 'dev（开发者）' },
]

const theme = ref<ThemeName>('portal')

function switchTheme(next: ThemeName): void {
  theme.value = next
  applyTheme(next)
}

const TONES: Tone[] = ['accent', 'success', 'warning', 'danger', 'info', 'neutral']
/** 按钮与标签的形状档位不同：标签没有 text 变体。分成两个常量，别共用。 */
const BUTTON_VARIANTS = ['solid', 'outline', 'text'] as const
const TAG_VARIANTS = ['soft', 'outline', 'solid'] as const

/* ============ 基础 ============ */

const loading = ref(false)
function toggleLoading(): void {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
  }, 1500)
}

const dialogOpen = ref(false)
const dialogReason = ref('')

/* ============ 表单 ============ */

const model = reactive({
  name: '',
  email: '',
  password: '',
  confirm: '',
  intro: '',
})

const usedNames = ['admin', 'root']

const rules = {
  name: [
    { required: true, message: '请填写昵称' },
    { min: 2, max: 12, message: '昵称 2–12 个字符' },
    // 异步校验器：返回字符串即错误，返回空即通过（不是回调式，不会忘调 callback）
    {
      trigger: 'blur' as const,
      validator: async (value: unknown) => {
        await new Promise((resolve) => window.setTimeout(resolve, 400))
        return usedNames.includes(String(value)) ? '该昵称已被占用' : undefined
      },
    },
  ],
  email: [
    { required: true, message: '请填写邮箱' },
    { type: 'email' as const },
  ],
  password: [
    { required: true, message: '请设置口令' },
    { min: 8, message: '口令至少 8 位' },
  ],
  confirm: [
    { required: true, message: '请再输入一次' },
    {
      validator: (value: unknown) => (value === model.password ? undefined : '两次输入不一致'),
    },
  ],
}

const form = ref<TFormInstance>()
const result = ref('')

async function submit(): Promise<void> {
  result.value = ''
  // 失败时 resolve false，不 reject，所以不需要 try/catch
  if (!(await form.value?.validate())) return
  result.value = JSON.stringify(model)
}

const single = ref<SelectModelValue>(null)
const multi = ref<SelectModelValue>(['paid'])
const filtered = ref<SelectModelValue>(null)
const grouped = ref<SelectModelValue>(null)
const disabledOption = ref<SelectModelValue>('normal')

const statusOptions = [
  { label: '待审核', value: 'pending_review' },
  { label: '待缴定金', value: 'pending_deposit' },
  { label: '开发中', value: 'in_development', disabled: true },
  { label: '待缴尾款', value: 'pending_final' },
  { label: '已完成', value: 'completed' },
]

const multiValues = computed<SelectValue[]>(() => (Array.isArray(multi.value) ? multi.value : []))

const amount = ref<number | null>(null)
const points = ref<number | null>(10)

const checkAgree = ref(false)
const checkRemote = ref(true)
const checkIndeterminate = ref(true)
const checkGroup = ref<SelectValue[]>(['sms'])

const radio = ref<SelectValue>('IDENTITY_CARD')
const radioButton = ref<SelectValue>('alipay')

const switchValue = ref(true)
const switchSaving = ref(false)

function toggleSwitchSaving(): void {
  switchSaving.value = true
  window.setTimeout(() => {
    switchSaving.value = false
  }, 1200)
}

/**
 * 日期控件的 `v-model` 目标类型必须写宽。
 *
 * `TDatePicker` 的 `update:modelValue` 是 `DatePickerValue | DatePickerRangeValue`
 * （它同时服务单值与区间两种 `type`），绑到 `DatePickerValue` 这种窄类型上类型检查会拦下来。
 * 区间两端要取值时另外算一个 computed —— 直接用 `dateRange[0]` 会因为联合类型里
 * 还有非数组一支而报错。业务代码迁移时也会遇到同样的形状，这里如实写出来。
 */
const date = ref<DatePickerValue | DatePickerRangeValue>(null)
const dateYmd = ref<DatePickerValue | DatePickerRangeValue>(null)
const dateTime = ref<DatePickerValue | DatePickerRangeValue>(null)
const dateRange = ref<DatePickerValue | DatePickerRangeValue>([null, null])

const rangeStart = computed(() => (Array.isArray(dateRange.value) ? dateRange.value[0] : null))
const rangeEnd = computed(() => (Array.isArray(dateRange.value) ? dateRange.value[1] : null))

/* ============ 浮层 ============ */

const dropdownPicked = ref('')
const dropdownSort = ref('latest')
const tooltipOpen = ref(false)
const popoverOpen = ref(false)

/* ============ 数据 ============ */

interface Row {
  id: number
  name: string
  status: string
  amount: number
  updatedAt: string
}

/** 单元格插槽里的 `row` 是 `unknown`：列组件不知道行的类型。这里显式转一次 */
function asRow(row: unknown): Row {
  return row as Row
}

const rows: Row[] = [
  { id: 1, name: '订单号 A-20260930', status: '已完成', amount: 12800, updatedAt: '2026-09-30' },
  { id: 2, name: '订单号 B-20260929', status: '开发中', amount: 4600, updatedAt: '2026-09-29' },
  { id: 3, name: '订单号 C-20260928', status: '待缴尾款', amount: 9210.5, updatedAt: '2026-09-28' },
]

const tableLoading = ref(false)
const tableEmpty = ref(false)

function reloadTable(): void {
  tableLoading.value = true
  window.setTimeout(() => {
    tableLoading.value = false
  }, 900)
}

const page = ref(1)
const pageSize = ref(10)
const total = ref(238)

const longText =
  '这一段刻意写得比较长，用来验证 show-overflow-tooltip 会不会在有限宽度的列里被截断，' +
  '并且把完整内容挂到原生 title 上。'

const bigRows = computed<Row[]>(() =>
  Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    name: `滚动条目 ${index + 1}`,
    status: '已完成',
    amount: 100 + index,
    updatedAt: '2026-09-30',
  })),
)

/* ============ 反馈 ============ */

function toast(type: 'info' | 'success' | 'warning' | 'error'): void {
  const text = { info: '这是一条信息', success: '已保存', warning: '余额不足', error: '请求失败' }[type]
  TMessage[type](text, 2000)
}

function toastClosable(): void {
  TMessage.open({ message: '手动关闭这条提示', type: 'info', duration: 0, closable: true })
}

async function askConfirm(): Promise<void> {
  const ok = await TMessageBox.confirm({
    title: '终止合作',
    content: '终止后定金将按合同约定处理，且不可撤销。',
    confirmText: '确认终止',
    tone: 'danger',
  })
  TMessage[ok ? 'success' : 'info'](ok ? '已终止' : '已取消')
}

async function askAlert(): Promise<void> {
  await TMessageBox.alert({ title: '提示', content: '这是一个只有确定按钮的提示框。' })
}

const alertClosed = ref(false)
</script>

<template>
  <main class="page">
    <header class="page__head">
      <h1>ui_73info playground</h1>
      <p class="page__lead">
        切主题看同一个组件的颜色变化。重点看<strong>成功</strong>与<strong>警示</strong>：
        portal 下是绿与琥珀，dev 下是青与金。表单类控件在任何主题下都能 Tab 到达、
        回车提交。
      </p>
      <div class="theme-switch">
        <TButton
          v-for="item in THEMES"
          :key="item.value"
          size="sm"
          :variant="theme === item.value ? 'solid' : 'outline'"
          tone="accent"
          @click="switchTheme(item.value)"
        >
          {{ item.label }}
        </TButton>
      </div>
    </header>

    <!-- ==================== 基础 ==================== -->

    <TCard title="TButton" description="variant（形状）× tone（语义色）两个轴">
      <div v-for="variant in BUTTON_VARIANTS" :key="variant" class="row">
        <span class="row__label">{{ variant }}</span>
        <TButton v-for="tone in TONES" :key="tone" :variant="variant" :tone="tone">
          {{ tone }}
        </TButton>
      </div>

      <hr class="divider" />

      <div class="row">
        <span class="row__label">尺寸 / 状态</span>
        <TButton variant="solid" tone="accent" size="md">md</TButton>
        <TButton variant="solid" tone="accent" size="sm">sm</TButton>
        <TButton variant="solid" tone="accent" :loading="loading" @click="toggleLoading">
          点我转圈
        </TButton>
        <TButton variant="solid" tone="accent" disabled>禁用</TButton>
        <TButton variant="outline" tone="danger">危险操作</TButton>
        <TButton variant="solid" tone="warning">金额与提示</TButton>
      </div>

      <hr class="divider" />

      <div class="row">
        <span class="row__label">as= 换元素</span>
        <TButton as="a" href="#top" variant="outline">当链接用的按钮</TButton>
      </div>

      <div class="stack">
        <TButton variant="solid" tone="accent" block>撑满宽度（block）</TButton>
      </div>
    </TCard>

    <TCard title="TTag" description="soft（浅底 + 深字，默认）/ outline / solid">
      <div v-for="variant in TAG_VARIANTS" :key="variant" class="row">
        <span class="row__label">{{ variant }}</span>
        <TTag v-for="tone in TONES" :key="tone" :tone="tone" :variant="variant">
          {{ tone }}
        </TTag>
      </div>

      <hr class="divider" />

      <div class="row">
        <span class="row__label">尺寸 / 可关闭</span>
        <TTag tone="accent" size="md">28px</TTag>
        <TTag tone="accent" size="sm">22px</TTag>
        <TTag tone="success" closable>可关闭</TTag>
        <TTag tone="danger" variant="outline" closable>可关闭</TTag>
        <TTag tone="neutral">待处理</TTag>
      </div>
    </TCard>

    <TCard title="TIcon / TEmpty" description="图标取 currentColor；空态不再自带插画">
      <div class="row">
        <span class="row__label">TIcon</span>
        <TIcon :size="16" label="提示">
          <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" /></svg>
        </TIcon>
        <TIcon :size="22" label="加载中" spin>
          <svg viewBox="0 0 16 16">
            <path d="M8 2a6 6 0 106 6" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </TIcon>
        <TButton variant="outline" size="sm">
          <TIcon :size="14"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="currentColor" /></svg></TIcon>
          按钮里的图标跟着文字色
        </TButton>
      </div>

      <hr class="divider" />

      <div class="grid">
        <TEmpty description="还没有记录" />
        <TEmpty description="表格里不带虚线框的形态" variant="plain" />
        <TEmpty size="sm" description="紧凑档">
          <template #description>自定义文案区</template>
        </TEmpty>
      </div>
    </TCard>

    <!-- ==================== 表单 ==================== -->

    <TCard title="TInput" description="单行 / 多行（textarea）/ clearable / showCount / 错误态">
      <div class="grid">
        <TInput v-model="model.name" placeholder="普通输入" />
        <TInput v-model="model.name" placeholder="可清除" clearable />
        <TInput v-model="model.email" placeholder="带计数" :maxlength="30" show-count />
        <TInput model-value="错误态" invalid placeholder="错误态" />
        <TInput model-value="禁用" disabled />
        <TInput v-model="model.name" placeholder="小尺寸" size="sm" />
      </div>

      <hr class="divider" />

      <div class="stack">
        <TInput
          v-model="model.intro"
          type="textarea"
          placeholder="多行：跟着内容长高，到 6 行封顶后内部滚动"
          :maxlength="200"
          show-count
          :autosize="{ minRows: 2, maxRows: 6 }"
        />
        <TInput
          model-value="固定 3 行，可以手动拖右下角"
          type="textarea"
          :autosize="false"
          :rows="3"
          resize="vertical"
        />
      </div>
    </TCard>

    <TCard title="TInputNumber" description="两侧步进按钮 / 精度 / 上下限 / 键盘上下键">
      <div class="grid">
        <TInputNumber v-model="amount" :min="0.01" :max="100000" :precision="2" :step="0.01" placeholder="金额" />
        <TInputNumber v-model="points" :min="0" :max="10000" :precision="0" :step="10" />
        <TInputNumber :model-value="300" :controls="false" placeholder="无步进按钮" />
        <TInputNumber :model-value="5" disabled />
      </div>
    </TCard>

    <TCard title="TSelect" description="单选 / 多选 / 可过滤 / 分组 / 禁用项 / 可清除">
      <div class="grid">
        <TSelect v-model="single" :options="statusOptions" clearable placeholder="单选（数据驱动）" />
        <TSelect
          v-model="disabledOption"
          clearable
          placeholder="含禁用项"
        >
          <TOption value="normal" label="正常可选项" />
          <TOption value="blocked" label="这一项被禁用" disabled />
          <TOption value="another" label="另一项" />
        </TSelect>
        <TSelect v-model="filtered" filterable clearable placeholder="可输入过滤" :options="statusOptions" />
        <TSelect v-model="grouped" clearable placeholder="分组选项">
          <TOptionGroup label="进行中">
            <TOption value="pending_review" label="待审核" />
            <TOption value="in_development" label="开发中" />
          </TOptionGroup>
          <TOptionGroup label="已结束">
            <TOption value="completed" label="已完成" />
            <TOption value="cancelled" label="已取消" />
          </TOptionGroup>
        </TSelect>
        <TSelect v-model="multi" multiple clearable :max-tag-count="2" placeholder="多选，超出折成 +N">
          <TOption v-for="item in statusOptions" :key="item.value" :value="item.value" :label="item.label" />
        </TSelect>
        <TSelect model-value="locked" disabled placeholder="禁用" :options="statusOptions" />
      </div>

      <p class="hint">
        已选：单选 {{ single }}／多选 {{ multiValues.join('、') || '（空）' }}。
        键盘：Tab 到选择器 → ↓ 展开 → ↑↓ 移动高亮 → Enter 选中 → Esc 收起。
      </p>
    </TCard>

    <TCard title="TCheckbox / TRadio / TSwitch">
      <div class="grid">
        <div class="stack">
          <TCheckbox v-model="checkAgree">我已阅读并同意《服务协议》</TCheckbox>
          <TCheckbox v-model="checkRemote" disabled>禁用且已勾选</TCheckbox>
          <TCheckbox v-model="checkIndeterminate" indeterminate>不确定态（全选）</TCheckbox>
        </div>

        <div class="stack">
          <TCheckboxGroup v-model="checkGroup">
            <TCheckbox value="sms">短信</TCheckbox>
            <TCheckbox value="email">邮件</TCheckbox>
            <TCheckbox value="push" disabled>站内（禁用）</TCheckbox>
          </TCheckboxGroup>
          <p class="hint">竖排档：</p>
          <TCheckboxGroup v-model="checkGroup" direction="vertical">
            <TCheckbox value="sms">短信</TCheckbox>
            <TCheckbox value="email">邮件</TCheckbox>
          </TCheckboxGroup>
        </div>

        <div class="stack">
          <TRadioGroup v-model="radio">
            <TRadio value="IDENTITY_CARD">身份证</TRadio>
            <TRadio value="ENTERPRISE">企业认证</TRadio>
            <TRadio value="SOLE_PROPRIETOR" disabled>个体工商户（禁用）</TRadio>
          </TRadioGroup>
          <p class="hint">按钮形态（支付渠道那种）：</p>
          <TRadioGroup v-model="radioButton">
            <TRadioButton value="alipay">支付宝</TRadioButton>
            <TRadioButton value="wechat">微信</TRadioButton>
            <TRadioButton value="balance" disabled>余额（不可用）</TRadioButton>
          </TRadioGroup>
        </div>

        <div class="stack">
          <TSwitch v-model="switchValue" active-text="自动提现已开启" inactive-text="自动提现已关闭" />
          <TSwitch :model-value="false" disabled />
          <TSwitch
            :model-value="switchSaving"
            :loading="switchSaving"
            active-text="提交中不能连点（loading）"
            @update:model-value="toggleSwitchSaving"
          />
          <TSwitch v-model="switchValue" size="sm" />
        </div>
      </div>
    </TCard>

    <TCard title="TDatePicker" description="date / datetime / daterange，格式串与绑定值分开">
      <div class="grid">
        <TDatePicker v-model="date" placeholder="选择日期" />
        <TDatePicker
          v-model="dateYmd"
          value-format="YYYYMMDD"
          format="YYYY-MM-DD"
          placeholder="值绑 YYYYMMDD（实名认证那两处）"
        />
        <TDatePicker v-model="dateTime" type="datetime" placeholder="日期 + 时间" />
        <TDatePicker v-model="dateRange" type="daterange" />
      </div>

      <p class="hint">
        值：date {{ date }}／YYYYMMDD {{ dateYmd }}／datetime {{ dateTime }}／
        range {{ rangeStart }} – {{ rangeEnd }}。
        面板标题可点，往上一层选月、再往上一层选年（选 40 年前的生日不必按 480 次）。
      </p>
    </TCard>

    <TCard title="TForm + TFormItem" description="必填、长度、格式、跨字段、异步校验">
      <TForm ref="form" :model="model" :rules="rules" @submit="submit">
        <TFormItem prop="name" label="昵称" help="试试 admin 或 root，会触发异步校验">
          <TInput v-model="model.name" />
        </TFormItem>

        <TFormItem prop="email" label="邮箱">
          <TInput v-model="model.email" />
        </TFormItem>

        <TFormItem prop="password" label="口令">
          <TInput v-model="model.password" type="password" autocomplete="new-password" />
        </TFormItem>

        <TFormItem prop="confirm" label="确认口令">
          <TInput v-model="model.confirm" type="password" autocomplete="new-password" />
        </TFormItem>

        <!-- 表单里放控件：自动拿到失焦校验、id 关联、错误描边 -->
        <TFormItem label="注册状态" required>
          <div class="stack">
            <TSelect :model-value="single" :options="statusOptions" clearable />
            <TCheckbox v-model="checkAgree">勾选以继续</TCheckbox>
            <TDatePicker v-model="date" placeholder="也支持日期" />
          </div>
        </TFormItem>

        <div class="row">
          <TButton type="submit" variant="solid" tone="accent">提交（会校验）</TButton>
          <TButton variant="outline" @click="form?.resetFields()">重置</TButton>
          <TButton variant="text" @click="form?.clearValidate()">清掉错误提示</TButton>
        </div>

        <p v-if="result" class="result">校验通过：{{ result }}</p>
      </TForm>
    </TCard>

    <!-- ==================== 浮层 ==================== -->

    <TCard
      title="TDialog / TDropdown / TTooltip / TPopover"
      description="焦点陷阱 / Esc 与点遮罩关闭 / 打开时锁背景滚动 / 滚动跟随"
      :padded="false"
    >
      <div class="dialog-demo">
        <div class="row">
          <TButton variant="solid" tone="accent" @click="dialogOpen = true">打开弹窗</TButton>

          <TDropdown @command="(command) => (dropdownPicked = String(command))">
            <TButton variant="outline">操作菜单</TButton>
            <template #dropdown>
              <TDropdownMenu>
                <TDropdownItem command="view">查看详情</TDropdownItem>
                <TDropdownItem command="copy">复制链接</TDropdownItem>
                <TDropdownItem command="disabled" disabled>不可用项</TDropdownItem>
                <TDropdownItem command="terminate" tone="danger" divided>终止合作</TDropdownItem>
              </TDropdownMenu>
            </template>
          </TDropdown>

          <TDropdown trigger="hover" placement="bottom-end">
            <TButton variant="outline">悬停展开 + 当前值打勾</TButton>
            <template #dropdown>
              <TDropdownMenu>
                <TDropdownItem
                  v-for="item in [
                    { command: 'latest', label: '最新发布' },
                    { command: 'like', label: '最多点赞' },
                    { command: 'hot', label: '最热' },
                  ]"
                  :key="item.command"
                  :command="item.command"
                  :active="dropdownSort === item.command"
                  @click="dropdownSort = item.command"
                >
                  {{ item.label }}
                </TDropdownItem>
              </TDropdownMenu>
            </template>
          </TDropdown>

          <TTooltip content="这是原生深底提示，聚焦也能看到（键盘用户靠这条）">
            <TButton variant="outline">悬停/聚焦看提示</TButton>
          </TTooltip>

          <TPopover title="可交互的气泡">
            <TButton variant="outline">打开气泡</TButton>
            <template #content>
              <p class="muted">气泡里可以放按钮与链接，提示（tooltip）里不行。</p>
              <TButton
                variant="solid"
                tone="accent"
                size="sm"
                @click="TMessage.success('气泡里的按钮也点得到')"
              >
                点这里
              </TButton>
            </template>
          </TPopover>

          <TPopover placement="right" trigger="hover">
            <TTag tone="info">右侧气泡</TTag>
            <template #content>以 placement="right" 贴在右侧，空间不足会自动翻转。</template>
          </TPopover>
        </div>

        <p v-if="dialogReason" class="muted">上次关闭原因：{{ dialogReason }}</p>
        <p v-if="dropdownPicked" class="muted">菜单选中：{{ dropdownPicked }}</p>
        <p class="hint">弹窗打开后按 Tab 循环、按 Esc 关闭；关掉后焦点应回到触发它的按钮上。</p>
      </div>
    </TCard>

    <TDialog v-model:open="dialogOpen" title="示例弹窗" @close="dialogReason = $event">
      <p class="muted">正文区域。表单、列表、说明都放这里。</p>
      <TInput v-model="model.name" placeholder="弹窗里的输入框" />
      <template #footer>
        <TButton variant="outline" @click="dialogOpen = false">取消</TButton>
        <TButton variant="solid" tone="accent" @click="dialogOpen = false">确定</TButton>
      </template>
    </TDialog>

    <TCard title="TScrollbar" description="自绘滚动条：内容够长才出现，拖动 thumb 会跟随">
      <TScrollbar max-height="180px" always class="scroll-demo">
        <div class="scroll-demo__list">
          <p v-for="row in bigRows" :key="row.id" class="muted">
            {{ row.name }} —— 内容长到超过 max-height 时右侧才会出现滑块
          </p>
        </div>
      </TScrollbar>

      <p class="hint">
        触屏上建议改传 <code>native</code>：自绘滚动条没有惯性、边缘回弹，
        也不能在滚动时收起地址栏。
      </p>
    </TCard>

    <!-- ==================== 数据 ==================== -->

    <TCard
      title="TTable + TTableColumn"
      description="stripe / border / loading / #empty / 列宽拖拽 / 右侧固定列"
      :padded="false"
    >
      <div class="table-actions">
        <TButton size="sm" variant="outline" @click="reloadTable">模拟加载</TButton>
        <TButton size="sm" variant="outline" @click="tableEmpty = !tableEmpty">
          {{ tableEmpty ? '显示数据' : '显示空态' }}
        </TButton>
      </div>

      <TTable
        :data="tableEmpty ? [] : rows"
        row-key="id"
        stripe
        :border="true"
        :loading="tableLoading"
        aria-label="示例订单表"
      >
        <TTableColumn prop="name" label="标题" min-width="220" show-overflow-tooltip resizable />
        <TTableColumn prop="status" label="状态" width="110" align="center" />
        <TTableColumn prop="amount" label="金额" width="120" align="right" resizable>
          <template #default="{ value }">¥{{ Number(value).toFixed(2) }}</template>
        </TTableColumn>
        <TTableColumn prop="updatedAt" label="更新时间" width="130" />
        <TTableColumn label="操作" width="150" fixed="right" align="right">
          <template #default="{ row }">
            <TButton size="sm" variant="outline" @click="TMessage.info(asRow(row).name)">
              查看
            </TButton>
          </template>
        </TTableColumn>

        <template #empty>
          <TEmpty description="还没有订单，去需求大厅看看" />
        </template>
      </TTable>

      <TTable :data="[{ id: 1, note: longText }]" aria-label="只显示省略号与原生 title">
        <TTableColumn prop="note" label="超长文本（show-overflow-tooltip）" show-overflow-tooltip />
      </TTable>
    </TCard>

    <TCard title="TPagination" description="页码窗口 / 每页条数 / 跳页 / 窄屏降档">
      <div class="stack">
        <TPagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" />
        <TPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :pager-count="5"
          background
          show-size-changer
          show-jumper
        />
        <TPagination :current-page="1" :total="0" :show-total="true" />
      </div>
      <p class="hint">当前第 {{ page }} 页，每页 {{ pageSize }} 条，共 {{ total }} 条。</p>
    </TCard>

    <TCard title="TDescriptions" description="标签列按内容对齐；border 档用 1px 间隙画网格">
      <div class="stack">
        <TDescriptions :column="3" title="合同信息">
          <TDescriptionsItem label="合同编号">HT-2026-0930-001</TDescriptionsItem>
          <TDescriptionsItem label="合同金额">¥12,800.00</TDescriptionsItem>
          <TDescriptionsItem label="签约时间">2026-09-30 14:20</TDescriptionsItem>
          <TDescriptionsItem label="备注" :span="3">
            这一段刻意写得长一些，用来验证跨列与换行。
          </TDescriptionsItem>
        </TDescriptions>
      </div>

      <hr class="divider" />

      <TDescriptions :column="2" border size="sm" direction="vertical">
        <TDescriptionsItem label="定金">¥2,560.00</TDescriptionsItem>
        <TDescriptionsItem label="尾款">¥10,240.00</TDescriptionsItem>
        <TDescriptionsItem label="平台分成比例">20%</TDescriptionsItem>
        <TDescriptionsItem label="分账等待期">7 天</TDescriptionsItem>
      </TDescriptions>
    </TCard>

    <!-- ==================== 反馈 ==================== -->

    <TCard title="TAlert" description="浅底 + 描边；成功与警示在两套主题下不是同一支颜色">
      <div class="stack">
        <TAlert title="这是一条信息提示" tone="info" />
        <TAlert title="保存成功" description="补充说明放在第二行。" tone="success" />
        <TAlert title="余额不足以支付定金" tone="warning" />
        <TAlert title="请求失败" description="订单不存在或已被取消。" tone="danger" closable @close="alertClosed = true" />
        <TAlert title="只有描边、没有浅底的形态" variant="outline" tone="accent" :show-icon="false" />
      </div>
      <p v-if="alertClosed" class="muted">上一条危险提示已被关闭。</p>
    </TCard>

    <TCard title="TMessage / TMessageBox" description="命令式 API，容器由库自己建，只挂一次">
      <div class="row">
        <TButton variant="outline" @click="toast('info')">info</TButton>
        <TButton variant="outline" tone="success" @click="toast('success')">success</TButton>
        <TButton variant="outline" tone="warning" @click="toast('warning')">warning</TButton>
        <TButton variant="outline" tone="danger" @click="toast('error')">error</TButton>
        <TButton variant="outline" @click="toastClosable">不自动消失且有关闭按钮</TButton>
        <TButton variant="solid" tone="danger" @click="askConfirm">确认框（危险）</TButton>
        <TButton variant="solid" tone="accent" @click="askAlert">alert</TButton>
        <TButton variant="text" @click="TMessage.closeAll()">全部关掉</TButton>
      </div>
      <p class="hint">
        连点几次「info」会看到最多同时 5 条，超出挤掉最旧的；
        确认框是模态的，连点两次会排队而不是叠在一起。
      </p>
    </TCard>
  </main>
</template>

<style scoped>
/* playground 自己的排版，颜色全部走令牌——它也是本库的消费方之一 */
.page {
  display: grid;
  gap: 20px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 24px;
  color: var(--73-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  background: var(--73-bg);
  min-height: 100vh;
}

.page__head h1 {
  margin: 0;
  font-size: 24px;
  color: var(--73-ink);
}

.page__lead {
  margin: 8px 0 12px;
  color: var(--73-ink-muted);
  line-height: var(--73-line-height);
}

.theme-switch,
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.row + .row {
  margin-top: 12px;
}

.row__label {
  min-width: 96px;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.stack {
  display: grid;
  gap: 10px;
  align-content: start;
}

.divider {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--73-border-soft);
}

.muted {
  margin: 0;
  color: var(--73-ink-muted);
}

.hint {
  margin: 12px 0 0;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
  line-height: 1.6;
}

.hint code {
  padding: 1px 4px;
  border-radius: var(--73-radius-check);
  background: var(--73-inset);
  font-family: var(--73-font-family-mono);
}

.result {
  margin: 12px 0 0;
  color: var(--73-success-text);
  font-size: var(--73-font-size-sm);
}

.dialog-demo {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 24px;
}

/* 表格区块自带内边距为 0（padded=false），所以工具条要自己留白 */
.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px 12px;
}

.scroll-demo {
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-inner);
  background: var(--73-surface-strong);
}

.scroll-demo__list {
  display: grid;
  gap: 8px;
  padding: 12px 16px;
}

.scroll-demo__list p {
  font-size: var(--73-font-size-sm);
}
</style>
