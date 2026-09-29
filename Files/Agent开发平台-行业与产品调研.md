# Agent 开发平台：行业与产品调研

> 用途：为「公司统一 Agent 基建平台」PRD 提供行业调研素材，后续按需拆入 PRD。
> 视角：我们是**公司内部平台**，用户是技术水平不一的各业务团队（以 A 社区穿搭灵感 Agent、B 生态守护 Agent、C 电商售后答疑 Agent 为种子）。
> 资料截至 2026 年 9 月，来自官方文档和公告、行业报告、媒体报道。标注「未核实」的内容来自二手信息，引用前建议再确认。

---

## 0. 核心结论

1. **构建已经不是瓶颈，从试点到生产才是。** LangChain 2025 年底的调研显示，质量是 Agent 上线的第一大阻碍（33%）；Gartner 预测到 2027 年底超过 40% 的 Agent 项目会被取消；MIT 的报告指出，多数生成式 AI 系统「不保留反馈、不随时间改进」。三组数据指向同一个结论：平台的价值在于**让 Agent 安全上线、持续变好**，而不是让搭建再快一点。
2. **行业重心在 2025–2026 年从「搭建」转向「生产闭环」。** AWS 在 AgentCore 之后补了评测和策略管控；微软、谷歌、Salesforce 都在发布会上主推评测、追踪和治理；字节把扣子罗盘（Coze Loop）单独做成产品；腾讯 ADP 4.0 主打「建管一体」。
3. **构建方式在变：可视化画布正让位于「自然语言 + 代码」。** OpenAI 宣布 2026 年 11 月 30 日下线可视化 Agent Builder，引导用户转向 Agents SDK；微软、谷歌、阿里都把「用自然语言描述就能生成 Agent」作为入口。画布不再是护城河。
4. **能力单元正在标准化。** MCP（工具连接）、A2A（Agent 间协作）、Agent Skills（技能包）都已成为开放标准，并由中立基金会或多家厂商共同推动。平台沉淀的工具、知识、技能按标准封装，才能被跨团队复用。
5. **Agent 数量越来越多之后，治理成为新刚需。** 微软 Agent 365 做统一视图，蚂蚁 Agentar 2.0 提出「智能体多了，没人定规矩」，AWS 用 Policy 在网关层拦截工具调用。谁建的、谁负责、能调什么、花了多少钱，都要能管住。
6. **外部产品普遍薄弱、却恰好是 A/B/C 刚需的能力有：** 流量级灰度加业务指标 AB、强制上线门槛、批量和在线统一执行、知识版本随 Agent 版本走、多团队资源隔离和成本分摊，以及和公司内容安全、实验平台、标注平台的打通。这些正是内部平台的差异化空间。
7. **建议的路线：** 自研「生产闭环 + 治理」这个核心；构建层和部分组件借鉴或复用开源（Dify、Coze Studio / Loop、Langfuse 等）；运行时、实验、标注、安全复用公司已有基建。对外产品是「参照物」，不是「替代品」。

---

## 1. 调研视角与方法

### 1.1 看竞品时我们关心什么

外部平台的目标是卖给尽可能多的客户，我们的目标是让公司内任意业务团队「零启动成本构建、生产级上线、持续迭代、沉淀复用」。所以看竞品不比「谁功能多」，而是看四个问题：

| 问题 | 对应题目要求 | 对应作答文档 |
|---|---|---|
| Q1 怎样降低**构建**门槛？ | 开箱即用、零启动成本 | 基础能力 · 模块一 |
| Q2 怎样保障**上线和迭代**的质量与安全？ | 生产环境稳定运行、持续迭代 | 骨架 ①–⑥ · 模块二、三 |
| Q3 怎样保障**运行**稳定、可追溯？ | 高并发、批量、波峰、可回溯 | 骨架 ⑦–⑨ · 模块四、五 |
| Q4 怎样支持**多团队**共用、治理、复用？ | 减少重复投入、沉淀共性能力 | 骨架 ⑩ · 模块六 |

### 1.2 调研范围

- **国内**：字节（扣子 / 扣子罗盘 / HiAgent）、阿里云百炼、百度千帆、腾讯云智能体开发平台 ADP、蚂蚁数科 Agentar、Dify（开源）
- **国外**：AWS Bedrock AgentCore、Microsoft Foundry 与 Copilot Studio、Google Gemini Enterprise Agent Platform（原 Vertex AI）、OpenAI AgentKit、Salesforce Agentforce、Sierra、LangSmith、Langfuse、n8n
- **企业内部平台**：LinkedIn、Uber（和本题「公司基建」的定位最接近）
- **相关赛道**：传统低代码、工作流自动化、AI 编程（vibe coding）

---

## 2. 行业现状

### 2.1 发展脉络

