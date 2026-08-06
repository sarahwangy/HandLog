# HandLog 多用户/SaaS 改造 — 问题与回答记录

> 讨论背景：项目目前是单用户架构（Google 登录写死一个邮箱 `ALLOWED_EMAIL`，Notion 读写用一个固定的 Internal Integration token + database ID）。以下是关于"如何让朋友也用起来"这个话题的完整讨论记录。

---

## Q1：如果有其他朋友账号想使用，我该如何跑通呢？（不改代码）

**结论：不改代码的前提下，唯一能让朋友用起来的方式，是让朋友部署一份完全独立的自己的实例**，而不是共用现有部署（共用的话数据会全部写进你自己的 Notion，且 Google 登录会直接拒绝他的邮箱）。

朋友需要自己申请：
- Anthropic API Key（AI 生成复盘）
- OpenAI API Key（语音转录 Whisper）
- Google OAuth 应用（登录用，拿到 `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`）
- Notion Internal Integration（拿到 `NOTION_TOKEN`，并连接到他自己的 Notion database，拿到 `NOTION_DATABASE_ID`）
- 随机生成的 `ENCRYPTION_KEY` 和 `NEXTAUTH_SECRET`

然后把 `ALLOWED_EMAIL` 填成他自己的邮箱，部署到他自己的 Vercel 账号，环境变量全部填一遍。

Notion database 需要的字段结构（列名/类型必须完全对上）：

| Notion 列名 | 类型 | 用途 |
|---|---|---|
| `Name` | Title | 日期标题 |
| `简短日常` | Text | 当天原始日记摘要 |
| `label标签` | Multi-select | 标签 |
| `打分` | Number | 当日心情/状态打分 |
| `一句话感悟` | Text | AI 生成的一句话洞察 |
| `复盘` | Text | AI 生成的复盘段落 |
| `下一步` | Text | 下一步待办 |
| `心理学正能量话` | Text | 心理学相关的正向提示语 |

完整详细步骤见同目录下的 `FRIEND-SETUP-GUIDE.md`。

---

## Q2：有没有其他快捷办法，让朋友快速登录，变成 SaaS 产品？（不改代码）

**结论：不改代码做不出真正的多用户 SaaS**——这是结构性问题，不是配置项能绕过去的。登录只认一个写死的邮箱，Notion 也只接一个固定的 token/database，"多用户各自独立使用"需要在代码里加"每个用户存自己的 Notion 授权信息"这一层。

两个不改代码的折中方案：

**方案 A：临时"借用"你的部署**（最快，几分钟，但同一时间只能一人用）
1. 新建一个空白 Notion database 专门给朋友用，拿到新的 `NOTION_DATABASE_ID`
2. 在 Vercel 环境变量里把 `ALLOWED_EMAIL` 改成朋友的邮箱、`NOTION_DATABASE_ID` 改成新建的那个
3. 重新部署
4. 缺点：你们俩不能同时用，本质是"轮流借用"

**方案 B：给朋友一个"一键部署"入口**（更像自助式，需要仓库 public）
- 用 Vercel 的 Deploy Button（`https://vercel.com/new/clone?repository-url=仓库地址`）
- 朋友点击后 Vercel 自动 fork 代码、创建独立项目，并弹出表单让他自己填环境变量
- 部署好之后是完全独立的一份，数据、账号、费用都跟你无关
- 这是唯一不改代码、又不需要你重复手把手操作的方案

**如果之后真想做成"一份部署、很多人共用"的真 SaaS**，需要的代码改动（仅供规划参考）：
1. 去掉 `ALLOWED_EMAIL` 单邮箱白名单，改成任何账号都能登录（或加邀请码/付费控制）
2. 真正启用 Notion OAuth，让每个用户登录后自己去 Notion 授权，把每个人的 token 存进数据库
3. 加一张用户表，存"这个 session 对应哪个用户、该用哪个 Notion token/database"的映射关系
4. 把所有原来"读写固定 Notion token"的地方，改成"读写当前登录用户的 token"
5. 处理 token 失效/重新授权的情况（项目里已有 `NotionAuthError` 类处理 401，可以复用这个逻辑）

