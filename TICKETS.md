# Ticket 任务拆解 — Handbook 手账复盘助手

> 配套 PRD：`PRD.md`
> 拆解粒度：Epic → Story → Task
> 估算单位：人日（1 人日 ≈ 6 小时专注开发）
> 优先级：P0 必做 / P1 重要 / P2 可延后

---

## Epic 总览

| Epic | 描述 | 总工时 | 优先级 |
|---|---|---|---|
| E1 | 项目脚手架与基础设施 | 3 人日 | P0 |
| E2 | 用户认证与 Notion 集成 | 4 人日 | P0 |
| E3 | 输入层（Capture 页） | 4 人日 | P0 |
| E4 | AI 处理层（Claude 集成） | 5 人日 | P0 |
| E5 | 审核与编辑（Review 页） | 3 人日 | P0 |
| E6 | 手账图生成（Handbook 页） | 5 人日 | P0 |
| E7 | 回顾页面（Timeline + Dashboard） | 4 人日 | P1 |
| E8 | 设置与个性化 | 2 人日 | P1 |
| E9 | Landing 与 Onboarding | 3 人日 | P0 |
| E10 | 部署、监控、文档 | 2 人日 | P0 |
| **E11** | **跨页面信息分发引擎（★ 新增）** | **6 人日** | **P0** |
| **E12** | **周/月复盘 + 完整度检查（★ 新增）** | **9 人日** | **P0** |
| **E13** | **定时任务与通知（★ 新增）** | **3 人日** | **P0** |
| **总计** | | **55 人日**（124 张 ticket，13 个 Epic） | |

---

## E1 — 项目脚手架与基础设施

### Story 1.1：初始化项目
- **T-101** 创建 Next.js 14 项目（App Router、TypeScript、ESLint）— 0.5d — P0
- **T-102** 配置 Tailwind CSS + shadcn/ui（基础组件 Button、Input、Card、Dialog）— 0.5d — P0
- **T-103** 设置 i18n（next-intl，中英文 messages 文件结构）— 0.5d — P0
- **T-104** 配置主题（亮/暗模式切换，next-themes）— 0.5d — P0

### Story 1.2：基础设施
- **T-105** 设置 Vercel 项目 + 环境变量（Claude API key、Notion client id/secret、KV）— 0.5d — P0
- **T-106** 接入 Vercel KV，写工具函数 `kv.get/set/del` — 0.3d — P0
- **T-107** 配置 Sentry + Vercel Analytics — 0.2d — P0

---

## E2 — 用户认证与 Notion 集成

### Story 2.1：Notion OAuth
- **T-201** 在 Notion 开发者后台创建 integration，配置 redirect URL — 0.3d — P0
- **T-202** 实现 NextAuth Notion provider — 1d — P0
- **T-203** 加密存储 access token 到 Vercel KV — 0.5d — P0
- **T-204** 实现 token 刷新逻辑 — 0.5d — P0

### Story 2.2：Notion API 封装
- **T-205** 写 Notion SDK 封装：`createPage`, `queryDatabase`, `updatePage`, `getDatabase` — 1d — P0
- **T-206** 实现 database 字段映射（UI 字段 ↔ Notion property）— 0.5d — P0
- **T-207** 写单元测试覆盖 Notion 封装核心方法 — 0.2d — P1

---

## E3 — 输入层（Capture 页）

### Story 3.1：基础布局
- **T-301** 创建 `/capture` 路由 + 页面布局（参考线框图）— 0.5d — P0
- **T-302** 顶部导航栏组件（Logo + Tab + 用户头像）— 0.5d — P0

### Story 3.2：文字输入
- **T-303** 多行 textarea 组件 + 字数统计 — 0.3d — P0
- **T-304** 自动保存草稿（debounce 3s + onBlur）到 Vercel KV — 0.5d — P0
- **T-305** 草稿恢复（页面加载时检查 KV）— 0.3d — P0