| 阶段 | 特征 | 代表事件 |
|---|---|---|
| **2023：Prompt 与聊天机器人** | 以写 Prompt、做对话机器人为主；开发框架起步 | GPTs；LangChain 等框架流行 |
| **2024：低代码 LLM 应用平台爆发** | 「搭 Bot」：可视化工作流 + 知识库（RAG）+ 插件，业务人员也能做 | 扣子（2024 年 2 月上线）、Dify、FastGPT、百炼、千帆 AppBuilder、腾讯元器 |
| **2025：「Agent 元年」，标准化和工程化** | 协议标准化；代码级 SDK 回归；云厂商推出 Agent 运行时；开源平台出现 | OpenAI Agents SDK（3 月）；Google 发布 A2A（4 月），6 月捐给 Linux 基金会；扣子开源 Coze Studio 和 Coze Loop（7 月）；AWS 推出 AgentCore；OpenAI 发布 AgentKit（10 月）；Linux 基金会成立 Agentic AI Foundation，接收 MCP（12 月）；Anthropic 开放 Agent Skills 标准（12 月） |
| **2026：生产化与治理** | 重心转向评测、观测、策略、治理；通用型 Agent 兴起；平台开始分化 | 扣子 2.0 转向职场通用 Agent（1 月）；AgentCore Evaluations 正式发布（3 月）；Claude Managed Agents 公测（4 月）；Google 将 Vertex AI 升级为 Gemini Enterprise Agent Platform（4 月）；OpenClaw 开源爆火，大厂跟进（春季）；Salesforce Testing Center 增强版正式发布（5 月）；微软 Build 2026 主推托管 Agent 与治理（6 月）；OpenAI 宣布下线 Agent Builder 与 Evals（11 月 30 日生效）；蚂蚁 Agentar 2.0（7 月） |

### 2.2 市场与数据

**国内市场规模（IDC，2026 年 6 月发布）**
- 2025 年中国智能体开发平台**私有化**市场规模 17.5 亿元。前五名依次是火山引擎、腾讯云、阿里云、蚂蚁数科、中国电信人工智能公司。
- IDC 判断：私有化市场已进入早期成熟，公有云市场仍在试点和早期商业化阶段；企业采购最看重**生产环境的稳定表现、数据治理、知识工程，以及业务经验能否沉淀**。
- 对我们的意义：大企业更倾向把 Agent 平台部署在自己环境里，看重的正是「生产稳定 + 治理 + 沉淀」，这和本题的平台定位一致。

**生产落地现状（LangChain《State of Agent Engineering》，2025 年 11–12 月，1,340 份问卷）**

| 指标 | 数据 |
|---|---|
| 已有 Agent 上线生产 | 57%（万人以上企业 67%） |
| 上线的第一大阻碍 | **质量 33%**；延迟 20%；2,000 人以上企业中，安全占 24.9% |
| 使用可观测工具 | 89%（已上线团队 94%） |
| 做离线评测 / 线上评测 | **52.4% / 37.3%** |
| 评测方式 | 人工评审 59.8%；LLM 评委 53.3% |
| 同时使用多个模型 | 超过 75% |
| 最多的使用场景 | 客服 26.5%；研究与数据分析 24.4%；内部流程自动化 18% |

解读：可观测已经普及，但**评测，尤其是线上评测，明显落后**。这说明「能看到」和「能判断好坏、能拦住退化」之间还有很大缺口。客服是第一大场景，和 C 团队需求一致。

**风险与预期（Gartner，2025 年 6 月）**
- 预测到 2027 年底，**超过 40% 的 Agent 项目会被取消**，原因是成本上升、业务价值不清、风险控制不足。
- 「Agent washing」现象：大量厂商把原有的助手、RPA、聊天机器人重新包装成 Agent，Gartner 估计真正具备 Agent 能力的厂商只有约 130 家。
- 到 2028 年，33% 的企业软件会内置 Agent 能力（2024 年不足 1%），15% 的日常工作决策会由 Agent 自主完成。

**价值兑现（MIT NANDA《The GenAI Divide》，2025 年 8 月）**
- 95% 的组织没有从生成式 AI 投入中获得可衡量的回报。
- 根因是「学习鸿沟」：多数系统**不保留反馈、不适应上下文、不随时间改进**。
- 对我们的意义：平台必须内置「线上反馈 → 归因 → 回流评测 → 迭代」的闭环（即作答文档中骨架 ⑥），否则 Agent 上线后只会原地踏步。

**资本信号**

| 公司 | 事件 | 说明 |
|---|---|---|
| n8n | 2026 年 5 月估值 52 亿美元（SAP 投资），较 2025 年 10 月翻倍 | 工作流自动化转向 Agent 编排；1,400+ 企业客户 |
| Dify | 2026 年 3 月融资 3,000 万美元，估值 1.8 亿美元 | 开源 LLM 应用平台；部署在 140 万台以上机器，280+ 企业使用商业版；定位「从实验走向生产」 |
| Lovable | 2026 年 2 月 ARR 突破 4 亿美元 | AI 编程（vibe coding）增长极快，冲击传统低代码 |

### 2.3 六个关键趋势

**T1 构建门槛继续下降，形态从「拖拽画布」转向「自然语言 + 代码」**
- 微软 Copilot Studio 把「任何人都能把意图变成 Agent」列为 2026 年第一项能力；Google Gemini Enterprise 的 Agent Designer 面向不会写代码的员工；阿里百炼提供「自然语言配置（零代码）」的智能体模式。
- 另一端，OpenAI 宣布下线可视化 Agent Builder，引导用户转向 Agents SDK（代码）或 ChatGPT 里的 Workspace Agents（自然语言）。有评论总结：「真正持久的是代码层的 SDK，而不是架在上面的可视化编辑器」。
- **启示**：拖拽画布研发成本高，价值却在被两端挤压。一期用「表单 + 自然语言生成配置 + 代码节点」覆盖大多数需求，画布放二期，这个判断有外部依据。

