<script setup lang="ts">
/**
 * playground：把每个组件与两套主题都摆出来，用来肉眼比对。
 *
 * 它不是文档站，刻意不做导航与分组折叠——目的是「一屏看完、切主题时盯着看变化」。
 * 每个区块的样式直接写在这里（用令牌），不引进额外样式文件。
 */
import { reactive, ref } from 'vue'
import {
  applyTheme,
  TButton,
  TCard,
  TDialog,
  TForm,
  TFormItem,
  TInput,
  TTag,
  type TFormInstance,
  type ThemeName,
  type Tone,
} from '../src'

/* ---------- 主题 ---------- */

const THEMES: Array<{ value: ThemeName; label: string }> = [
  { value: 'portal', label: 'portal（门户，默认）' },
  { value: 'dev', label: 'dev（开发者）' },
]

const theme = ref<ThemeName>('portal')

function switchTheme(next: ThemeName): void {
  theme.value = next
  applyTheme(next)
}

/* ---------- 组件用到的数据 ---------- */

const TONES: Tone[] = ['accent', 'success', 'warning', 'danger', 'info', 'neutral']
/** 按钮与标签的形状档位不同：标签没有 text 变体。分成两个常量，别共用。 */
const BUTTON_VARIANTS = ['solid', 'outline', 'text'] as const
const TAG_VARIANTS = ['soft', 'outline', 'solid'] as const

const loading = ref(false)
function toggleLoading(): void {
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
  }, 1500)
}

const dialogOpen = ref(false)
const dialogReason = ref('')

/* ---------- 表单 ---------- */

const model = reactive({ name: '', email: '', password: '', confirm: '' })

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
    // 跨字段规则：读得到整份 model
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
</script>

<template>
  <main class="page">
    <header class="page__head">
      <h1>ui_73info playground</h1>
      <p class="page__lead">
        切主题看同一个组件的颜色变化。重点看<strong>成功</strong>与<strong>警示</strong>：
        portal 下是绿与琥珀，dev 下是青与金。
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

    <!-- ============ TButton ============ -->
    <TCard title="TButton" description="variant（形状）× tone（语义色）两个轴">
      <div v-for="variant in BUTTON_VARIANTS" :key="variant" class="row">
        <span class="row__label">{{ variant }}</span>
        <TButton
          v-for="tone in TONES"
          :key="tone"
          :variant="variant"
          :tone="tone"
        >
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

      <hr class="divider" />

      <div class="stack">
        <TButton variant="solid" tone="accent" block>撑满宽度（block）</TButton>
      </div>
    </TCard>

    <!-- ============ TTag ============ -->
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

    <!-- ============ TInput ============ -->
    <TCard title="TInput" description="clearable / showCount / 前缀后缀 / 错误态">
      <div class="grid">
        <TInput v-model="model.name" placeholder="普通输入" />
        <TInput v-model="model.name" placeholder="可清除" clearable />
        <TInput
          v-model="model.email"
          placeholder="带计数"
          :maxlength="30"
          show-count
        />
        <TInput model-value="错误态" invalid placeholder="错误态" />
        <TInput model-value="禁用" disabled />
        <TInput v-model="model.name" placeholder="小尺寸" size="sm" />
      </div>
    </TCard>

    <!-- ============ TCard ============ -->
    <TCard title="TCard" description="卡头 + 操作区 + 页脚；hoverable 会抬升阴影">
      <div class="grid">
        <TCard
          title="内嵌卡片"
          description="说明文字只在承载必要信息时才写"
          hoverable
        >
          <template #actions>
            <TButton size="sm" variant="outline">操作</TButton>
          </template>
          <p class="muted">卡片内容区。</p>
        </TCard>

        <TCard title="无内边距" :padded="false">
          <div class="flush">padded=false：内容自己贴边（表格、列表用）</div>
        </TCard>
      </div>
    </TCard>

    <!-- ============ TForm ============ -->
    <TCard title="TForm + TFormItem" description="必填、长度、格式、跨字段、异步校验">
      <TForm ref="form" :model="model" :rules="rules" @submit="submit">
        <TFormItem prop="name" label="昵称" help="试试 admin 或 root，会触发异步校验">
          <TInput v-model="model.name" />
        </TFormItem>

        <TFormItem prop="email" label="邮箱">
          <TInput v-model="model.email" />
        </TFormItem>

        <TFormItem prop="password" label="口令">
          <TInput v-model="model.password" type="password" />
        </TFormItem>

        <TFormItem prop="confirm" label="确认口令">
          <TInput v-model="model.confirm" type="password" />
        </TFormItem>

        <div class="row">
          <TButton type="submit" variant="solid" tone="accent">提交（会校验）</TButton>
          <TButton variant="outline" @click="form?.resetFields()">重置</TButton>
          <TButton variant="text" @click="form?.clearValidate()">清掉错误提示</TButton>
        </div>

        <p v-if="result" class="result">校验通过：{{ result }}</p>
      </TForm>
    </TCard>

    <!-- ============ TDialog ============ -->
    <TCard
      title="TDialog"
      description="焦点陷阱 / Esc 与点遮罩关闭 / 打开时锁背景滚动"
      :padded="false"
    >
      <div class="dialog-demo">
        <TButton variant="solid" tone="accent" @click="dialogOpen = true">打开弹窗</TButton>
        <span v-if="dialogReason" class="muted">上次关闭原因：{{ dialogReason }}</span>
        <p class="hint">
          打开后按 Tab 循环、按 Esc 关闭，或点弹窗外；关掉后焦点应回到这颗按钮上。
        </p>
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
  max-width: 360px;
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
  margin: 8px 0 0;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
}

.result {
  margin: 12px 0 0;
  color: var(--73-success-text);
  font-size: var(--73-font-size-sm);
}

.flush {
  padding: 24px;
  background: var(--73-inset);
  color: var(--73-ink-muted);
}

.dialog-demo {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 24px;
}
</style>