### Story 3.3：语音输入
- **T-306** Web Speech API 封装 hook `useSpeechRecognition` — 0.7d — P0
- **T-307** 录音 UI（麦克风按钮、时长、脉冲动画、停止）— 0.5d — P0
- **T-308** 语音转文字实时拼接到 textarea — 0.3d — P0
- **T-309** Safari 兼容性测试与降级提示 — 0.3d — P1

### Story 3.4：AI 追问
- **T-310** API route `/api/followup`：根据当前文本生成 1-2 个追问 — 0.5d — P1
- **T-311** 追问 UI 卡片（在文本框下方展示，点击可填入）— 0.3d — P1

---

## E4 — AI 处理层（Claude 集成）

### Story 4.1：Claude SDK 封装
- **T-401** 接入 `@anthropic-ai/sdk`，写基础调用函数 — 0.5d — P0
- **T-402** 流式响应（Server-Sent Events）封装 — 0.7d — P0
- **T-403** Prompt template 文件夹结构（按功能分文件管理）— 0.3d — P0

### Story 4.2：Prompt 设计
- **T-404** 写 prompt：事件提取 + 标签匹配（输入：原始文本 + 已有标签列表；输出：结构化 JSON）— 1d — P0
- **T-405** 写 prompt：一句话感悟 + 下一步 + 复盘段落 — 1d — P0
- **T-406** 写 prompt：打分 + 理由 — 0.5d — P0
- **T-407** Prompt 效果测试（用现有 Notion 数据作为 ground truth）— 0.5d — P1

### Story 4.3：API route
- **T-408** `/api/process`：编排上述 prompt 调用，返回完整复盘草稿 — 0.5d — P0

---

## E5 — 审核与编辑（Review 页）

### Story 5.1：Review 页布局
- **T-501** 创建 `/review/:draftId` 路由 — 0.3d — P0
- **T-502** 字段卡片：简短日常、感悟、下一步、复盘、打分、标签（可编辑）— 1d — P0

### Story 5.2：交互
- **T-503** 每个字段「重新生成」按钮（调用对应 API）— 0.5d — P0
- **T-504** 风格切换（更精简 / 更详细 / 更温暖）— 0.5d — P1
- **T-505** 标签管理：增删 + 新建标签时同步到 Notion — 0.5d — P0
- **T-506** 「确认并生成手账图」按钮 → 跳转 Handbook 页 — 0.2d — P0

---

## E6 — 手账图生成（Handbook 页）

### Story 6.1：SVG 模板系统
- **T-601** 设计 3 套 SVG 模板（极简、可爱、复古）— 1.5d — P0
- **T-602** 模板参数化：日期、感悟、行动项、打分、标签 — 0.5d — P0
- **T-603** 配色主题映射（标签 → 配色）— 0.5d — P0
- **T-604** 集成开源手写中文字体（思源、鸿蒙手写）— 0.5d — P0

### Story 6.2：渲染与导出
- **T-605** 引入 Satori + sharp，React 组件 → PNG — 0.7d — P0
- **T-606** PDF 导出（A5/A4）— 0.5d — P1
- **T-607** API route `/api/handbook/generate`：返回 PNG buffer — 0.3d — P0

### Story 6.3：上传与提交
- **T-608** 上传 PNG 到 Notion（作为 page 封面或附件）— 0.5d — P0
- **T-609** 提交全部数据，写入 Notion database row — 0.3d — P0
- **T-610** 成功后跳转 Timeline，展示 toast 提示 — 0.2d — P0

---

## E7 — 回顾页面（Timeline + Dashboard）

### Story 7.1：Timeline
- **T-701** 创建 `/timeline` 路由 — 0.2d — P1
- **T-702** 从 Notion 拉取数据 + 缓存到 KV（5 min TTL）— 0.5d — P1
- **T-703** 卡片视图（日期、感悟、标签、缩略图）— 0.7d — P1
- **T-704** 筛选（按标签、月份、打分）— 0.5d — P1
- **T-705** 全文搜索（客户端 fuzzy search）— 0.3d — P1

### Story 7.2：Dashboard
- **T-706** 创建 `/dashboard` 路由 — 0.2d — P1
- **T-707** 标签分布饼图（Recharts）— 0.3d — P1
- **T-708** 打分趋势折线图 — 0.3d — P1
- **T-709** 关键词云 — 0.5d — P2
- **T-710** 复盘频率热力图（GitHub 风格）— 0.5d — P2