**T2 能力单元标准化：MCP、A2A、Skills**
- MCP 已由 Linux 基金会旗下的 Agentic AI Foundation 托管（2025 年 12 月成立，AWS、Google、微软、OpenAI、Anthropic 等为创始成员）。
- A2A 由 Google 于 2025 年 4 月发布，6 月捐给 Linux 基金会，用于不同厂商的 Agent 相互发现和协作。
- Agent Skills 于 2025 年 12 月成为开放标准，VS Code、GitHub、Codex、Cursor 等都已采用。国内扣子 2.0 推出技能商店；腾讯 ADP 4.0 内置 130+ 企业级技能，按企业、团队、个人三级管理。
- **启示**：工具中心和知识库在设计接口时就兼容 MCP 等标准，一期对内使用，二期再开放跨团队市场。复用的颗粒度可以从「整个 Agent」细化到「技能 / 工具 / 知识库」。

**T3 竞争重心转向生产闭环（AgentOps / LLMOps）**
- AWS AgentCore：2025 年 12 月新增 Evaluations（内置评估器、自定义评估器、线上抽样评测）和 Policy（拦截工具调用）；Evaluations 于 2026 年 3 月正式发布。
- Microsoft Foundry：追踪和评测不绑定开发框架。Salesforce：Testing Center 支持多轮对话测试和自定义评分，A/B Testing API 可以在版本间分流、推全量（试点中）。
- 字节把扣子罗盘单独做成产品，负责 Prompt 版本、评测、全链路观测；腾讯 ADP 4.0 主打「建管一体」。
- 客服 Agent 公司 Sierra 提出 Agent 开发生命周期（ADLC）：每次发布都是包含代码、Prompt、模型版本、不可变知识库的快照，可以立即回滚；标注过的线上对话会变成回归测试。
- **启示**：印证作答文档的主张，平台卖的是「一条让 Agent 安全上线、持续变好的生产闭环」。

**T4 托管运行时成为基础设施**
- AgentCore Runtime、Foundry 托管 Agent、Claude Managed Agents（2026 年 4 月公测）都在提供：沙箱隔离、长时间运行的会话、状态保持、权限和执行追踪。
- **启示**：我们复用公司的算力和推理集群，但平台要有统一的运行时抽象，支持在线、批量、多轮会话三种执行模式，并按团队隔离资源。

**T5 Agent 越来越多之后，治理成为刚需**
- 微软 Agent 365 提供覆盖所有 Agent 的统一视图；它的建议是「让业务团队建 Agent，IT 用统一的治理策略守住边界」。
- 蚂蚁 Agentar 2.0 把「治理」列为四大能力之一；AgentCore 提供 Identity 和 Policy；Google 给每个 Agent 分配身份并接入 IAM。
- **启示**：平台需要一个 **Agent 目录**：每个 Agent 有负责人、有等级（原型 / 生产）、有权限范围、有成本归属。作答文档里的「团队与权限」「审计」「配额与成本」可以在这个概念下串起来。

**T6 两极分化：通用个人 Agent 与生产级业务 Agent**
- 一极是面向个人的通用 Agent：扣子 2.0 转向「帮助职场人」，推出技能、长期计划、办公能力；2026 年春天开源项目 OpenClaw 爆火，腾讯 WorkBuddy、字节 ArkClaw、阿里 Copaw、智谱 AutoClaw 等相继跟进；OpenAI 也把自然语言场景引导到 ChatGPT Workspace Agents。
- 另一极是嵌入业务流程的生产级 Agent：客服、审核、推荐、风控，追求稳定、可度量、可追溯。
- **启示**：本题三个 Agent 都属于后一极。平台的核心设计要围绕生产级 Agent，但通用 Agent 的体验会拉高内部用户对「上手速度」的期望，所以构建体验不能太重。

### 2.4 低代码开发的现状

| 类别 | 代表 | 现状 | 和我们的关系 |
|---|---|---|---|
| **传统低代码** | OutSystems、Mendix、Power Apps；国内宜搭、简道云、明道云 | 面向表单、流程类业务应用。据二手转引的 Gartner 预测，市场仍保持两位数增长（未核实）；正在叠加自然语言生成应用、嵌入 Agent | 可以借鉴它们的「平民开发者 + IT 管控」治理模式 |
| **工作流自动化** | Zapier、Make、n8n | 从「连接 SaaS」演进为「Agent 编排」；n8n 估值一年内翻倍 | 适合确定性流程，和 Agent 互补 |
| **LLM 应用低代码** | 扣子、Dify、FastGPT、百炼、千帆、腾讯 ADP | 2024 年爆发，2026 年分化：扣子转向职场通用 Agent；Dify 转向企业生产化；云厂商和自家模型、云资源绑定 | **最直接的参照对象** |
| **AI 编程（vibe coding）** | Lovable、Bolt、v0、Cursor 等 | 用自然语言直接生成完整应用，增长极快 | 绕开了低代码「表达能力有上限」的问题，但质量、维护、治理问题更突出 |

**低代码的固有局限，以及在 LLM 场景下被放大的问题**

| 局限 | 传统低代码 | 在 Agent 场景下 |
|---|---|---|
| 表达能力有上限 | 复杂逻辑做不了 | A 每周迭代推荐策略，很快碰到上限 |
| 调试难 | 看不到内部执行 | LLM 本身不确定，更需要逐步追踪 |
| 版本与协作弱 | 改了就生效，难以对比 | 连「改了什么、效果变了多少」都说不清 |
| 性能不可控 | 难以针对性优化 | A 百万级调用、对延迟敏感 |
| 厂商锁定 | 难以迁移 | 模型迭代快，锁定单一厂商的风险更高（OpenAI 下线 Agent Builder 就是例子） |
| **效果不确定**（新增） | — | 同样的配置换一个输入就可能出错，**必须靠评测才能判断能否上线** |

