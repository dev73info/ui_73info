---
name: ui-73info
description: 在 ui_73info 自研组件库新增或修改组件时使用：令牌驱动、零第三方 UI 依赖、link 消费方联动、类型校验与跨仓契约。
---

# ui_73info 组件库

## 定位

- 自研 UI 组件库，令牌驱动，**零第三方 UI 依赖**——不要引入 Element Plus / Naive UI 或其他组件库。
- 消费方：`../user_client`（link 依赖，改源码 HMR 立刻生效）、`../admin_client`（计划中）。

## 目录

- `src/components/` 组件；`src/primitives/` 基础件；`src/theme/` 设计令牌；
  `src/styles/` 样式；`src/icons/` 图标；`src/types/` 类型
- 入口 `src/index.ts`；本地预览用 `playground/`

## 改组件流程

1. 先用 codegraph 查消费方用法（`codegraph_callers` / `codegraph_impact`）。
2. 改组件；改 props、事件、插槽或样式令牌都算**破坏性改动**。
3. `pnpm type-check`——本库没有 build 步骤，这是唯一校验入口。
4. 到 `../user_client` 跑 `pnpm type-check`：link 依赖下，类型破了宿主会先炸。

## 红线

- 设计令牌与主题变量是**唯一真源**，宿主不要各自复写一套色值。
- 破坏性改动先确认消费方，按需求号跨仓库同名分支一起改。
- 发源码不发构建产物：`package.json` 入口指向源码；`dist/` 不入库。
- 组件注释与文案一律中文；界面文案纪律见根仓 `.claude/rules/ui-copy.md`。