---

## E8 — 设置与个性化

### Story 8.1：Settings 页
- **T-801** 创建 `/settings` 路由 + 侧边 Tab 导航 — 0.3d — P0
- **T-802** Notion 连接管理（重新授权、断开）— 0.3d — P0
- **T-803** AI 风格偏好（精简/详细、温暖/直接）— 0.3d — P1
- **T-804** 手账模板默认选择 — 0.3d — P1
- **T-805** 语言切换（中/英）— 0.2d — P0
- **T-806** 数据导出（JSON / CSV）— 0.4d — P2
- **T-807** 删除账号（清除 KV + 撤销 Notion）— 0.2d — P1

---

## E9 — Landing 与 Onboarding

### Story 9.1：Landing
- **T-901** 创建 `/` 路由 — 0.2d — P0
- **T-902** Hero 区（标题、副标题、CTA）— 0.5d — P0
- **T-903** 功能介绍（3 步流程动画）— 0.5d — P0
- **T-904** Demo 视频 / GIF embed — 0.3d — P0
- **T-905** Demo Mode（mock 数据，无需登录）— 1d — P1

### Story 9.2：Onboarding
- **T-906** 创建 `/onboarding` 路由 + 多步骤组件 — 0.3d — P0
- **T-907** 步骤 1：欢迎介绍 — 0.2d — P0
- **T-908** 步骤 2：Notion OAuth — 0.2d — P0（依赖 T-202）
- **T-909** 步骤 3：选择 / 创建 database — 0.5d — P0
- **T-910** 步骤 4：字段映射确认 — 0.3d — P0

---

## E10 — 部署、监控、文档

### Story 10.1：部署
- **T-1001** Vercel 生产环境配置（域名、环境变量、KV）— 0.3d — P0
- **T-1002** GitHub Actions CI（lint、type-check、test）— 0.3d — P0
- **T-1003** Preview deploy（PR 自动部署）— 0.2d — P0

### Story 10.2：文档与作品集
- **T-1004** README（架构图、技术栈、本地启动、贡献指南）— 0.5d — P0
- **T-1005** 技术博客一篇（产品思路 + 实现细节）— 0.5d — P1
- **T-1006** 演示视频录制（1-2 分钟）— 0.3d — P1
- **T-1007** 架构图（PRD 中现有图复用） — 0.2d — P1
- **T-1008** 作品集页面（个人网站集成）— 0.3d — P2

---

## E11 — 跨页面信息分发引擎（★ 新增）

> 对应 PRD §4.5。一次输入 → 自动写入 6 个 Notion 子页面（主表、人物卡、育儿、健康、理财、博主），AI 充当"信息路由器"。

### Story 11.1：Notion 子库映射与配置
- **T-1101** Settings 加入"子库映射"配置 UI：用户选择/创建 6 个子 database（主表、人物卡、育儿时间轴、健康、理财、博主）— 0.7d — P0
- **T-1102** 字段映射存 KV：每个 user 一份 `notion_schema` 配置 — 0.3d — P0
- **T-1103** 启动时校验：6 个子库存在、字段类型符合预期，缺失字段提示修复 — 0.4d — P0

### Story 11.2：分发分类器（核心 Prompt）
- **T-1104** 写 Prompt：「分发分类器」— 输入用户原始日记 → 输出 JSON：`{ mainEntry, personCards[], parenting[], health[], finance[], blogger[] }` — 1.5d — P0 ⚠️ 风险型
- **T-1105** Few-shot 测试集：用 sw 现有 Notion 历史数据当训练样本，跑 20 条评估准确率（目标 ≥ 85%）— 0.5d — P0
- **T-1106** 容错与回退：分类失败时只写主表 + 给用户提示 — 0.3d — P0