**结论**：低代码适合快速做原型、覆盖标准场景；生产级 Agent 需要「**低代码入口 + 代码逃生口 + 统一的发布流水线**」。两种构建方式最终都要进入同一条「评测 → 发布 → 观测 → 回退」的管道。

---

## 3. 竞品图谱

### 3.1 按层次和用户划分

| 层次 | 解决什么 | 国外代表 | 国内代表 | 主要用户 |
|---|---|---|---|---|
| **L1 运行时与基础设施** | 模型接入、托管运行、沙箱、身份、网关 | AWS AgentCore、Foundry Agent Service、Gemini Enterprise Agent Platform、Claude Managed Agents | 火山方舟、阿里云百炼的模型服务 | 平台工程师 |
| **L2 开发框架 / SDK** | 用代码编排 Agent | OpenAI Agents SDK、Google ADK、LangGraph、Claude Agent SDK | 各家的 SDK | 开发者 |
| **L3 构建平台（低代码 / 零代码）** | 可视化或自然语言搭建 | Copilot Studio、Gemini Agent Designer、n8n、（OpenAI Agent Builder，即将下线） | 扣子、Dify、百炼、千帆、腾讯 ADP、HiAgent、Agentar | 业务人员、产品经理、开发者 |
| **L4 评测与观测（LLMOps）** | Prompt 版本、评测、追踪、标注 | LangSmith、Langfuse、Braintrust、Arize | 扣子罗盘（开源） | 开发者、算法、质量 |
| **L5 垂直企业 Agent 方案** | 面向特定业务的开箱方案 | Salesforce Agentforce、Sierra、Decagon | 蚂蚁 Agentar（金融）、各类客服方案 | 业务运营 |
| **L6 企业内部平台** | 公司自建统一基建 | LinkedIn、Uber | 各大厂内部平台（公开信息少） | 内部各业务团队 |

**我们的定位**：属于 L6，横跨 L1–L4。面向业务方提供 L3 的易用性，平台内部提供 L1 和 L4 的生产能力，同时吸收 L5 在具体场景（客服、审核）上的最佳实践。

### 3.2 定位象限（作者判断）

横轴：构建方式偏「低代码」还是偏「代码」；纵轴：生产闭环（评测、发布、观测、治理）做得浅还是深。

| | **偏低代码 / 零代码** | **偏代码 / 基础设施** |
|---|---|---|
| **生产闭环深** | Salesforce Agentforce、Sierra、腾讯 ADP 4.0、蚂蚁 Agentar 2.0、Copilot Studio（依托 Agent 365） | AWS AgentCore、Microsoft Foundry、Gemini Enterprise Agent Platform、LangSmith、LinkedIn / Uber 内部平台 |
| **生产闭环浅** | 扣子（个人版）、Dify 社区版、FastGPT、（OpenAI Agent Builder） | 纯开发框架（LangGraph、Agents SDK、ADK 本身） |

**我们的目标位置**：左上，也就是「构建像低代码一样简单，生产闭环像基础设施一样扎实」。外部产品里同时做到这两点的，大多是绑定自家生态的方案（Salesforce、微软），或者面向私有化的企业平台（腾讯、蚂蚁、火山）。

---

## 4. 重点竞品拆解

### 4.1 国内

#### 字节：扣子 / 扣子罗盘 / HiAgent
- **定位**：扣子面向个人和开发者（2024 年 2 月上线，2026 年 1 月升级 2.0，转向「帮助职场人」，推出 Agent Skills、Agent Plan、Agent Coding、Agent Office）；HiAgent 面向企业私有化（2026 年 6 月 FORCE 大会发布 3.0，细节未核实）。
- **生产化**：2025 年 7 月以 Apache 2.0 开源 Coze Studio（构建）和 **Coze Loop（扣子罗盘）**。后者专门负责 Prompt 编写、调试和版本管理；评测（评测集、评估器、实验对比）；全链路 Trace（从用户输入到 Prompt 解析、模型调用、工具执行）。
- **启示**：「构建」和「生产闭环」拆成两个产品，印证作答文档的两层结构（基础能力 / 生产骨架）。Coze Loop 开源，一期可以参考它的评测和 Trace 数据模型。

#### 阿里云百炼
- **定位**：模型服务加应用构建一体。提供三种构建方式：智能体（自然语言配置，零代码）、工作流（可视化节点编排）、高代码（Python）。
- **生产化**：有应用评测和自动评测模块，支持多渠道发布。
- **启示**：按用户类型分层提供构建方式，同一平台覆盖业务人员和开发者，这是「开箱即用」和「表达能力」之间的一种平衡。

#### 百度千帆（AppBuilder / Agent 开发平台）
- **生产化亮点**：2025 年 5 月上线**批量任务**：用户自定义数据集跑批并下载结果，还能用裁判大模型按自定义规则批量评测。
- **启示**：直接对应 B 团队的「海量批量 + 严格验证」。说明批量执行和批量评测可以共用同一套能力，也佐证批量任务应放一期。

#### 腾讯云智能体开发平台 ADP（原知识引擎）
- **定位**：企业级，4.0 主打「建管一体」。
- **能力**：知识检索；支持 RAG、工作流、多 Agent 多种开发方式；130+ 企业级技能，按企业、团队、个人三级管理；AgentOps 治理（代码分析、数据访问控制、网络策略、依赖白名单）；一键发布到 API、SDK、微信、企业通讯工具等渠道；支持工作流模式和「Claw 模式」双引擎分流（标准任务走工作流，复杂判断走自主 Agent）。以上信息来自腾讯云开发者社区文章。
- **启示**：① 资产分级治理（企业、团队、个人），可以直接借鉴到二期的资产市场；② 「确定性流程走工作流、复杂判断走自主 Agent」的双模式，对应 B（规则明确）和 A（开放生成）的差异。

