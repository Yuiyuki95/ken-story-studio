# KEN Story Studio — Ollama 转接

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Yuiyuki95/ken-story-studio/tree/main/ollama-relay)

Ollama 云端不允许 GitHub Pages 网页直接跨域调用。此独立 Worker 仅转接文字生成与模型清单，保持原有 GitHub 网页入口。

1. 点击上面的部署按钮，登入或注册自己的 Cloudflare 账号，并依页面连接 GitHub。使用 Workers Free 即可先试。
2. 接受本转接目录的设置并部署。不需要把 Ollama 金钥填进 Cloudflare，也没有共享 AI 金钥。
3. 部署成功后打开 Worker 的根网址，页面会显示 `apiBase`，例如 `https://你的-worker.workers.dev/v1`。
4. 回到 KEN Story Studio，文字服务选择「自定义 / OpenAI 兼容 API」，基础网址填上面的 `apiBase`，模型填 `gemma4:31b`，金钥仍填写你自己的 Ollama 金钥，再测试。

默认只允许来自 `https://yuiyuki95.github.io` 的网页。如果工作台使用其他域名，在 Worker 的 `ALLOWED_ORIGIN` 改成该网页的完整 origin（协议+域名，不含路径）。它只限制浏览器跨域来源，不是身份认证；每次调用仍必须提供自己的 Ollama API 金钥。

程序没有数据库、日志调用或凭证存储，关闭 Workers 观测日志，不回传上游错误原文。固定转发到 `https://ollama.com/v1/models` 或 `https://ollama.com/v1/chat/completions`，禁止任意目标、跟随重定向或调用其他 API。

来源：Cloudflare [部署按钮](https://developers.cloudflare.com/workers/platform/deploy-buttons/)与 [Workers 免费额度](https://developers.cloudflare.com/workers/platform/pricing/)。Ollama 模型权限和推理额度独立计算。

`node --test tests.mjs` 可运行模拟验证。代码已验证，尚未在你的 Cloudflare 账号部署，也未使用你的 Ollama 金钥做真实推理。