### Story 11.3：人物卡 append vs new 逻辑
- **T-1107** 写函数 `findOrCreatePersonCard(name)`：先查询 Notion 人物卡库，存在则返回 page_id，不存在则建新行 — 0.5d — P0
- **T-1108** 同人物多事件合并：当天同人多事件压成一条（"5-25 聊职业 + 推荐书"）— 0.3d — P0
- **T-1109** 家人过滤白名单（爸妈/老公/CC 不进人物卡）— 0.2d — P0

### Story 11.4：分发执行器
- **T-1110** API route `/api/distribute`：编排分类器 + 6 个写入 → 返回各页面写入结果 — 0.5d — P0
- **T-1111** 原子性：6 个写入用 Promise.allSettled，部分失败时记录到 `dlq`（dead letter queue）— 0.3d — P0
- **T-1112** Review 页展示"将写入哪些子页面"预览（让用户能在提交前看到分发结果）— 0.4d — P1

---

## E12 — 周/月复盘 + 完整度检查（★ 新增）

> 对应 PRD §4.5 F-14 + §4.8。复盘必须等"完整度达标"才能跑。

### Story 12.1：完整度检查器
- **T-1201** 写函数 `checkWeekCompleteness(weekId)`：扫描 1~7 位置，返回 `{ filled: [1,2,3], missing: [4,5,6,7] }` — 0.3d — P0
- **T-1202** 写函数 `checkMonthCompleteness(yearMonth)`：扫描整月 entry，返回缺失天数 — 0.3d — P0
- **T-1203** 阈值配置写进 Settings：默认 `weeklyMissThreshold=3, monthlyMissThresholdPct=0.2` — 0.2d — P0

### Story 12.2：等待补全状态机
- **T-1204** KV 数据结构 `pending_summaries: { weekId, missingDays, retryCount, lastCheckedAt }` — 0.3d — P0
- **T-1205** 状态机：`ready → pending-waiting → ready → done` 或 `pending-waiting → skipped`（超时）— 0.5d — P0
- **T-1206** 超时机制：到下周三仍未补全 → 标记 skipped，写"数据不全"到 Notion — 0.3d — P0

### Story 12.3：周复盘模板渲染器（★）
- **T-1207** 写 Prompt：「周复盘 v1」— 输入 7 天 entry → 输出 PRD §4.8.1 完整 Markdown 模板 — 1.5d — P0
- **T-1208** Section 动态扩展逻辑：识别新主题（出现 ≥ 3 次）→ 自动新增 section（如🏃身体、💼职业、💰理财、👥人际、🌱新尝试、🛠️项目、🎬内容、🍳生活、🌙内在） — 0.5d — P0
- **T-1209** Section 省略规则：本周没相关内容则跳过该 section — 0.2d — P0
- **T-1210** 评分维度动态化：根据本周实际涉及领域生成评分表行 — 0.3d — P0
- **T-1211** 心理学小贴士接入 §4.7 正能量话 prompt — 0.2d — P0

### Story 12.4：月复盘模板渲染器（★）
- **T-1212** 写 Prompt：「月复盘 v1」— 输入 4-5 个周复盘 + 全月 entry → 输出 PRD §4.8.2 完整模板 — 1d — P0
- **T-1213** 主题聚类：把全月日记按主题归类，挑出 top 6-8 个写成「最重要的收获」 — 0.5d — P0
- **T-1214** 月度感悟动态小节（关于学习/生活/成长/育儿 + 动态新增）— 0.3d — P0
- **T-1215** 衍生内容建议（可选 section） — 0.3d — P1

### Story 12.5：手账图生成（复盘版）
- **T-1216** 周复盘手账图模板：含关键词、地点、阅读、亲子高光、评分雷达图 — 0.7d — P0
- **T-1217** 月复盘手账图模板：含本月关键词、收获 top 6、一句话总结 — 0.7d — P0

### Story 12.6：回写 Notion
- **T-1218** Markdown → Notion blocks 转换（Notion 原生不支持直接写 Markdown 字符串，需要转 block 数组）— 0.5d — P0
- **T-1219** 图片上传 Vercel Blob + URL 写入 Notion 「图片」字段 — 0.3d — P0
- **T-1220** 写入对应「5-11-17」/「5 月」行的「复盘」「图片」字段 — 0.2d — P0