#### 蚂蚁数科 Agentar
- **定位**：金融级企业智能体平台。在 IDC 2025 年私有化市场排名第四，是非云厂商中的第一。2026 年 7 月 WAIC 发布 2.0。
- **能力**：评测、运营、治理、模板四大能力；预置 200 个岗位级「数字专家」模板；已落地 300 多个金融行业智能体；接入 100 多个金融 MCP 服务。
- **启示**：高准确、高合规场景（类似 B）的平台，会把**评测和治理**放在和构建同等重要的位置；「岗位模板」是开箱即用的一种做法，对应作答文档里的场景模板。

#### Dify（开源）
- **定位**：开源 LLM 应用平台，定位「从实验走向生产」。2026 年 3 月融资 3,000 万美元。
- **能力**：可视化工作流、RAG、插件生态、Prompt 管理；支持私有化部署。
- **局限**：版本管理只支持对话流和工作流；「回滚」是把历史版本载入草稿再重新发布，**做不到一键切换线上版本**；观测依赖接入 Langfuse 等第三方工具。
- **启示**：构建层可以作为二次开发的基础或参照，但生产闭环（灰度、强制门槛、分钟级回退）需要自己补。

### 4.2 国外

#### AWS Bedrock AgentCore
- **定位**：「积木式」Agent 基础设施，不限开发框架和模型。
- **组件**：Runtime（托管运行，支持双向流式）、Memory（含情景记忆）、Gateway（工具接入）、Identity、Observability、**Policy**（在网关层拦截工具调用，用 Cedar 策略语言或自然语言定义权限）、**Evaluations**（内置正确性、有用性、工具选择准确性、安全性等评估器；支持自定义评估器；可以对线上流量**按比例抽样评测**，结果汇入 CloudWatch）。
- **启示**：① 组件化，业务方按需组合；② 护栏放在网关统一执行，不依赖每个 Agent 自己实现；③ 线上抽样评测是连接「离线评测」和「bad case 闭环」的关键，可以作为二期能力。

#### Microsoft：Foundry Agent Service + Copilot Studio + Agent 365
- **分层**：Copilot Studio 给业务人员做低代码 Agent；Foundry 给开发者提供托管运行、Toolbox（工具统一端点，**工具有版本**）、跨框架的追踪和评测；Agent 365 统一管理所有 Agent。
- **理念**：「让更多人能建 Agent，同时统一共享和复用，并用一致的口径衡量使用量、质量和成本」。
- **启示**：同一家公司用「低代码入口 + 专业开发入口 + 统一治理」三层服务不同用户。这和我们「通用基线 + 场景增强」的思路一致；「工具有版本」可以补进作答文档中骨架 ① 的被动依赖锁定。

#### Google Gemini Enterprise Agent Platform（原 Vertex AI）
- **变化**：2026 年 4 月，Google 将 Vertex AI 升级为 Gemini Enterprise Agent Platform。
- **能力**：ADK 一条命令部署；Agent Engine 运行时带观测看板（Token、延迟、错误率）；模拟用户交互做评测；Agent 身份接入 IAM；Model Armor 防提示注入；面向员工的无代码 Agent Designer。
- **启示**：「一条命令上线」和「开箱即有的看板」是开发者体验的标杆。

#### OpenAI AgentKit（反面案例）
- **经过**：2025 年 10 月发布，包含 Agent Builder（可视化画布）、Evals、ChatKit、Connector Registry 等。2026 年宣布 **Agent Builder 和 Evals 于 11 月 30 日下线**，用户迁移到 Agents SDK 或 ChatGPT Workspace Agents；ChatKit、Connector Registry、Agents SDK 保留。
- **启示**：① 可视化画布不是核心壁垒，支撑我们把画布放二期；② 平台不要深度绑定单一模型厂商的上层产品，要保留模型和框架的可替换性。

#### Salesforce Agentforce
- **定位**：嵌入 CRM 的企业 Agent，客服是主场景。
- **生产化**：Testing Center（多轮对话测试、语音模拟、自定义评分，2026 年 5 月正式发布）；**A/B Testing API**（试点中：在 Agent 版本间分流、衡量结果、把胜出版本推全量）；会话 Trace 以 OpenTelemetry 标准导出，可直接接 Datadog 等工具；Agent Script 开源。
- **启示**：公开产品里少数把「版本间分流 + 推全量」做成产品能力的，可以作为 A 团队需求的直接参照；Trace 采用 OTel 标准是行业共识。

#### Sierra（客服 Agent）
- **ADLC 实践**：用声明式语言和可组合技能描述业务流程，关键业务规则设成 Agent 不能绕过的护栏；**每次发布都是快照（代码、Prompt、模型版本、不可变知识库），可以立即回滚**；标注过的线上对话变成回归测试，用模拟对话加模拟接口来跑；非技术的业务专家每天在 Experience Manager 里审样本、做标注。
- **启示**：几乎就是作答文档骨架 ①②⑥ 加「人工角色转变」的业界原型，可以作为 C 团队的对标。

