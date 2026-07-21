# YeMind Superpowers Development Requirements

## Purpose

本项目将上传的 Superpowers skills 纳入 YeMind 的开发流程，用于约束需求分析、设计、计划、实现、调试、测试、审查、验证和分支收尾。项目级强制入口为根目录 `AGENTS.md`；完整 skills 位于 `.agents/skills/`。

## Current baseline

当前稳定开发基线是 **YeMind v0.8.0**。后续开发必须从该版本继续，不得回退到旧版或重新引入已经解决的问题。

v0.5.10 至 v0.5.13 的受保护能力包括：

- 诊断生命周期与正式导图库隔离。
- Dock 加载时序和恢复标签页挂载保护。
- 纯大纲模式零尺寸画布保护。
- 待办点击只切换完成状态，删除必须显式触发。
- 拖动预览可使用已验证的官方矩形候选、稳定器和贝塞尔提示；最终结构、历史、布局和持久化仍由上游负责。
- 正式 bootstrap 先于宿主界面注册，单个注册失败必须隔离和诊断。
- 分屏/大纲编辑只通过上游节点命令修改文字和结构。
- 大纲提交前置、结构命令串行、IME 保护和 UID/selection 焦点恢复。
- 分屏比例持久化，以及拖拽逐帧候选、60 ms/3 帧稳定器和贝塞尔父节点提示。
- 拖动旧入线隐藏/恢复、80 px 子尾区、8/22 px 子目标留白、44/72 px 同级通道，以及 pending 候选连续逐帧稳定。

## Workflow map

| 阶段 | 必用或优先使用的 skill | 输出 |
| --- | --- | --- |
| 任务入口 | `superpowers-using-superpowers` | 识别适用技能 |
| 新功能设计 | `superpowers-brainstorming` | 经确认的设计文档 |
| 实施拆解 | `superpowers-writing-plans` | 可执行计划 |
| 隔离环境 | `superpowers-using-git-worktrees` | 独立分支/worktree |
| 实现 | `superpowers-test-driven-development` | RED-GREEN-REFACTOR 代码和测试 |
| 计划执行 | `superpowers-subagent-driven-development` 或 `superpowers-executing-plans` | 分任务实现和检查点 |
| 故障修复 | `superpowers-systematic-debugging` | 根因证据、失败测试、最小修复 |
| 多域问题 | `superpowers-dispatching-parallel-agents` | 互不冲突的并行调查 |
| 代码审查 | `superpowers-requesting-code-review`、`superpowers-receiving-code-review` | 规格审查、质量审查、修正记录 |
| 完成门禁 | `superpowers-verification-before-completion` | 最新验证证据 |
| 分支收尾 | `superpowers-finishing-a-development-branch` | 合并、PR、保留或丢弃的明确选择 |
| 技能维护 | `superpowers-writing-skills` | 经测试的可复用 skill |

## Project-specific adaptations

原始 skills 是通用方法，本项目采用以下适配：

1. **明确需求不重复确认。** 用户已给出清楚的功能和验收标准时直接实施；仅在数据兼容性、持久化格式或架构方向存在实质冲突时提出单个高价值问题。
2. **上游优先。** `simple-mind-map` 已提供的选择、拖拽、剪贴板、布局和节点能力，应优先继承或轻量扩展，不复制完整实现。
3. **真实数据隔离。** 诊断、自检、迁移演练和测试数据不得进入用户正式 maps/checkpoints 仓库。
4. **条件等待优先。** 思源标签恢复、容器可见性和画布尺寸等异步条件使用可取消、有限次的条件等待，不使用任意长 `setTimeout` 作为正确性保证。
5. **自动化与手工验收分开。** 自动化测试证明逻辑契约；Windows SiYuan 3.7.3 中的真实鼠标操作证明宿主集成。两者不得互相冒充。
6. **最小兼容性风险。** 不为清除低/中等级依赖告警而盲目升级底层导图库；升级必须有独立兼容性计划和回归证明。

## Required artifacts for substantial changes

较大功能或稳定性修复应形成：

```text
docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
docs/superpowers/plans/YYYY-MM-DD-<topic>.md
docs/verification-vX.Y.Z.md
```

真实诊断包驱动的修复可额外形成：

```text
docs/diagnostic-analysis-YYYY-MM-DD.md
```

设计文档描述“为什么和做什么”；计划描述“按哪些文件和测试步骤实施”；验证报告只陈述实际执行过的结果。

## Verification baseline

每次代码交付至少执行：

```bash
npm test
npm run check
npm run build
node --check index.js
```

生成 ZIP 后执行：

```bash
unzip -t <archive>.zip
node --check <extracted-plugin>/index.js
```

对 UI 和宿主集成改动继续执行手工清单：

1. 启动思源后，在不运行诊断的情况下确认全部现有导图出现。
2. 逐个打开导图，验证恢复标签页与重复打开。
3. 运行诊断，确认正式导图数量不增不减。
4. 执行导图 → 大纲 → 分屏 → 导图切换。
5. 验证待办完成、取消完成和右键删除。
6. 验证拖动贝塞尔虚线平滑跟随稳定目标父节点，快速越过节点边界时不抖动，且最终结构与上游行为一致。
7. 验证大纲中文输入、Enter/Shift+Enter、Tab/Shift+Tab、删除、折叠展开和分屏比例拖动。

## Source of truth

发生规则冲突时采用以下优先级：

1. 用户在当前任务中的明确要求。
2. 根目录 `AGENTS.md` 的 YeMind 项目约束。
3. 对应 Superpowers `SKILL.md` 的通用流程。
4. 既有项目惯例和历史文档。

不得用通用流程覆盖用户明确决定，也不得用历史惯例规避当前的安全、数据完整性和验证门禁。
