# KEN Story Studio Web 2.0

自己嘗試新的世界。

不用安装的故事、角色、立绘与动作幀工作台。手机与电脑通过同一个网页使用；连接相同私人资料仓库后，可同步专案与原始图片。

## 两个仓库，各做一件事

| 仓库 | 用途 | 可见性 |
| --- | --- | --- |
| 网页代码仓库，例如 `ken-story-studio` | 放本文件夹内容，通过 GitHub Pages 发布网页 | 依 GitHub 方案选择；免费 Pages 可使用公开代码仓库 |
| 资料仓库，例如 `ken-story-data` | 同步剧本、角色、立绘和动作图集 | **必须 Private**，不启用 Pages |

网页代码不包含你的创作资料、AI 金钥或 GitHub 凭证。应用会拒绝将创作资料同步到公开仓库。

## 发布网页：一次设置，之后直接打开网址

1. 在 GitHub 新建专门的代码仓库。
2. 把本文件夹的**内容**上传到仓库根目录，确保根目录能看到 `index.html`、`app.mjs`、`model.mjs`、`providers.mjs`、`style.css` 和 `icon.svg`。不需要上传 Windows `.exe` 或 Python 版本。
3. 仓库 → Settings → Pages → Build and deployment → Source 选择 **Deploy from a branch**。
4. 选择 `main` 分支，目录 `/ (root)`，按 Save。
5. 等 GitHub Pages 完成发布，使用页面显示的 Visit site 网址。手机、平板和电脑打开同一个网址即可。网址通常是 `https://你的用户名.github.io/代码仓库名/`，实际以 Pages 显示的地址为准。

网页使用相对路径，可发布在项目子路径下。没有 npm 安装或构建步骤，也没有要求安装手机 App。`.nojekyll` 用于关闭不需要的 Jekyll 处理；文件名以点开头时，请确保上传工具没有漏掉它。

