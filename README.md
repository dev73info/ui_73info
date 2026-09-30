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
  index.ts            出口：组件、主题运行时、行为原语、公共类型
  styles/
    tokens.css        令牌层，唯一的色值来源
    reset.css         样式底座，只作用于 .t73 类名空间
    alias.css         迁移兼容层（旧变量名 → --73-*），按需引入
    index.css         样式入口（只含 tokens + reset），对外是 ui_73info/styles.css
  primitives/         行为原语：焦点陷阱、关闭行为、滚动锁定、稳定 id
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
import { applyTheme } from 'ui_73info'
import './styles/user.css'

applyTheme('dev') // 或 'portal'
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

已实现：令牌层（`portal` / `dev` 两套主题）、行为原语、
`TButton` / `TIcon` / `TTag` / `TCard` / `TInput` / `TForm`+`TFormItem` / `TDialog`，
以及 `pnpm dev` 可打开的 playground。

未实现：`TSelect`（需要独立的定位引擎，安排在第二批）、`TTable` / `TPagination` /
`TDropdown` / `TDatePicker` 等；`user-client` 尚未接入本库。清单与理由见
[doc/架构.md](doc/架构.md) 最后一节。
