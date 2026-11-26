# 2026年指标 × HuggingFace 可获取性对照表

样例仓库：`https://huggingface.co/inclusionAI/Qwen3-32B-AWorld`

## 0. 文档说明

- **范围**：仅评估"蚂蚁开源项目评价指标"（A~G 共 18 项）在 **HuggingFace 侧**的可获取性。代码类指标走 GitHub / opendigger，不在本文范围；数据集形态与模型形态接口同构（`/api/datasets/*`）。
- **判定标准（简单口径）**：满足以下任一即视为"可获取"——① 官网页面爬虫可解析；② HF OpenAPI 可返回；③ `huggingface_hub` SDK 有封装。
- **验证状态图例**：
  - ✅ 已实测（本机抓取确认）
  - 🟡 接口/字段存在，本机未实测（直连被网络策略阻断，返回 000；通用抓取器对 JSON 提取为空）
  - ❌ HF 侧不可得

> 已实测结论：模型详情页为服务端渲染，`README` 正文可完整抓取；用户主页存在 `Organizations` 区块。侧栏数字（likes / downloads）同在 SSR 的 HTML 中，但通用正文提取器会丢弃，需自行用 xpath/css 解析。

---

## 1. HF Model Card 原生指标可获取性（10 项）

| # | 原生指标 | 含义 | 可获取 | 渠道 | 关键接口 / 字段 | 难度 | 是否建议纳入评分 |
|---|---|---|---|---|---|---|---|
| 1 | **Like** | 模型被点赞总数 | ✅ | API / SDK | `/api/models/{id}` → `likes` | ★ | 纳入，但仅作**热度辅助**，不入正式指标 |
| 2 | **Follow** | 关注该模型以接收更新 | ❌ | — | 模型级 Follow **无公开计数**，页面只有按钮 | ✗ | **不纳入**。用户/组织级 `followers` 数可得（`/api/users/{name}`、`/api/organizations/{org}/overview`），但那是主体指标，不是模型指标 |
| 3 | **Downloads last month** | 近 30 天下载次数 | ✅ | API / SDK | `/api/models/{id}` → `downloads`（近30天）、`downloadsAllTime` | ★ | 纳入，仅作**热度辅助**；含 CI/镜像重复拉取，不能当采用证据 |
| 4 | **Safetensors** | 权重参数量与精度分布 | ✅ | API / SDK | `/api/models/{id}` → `safetensors.total`、`safetensors.parameters`（按 dtype） | ★ | 纳入 → 支撑 **A1**（权重可加载性 / 格式规范性） |
| 5 | **Inference Providers** | 官方推理服务商是否托管 | 🟡 | API / SDK | `/api/models/{id}?expand[]=inferenceProviderMapping`；另有 `inference`（warm/cold） | ★ | 纳入 → 支撑 **E1**（部署集成类复用证据） |
| 6 | **Model tree for** | 基于本模型的衍生模型（finetune/adapter/quantized/merge） | 🟡 | API / SDK | `list_models(filter="base_model:finetune:{id}")`，另有 `:adapter:` `:quantized:` `:merge:` | ★ | **核心纳入** → 支撑 **E1** |
| 7 | **Dataset used to train** | 训练所用数据集 | 🟡 | API + RAW | `cardData.datasets`（README YAML 自报）；反向 `filter=datasets:{ds_id}` | ★ | 纳入 → 支撑 **A2**（训练材料披露）、**F1**（元数据规范性） |
| 8 | **Spaces using** | 引用本模型的 Space 列表 | 🟡 | API / SDK | `/api/models/{id}?expand[]=spaces` | ★ | 纳入 → 支撑 **E1**，**比下载量更硬的实际使用证据** |
| 9 | **Collection including** | 所属 Collection（官方专题分组） | 🟡 | API / SDK | `/api/collections?item=models/{id}` | ★★ | 可选纳入 → 支撑 **F2/A2**，属官方运营动作，信号弱 |
| 10 | **Paper for** | 关联论文（arXiv） | 🟡 | RAW + API | README 正则提取 `arxiv.org/abs/*`；再用 `/api/papers/{arxiv_id}` 校验并取标题/作者 | ★★ | 纳入 → 支撑 **A2**（技术报告）、**F1**（引用章节）。**无标准结构化字段**，需文本抽取 |

### 1.1 三个需要特别说明的项

**Follow —— 不可得，别在方案里承诺。**
模型页的 Follow 是"订阅更新"，HF 不展示也不通过 API 暴露模型的关注者数量。能拿到的只有用户/组织主体的 followers 数，口径完全不同，不能替代。

**Paper for —— 不是结构化字段。**
HF 没有"model → paper"的直接 API，页面的 "Paper for" 是 HF 从 README 中索引 arXiv 链接后生成的。实现路径是正则抽取 arXiv ID，再调 `/api/papers/{arxiv_id}` 反查校验。能拿到，但属于文本抽取，存在漏抽。

**Collection including —— 能拿但信号弱。**
Collection 是官方/维护者的运营分组动作，反映"被纳入专题"，不反映外部采用。若要用，建议只作为 A2/F2 的辅助证据，不单独计分。