网页代码仓库：[Yuiyuki95/ken-story-studio](https://github.com/Yuiyuki95/ken-story-studio)。代码已准备在仓库根目录发布；请完成上面的 Pages 设置，实际发布网址以 GitHub Settings → Pages 显示的 Visit site 为准。

## 开启手机 / 电脑互通

1. 建立另一个 **Private** 仓库，例如 `ken-story-data`，勾选新增 README，建立默认分支。不要启用 Pages。
2. 在 GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens 中建立凭证。
3. Repository access 只选择该**资料仓库**，Repository permissions 的 **Contents** 设为 **Read and write**。无需授权其他仓库或 Workflows。设置合适的有效期。
4. 打开工作台「连接与同步」，输入 GitHub 用户名、私人仓库名称、凭证，再按连接。
5. 在手机打开同一个工作台网址，并连接相同资料仓库。不同设备可各自建立只访问同一仓库的凭证。

凭证默认只在当前网页记忆体。刷新、关闭或更换设备后，需要重新输入。请只在你信任且由你控制的工作台网址使用。无需把凭证发给别人，也不要写进公开仓库或网址。

同步包含所有专案、剧情分支、角色资料、立绘和原始动作图集。AI 金钥不会同步；各设备分别填入自己的当次金钥。

## 实际的同步行为

- 每次编辑先保存到该浏览器 IndexedDB。连接资料仓库后，默认约 15 秒合并上传一次，约每分钟检查云端；也可按立即同步。
- 回到网页或网络恢复时，会检查云端。关闭自动同步后，可手动操作。
- 两边都有新修改时，暂停写入。可以保留两份独立专案，或先保存本机快照再采用云端版本。不会强制覆盖对方。
- GitHub 每次更新携带已知文件 SHA；若上传期间另一台设备更新，409 / 422 会转为版本差异提示，不会拿新 SHA 强行重试。
- 图片以 SHA-256 命名，上传原始图片；另一设备需要显示时才下载并缓存。下载会核对图片 SHA-256。
- GitHub 连线需要网络与有效权限。私人仓库不等于端到端加密；仓库有访问权限的人也能查看资料。
- 这是一套适合个人创作的跨设备同步与版本备份方案，**不是多人同时输入的即时协作编辑器**。文件名 `studio/workspace.json` 中放文字资料，`studio/assets/` 放图片。
- 文字资料目前上限约 900KB，图片每张 8MB。长篇内容可拆分；大量高解析动画建议使用专业素材储存服务。

## 原有功能

- 故事：AI 走向、分支、续篇、草稿核对、手动节点与选项、Markdown 匯出。
- 角色：自动抽取、人工核对、同名只补空栏位、锁定设定、参考图管理。
- 立绘：依角色与参考图生成、多版本、上传、设为参考、下载 PNG。
- 动作：依参考图生成图集；导入规则图集或自然排序序列；切格、逐帧、播放、FPS、统一画布、外框 / 脚底对齐。
- 导出：PNG 序列、Sprite Sheet、JSON 和 Godot 4 SpriteFrames `.tres`，一起打包 ZIP。
- 本机快照：重要替换、导入、删除前建立，保留最近 12 份；在总览的本机备份中恢复。

本机保存只属于这个浏览器和网址；隐私浏览、清除网站资料、设备容量不足或系统回收储存都可能影响缓存。请连接资料仓库或定期导出完整备份，确认同步成功后再换设备。

## 从 Windows 版本迁移

1. 在 Windows 版用「封装专案」，得到包含 `.kenstory` 和 `assets` 的专案 ZIP。
2. 网页版总览 → 导入专案 → 选择该 ZIP。
3. 导入会转换图片路径并保留剧情、角色、参考图、立绘和图集，不覆盖其他专案。

单独 `.kenstory` 只导入文字，未附图片的引用会清除并提示。请导入**专案 ZIP**，不是包含 `.exe` 与 `_internal` 的整套 Windows 软件压缩包。

网页的「导出备份」会生成含 `workspace.kenstudio.json` 和图片的 ZIP，可在另一浏览器导入。此备份不含金钥和凭证。ZIP 导入支持 Store / Deflate，并检查路径、大小和 CRC；不支持加密、分卷或 ZIP64。

## AI 生成

连接与设置中填服务网址、模型和当次金钥。默认文字 `gpt-4.1-mini`，图片 `gpt-image-1.5`，名称可修改。文字使用 Chat Completions 相容 API；图片使用 GPT Image 相容的 generations / edits，返回 `data[0].b64_json`。

有参考图时会实际通过 multipart 上传参考图，不只是拼接文字。每次生成都可能按服务计费。没有内建免费额度，也没有内置大型 AI 模型。

**浏览器跨域限制与服务政策仍然适用。** 若供应商不允许网页直接请求，请使用你自己配置的 HTTPS 代理，填入代理基础网址。GitHub Pages 本身只托管静态网页，不会替你运行 AI 代理。不要把真实金钥硬编码到 JavaScript、README、仓库或 Pages。

没有 AI 金钥仍可手动编辑、使用离线骨架、管理素材、切幀和导出。图像模型的格数、动作连续性、服装与人物比例需要人工预览；外框对齐不能代替骨骼绑定或根节点校正。白底不等于透明，本版不自动去背。

手机推荐 256 或 512 像素的整理画布。本版对序列、图集和导出设有像素上限，避免手机浏览器因大型画布耗尽记忆体。Godot 输出请将 `.tres` 与同名 `_sheet.png` 一起导入引擎。

## 开发与验证

静态网站，无外部前端依赖。开发时 Node.js：

```sh
npm test
npm start
```

开发网址 `http://127.0.0.1:8877`。正式使用请通过 HTTPS 网页网址，勿直接双击 `index.html`；浏览器 ES 模块与储存可能不允许 file://。

本次验证报告见 `VALIDATION.md`。真实 GitHub 同步需使用用户自己的私人仓库与凭证；外部付费 AI 需要有效服务帐号。包内测试采用模拟 API，不代表已在你的帐号上发布。

## 官方资料

- GitHub Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- 建立 Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- 文件 SHA / 写入：https://docs.github.com/en/rest/repos/contents
- 浏览器跨域：https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests
- 凭证权限：https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- 图片 API：https://developers.openai.com/api/reference/resources/images/methods/generate
- ZIP 解压使用浏览器 Compression Standard：https://compression.spec.whatwg.org/


## 角色资料生成（2.1）

「角色资料库」→「AI 生成角色资料」：输入概念并选择 1–6 位，结合项目世界观与既有角色，生成姓名、身份、年龄、性别、性格、外观、背景、目标、能力、弱点、人际关系及立绘提示词。可逐栏修改、取消勾选，确认后存入角色库。同名只补空栏，锁定角色不会改变。新字段可同步、备份和导出 Markdown；旧项目仍可打开。

自动生成使用现有文字 API，按服务商规则计费。没有 API 时，可复制提示词到 ChatGPT，粘贴返回的 JSON，再预览导入。此操作需要人工切换与粘贴，不是自动登录。

## ChatGPT 账号登录的当前限制

此 GitHub Pages 版本尚未实现 Sign in with ChatGPT。身份登录与授权使用 ChatGPT 套餐是不同权限。官方网页身份登录目前需要获批的 OAuth 客户端、登记的回调地址与后台；公开开源套餐授权要求本机 HTTP 回调监听。纯静态网页不能完成该本机流程。自托管 VM 的官方流程仍需先在本机授权，再安全转移凭证。

此外，套餐授权预览目前不支持图片生成工具，不能替代此应用的人物立绘及动作图集图片 API。已配置的 API 仍独立计费，不能把 ChatGPT 套餐自动当成 API 余额。尚未完成真实账号登录或付费生成验证。

官方依据（核对日期：2026-10-14）：
- https://developers.openai.com/siwc/website
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations


## Ollama 云端文字接入（2.3 跨域修正）

**Ollama Cloud 不能由 GitHub Pages 网页直接调用。** 已实际确认其跨域预检 OPTIONS 返回 405 且没有 Access-Control-Allow-Origin。原来只填写 `https://ollama.com/v1` 的直连步骤不完整，现已拦截并显示正确提示。金钥是否有效不能从这个跨域错误判断。

无需在手机或电脑安装软件；先在自己的 Cloudflare 账号部署一个免费转接 Worker：

[部署 Ollama 转接服务](https://deploy.workers.cloudflare.com/?url=https://github.com/Yuiyuki95/ken-story-studio/tree/main/ollama-relay)

1. 打开上面的部署入口，登入或注册 Cloudflare，并依页面连接自己的 GitHub 账号。选择 Workers Free，部署本仓库独立的 `ollama-relay` 子目录。不需要把 Ollama 金钥交给 Cloudflare 设置。
2. 部署成功后打开 Worker 根网址，复制页面显示的 `apiBase`，格式为 `https://你的-worker.workers.dev/v1`。
3. 工作台「连接与同步」→ 文字服务选 **自定义 / OpenAI 兼容 API**，基础网址填上面的转接 `apiBase`，模型填 `gemma4:31b`，金钥填自己的 Ollama API 金钥。
4. 按「测试文字连接」。成功后可生成剧情、对话、角色资料。免费模型和剩余额度以 Ollama 账号为准；图片服务另行设置。

部署程序和检查说明见 [ollama-relay/README.md](ollama-relay/README.md)。转接固定使用 Ollama 官方接口，只允许本工作台的 GitHub 来源，不存储金钥、请求内容或启用应用日志，不是共享 AI 金钥。跨域来源限制不是用户身份认证，每次调用仍要提供自己的 Ollama 金钥。网页偏好、项目、同步和备份均不保存金钥。

**当前完成状态：** 转接代码、模拟验证和网页修正已完成；尚未部署到你的 Cloudflare 账号，也未使用你的金钥做真实推理。曾尝试私人托管后端，但当前执行环境的 Git 托管连接失败，因此没有可用的私人版网址。不要把创建成功的空站点当成已部署服务。

官方参考：
- https://docs.ollama.com/cloud
- https://docs.ollama.com/api/openai-compatibility
- https://docs.ollama.com/capabilities/structured-outputs
- https://developers.cloudflare.com/workers/platform/deploy-buttons/
- https://developers.cloudflare.com/workers/platform/pricing/
