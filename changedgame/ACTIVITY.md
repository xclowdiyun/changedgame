# Discord Activity 多人开发说明 / Discord Activity Multiplayer Guide

当前游戏的唯一项目根目录是 `changedgame/`。前端继续使用现有 HTML、CSS 和 JavaScript，共享状态由 `backend/app/main.py` 维护。  
The only active project root is `changedgame/`. The frontend keeps the existing HTML, CSS, and JavaScript, while shared state is maintained by `backend/app/main.py`.

## 本地安装 / Local installation

需要 Python 3.11 或更高版本。  
Python 3.11 or newer is required.

```powershell
cd D:\apiandyiyou\discord_petgame\changedgame
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

`.env` 位于 `changedgame/backend/.env`。`.env.example` 只是模板；真正的 `.env` 已被 `.gitignore` 忽略，不要提交到 Git。  
The `.env` file is located at `changedgame/backend/.env`. `.env.example` is only a template; the real `.env` is ignored by `.gitignore` and must not be committed.

本机多人测试目前只需要：  
For local multiplayer testing, use:

```env
HOST=127.0.0.1
PORT=8000
FRONTEND_ORIGIN=http://127.0.0.1:5173
```

创建 Discord 应用后，再把 Client ID 等值填入同一个 `backend/.env`。当前代码尚未完成 Discord 用户身份验证，所以本机测试不要随便填写 Client Secret。  
After creating the Discord application, put the Client ID and other values in `backend/.env`. Discord identity verification is not complete yet, so do not invent a Client Secret for local testing.

## 启动服务 / Start services

终端一：启动 Python WebSocket 后端。  
Terminal 1: start the Python WebSocket backend.

```powershell
cd D:\apiandyiyou\discord_petgame\changedgame
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

终端二：启动前端。  
Terminal 2: start the frontend.

```powershell
cd D:\apiandyiyou\discord_petgame\changedgame
python run_game.py --port 5173
```

后端健康检查：`http://127.0.0.1:8000/health`  
Backend health check: `http://127.0.0.1:8000/health`

前端的实时连接和剧情数据都通过 `window.PET_GAME_BACKEND_URL` 指向后端。Cloudflare 临时域名变化后，只需修改 `index.html` 中这一行并重新启动前端隧道。  
Realtime connections and game data use `window.PET_GAME_BACKEND_URL`. When a temporary Cloudflare URL changes, update this line in `index.html` and restart the frontend tunnel.

```html
<script>window.PET_GAME_BACKEND_URL = "https://你的后端隧道.trycloudflare.com";</script>
```

不要把 `DISCORD_CLIENT_SECRET`、Bot Token 或其他私钥放进前端配置。  
Never put `DISCORD_CLIENT_SECRET`, a Bot Token, or any other secret in frontend configuration.

前端隧道只负责页面和静态文件；后端隧道负责 `/health`、`/api/data/zh`、`/api/data/en`、`/api/catalog` 和 `/ws/activity`。公告、语言 JSON 和结局 JSON 都从后端 API 获取。  
The frontend tunnel serves the page and static files. The backend tunnel serves `/health`, `/api/data/zh`, `/api/data/en`, `/api/catalog`, and `/ws/activity`. Announcements, language JSON, and ending JSON are fetched from the backend API.

## 当前多人规则 / Multiplayer rules

- Activity 中所有连接的用户自动进入同一个 `activity` 游戏状态，不提供创建房间按钮。  
  All users connected to the Activity automatically share the `activity` game state; there is no room-creation button.
- 左上角显示在线玩家。状态条固定显示、不可关闭，并可以拖动。  
  Online players appear in the top-left bar. It cannot be closed, but it can be dragged.
- 喂食、挖矿、订阅、回归现实和鞭打可以由任何玩家随时操作，结果累加到共享状态。  
  Any player may feed, mine, subscribe, return to reality, or whip at any time; results accumulate in the shared state.
- 每条玩家操作会出现在终端和事件列表中，并使用蓝色显示；事件使用语言 key，因此中英文切换仍然生效。  
  Every player action appears in the terminal and event list in blue; language keys keep these events translatable.
- 点击“下一天”只会登记当前玩家已完成。所有在线玩家都登记后才进入下一天。  
  Clicking “Next Day” only marks the current player as ready. The next day begins after every online player is ready.
- Day 3 的 whip pet 需要全员投票，只有全员赞成才安装；任何反对票都会拒绝。  
  The Day 3 whip-pet decision requires a unanimous vote; any no vote rejects the installation.
- JSON 剧情和语言数据由 Python 后端读取，前端通过 `/api/data/{language}` 获取需要的数据。  
  The Python backend reads the JSON story and language data; the frontend requests data through `/api/data/{language}`.

## Discord Activity 配置 / Discord Activity configuration

1. 在 Discord Developer Portal 创建应用并启用 Embedded App / Activity。  
   Create an application in the Discord Developer Portal and enable Embedded App / Activity.
2. 将前端的 HTTPS 地址配置为 Activity URL。  
   Set the frontend HTTPS address as the Activity URL.
3. 配置 URL Mapping，把后端域名映射到后端公网地址。  
   Configure URL Mapping so the backend domain routes to the public backend.
4. 前端接入 Discord Embedded App SDK 后，将已验证的用户显示名写入 `window.discordUser`。  
   After integrating the Discord Embedded App SDK, put the verified display name in `window.discordUser`.
