# CLAUDE.md（子工程执行版）——ui_73info

本仓是 73Info 工作区（Windows `E:\dev73info` / WSL `/home/banch/dev73info`）11 个子工程仓库之一，
根目录本身是只放文档与配置的第 12 个仓库。跨工程约定以根仓 `../CLAUDE.md`、`../AGENTS.md`
与 `../docs/开发流程/AI开发标准流程.md` 为准，**冲突以标准文档为准**；本文件只写本仓的差异项。

## 〇、Claude 资产与权威顺序

- 本仓的 Claude 资产**都入库、开会话自动加载**：`.claude/rules/`（规则四份）与 `.claude/skills/`（技能三个：
  `gate` 跑门禁、`branch-and-merge` 开分支到合并一条龙、`ui-73info` 组件库规范）。新增规则放 `.claude/rules/`，
  新增技能放 `.claude/skills/<name>/SKILL.md`；`.claude/` 下只入库这两处。
- 权威顺序：根仓 `AGENTS.md`（事实）+ 根仓 `docs/开发流程/AI开发标准流程.md`（流程）> 本文件 >
  `.claude/rules/` > `doc/规则/`（详细正文）。冲突时以更具体、更新的一方为准。
- 跨仓约定的**正本在根仓 `.claude/rules/`**；本仓 `.claude/rules/` 是执行版副本，改跨仓规则时根仓与 6 个前端仓一起改。

## 一、开工（在本仓动手之前，包括「只是看看 / 改个文案」）

> **CodeGraph 硬规则**：每次修改代码前先用 codegraph 定位符号与影响面
> （`codegraph_context` / `codegraph_search` → `codegraph_callers` / `codegraph_impact`），
> 详见 `.claude/rules/codegraph.md`。不要跳过索引直接 grep。

1. **先读** `.claude/rules/dev-workflow.md` 与 `.claude/rules/code-quality.md`；改界面文案还要看 `ui-copy.md`。
2. `pwd` 确认在本仓目录；一次只处理一个仓库，不跨仓批量提交。
3. `git fetch origin` → `git status --porcelain` → `git branch --show-current`。
4. 当前分支落在 `develop` / `master` 上先停下：**新建分支**，不要在集成分支上直接改。
5. 基线不是最新 `origin/develop` 就先 `git switch develop && git pull --ff-only`。
   **不要从过期基线开工**：已 squash 合入的改动会以另一个 SHA 再带一遍，PR 会平白多出别人的文件。
6. 分支从最新 `develop` 切（`hotfix/` 从 `master` 切），命名 `feat/<需求号>-<简称>` / `fix/…` /
   `chore/…` / `docs/…`；跨仓库需求在各仓用**同名**分支，一条分支只做一件事。
7. 做完的走向固定：分支 → 门禁绿 → PR(**base=`develop`**) → squash 合并；
   **日常 PR 不要求独立审阅**，独立审阅只在打 tag 发版前做（命令与检查单见
   `.claude/skills/branch-and-merge/SKILL.md`）。执行代理永远不给自己写 `PASS`。

## 二、提交

- `git add <具体文件>`，禁止 `git add -A` / `git add .`；提交前 `git diff --cached --check`。
- Conventional Commits 前缀 + 中文简述，一个提交一件事（重构与功能分开、格式化与逻辑分开）。
- 提交信息里**不写任何工具或 agent 署名**（无 `Co-Authored-By` / `Signed-off-by` / `Generated with`）。
- 绝不提交：`dist/`、`coverage/`、`node_modules/`、`*.tsbuildinfo`、`*.local`、`.cursorignore`。
  本库**发源码不发构建产物**，`package.json` 的入口指向源码，别改回去。

## 三、PR

- PR 的 base 写 `develop`；`hotfix/` 写 `master`。
- 标题 `[需求号] 类型(范围): 中文简述`；正文按 `../docs/开发流程/PR模板.md` 五段填，
  写到仓库外的临时文件再 `--body-file` 传。
- 门禁没跑绿前开 Draft；绿了、描述填全即可合并（日常 PR 不要求独立审阅，审阅在打 tag 前做）。
- `develop` / `master` 只能经 PR 合入：不直推、不 `--force`。合并看门禁，**审阅看发版**：
  日常 PR 门禁绿即可合；打 tag 前必须有一轮独立审阅并给出 `PASS`。
- 推稳定线、改 PR 的目标分支、改别人的分支之前**先问用户**。

## 四、本仓门禁

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 改到 `src/**` | `pnpm type-check` | `vue-tsc --build`，**本库没有 build 步骤，这是唯一校验入口** |
| 联动验证 | 在 `../user_client` 跑 `pnpm type-check` | 宿主以 link 依赖消费本库，改源码 HMR 立刻生效，类型破了宿主会先炸 |
| 本地启动 | `pnpm dev` | 5180，playground（端口在 `vite.config` 里固定） |

## 五、本仓事实与红线

- 定位：自研 UI 组件库，令牌驱动、**零第三方 UI 依赖**。不要为了省事引入 Element Plus / Naive UI
  或别的组件库——它的意义就是替换 `user_client` 里的 Element Plus。
- 消费方：`../user_client`（link 依赖，正在按耦合度分批迁入）、`../admin_client` 计划中。
  **破坏性改动（改 props、事件、插槽或样式令牌）必须先确认消费方**，并按需求号跨仓库同名分支一起改。
- 设计令牌与主题变量是该库的唯一真源，宿主不要各自复写一套色值。
- 组件注释与文案一律中文；界面文案纪律见根仓 `.claude/rules/ui-copy.md`。

## 跨仓需求

根仓 `scripts/`（含 `xrepo`）已于 2026-10-22 删除，**没有跨仓编排脚本可用了**。
涉及多个子工程时手工按仓操作：各仓从 `develop` 建**同名分支** → 各自门禁绿 → 各自开 PR(base=`develop`) →
正文里互相贴链接；合并顺序按依赖来（先后端、再消费方前端）。根仓文档改动只 commit（根仓无远程、永不 push）。
