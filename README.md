# ui_73info

73Info 自研 UI 组件库：**令牌驱动的多主题组件，零第三方 UI 依赖**。为替换
`user-client` 里的 Element Plus 而建，架构上预留其他三个前端。

- 一套主题 = 一组 `--73-*` 令牌的取值，包在 `[data-73-theme='…']` 下。
  **切主题就是在 `<html>` 上换一个属性，纯 CSS，不重渲染、不重新注入样式表。**
- 三层结构：令牌层（唯一色值来源）→ 行为原语层（无样式的交互）→ 组件层（只消费令牌）。
  组件层**禁止出现裸色值**——这条约束就是分层存在的理由。

## 结构

```
src/
  index.ts            出口：组件、命令式 API、主题运行时、行为原语、公共类型
  styles/
    tokens.css        令牌层，唯一的色值来源
    reset.css         样式底座，只作用于 .t73 类名空间
    alias.css         迁移兼容层（旧变量名 → --73-*），按需引入
    index.css         样式入口（只含 tokens + reset），对外是 ui_73info/styles.css
  primitives/         行为原语：定位引擎、浮层开合、列表导航、焦点陷阱、关闭行为、滚动锁定、稳定 id
  components/         组件，每个一个目录
  theme/              主题运行时
playground/           pnpm dev 起的预览页（端口 5180）
```

细节见 [doc/README.md](doc/README.md)。

## 用法

本库**发源码不发构建产物**，通过路径依赖被消费（与 `tags-wasm` 同一模式，
但 link 的是源码而不是 `pkg/`，这样改了组件宿主的 HMR 立刻生效、不必重建）：

```bash
# 在 user-client 里
pnpm add ui_73info@link:../ui_73info
```

```ts
// main.ts —— 顺序有语义，令牌要早于页面样式
import 'ui_73info/styles.css'
import { applyTheme, TMessage } from 'ui_73info'
import './styles/user.css'

applyTheme('dev')            // 或 'portal'
TMessage.success('已保存')    // 命令式提示，不占模板
```

> 子路径**必须带 `.css` 后缀**。宿主的 `vite/client` 类型里只有
> `declare module '*.css'`，它按后缀匹配；少写后缀 Vite 能跑，但 `vue-tsc` 会报找不到模块。

迁移期还需要旧变量名的桥接（前置条件见该文件顶部）：

```ts
import 'ui_73info/alias.css'
```

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 装依赖（只需要一次） |
| `pnpm dev` | 起 playground（组件预览页），端口 **5180** |
| `pnpm type-check` | `vue-tsc --build`。**本库没有 build 步骤**，这是唯一的校验入口 |

## 当前进度

已实现：

- **令牌层**：`portal` / `dev` 两套主题，加上与主题无关的尺寸、圆角、字号、层级档位。
- **行为原语**：`useFloating`（定位引擎）、`useOverlay`（开合）、`useListbox`（列表键盘导航）、
  `useFocusTrap`、`useDismissable`、`useBodyScrollLock`、`useId`。
- **组件（23 个目录 / 32 个模板组件）**：
  - 基础 `TButton` `TIcon` `TTag` `TCard` `TEmpty`
  - 表单 `TInput`（含多行）`TInputNumber` `TSelect` `TOption` `TOptionGroup`
    `TCheckbox` `TCheckboxGroup` `TRadio` `TRadioGroup` `TRadioButton`
    `TSwitch` `TDatePicker` `TForm` `TFormItem`
  - 浮层 `TDialog` `TDropdown` `TDropdownMenu` `TDropdownItem` `TTooltip` `TPopover` `TScrollbar`
  - 数据 `TTable` `TTableColumn` `TPagination` `TDescriptions` `TDescriptionsItem`
  - 反馈 `TAlert`
- **命令式 API**：`TMessage`（右下角色块提示，可堆叠、样子对齐宿主既有 toast）与
  `TMessageBox`（模态确认框，带队列）。
- `pnpm type-check` 通过；`pnpm dev`（端口 5180）可打开 playground 逐项人工验证。

**`user-client` 里实际渲染过的 Element 组件，除两处外全部有对应物**：
`el-select-v2` 的虚拟化（改为普通列表渲染）与 `ElConfigProvider`（没有 locale 层）。

**已接入 `user-client`**（2026-09-30）：link 依赖与 Vite 分块、样式引入顺序、
按路由切主题（门户 / 开发者）都已完成并实测。迁移按耦合度分批推进：样板页 `BadgeCenterView`
与**第一批 15 个页面**（`<el-*>` 只有 button / icon / tag 的那些）已迁完，
`user-client` 里还剩 37 个文件带 `<el-*>`、约 950 处标签。

未实现：`user-client` 其余页面尚未迁移（逐页推进，顺序见
[doc/开发指南.md](doc/开发指南.md) 第六节）；自动化视觉测试还没有；
`alias.css` 这个旧变量名桥接层**刻意还没引**（理由见
[doc/架构.md](doc/架构.md) 第七节）；其余差距清单见同文件第八节。