---

## 2. 业务指标 × HF 可获取性（18 项）

| 指标 | 结论 | 渠道 | 关键接口 / 字段 | 难度 | 支撑的原生指标 | 说明 |
|---|---|---|---|---|---|---|
| **A1** 核心成果可获取程度 | ✅ 可 | API / SDK | `siblings[].rfilename`、`?blobs=true` 取大小、`gated`、`safetensors.total` | ★ | Safetensors | 固定清单：权重分片、`config.json`、`tokenizer*`、`generation_config.json` 是否存在，100% 自动 |
| **A2** 配套材料开放程度 | ✅ 可 | API + RAW | 文件清单匹配白名单（见附录A）；`cardData.datasets`；README 中的技术报告链接 | ★ | Dataset used to train、Paper for | 纯存在性计数，不评价可用性。**权重/config 归 A1，不在此重复计** |
| **B1** 外部被采纳贡献者数 | ✅ 可（需名单） | API / SDK | `list_repo_commits` 的 `authors`、discussions 的 `author`；与「蚂蚁 huggingface 用户名单.csv」+ 蚂蚁 org 成员表比对 | ★★ | — | 含社区 PR 提交者（`isPullRequest=true` 的 discussion `author`）；"被采纳"口径需过滤 `status=merged`，合并后 commit 的 `authors` 保留原提交者。HF 无身份标签，靠名单 + `/api/users/{name}/orgs` 双重判定 |
| **B2** 外部贡献占比 | ✅ 可（需名单） | 同上 | 同上，按 commit / discussion 为贡献单元 | ★★ | — | 分母含未知身份者，结果为"已确认外部占比下限" |
| **B3** 外部共建组织数 | ⚠️ 口径受限 | API / UI 爬虫 | `/api/users/{username}/orgs`；或解析用户主页 Organizations 区块 | ★★ | — | org ≠ 任职公司；无历史快照，不满足"贡献发生时"口径；个人账号无 org 只能归"个人独立贡献者" |
| **C1** 活跃参与人数 | ✅ 可 | API / SDK | `list_repo_commits` 窗口内 author 去重 | ★ | — | 纯量化。风险：model repo 常见单次大提交，人数系统性偏低 |
| **C2** 持续参与者比例 | ✅ 可 | API / SDK | commit `date` 按 author × 自然月透视，≥3 个月 | ★★ | — | 需拉全量 commit 再聚合 |
| **C3** 维护活跃月占比 | ✅ 可 | API / SDK | commit 月份去重数 ÷ `createdAt` 起算月份数 | ★ | — | 最易落地，纯量化无歧义 |
| **D1** Issue/讨论及时响应率 | ✅ 可 | API | `/api/models/{id}/discussions` + `/discussions/{num}` 的 `events[].author/date` | ★★ | — | 首响时间需 N+1 拉详情；机器人回复按 username 规则排除 |
| **D2** PR 及时响应率 | ✅ 可 | API | 同上，`isPullRequest=true` 过滤 | ★★ | — | HF 的 PR 语义与 GitHub PR 不等价，口径需重写 |
| **D3** 贡献人审查覆盖率 | ❌ 不可 | — | — | ✗ | — | HF model repo **无 review/approve 机制**，只能退化为"PR 是否被维护者合并" |
| **E1** 可核验外部复用成果数 | ✅ 可（覆盖不全） | API / SDK | `filter=base_model:*:{id}`、`expand[]=spaces`、`inferenceProviderMapping` | ★ | Model tree、Spaces using、Inference Providers | 三路合并去重。Model tree 只收录声明了 `base_model` 的仓库，属下限值 |
| **E2** 外部复用组织数 | ⚠️ 口径受限 | API | 衍生模型 / Space 的 `author` 是否为 org（`/api/organizations/{name}` 校验） | ★★ | Model tree、Spaces using | org 型 author 可算组织，个人 author 归"个人独立采用" |
| **F1** 文档完备度 | ✅ 可（结构信号） | RAW / API | README YAML 头 + 正文结构 + 文档文件（见附录B） | ★★ | Dataset used to train、Paper for | 三项加权 0.4/0.4/0.2，衡量**完备度下限**，非人工达标判定 |
| **F2** 贡献与维护机制完备度 | ❌ 基本不可 | RAW | README 中是否提及 CONTRIBUTING / 维护者联系方式 | ★★★ | Collection including | HF 无独立贡献指南、变更记录承载物，多数模型仓为空，建议判"不适用" |
| **G1** 质量验证结果 | ❌ 不可 | — | `?expand[]=evalResults`、`cardData.model-index` | ✗ | — | 接口里只有**模型自报**分数，无第三方复现，不能作质量结论 |
| **G2** 使用/复现验证通过情况 | ❌ 不可 | — | — | ✗ | Safetensors | 必须实际下载跑推理；HF 侧最多确认"文件完整可下载" |
| **G3** 安全维护措施完备度 | ❌ 不可 | — | `gated`、safetensors 转换状态 | ✗ | — | HF 不公开漏洞扫描/CVE/敏感信息检查结果 |

