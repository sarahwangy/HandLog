# HandLog 自部署指南 — 给想自己用一份的朋友

这份指南教你怎么把 HandLog fork 一份到自己名下，配好自己的账号密钥，部署成完全独立、只属于你自己的一份实例。你的数据、你的 API 用量、你的 Notion，都跟原作者完全无关。

> 这个项目目前是"单用户"设计——每份部署只服务一个人（一个 Google 邮箱登录）。想让朋友也用起来，最简单的办法就是**每个人各自部署一份**，而不是共用一份。

---

## 第一步：Fork 和 Clone 代码

1. 打开项目的 GitHub 仓库页面，点右上角 **Fork**，复制一份到你自己的 GitHub 账号下
2. 把你 fork 出来的仓库 clone 到本地：
   ```bash
   git clone https://github.com/<你的用户名>/<仓库名>.git
   cd <仓库名>
   ```
3. 安装依赖：
   ```bash
   npm install
   ```

---

## 第二步：准备好需要的账号和密钥

在开始配置之前，先去把下面这几样东西申请好。全部免费（部分有免费额度限制）。

### 1. Anthropic API Key（用于 AI 生成复盘、聊天）
- 打开 [console.anthropic.com](https://console.anthropic.com)，注册/登录
- 左侧找到 **API Keys**，创建一个新 key，复制保存下来
- 对应环境变量：`ANTHROPIC_API_KEY`

### 2. OpenAI API Key（用于语音转文字 Whisper）
- 打开 [platform.openai.com](https://platform.openai.com)，注册/登录
- 左侧找到 **API Keys**，创建一个新 key
- 对应环境变量：`OPENAI_API_KEY`

### 3. Google OAuth 应用（用于登录）
- 打开 [Google Cloud Console](https://console.cloud.google.com)
- 新建一个项目（随便起个名字，比如 "MyHandLog"）
- 左侧菜单找到 **APIs & Services → Credentials**
- 点 **Create Credentials → OAuth client ID**
  - Application type 选 **Web application**
  - **Authorized redirect URIs** 填：
    - 本地测试：`http://localhost:3001/api/auth/callback/google`
    - 正式部署后（第四步会拿到域名）：`https://你的域名/api/auth/callback/google`
- 创建完成后会拿到 **Client ID** 和 **Client Secret**
- 对应环境变量：`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`

### 4. Notion Internal Integration（用于读写你自己的 Notion）
- 打开 [notion.so/my-integrations](https://www.notion.so/my-integrations)
- 点 **New integration**，起个名字（比如 "HandLog"），选择你要用的 workspace
- 创建后会拿到一个 **Internal Integration Secret**（一串以 `ntn_` 或 `secret_` 开头的字符串）
- 对应环境变量：`NOTION_TOKEN`

### 5. 生成两个随机密钥
在终端里跑这两条命令，各生成一个随机字符串：
```bash
openssl rand -hex 32   # 用作 ENCRYPTION_KEY
openssl rand -base64 32   # 用作 NEXTAUTH_SECRET
```

---

## 第三步：在 Notion 里建好数据库

HandLog 需要你的 Notion 里有一个"日记数据库"，并且要在里面创建**这些具体的列（属性）**，列名和类型必须完全对上（大小写、中英文都要一致），否则数据写不进去：

| Notion 列名 | 类型 | 用途 |
|---|---|---|
| `Name` | Title（标题，Notion 每个数据库必须有的那一列） | 日期标题，比如 "7-25" |
| `简短日常` | Text（文本） | 当天原始日记摘要 |
| `label标签` | Multi-select（多选） | 标签 |
| `打分` | Number（数字） | 当日心情/状态打分 |
| `一句话感悟` | Text（文本） | AI 生成的一句话洞察 |
| `复盘` | Text（文本） | AI 生成的复盘段落 |
| `下一步` | Text（文本） | 下一步待办 |
| `心理学正能量话` | Text（文本） | 心理学相关的正向提示语 |

**具体操作：**
1. 在 Notion 里新建一个空白页面，插入一个 **Database - Table** 视图
2. 按上表把这几列一个一个加上去，注意类型要选对（比如"打分"必须是 Number 类型，"label标签"必须是 Multi-select 类型）
3. 建好之后，右上角点 **···（更多）→ Connections**，把你在第二步创建的那个 Integration（比如 "HandLog"）加进去授权——这一步很关键，不加的话程序连不上这个数据库
4. 复制这个数据库的链接，链接里 32 位那串字符（去掉横杠）就是 `NOTION_DATABASE_ID`：
   ```
   https://www.notion.so/xxxxx/这里这一串32位字符?v=xxxx
   ```
   对应环境变量：`NOTION_DATABASE_ID`

> 如果你不确定列名要不要完全一致：项目里有个"字段映射"功能（`src/lib/notion-schema.ts`），理论上可以自定义列名对应关系，但目前默认配置是按上表这几个中文列名来读写的，最省事的做法就是照抄上表建列，不用去改任何配置。

---

## 第四步：本地测试

1. 复制 `.env.example` 为 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```
2. 把前面拿到的所有值一一填进 `.env.local`：
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `ENCRYPTION_KEY`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` 填 `http://localhost:3001`
   - `ALLOWED_EMAIL` 填**你自己的** Google 邮箱（只有这个邮箱能登录）
   - `NEXT_PUBLIC_APP_URL` 填 `http://localhost:3001`
3. 启动：
   ```bash
   npm run dev
   ```
4. 打开 `http://localhost:3001`，用你在 `ALLOWED_EMAIL` 填的那个邮箱登录，试着写一条日记看看能不能存进 Notion

---

## 第五步：部署上线（推荐 Vercel）

1. 去 [vercel.com](https://vercel.com) 用 GitHub 账号登录
2. 点 **Add New → Project**，选择你 fork 出来的这个仓库
3. 在部署配置页面的 **Environment Variables** 里，把 `.env.local` 里的所有变量**原样填一遍**（Vercel 不会自动读取你本地的 `.env.local`，必须手动填）
4. 有两个变量在这一步需要**改成正式域名**（Vercel 部署后会给你一个 `https://你的项目名.vercel.app` 这样的域名）：
   - `NEXTAUTH_URL` → 改成 `https://你的项目名.vercel.app`
   - `NEXT_PUBLIC_APP_URL` → 改成 `https://你的项目名.vercel.app`
5. 部署完成后，回到 **Google Cloud Console** 那个 OAuth 应用设置里，把正式域名的回调地址也加进 Authorized redirect URIs（第二步提到过的那一条）：
   ```
   https://你的项目名.vercel.app/api/auth/callback/google
   ```
6. 用你自己的邮箱登录试一下正式环境

---

## 可选功能（不配置也能跑，但部分功能会缺失）

| 功能 | 需要的环境变量 | 用途 |
|---|---|---|
| 草稿自动保存 | `KV_URL`、`KV_REST_API_URL`、`KV_REST_API_TOKEN`、`KV_REST_API_READ_ONLY_TOKEN` | 去 Vercel 项目里加一个 Vercel KV（Upstash Redis）存储，会自动生成这几个变量 |
| 图片/文件上传 | `BLOB_READ_WRITE_TOKEN` | 去 Vercel 项目里加一个 Vercel Blob 存储，会自动生成 |
| 定时自动生成周报/月报 | `CRON_SECRET` | 需要在 Vercel 项目设置里配置对应的 Cron Job |
| 报错监控 | `NEXT_PUBLIC_SENTRY_DSN` | 去 [sentry.io](https://sentry.io) 建一个项目拿 DSN，不配置的话只是没有报错追踪，不影响正常使用 |

---

## 常见问题

**Q: 我能不能跟原作者共用一份部署，不用自己申请这些 Key？**
不行——这个项目目前只支持一个 Google 邮箱登录（`ALLOWED_EMAIL` 是写死成一个邮箱的），也只连一个固定的 Notion 数据库。想要有自己独立的数据和账号，必须按这份指南自己部署一份。

**Q: Notion 数据库的列名可以用英文吗？**
目前默认配置读写的是上表里那几个中文列名，直接照抄建库最省事。如果你想用英文列名，需要去改 `src/lib/notion-schema.ts` 里 `DEFAULT_FIELD_MAPPING` 对应的值——但这属于改代码的范畴，如果你不熟悉代码，建议还是照抄中文列名。

**Q: 登录的时候提示不允许访问怎么办？**
检查 `ALLOWED_EMAIL` 这个环境变量是不是填的就是你正在用来登录的那个 Google 邮箱，大小写、有没有多余空格都要确认一下。

**Q: Notion 那边一直报错连不上？**
最常见的原因是忘了在 Notion 数据库页面右上角的 **Connections** 里把你的 Integration 加进去授权——建好 Integration 只是第一步，还必须手动把它"连接"到具体的数据库上，Notion 不会自动给权限。
