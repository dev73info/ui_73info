# CLAUDE.md（子工程执行版）——ui_73info

本仓是 73Info 工作区（Windows `E:\dev73info` / WSL `/home/banch/dev73info`）11 个子工程仓库之一，
根目录本身是只放文档与配置的第 12 个仓库。跨工程约定以根仓 `../CLAUDE.md`、`../AGENTS.md`
与 `../docs/开发流程/AI开发标准流程.md` 为准，**冲突以标准文档为准**；本文件只写本仓的差异项。

## 一、开工（在本仓动手之前，包括「只是看看 / 改个文案」）

1. `pwd` 确认在本仓目录；一次只处理一个仓库，不跨仓批量提交。
2. `git fetch origin` → `git status --porcelain` → `git branch --show-current`。
3. 当前分支落在 `master` 上先停下：新建分支，不要在稳定线上直接改。
4. 基线落后 `origin/master` 就先 `git switch master && git pull --ff-only`，
   **不要从过期基线开工**（已 squash 合入的改动会以另一个 SHA 再带一遍）。
5. 分支命名 `feat/<需求号>-<简称>` / `fix/…` / `chore/…` / `docs/…`；跨仓库需求在各仓用**同名**分支，
   一条分支只做一件事。

## 二、提交

- `git add <具体文件>`，禁止 `git add -A` / `git add .`；提交前 `git diff --cached --check`。
- Conventional Commits 前缀 + 中文简述，一个提交一件事（重构与功能分开、格式化与逻辑分开）。
- 提交信息里**不写任何工具或 agent 署名**（无 `Co-Authored-By` / `Signed-off-by` / `Generated with`）。
- 绝不提交：`dist/`、`coverage/`、`node_modules/`、`*.tsbuildinfo`、`*.local`、`.cursorignore`。
  本库**发源码不发构建产物**，`package.json` 的入口指向源码，别改回去。

## 三、PR

- **本仓例外：只有 `master`，没有 `dev`。** PR 的 base 写 `master`，并在 PR 正文里注明这条例外。
- 标题 `[需求号] 类型(范围): 中文简述`；正文按 `../docs/开发流程/PR模板.md` 五段填，
  写到仓库外的临时文件再 `--body-file` 传。
- 门禁没跑绿前开 Draft；绿了、描述填全再请求审阅。
- `master` 只能经 PR 合入：不直推、不 `--force`，作者不自审自合，无审阅结论不合并。
- 改 PR 的目标分支、改别人的分支之前**先问用户**。

## 四、本仓门禁

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 改到 `src/**` | `pnpm type-check` | `vue-tsc --build`，**本库没有 build 步骤，这是唯一校验入口** |
| 联动验证 | 在 `../user-client` 跑 `pnpm type-check` | 宿主以 link 依赖消费本库，改源码 HMR 立刻生效，类型破了宿主会先炸 |
| 本地启动 | `pnpm dev` | 5180，playground（端口在 `vite.config` 里固定） |

## 五、本仓事实与红线

- 定位：自研 UI 组件库，令牌驱动、**零第三方 UI 依赖**。不要为了省事引入 Element Plus / Naive UI
  或别的组件库——它的意义就是替换 `user-client` 里的 Element Plus。
- 消费方：`../user-client`（link 依赖，正在按耦合度分批迁入）、`../admin_client` 计划中。
  **破坏性改动（改 props、事件、插槽或样式令牌）必须先确认消费方**，并按需求号跨仓库同名分支一起改。
- 设计令牌与主题变量是该库的唯一真源，宿主不要各自复写一套色值。
- 组件注释与文案一律中文；界面文案纪律见根仓规则 `ui-copy`。