---

## Q3：如果用 Notion Auth 的话，那还需要 Google Auth 登录吗？如果改的话，需要哪些步骤？（纯 idea，不改代码）

**结论：不需要——Notion OAuth 本身就可以直接当登录方式用，不需要叠加 Google。**

Notion OAuth 授权完成后会返回用户的身份信息（工作区名字、关联邮箱），这本身就足够当登录凭证，做一个"Sign in with Notion"按钮即可。

两种架构选择：

| 方案 | 说明 | 取舍 |
|---|---|---|
| 只用 Notion OAuth 登录（推荐） | 登录页只有一个"用 Notion 登录"按钮 | 少一次设置，少一步操作；但用户断开 Notion 授权后就完全不知道这个人是谁了 |
| 保留 Google 登录 + 额外做"连接 Notion" | 先用 Google 确认身份，再单独引导连接 Notion | 身份和授权分开，更稳健；但要多维护一套 Google OAuth，对朋友间小工具有点过重 |

给几个朋友用的场景，建议只用 Notion OAuth 登录，更简单，逻辑上也更自然（工具核心就是读写 Notion）。

**改造步骤（纯 idea）：**
1. 决定登录模式——只用 Notion OAuth，不用 Google
2. 在 Notion 后台注册一个 **Public Integration**（不是现在用的 Internal Integration），填好 OAuth 回调地址（redirect URI）
3. 设计"连接 Notion"授权流程：点登录 → 跳转 Notion 授权页 → 用户同意后跳回带一个临时 `code` → 用这个 `code` 换成该用户专属的 access token
4. 新增一张"用户表"存这些 token（现在项目完全没有数据库存用户信息，这是唯一必须新增的状态存储）
5. 解决"每个人 Notion 数据库结构不一样"的问题：
   - 授权后自动帮用户在他的 Notion 里创建符合要求字段的新 database（更友好，需调用 Notion API 建表）
   - 或让用户自己按模板手动建库，再在 app 里"选择"这个 database（更简单）
6. 把所有原来"读写固定 Notion token"的地方，改成"读写当前登录用户的 token"
7. 去掉 `ALLOWED_EMAIL` 单邮箱白名单，换成邀请码或可维护的白名单列表
8. 处理断开重连——复用已有的 `NotionAuthError` 逻辑，让用户能重新走一遍授权流程刷新 token

---

## Q4：如果用 Notion Auth 让每个人都用的话，是不是他们用我的 token/key/API？

**结论：Notion token 会变成各自独立，但 AI 相关的 Key（Anthropic、OpenAI）不会自动跟着隔离，除非另外处理。**

| 用的是谁的 | 说明 |
|---|---|
| **Notion token** | 改成 OAuth 后不再是你的——每个用户各自授权，数据存进各自的 Notion workspace，跟你的完全隔离 |
| **Anthropic API Key（AI生成复盘）** | 还是你的——除非也让每个用户填自己的 Key，否则所有人的 AI 调用费用都算在你账号上 |
| **OpenAI API Key（语音转录）** | 同上，还是你的，费用算你的 |
| **Google OAuth 应用** | 换成 Notion OAuth 登录后不再需要，这项直接省掉 |

**核心提醒**：Notion OAuth 只解决"数据隔离"问题（各自的日记存在各自的 Notion 里），不会自动解决"AI 调用费用"问题——只要还是共用你自己申请的 Anthropic/OpenAI Key，朋友越多你的账单越高，且没有天然的用量隔离（除非另外加限流）。

如果想让 AI 费用也各自承担，需要让每个用户自己申请并填自己的 Key（即 "BYOK — Bring Your Own Key" 模式，一些开源 AI 应用采用的方式），而不是共用你的。

---

## 相关文档

- 朋友自部署详细步骤：`FRIEND-SETUP-GUIDE.md`（同目录）
