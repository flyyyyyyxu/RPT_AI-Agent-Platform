# Agent 基建平台 · 前端框架原型

本阶段提供全局导航、设计规范样板页、4 个 Agent 的演示数据，以及「内部制度问答助手」的基础能力完整主路径：新建、配置、调试、评测、发布、监控和回退。在此基础上叠加了 10 项生产骨架能力（见下文），全部为前端交互 + mock 数据。

在本目录运行 `npm install`、`npm run build`。构建完成后，直接打开 `dist/index.html`；页面通过 Hash 路由切换，刷新不会请求服务端。`npm run dev` 可用于本地开发。

## 代码结构

```
src/
├─ data/          mock 数据。唯一入口 data/index.ts；base/ 按功能拆分，scenarios/ 按剧本 A / B / C 拆分
├─ core/          与界面无关的状态、规则和取数
│  ├─ store/      演示状态（DemoProvider）与按领域分组的操作（actions/：版本、发布、运营配置、知识库、剧本）
│  ├─ rules/      版本与线上指向、生命周期、上线门槛与就绪检查、演示时钟、diff
│  ├─ data-access/scenarioData.ts   统一取数，演示剧本在这里替换数据
│  └─ hooks/
├─ shared/        跨页面复用：components/（按钮、徽章、卡片、能力卡片、开关、告警条…）和 styles/（设计变量、基础样式、通用组件样式）
├─ features/      一个功能一个文件夹：页面、专用组件、专用样式
│  └─ shell / directory / create / build / evaluation / release / monitor / trace / settings / library / playbook / design-system / placeholder
└─ types/domain.ts
```

- 依赖方向：features → shared → core → data → types，只允许从左往右引用；功能之间尽量不互相引用，例外是公共外壳 `features/shell` 和剧本锁定 `features/playbook/playbooks`。
- 样式：`main.tsx` 先引入 `shared/styles/base.css`、`components.css`，各页面在自己的文件里引入本页样式，打包后仍内联进单个 HTML。只引用 `shared/styles/tokens.ts` 的设计变量。

## 检查脚本

首次使用前运行 `npx playwright install chromium`。脚本直接打开 `dist/index.html`，先 `npm run build`。

- `npm run smoke`：三条演示剧本从头走到尾，加上已修复问题的回归检查。
- `npm run snapshot`：记录基准截图（主要页面 × 1440 / 390 宽 × 两种能力视图，另含弹窗、剧本中途等交互状态）。
- `npm run snapshot:compare`：重新截图并与基准逐像素比对，列出有差异的截图。改样式前先记录基准，改完再比对。截图保存在 `scripts/.snapshots/`（不进仓库）。

## 版本模型

- 每个版本都是不可修改的快照（模型、Prompt、步骤、工具、知识版本、输出格式）。只有候选版本（草稿 / 待发布）可以编辑。
- 线上、历史版本只读；要修改时在构建页「基于 vX 新建草稿」。
- 候选版本需依次完成：保存配置 → 调试 → 至少一个评测集，才能发布。保存了新的修改后，调试和评测结果会失效。例外：依赖一键升级、剧本的「代我修正」由平台代为保存，并用第一条预设问题自动跑一次冒烟调试（调试台可见结果），评测仍需手动运行。
- 发布和回退都只改变生产环境的「线上指向」。只有曾经上线过的版本可以回退，草稿、待发布和灰度中的版本不能回退。
- 同一时间只允许一个实验：有灰度或影子运行时，不能发布新版本，也不能从版本历史回退，需先放量完成或回退实验。
- 所有操作时间使用演示时钟：从 2026-09-29 12:00 开始，每次操作前进 1 分钟；读取存档时对齐到最晚的操作时间。知识条目的生效 / 失效状态也按演示时钟计算。
- 相关逻辑在 `src/core/rules/versions.ts`、`src/core/rules/clock.ts` 和 `src/core/store/actions/`。

## 数据与存储

页面数据为 mock，放在 `src/data/`，4 个 Agent 各有自己的配置、调试预设、评测集和监控数据；页面只从 `src/data/index.ts` 引用。演示进度保存在浏览器存储中（键名 `agent-platform-demo-v4`）。数据结构变化时要同步提升 `src/core/store/storage.ts` 里的版本号，旧存档会被自动丢弃。页面出错时只替换内容区，可点「重置演示」恢复。Google Fonts 无法访问时会使用系统字体。

## 生产骨架叠加层

- 顶栏「能力视图」可切换「只看基础能力 / 显示生产骨架」。基础视图下所有带骨架编号的卡片不渲染，生命周期导航隐藏「Trace 与 bad case」，发布只按基础条件判断。
- 所有骨架能力都用 `src/shared/components/Capability.tsx` 的 `Capability` 包裹：自带骨架编号徽章与 MVP / 二期徽章；二期整块置灰不可点；`hero` 属性给「四个主角」加靛蓝左色条和「差异化 · 主角 N」标签。
- 各页新增：构建页（① 依赖锁定、版本 diff）、评测页（② 隔离环境、上线门槛、批量评测）、发布与实验页（③④⑤ 生产就绪检查、发布策略、流量指向、AB 报告、放量与回退）、Trace 与 bad case 页（⑥⑧）、Agent 设置页（⑦⑨⑩）、能力组件库（① 知识与工具版本）。
- 门槛与就绪检查逻辑在 `src/core/rules/gate.ts`；灰度、放量、回退操作在 `src/core/store/actions/releaseActions.ts`；骨架 mock 按功能放在 `src/data/base/`。
- 推荐演示路径：内部制度问答助手 v4 构建保存 → 调试 → 评测 → 发布页看就绪检查（缺告警与审批）→ 设置页开启告警 → 提交并模拟审批 → 比例灰度发布 → 放量 → 回退到 v3（显示耗时）。穿搭灵感可直接演示「回退到 v12」，生态守护 v8 演示门槛阻断。

## 演示剧本

- 工作台顶部有三条可点击的剧本：A 穿搭灵感（快）、B 生态守护（准）、C 售后答疑（稳）。点「开始剧本」后，对应 Agent 换成剧本的初始数据（其它 Agent 不变），并跳到第一步。
- 右下角「演示步骤」浮层显示第几步、下一步点哪里（页面目标元素会虚线高亮），关键步骤标注「这一步体现了主角 X」。完成页面上的真实操作后自动进入下一步；B 改 Prompt、C 填知识生效时间两步提供「代我修正 / 代我填写」。
- 页面和组件不变，只换数据：剧本 Agent 使用 `pa / pb / pc` 数据配置，页面统一经 `src/core/data-access/scenarioData.ts` 取数；剧本步骤定义在 `src/features/playbook/playbooks.ts`，浮层与入口在 `src/features/playbook/`，剧本 mock 在 `src/data/scenarios/`。
- 顺带补齐的通用能力：依赖提醒可一键「创建候选版本并升级依赖」；知识库可「基于 vX 新建版本」并编辑每条知识的生效 / 失效时间；影子运行只需门槛、护栏、负责人三项，全量发布前再审批。
- 剧本进行中会锁定容易走偏的入口（构建页「新建草稿」、发布策略、知识库「放弃草稿」），按钮下方说明原因。开始剧本前页内确认会覆盖该 Agent 的演示进度；退出剧本时可选择保留数据或恢复原始数据。
- 存档 schema 为 v4（键名 `agent-platform-demo-v4`）。「重置演示」会同时清除剧本进度。所有数字均为演示数据。
