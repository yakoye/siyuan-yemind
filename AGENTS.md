# YeMind Zen Development Instructions / 开发要求

本文件是 YeMind Zen 的项目级开发入口。所有后续开发以 **v0.6.1** 为当前稳定基线，并结合 `.agents/skills/superpowers-*` 中的 Superpowers skills 执行。

## 1. Baseline / 当前基线

- 插件 ID：`siyuan-yemind-zen`
- 显示名称：`YeMind Zen`
- 当前开发基线：`v0.6.1`
- 不得回退或破坏 v0.5.10 至 v0.6.1 已完成的稳定性修复与交互契约。
- 真实运行环境的最终验收目标为 Windows 上的 SiYuan 3.7.2 桌面端。

必须持续保护以下行为：

1. 诊断自检只能使用独立临时 maps/checkpoints 仓库，不得写入或删除正式导图库数据。
2. Dock 必须等待正式仓库加载完成；恢复标签页必须等待非零尺寸容器；陈旧标签句柄不得阻止重新打开导图。
3. 纯大纲模式不得对隐藏画布调用 `resize()`；返回导图或分屏模式后才可安全调整。
4. 待办复选框仅执行“未完成 ↔ 已完成”；删除待办只能由明确的右键菜单操作触发。
5. 拖动最终结构继续由上游 `MOVE_NODE_TO`、`INSERT_BEFORE`、`INSERT_AFTER` 决定；项目可移植已验证的官方候选几何、稳定器和提示层，但不得建立第二套最终变更、历史或持久化算法。
6. 插件 bootstrap 必须先于可选宿主界面注册启动；单个注册异常不得让正式仓库保持未加载。
7. 大纲文字和结构编辑必须通过上游节点命令完成，不直接改写 `MindMapTree.children`。

## 2. Skill selection / 技能选择

开始任务前先判断适用技能，并读取对应 `SKILL.md`，不要只凭技能名称猜测流程。

- 所有开发任务：`superpowers-using-superpowers`
- 新功能、交互或架构设计：`superpowers-brainstorming`
- 编写实施计划：`superpowers-writing-plans`
- 执行既定计划：优先 `superpowers-subagent-driven-development`；无子代理时使用 `superpowers-executing-plans`
- Bug、测试失败、竞态、偶现问题：`superpowers-systematic-debugging`
- 功能实现和修复：`superpowers-test-driven-development`
- 多个互不相关的问题：`superpowers-dispatching-parallel-agents`
- 开始隔离开发：`superpowers-using-git-worktrees`
- 完成前验证：`superpowers-verification-before-completion`
- 请求或处理代码审查：`superpowers-requesting-code-review`、`superpowers-receiving-code-review`
- 分支收尾：`superpowers-finishing-a-development-branch`
- 新增或修改开发技能：`superpowers-writing-skills`

并非每个任务都要机械运行全部技能；必须使用与当前任务匹配的技能，并遵守其强制步骤。

## 3. Required workflow / 强制流程

### 3.1 明确需求

- 先检查当前源码、文档、测试和最近的实现方式，再提出改动方案。
- 对新功能至少比较 2–3 种可行方案，说明取舍并给出推荐方案。
- 优先沿用现有架构和上游能力，不因局部需求建立重复实现。
- 严格执行 YAGNI：不加入当前需求未使用的“顺手功能”。
- 用户需求已经明确时直接推进，不重复询问；只有会显著改变数据格式、兼容性或架构的歧义才需要确认。

### 3.2 设计与计划

较大改动必须先形成：

- 设计：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- 计划：`docs/superpowers/plans/YYYY-MM-DD-<topic>.md`

计划必须包含：

- 明确目标、架构和技术栈。
- 精确文件路径及修改范围。
- 测试先行步骤。
- 可直接执行的命令及预期结果。
- 小步任务和清晰提交点。
- 不得使用 `TBD`、泛化 TODO 或“稍后处理”等占位说明。

### 3.3 调试

任何 Bug 修复都必须先证明根因：

1. 稳定复现或从真实日志、诊断包中建立证据链。
2. 沿数据流和调用链向上追踪最早出现错误状态的位置。
3. 区分根因、触发条件和表面症状。
4. 先写能失败的回归测试，再做最小修复。
5. 禁止一次混入多个未经证实的猜测性修复。
6. 异步和 UI 时序优先使用条件等待，不用任意固定延时掩盖问题。

### 3.4 TDD

默认执行 RED → GREEN → REFACTOR：

1. 写一个针对需求或 Bug 的最小失败测试。
2. 运行测试，确认它因预期原因失败。
3. 写使测试通过的最小代码。
4. 运行相关测试并确认通过。
5. 在保持全绿的前提下重构。

不得先写实现再补一个天然会通过的测试。不得为了测试方便削弱生产逻辑。

### 3.5 实现与审查

- 优先在独立分支或 worktree 开发，不得未经用户明确同意直接在 `main`/`master` 上实施。
- 每个计划任务完成后先做规格符合性审查，再做代码质量审查。
- 审查意见需要技术验证；不盲从，也不以措辞代替修复。
- 只修改与当前目标相关的代码；发现相邻问题时记录，不擅自扩大范围。
- 文件保持单一职责；只有当前改动直接受益时才做针对性拆分，不进行无关大重构。

## 4. Completion gate / 完成门禁

没有新的命令输出或真实运行证据，不得声称“已修复”“已完成”“全部通过”。

至少运行：

```bash
npm test
npm run check
npm run build
node --check index.js
```

发布 ZIP 还必须验证：

```bash
unzip -t <archive>.zip
```

并对解压后的入口再次运行：

```bash
node --check <extracted-plugin>/index.js
```

验证报告至少列出：

- 测试文件和测试项数量。
- TypeScript 检查结果。
- 生产构建结果和构建模块数。
- 入口语法检查。
- ZIP 完整性及解压后入口检查。
- 依赖审计结果及是否采取升级。
- 当前环境不能完成的真实桌面端验收项目。

UI、标签恢复、拖拽、待办、大纲/分屏切换等真实交互，如果未在用户电脑的 SiYuan 桌面端实际点击验证，必须明确写为“待手工验收”，不得用自动化测试替代并声称已经完成鼠标验收。

## 5. Release and handoff / 发布与交付

- 功能版本号只在用户要求或产品行为发生版本化变化时更新；仅补充开发文档不得伪装成功能版本升级。
- 输出包名称必须包含明确版本和用途，例如：`siyuan-yemind-zen-v0.6.1-dev.zip`。
- 每个版本应提供对应验证报告和必要的诊断分析。
- 完成后附可直接执行的 Git 命令：

```bash
git add .; git commit -m "<准确描述本次修改>"; git push
```

- Commit message 不得使用含糊的 `update`。
- 未经明确要求不得 force-push、删除分支、丢弃工作或清理不属于当前工具创建的 worktree。

更完整的说明见 `docs/superpowers/DEVELOPMENT_REQUIREMENTS.md`。