---

## 3. 落地分档

| 档位 | 指标 | 实现方式 |
|---|---|---|
| **L1 一次 API 即得** | A1、A2、C3、E1 | 每仓库 2~3 个请求，可全量跑批 |
| **L2 需遍历聚合** | C1、C2、B1、B2、B3、E2、D1、D2、F1 | commit / discussions 列表 + N+1 拉详情，注意游标与限流 |
| **L3 需语义判定** | F2 | README 文本 + LLM 打分，人工抽样校准 |
| **L4 HF 侧无法获取** | D3、G1、G2、G3 | 需 GitHub 侧数据或人工验证；G1 可用第三方榜单补充 |

统计：**可机器量化 8 项**（A1、A2、C1、C3、E1、B1、B2、F1），**口径受限 2 项**（B3、E2），**不可得 5 项**（D3、F2、G1、G2、G3），另有 E1 覆盖不全。

---

## 4. 三个必须提前知道的坑

1. **没有时间序列**。HF 只给当前 `downloads`（近30天）、`downloadsAllTime`、当前 `likes`，**无历史值且不可回溯**。任何"窗口内增长"类指标必须自建每日快照表（仓库已有 `metrics/` + MySQL），否则三个月后仍然没有历史数据。
2. **SSR + SPA 混杂**。模型详情页是服务端渲染，侧栏数字在 HTML 里但通用正文提取器会丢弃，需 xpath/css 解析；`huggingface.co/models?filter=...` 是前端渲染，抓取为空（已实测），必须改走 `/api/models?filter=...`。
3. **"下载量 ≠ 采用"**。`downloads` 含 CI/镜像/评估脚本的重复拉取；点赞数无法追溯点赞人身份，无法区分内外。二者只能作热度辅助，正式复用证据用 Model tree + Spaces using + Inference Providers。

---

## 5. 附录

### 附录A：A2 有效文件白名单（命中计 1，满分 12）

| 序 | 类别 | 匹配模式（同类任一命中即计 1） |
|---|---|---|
| 1 | 运行环境 | requirements.txt、environment.yml、pyproject.toml |
| 2 | 容器化 | Dockerfile、docker-compose.yml |
| 3 | 推理脚本 | inference.py、run_*.py、example*.py、demo*.py、app.py |
| 4 | 示例目录 | examples/、example/ 下任意文件 |
| 5 | 训练脚本 | train*.py、finetune*.py、trainer*.py |
| 6 | 训练配置 | deepspeed*.json、train_config*.yaml、training_args*.json |
| 7 | 评测脚本 | eval*.py、evaluate*.py、benchmark*.py |
| 8 | 评测目录 | eval/、evaluation/、benchmark/ 下任意文件 |
| 9 | 模型卡 | README.md |
| 10 | 许可证 | LICENSE、LICENSE.md |
| 11 | 技术报告/引用 | CITATION.cff、*.pdf |
| 12 | 变更记录 | CHANGELOG.md、MODEL_CARD.md |

仅判断文件是否存在，不判断内容是否可用；权重与 config/tokenizer 属核心成果，由 A1 计分。

### 附录B：F1 检查项

| 维度 | 权重 | 检查项（命中即计 1） |
|---|---|---|
| 元数据规范性 | 0.4 | license、library_name 或 pipeline_tag、base_model、datasets、language（README YAML 头，5 项） |
| 文档内容完备度 | 0.4 | 模型描述/用途、快速上手/使用、示例代码、局限/适用范围、引用（正文 5 类，标题关键词 + 代码块） |
| 文档文件完整性 | 0.2 | README.md、LICENSE、CITATION.cff（3 项） |

三个维度内部各自按"命中数 ÷ 检查项数"归一后加权。这是机器可核验的完备度下限，不能替代人工达标判定。

### 附录C：接口清单

| 用途 | 接口 |
|---|---|
| 模型元数据 | `GET /api/models/{id}` |
| 文件列表与大小 | `GET /api/models/{id}?blobs=true`、`GET /api/models/{id}/tree/main?recursive=true` |
| 提交历史 | `GET /api/models/{id}/commits/main` |
| 讨论/PR | `GET /api/models/{id}/discussions`、`GET /api/models/{id}/discussions/{num}` |
| 衍生模型（Model tree） | `GET /api/models?filter=base_model:finetune:{id}`（另有 `:adapter:` `:quantized:` `:merge:`） |
| 使用该模型的 Space | `GET /api/models/{id}?expand[]=spaces` |
| 推理服务商 | `GET /api/models/{id}?expand[]=inferenceProviderMapping` |
| 所属 Collection | `GET /api/collections?item=models/{id}` |
| 用户所属组织 | `GET /api/users/{username}/orgs`（待实测） |
| 组织成员 | `GET /api/organizations/{org}/members` |
| 论文校验 | `GET /api/papers/{arxiv_id}` |
| README 原文 | `GET /{id}/raw/main/README.md` |