#### LangSmith / Langfuse（LLMOps 工具）
- **LangSmith**：全链路 Trace、数据集和实验对比、线上评估器、人工标注队列（支持单次调用和整段对话）、Trace 聚类、部署和回滚。
- **Langfuse（开源）**：Prompt 版本加标签（production / staging），用标签做 A/B；LLM 评委；实验。局限是**分流逻辑要业务方自己写**，官方也说 A/B 更适合容错度高的场景。
- **启示**：评测和观测的数据模型可以参考（Trace、数据集、实验、评分、标注队列），但它们都不懂业务指标，也不管发布和流量。

#### n8n
- **定位**：工作流自动化转向 Agent 编排，支持无代码、低代码、专业代码三种方式，1,000 多个集成，强调合规和数据主权；SAP 把它集成进 Joule Studio。
- **启示**：确定性流程和 Agent 可以混合编排。对 C 团队（查订单、查物流）这类「工具调用 + 流程」的场景有参考意义。

### 4.3 企业内部平台

#### LinkedIn 内部 Agent 平台
- **组成**：统一的 Agent 生命周期服务（本身无状态，状态放在外部，便于横向扩展）；基于消息的编排；对话记忆和经验记忆；基于 OpenTelemetry 的观测；基于角色的权限控制；人工审核（例如生成的邮件发出前要人确认）；同时支持**交互式和批量**两种模式。
- **理念**：把 Agent 当成公司云原生分布式架构里的普通组件，沿用现有的开发规范和观测标准。
- **启示**：内部平台要**融入**公司现有基建，而不是另起一套体系。这支撑作答文档中「复用公司已有平台」的原则。

#### Uber Michelangelo
- **组成**：GenAI Gateway 统一接入各家模型；Prompt Engineering Toolkit 集中管理 Prompt 模板，并在模板里接入 RAG 和运行时数据；整体延续原有 ML 平台 Michelangelo 的体系。
- **启示**：从原有 ML 平台演进到 GenAI 平台，**模型网关 + Prompt 集中管理**是一期最先建设的部分，和作答文档中一期的「模型网关 + 配置中心」一致。

---

## 5. 能力对比矩阵（按类别，作者判断）

> ● 公开资料显示能力较完整　◐ 有部分能力，或需要自建 / 接第三方　○ 基本没有或未见公开资料
> 按类别而不是按单个产品打分，避免对具体产品下不准确的结论。

| 能力 | 低代码 LLM 平台（扣子、Dify、百炼、千帆） | 云厂商 Agent 基础设施（AgentCore、Foundry、Gemini） | LLMOps 工具（LangSmith、Langfuse、扣子罗盘） | 垂直企业方案（Agentforce、Sierra） | 大厂内部平台（LinkedIn、Uber） | **我们的一期目标** |
|---|---|---|---|---|---|---|
| 低代码 / 自然语言构建 | ● | ◐ | ○ | ● | ◐ | ●（表单 + 模板） |
| 代码开发 / SDK | ◐ | ● | ◐ | ◐ | ● | ◐（代码节点） |
| 知识库（RAG） | ● | ● | ○ | ● | ◐ | ● |
| 工具接入 / MCP | ● | ● | ○ | ● | ◐ | ●（白名单） |
| 批量执行 | ◐（千帆有） | ◐ | ○ | ○ | ● | ● |
| 评测集 + 离线评测 | ◐ | ● | ● | ● | ◐ | ● |
| **强制上线门槛** | ○ | ◐ | ◐ | ◐ | ◐ | ● |
| **流量灰度 + 业务指标 AB** | ○ | ○ | ◐（手动分流） | ◐（试点） | ◐ | ●（对接实验平台） |
| **版本快照（含知识）+ 分钟级回退** | ◐ | ◐ | ◐（仅 Prompt） | ● | ◐ | ● |
| 全链路 Trace | ◐ | ● | ● | ● | ● | ● |
| 线上评测 / bad case 闭环 | ○ | ● | ● | ● | ◐ | ◐（人工，二期自动化） |
| 输出护栏 / 策略 | ◐ | ● | ○ | ● | ● | ●（接公司内容安全） |
| 多团队治理与成本分摊 | ◐ | ● | ◐ | ◐ | ● | ● |
| **与公司内部基建打通** | ○ | ○ | ○ | ○ | ● | ● |

**从矩阵能读出两点**
1. 外部产品在「构建」和「追踪」上已经很成熟，**加粗的四行**（强制门槛、流量 AB、含知识的版本回退、内部基建打通）普遍薄弱，而这恰好是 A、B、C 三个团队的核心诉求。
2. 大厂内部平台在「打通」「批量」「治理」上最强，但构建易用性一般。我们要补的正是这一块：让内部平台也「开箱即用」。

---

## 6. 从「公司内部统一平台」的视角看竞品

### 6.1 内部平台和外部产品的根本差异

| 维度 | 外部商业产品 | 公司内部统一平台 |
|---|---|---|
| 用户 | 海量、同质化的外部客户 | 少量但差异很大的内部团队，需求可以深度沟通 |
| 成功标准 | 注册量、付费、留存 | 业务 Agent 成功上线的数量和质量、节省的重复投入 |
| 集成 | 通用连接器 | 深度打通内部系统：账号、实验、标注、内容安全、订单、笔记检索 |
| 数据 | 要考虑客户数据隔离与合规 | 数据不出公司，但团队之间仍需权限隔离 |
| 治理 | 客户自己管 | 平台对公司整体负责：成本、合规、事故 |
| 迭代节奏 | 按版本发布，照顾多数客户 | 可以跟着种子团队的需求快速共建 |
| 风险 | 客户流失 | 平台故障会同时影响多个业务，爆炸半径大 |