---

## E13 — 定时任务与通知（★ 新增）

> 对应 PRD §4.5 F-14。Vercel Cron + 邮件/通知。

### Story 13.1：Vercel Cron 配置
- **T-1301** `vercel.json` cron 配置：周日 21:00（北京）= UTC 13:00 `0 13 * * 0`；月末 `0 13 28-31 * *`；每晚兜底 `0 14 * * *` — 0.2d — P0
- **T-1302** CRON_SECRET 环境变量 + auth header 校验 — 0.2d — P0

### Story 13.2：Cron API routes
- **T-1303** `/api/cron/weekly-summary`：调完整度检查 → 跑或 pending → 写 Notion — 0.5d — P0
- **T-1304** `/api/cron/monthly-summary`：类似 weekly，加月末判定（明天 = 下月 1 号）— 0.4d — P0
- **T-1305** `/api/cron/retry-pending`：每晚 22:00 跑，扫所有 pending → 重检是否补全 — 0.4d — P0

### Story 13.3：通知与提醒
- **T-1306** Resend / SendGrid 接入，发送邮件模板 — 0.3d — P1
- **T-1307** 提醒邮件文案：「本周还差 X 天没写哦 🌱」、「本周复盘已生成 ✨」、「数据不全已跳过」— 0.2d — P1
- **T-1308** 手动触发按钮（Settings → "立即跑本周复盘"）— 0.3d — P1

---

## 依赖关系图

```
E1 基础设施
T-101 → T-102 → T-103/104 → T-105 → T-106
                                      ↓
E2 Notion + Auth
T-201 → T-202 → T-203/204 → T-205 → T-206
                                      ↓
E3 输入层 + E4 AI 处理（可并行）
T-301..311        T-401 → T-402 → T-403 → T-404/405/406 → T-408
                                                            ↓
E11 分发引擎（依赖 E2 + E4）★
T-1101/1102/1103 → T-1104 → T-1105/1106 → T-1107/1108/1109 → T-1110/1111/1112
                                                            ↓
E5 Review + E6 手账图
T-501..506 → T-601..610
                                                            ↓
E12 周/月复盘（依赖 E11 + E6）★
T-1201..1203 → T-1204..1206
              ↘
                T-1207..1211（周复盘渲染）
                T-1212..1215（月复盘渲染）
                T-1216/1217（手账图）
                T-1218..1220（回写 Notion）
                                                            ↓
E13 定时任务（依赖 E12）★
T-1301/1302 → T-1303/1304/1305 → T-1306/1307/1308
                                                            ↓
E7 Timeline + Dashboard（可并行启动）
T-701..710
                                                            ↓
E8 Settings → E9 Landing/Onboarding → E10 部署上线
```

---

## Sprint 计划建议

### Sprint 1（Week 1-2）— 基础设施 + 输入闭环
- E1 全部
- E2 全部
- E3 Story 3.1, 3.2
- 交付：用户能登录、连接 Notion、文字输入并存草稿

### Sprint 2（Week 3）— AI 处理 + 审核
- E3 Story 3.3, 3.4
- E4 全部
- E5 全部
- 交付：完整跑通「输入 → AI 处理 → 编辑」

### Sprint 3（Week 4）— 跨页面分发引擎（★ 新增）
- E11 全部
- 交付：一次输入自动分发到 6 个 Notion 子页面，分类准确率 ≥ 85%

### Sprint 4（Week 5）— 手账图生成
- E6 全部
- 交付：能生成日记手账图、上传 Notion

### Sprint 5（Week 6-7）— 周/月复盘 + 完整度检查（★ 新增）
- E12 全部
- E13 全部
- 交付：周日自动跑周复盘 / 月末自动跑月复盘；缺数据自动等待补全；手动触发可用

### Sprint 6（Week 8）— 回顾页面 + Settings
- E7 全部
- E8 P0/P1 任务
- 交付：可浏览历史、看统计图表、调整 Settings

### Sprint 7（Week 9）— Landing + 上线
- E9 全部
- E10 全部
- 交付：Vercel 上线，可作为作品集展示

---

## 风险型任务（需重点关注）