5. 不要在浏览器中使用 Bot Token 或 Client Secret。  
   Never use a Bot Token or Client Secret in the browser.

环境变量写在 `backend/.env`。  
Environment variables belong in `backend/.env`.

```env
HOST=127.0.0.1
PORT=8000
FRONTEND_ORIGIN=http://127.0.0.1:5173
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=
DISCORD_REDIRECT_URI=
```

认证字段只有在接入 Discord SDK 的后端验证流程时才必须配置；当前本地多人开发只要求 `FRONTEND_ORIGIN`。  
Authentication fields are required only when backend Discord SDK verification is connected; local multiplayer development currently needs only `FRONTEND_ORIGIN`.

## 本地 HTTPS 和网络隧道 / Local HTTPS and tunnels

Discord Activity 页面通常要求 HTTPS。你不需要购买域名；Cloudflare Quick Tunnel 会临时生成两个 `trycloudflare.com` 域名，每次重启都可能变化。  
Discord Activity pages usually require HTTPS. You do not need to buy a domain; Cloudflare Quick Tunnel creates two temporary `trycloudflare.com` domains, which may change after every restart.

请保持四个终端窗口运行，不要关闭。  
Keep all four terminal windows open.

终端 1：Python 后端 / Terminal 1: Python backend

```powershell
cd D:\apiandyiyou\discord_petgame\changedgame
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

终端 2：前端服务器 / Terminal 2: frontend server

```powershell
cd D:\apiandyiyou\discord_petgame\changedgame
python run_game.py --port 5173
```

终端 3：后端隧道 / Terminal 3: backend tunnel

```powershell
cloudflared tunnel --url http://127.0.0.1:8000
```

复制输出的 `https://xxxxx.trycloudflare.com`，作为后端域名。  
Copy the `https://xxxxx.trycloudflare.com` URL from the output as the backend URL.

终端 4：前端隧道 / Terminal 4: frontend tunnel

```powershell
cloudflared tunnel --url http://127.0.0.1:5173
```

复制输出的 `https://yyyyy.trycloudflare.com`，作为前端域名。  
Copy the `https://yyyyy.trycloudflare.com` URL from the output as the frontend URL.

把终端 3 的后端域名填入 [index.html](./index.html)：  
Put the backend URL from Terminal 3 into [index.html](./index.html):

```js
window.PET_GAME_BACKEND_URL = "https://xxxxx.trycloudflare.com";
```

保存后重启终端 2 和终端 4，最后把终端 4 的前端域名填入 Discord Activity URL。  
Save the file, restart Terminals 2 and 4, then put the frontend URL from Terminal 4 into Discord Activity URL.

HTTPS 页面连接后端时必须使用 `wss://`；代码会自动把后端的 `https://` 地址转换为 `wss://`。  
HTTPS pages must use `wss://` for the backend connection; the code automatically converts the configured backend `https://` URL to `wss://`.

### 域名变化后的固定操作 / What to do when a tunnel URL changes

1. 重新运行终端 3，复制新的后端域名。  
   Restart Terminal 3 and copy the new backend URL.
2. 修改 `index.html` 的 `window.PET_GAME_BACKEND_URL`。  
   Update `window.PET_GAME_BACKEND_URL` in `index.html`.
3. 重新运行终端 4，复制新的前端域名。  
   Restart Terminal 4 and copy the new frontend URL.
4. 将 Discord Developer Portal 的 Activity URL 改成新的前端域名。  
   Change the Activity URL in the Discord Developer Portal to the new frontend URL.
5. 不需要修改本地 `backend/.env` 的 `FRONTEND_ORIGIN`；正式固定域名才需要追加正式前端地址。  
   You do not need to change the local `backend/.env` `FRONTEND_ORIGIN`; add the production frontend URL only when using a fixed domain.

## 在 Discord 中启动 / Launch in Discord

保存 Activity URL 和 URL Mapping 后，在目标 Discord 服务器的语音频道或支持 Activity 的频道中打开应用。加入同一个 Activity 的用户会自动出现在左上角在线条中，并共享同一局游戏。  
After saving the Activity URL and URL Mapping, open the application in a voice channel or another Activity-enabled channel on the target Discord server. Users in the same Activity automatically appear in the online bar and share one game.

## 公网部署 / Public deployment

前端可部署到静态托管或 CDN，Python 服务可部署到支持 WebSocket 的容器或虚拟机。  
The frontend can be deployed to static hosting or a CDN; the Python service can run in a WebSocket-capable container or virtual machine.

```text
HTTPS frontend -> reverse proxy -> FastAPI / Uvicorn
WSS /ws/activity -> same backend
```

生产环境需要：  
For production:

- 将 `FRONTEND_ORIGIN` 改为实际 Activity 来源。  
  Set `FRONTEND_ORIGIN` to the real Activity origin.
- 配置 Discord 应用的正式 URL、Client Secret 和签名验证。  
  Configure the production Discord URL, Client Secret, and signature verification.
- 使用 Redis 或其他共享存储替代当前单进程内存房间，以支持多实例。  
  Replace the current in-memory room with Redis or another shared store for multiple instances.
- 为 WebSocket 设置心跳、断线重连和连接数限制。  
  Add WebSocket heartbeats, reconnect handling, and connection limits.
- 不把 `backend/.env` 提交到版本库。  
  Never commit `backend/.env`.