### 6.2 竞品覆盖得好的部分，与留下的空白

**可以直接借鉴或复用的**：构建交互（表单、自然语言生成配置、模板）、RAG 流程、插件和工具协议（MCP）、Trace 数据模型（OTel）、评测对象模型（评测集、评估器、实验）、Prompt 版本管理。

**外部产品的空白，也是我们的差异化**：
1. **与业务指标打通的灰度实验**：外部平台拿不到客户的采纳、点击、留存等数据，内部平台可以直接对接公司 AB 实验平台和埋点。
2. **强制上线门槛**：外部平台很少「不让你上线」，内部平台对公司质量负责，可以也应该强制执行。
3. **知识和政策版本随 Agent 版本走**：B 的政策、C 的售后规则都要能回溯到「当时依据哪一版」。
4. **在线、批量、多轮会话统一**：一个平台同时承接 A、B、C 三种形态。
5. **多团队资源隔离和成本分摊**：A 的高并发不能挤掉 C 的大促资源。
6. **复用公司安全、标注、监控能力**：不重复建设。

### 6.3 自研、采购还是开源二次开发

| 方案 | 优点 | 缺点 | 适用 |
|---|---|---|---|
| **采购云厂商平台**（百炼、ADP、HiAgent、AgentCore 等） | 上线快，能力全 | 难以深度对接内部系统；数据和成本受限；可能被锁定；业务指标 AB 做不了 | 小公司，或非核心场景 |
| **开源二次开发**（Dify、Coze Studio / Loop、Langfuse） | 构建层成熟，可控，成本低 | 生产闭环要自己补；要跟进上游版本；大规模性能需要改造 | 构建层和部分组件 |
| **完全自研** | 与内部基建深度融合，贴合业务 | 投入大、周期长，容易重复造轮子 | 核心的生产闭环和治理 |
| **推荐组合** | 自研「版本 → 评测门槛 → 灰度 / AB → 回退 → Trace → 治理」这条核心链路；构建层和评测、观测的数据模型参考或复用开源；运行时、实验、标注、内容安全、监控对接公司已有平台 | — | — |

### 6.4 一句话定位

> 外部平台解决「怎么把 Agent 做出来」，我们解决「**公司内任何团队做出来的 Agent，怎样用同一套标准安全上线、持续变好，并把能力沉淀给下一个团队**」。

---

## 7. 对 PRD 的启示（按章节映射）

| # | 启示 | 建议放在 PRD 哪里 | 依据 |
|---|---|---|---|
| 1 | 平台价值在生产闭环，不在构建编辑器 | 背景 / 先说结论 | LangChain 质量阻碍 33%；Gartner 40% 项目被取消；AgentCore、Coze Loop、ADP「建管一体」 |
| 2 | 通用 Agent 的要素和「版本 = 完整快照（含模型、知识、工具版本）」 | 1.1.1 通用 Agent 定义；骨架 ① | Sierra ADLC；Foundry 工具版本 |
| 3 | 构建方式：一期「表单 + 自然语言生成配置 + 代码节点」，画布放二期 | 模块一 1.1 | OpenAI 下线 Agent Builder；Copilot Studio 和 Gemini 都主推自然语言构建 |
| 4 | 工具和知识按 MCP、Skills 等标准封装，一期对内，二期开放市场 | 模块一 1.4；模块六 6.5 | AAIF 托管 MCP；Skills 开放标准；ADP 三级技能治理 |
| 5 | 评测前置，并强制执行上线门槛 | 模块二 2.1、2.3 | 离线评测仅 52.4%、线上评测仅 37.3%；外部产品普遍缺少强制门槛 |
| 6 | AB 对接公司实验平台，平台负责分流并把版本号写入埋点 | 模块三 3.4 | 公开平台多为试点（Agentforce）或手动分流（Langfuse） |
| 7 | 回退 = 切换线上指向的版本，而不是重新编辑 | 模块三 3.5 | Sierra 可立即回滚；Dify 需载入草稿再发布 |
| 8 | 批量任务和批量评测共用一套能力，放一期 | 模块四 4.2；模块二 2.2 | 千帆批量任务；LinkedIn 交互式加批量 |
| 9 | Trace 采用 OpenTelemetry 标准，对接公司监控 | 模块五 5.2 | Agentforce、LinkedIn、Foundry 都采用 OTel |
| 10 | bad case 闭环是「持续变好」的关键，一期人工归因，二期线上抽样评测和自动聚类 | 骨架 ⑥；模块五 5.4 | MIT「学习鸿沟」；AgentCore 线上抽样评测；LangSmith Trace 聚类 |
| 11 | 增加「Agent 目录 + 生产就绪检查」：负责人、等级、权限、成本归属 | 模块六（可新增 6.0） | 微软 Agent 365；Agentar 治理；Gartner「风险控制不足」 |
| 12 | 保持模型和框架可替换，不深度绑定单一厂商 | 划分原则 / 风险 | OpenAI 下线产品；超过 75% 的团队使用多模型 |
| 13 | 成功指标避开「Agent 数量」这类虚荣指标，看原型转化为生产的比例、迭代周期、回退耗时 | 2.4 成功指标 | Gartner「agent washing」；MIT 95% 无回报 |
| 14 | 种子接入顺序可以引用外部数据：客服是第一大场景，所以 C 先接入 | 2.4 上线节奏 | LangChain：客服占 26.5% |

---

## 8. 局限与待验证事项