| 任务 | 风险点 | 应对 |
|---|---|---|
| T-306 Web Speech API | Safari 不支持持续识别 | 文字输入兜底；预留 Whisper API 接入位 |
| T-404 标签匹配 prompt | AI 容易乱造新标签 | Few-shot examples + 严格 JSON schema |
| T-601 SVG 模板 | 中文字体布局换行复杂 | 用固定宽度 + 字符计算预估行数 |
| T-605 Satori 中文渲染 | Satori 中文支持有限 | 测试时优先确认；备选 puppeteer 截图 |
| T-608 Notion 图片上传 | Notion API 不直接支持 file upload | 用 external URL（Vercel Blob 或 S3） |
| **T-1104 分发分类器**（★） | AI 误判子页面归属（如把"老公"塞进人物卡） | Few-shot + 家人白名单 + Review 页可手动调整 |
| **T-1107 人物卡 find/create**（★） | 同一人不同写法（"小明"vs"明明"）被建成两条 | Notion query 用模糊匹配 + 别名表 |
| **T-1207 周复盘渲染**（★） | AI 自由发挥乱加 section | 用 PRD §4.8.1 模板做 system prompt + 严格 JSON 结构化输出 |
| **T-1208 Section 动态扩展**（★） | 新 section 太多导致复盘冗长 | 单周硬上限 12 section + 主题 ≥ 3 次才触发 |
| **T-1218 Markdown → Notion blocks**（★） | Notion API 不接收 Markdown 字符串 | 用 `@tryfabric/martian` 或手写 parser |
| **T-1301 Cron 时区**（★） | Vercel cron 用 UTC，北京时间需 −8h | `vercel.json` 全部写 UTC；时区检查写进单测 |
| **T-1304 月末判定**（★） | cron `28-31 * *` 会在每月 28、29、30、31 都跑 | 代码内判断"明天是不是下月 1 号"，不是就直接 return |

---

## 估算总结

- **总工时**：55.3 人日（含分发引擎 + 周/月复盘 + 定时任务，共 124 张 ticket）
- **单人全职**：约 11 周（含 buffer + bug 修复 + 文档）
- **下班时间 + 周末**：约 18-20 周
- **MVP 最小可发布范围**（仅 P0）：约 45 人日
- **超精简 MVP**（先去掉 E7 Dashboard + E12 月复盘，保留周复盘）：约 36 人日，6-7 周可上线

---

## 给 Claude Code 的开工建议

按这个顺序写代码（每个 Epic 一个分支，PR 合并到 main）：

1. **E1 → E2**：先把脚手架和 Notion 接入跑通（环境变量、OAuth、API 封装）
2. **E3 + E4 并行**：输入页和 AI 处理（前后端可同时开工）
3. **E11**（关键）：先实现分类器 prompt，跑用户提供的历史 Notion 数据做评估，达到 85% 准确率再进 E5
4. **E5 → E6**：审核页 + 手账图
5. **E12 + E13**（关键）：先实现完整度检查器 + 周复盘模板渲染，**用 mock data 跑通**再接 cron
6. **E7 → E8 → E9 → E10**：尾声三连，主要是 UI 和上线

每个 Epic 完成后强制：
- ✅ Lint + Type-check 通过
- ✅ 至少 2 个单测（核心逻辑覆盖）
- ✅ 人肉跑一遍核心 happy path
- ✅ 写一段 commit message 描述这个 Epic 完成了什么

**Prompt 工程相关任务（T-404、T-1104、T-1207、T-1212）特别建议**：
- 把 prompt 单独放 `/prompts/*.md` 文件，方便迭代
- 写一个 `/scripts/eval-prompt.ts` 评估脚本，用 sw 现有 Notion 数据当 ground truth
- 每个 prompt 改动都跑一遍评估，确保不退化

---

## 当前文件位置

- 📄 PRD：`PRD.md`（v0.2，已含分发引擎 + 完整度检查 + 周/月复盘模板）
- 📋 Tickets：`TICKETS.md`（本文档，v0.2）
- 🚀 准备好交给 Claude Code：是 ✅