- HiAgent 3.0、腾讯 ADP 4.0 的具体能力来自开发者社区和媒体文章，没有读到官方完整文档。
- Salesforce A/B Testing API 目前是试点状态；AgentCore Policy 的正式发布时间以 AWS 官方为准。
- 低代码市场规模数字来自二手转引，引用前建议查 Gartner 原文。
- 第 3.2 节的定位象限和第 5 节的能力矩阵是作者基于公开资料的判断，不是厂商官方口径。
- 各大厂的内部 Agent 平台公开资料很少，国内部分没有纳入。

---

## 参考资料

**行业报告与数据**
- [IDC 中国智能体开发平台市场份额报告（新浪财经转载）](https://finance.sina.com.cn/tech/2026-06-12/doc-iniccspt0246572.shtml)
- [LangChain：State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering)
- [Gartner：超过 40% 的 Agent 项目将在 2027 年底前被取消](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [MIT NANDA《GenAI Divide》报道（Virtualization Review）](https://virtualizationreview.com/articles/2025/08/19/mit-report-finds-most-ai-business-investments-fail-reveals-genai-divide.aspx)
- [Gartner 低代码预测（byteiota 转引，未核实）](https://byteiota.com/low-code-hits-44-5b-gartner-2026-forecast/)

**标准与生态**
- [Linux 基金会成立 Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [Agent2Agent（维基百科）](https://en.wikipedia.org/wiki/Agent2Agent)
- [VentureBeat：Anthropic 开放 Agent Skills 标准](https://venturebeat.com/ai/anthropic-launches-enterprise-agent-skills-and-opens-the-standard)
- [钛媒体：OpenClaw 引爆巨头竞争](https://www.tmtpost.com/7910576.html)

**国内产品**
- [IT之家：扣子 2.0 发布](https://www.ithome.com/0/914/507.htm)
- [Coze Loop Wiki](https://github.com/coze-dev/coze-loop/wiki/1.-%E4%BB%80%E4%B9%88%E6%98%AF-Coze-Loop)
- [AI 工具集：HiAgent](https://ai-bot.cn/hiagent/)
- [阿里云百炼：应用模式对比](https://help.aliyun.com/zh/model-studio/application-introduction)
- [千帆 AppBuilder 批量任务上线](https://qianfan.cloud.baidu.com/qianfandev/topic/686080)
- [腾讯云 ADP 4.0：建管一体](https://cloud.tencent.com/developer/article/2685456)
- [IT之家：蚂蚁数科 Agentar 2.0](https://www.ithome.com/0/978/684.htm)
- [Dify 融资公告（Business Wire）](https://www.businesswire.com/news/home/20260309511426/en/Dify-Raises-$30-million-Series-Pre-A-to-Power-Enterprise-Grade-Agentic-Workflows)
- [Dify 文档：版本管理](https://docs.dify.ai/zh-hans/guides/management/version-control)

**国外产品**
- [AWS：AgentCore 新增评测与策略](https://aws.amazon.com/blogs/aws/amazon-bedrock-agentcore-adds-quality-evaluations-and-policy-controls-for-deploying-trusted-ai-agents/)
- [AWS：AgentCore Evaluations 正式发布](https://aws.amazon.com/about-aws/whats-new/2026/03/agentcore-evaluations-generally-available)
- [InfoQ：Microsoft Foundry 面向生产的 Agent 能力](https://www.infoq.com/news/2026/06/microsoft-foundry-agents/)
- [Microsoft：2026 年规模化 Agent 的 6 项核心能力](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/6-core-capabilities-to-scale-agent-adoption-in-2026/)
- [Gemini Enterprise Agent Platform（维基百科）](https://en.wikipedia.org/wiki/Gemini_Enterprise_Agent_Platform)
- [InfoWorld：Vertex AI Agent Builder 新增观测与部署工具](https://www.infoworld.com/article/4085736/google-boosts-vertex-ai-agent-builder-with-new-observability-and-deployment-tools.html)
- [OpenAI：Agent Builder 文档（含下线公告）](https://developers.openai.com/api/docs/guides/agent-builder)
- [Montana Labs：AgentKit 与 Agent Builder 的八个月](https://montanalabs.ai/news/openai-s-agentkit-and-the-eight-month-lifespan-of-agent-builder/)
- [Claude Managed Agents 发布](https://claude.com/blog/claude-managed-agents)
- [Salesforce TDX 2026 Agentforce 汇总](https://www.salesforce.com/blog/tdx-2026-roundup-agentforce-edition/)
- [Sierra：The Agent Development Life Cycle](https://sierra.ai/blog/agent-development-life-cycle)
- [LangSmith 更新日志](https://docs.langchain.com/langsmith/changelog)
- [Langfuse：A/B Testing](https://langfuse.com/docs/prompt-management/features/a-b-testing)
- [n8n 获 SAP 投资（TFN）](https://techfundingnews.com/sap-backs-n8n-at-5-2b-valuation-to-automate-complex-data-heavy-enterprise-workflows-with-ai/)
- [TechCrunch：Lovable ARR](https://techcrunch.com/2026/03/11/lovable-says-it-added-100m-in-revenue-last-month-alone-with-just-146-employees/)

**企业内部平台**
- [InfoWorld：LinkedIn 如何构建 Agent 平台](https://www.infoworld.com/article/4054974/how-linkedin-built-an-agentic-ai-platform.html)
- [Uber：Prompt Engineering Toolkit](https://www.uber.com/en-EG/blog/introducing-the-prompt-engineering-toolkit/)
- [Uber：GenAI Gateway](https://www.uber.com/en-CA/blog/genai-gateway/)
