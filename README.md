# [pet] 养成计划 · Discord Activity 联机版

整个游戏（网页 + 后端）现在由 **一个 Python 程序** 提供，只用一个端口（8000）、一个域名。

## 一、本机试玩（两个玩家）

1. 把本文件夹放在任意位置，需要电脑装了 Python 3.11+（安装时勾选 *Add python.exe to PATH*）。
2. **双击 `start_game.bat`**。第一次会自动建环境、装依赖（要联网，约 1–2 分钟）。
3. 自动弹出两个浏览器标签页：每个标签页就是一个玩家。左上角能看到两个玩家名。
4. 黑色窗口不要关；关掉它就停止游戏。

> 不需要自己敲任何命令。`.env` 也会自动生成。

### 手动创建虚拟环境（可选）

如果不使用批处理文件，也可以在 `changedgame` 目录中手动创建和使用虚拟环境：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

依赖清单位于 `backend\requirements.txt`。`.venv`、`venv` 和 `env` 都是本地虚拟环境目录，不应提交到 Git。

## 二、放到 Discord 里玩

1. 先双击 `start_game.bat`（保持运行）。
2. 再双击 `start_tunnel.bat`（第一次会自动安装 cloudflared，装完关掉窗口再双击一次）。窗口里会出现一行 `https://xxxx.trycloudflare.com`。
3. 打开 <https://discord.com/developers/applications>，进入你的应用：
   - **Activities → Settings**：开启 *Enable Activities*。
   - **Activities → URL Mappings**：`Prefix` 填 `/`，`Target` 填 `xxxx.trycloudflare.com`（**只要域名**，不要 `https://`，不要结尾的 `/`）。
   - **OAuth2**：复制 *Client ID*；点 *Reset Secret* 复制 *Client Secret*；在 *Redirects* 里添加 `https://127.0.0.1`。
4. 打开 `backend\.env`（用记事本），填：
   ```env
   DISCORD_CLIENT_ID=你的ClientID
   DISCORD_CLIENT_SECRET=你的ClientSecret
   ```
   保存后，把 `start_game.bat` 的黑窗口关掉再重新双击一次。**Client Secret 只能写在这里，不要发给别人、不要提交到 Git。**
5. Discord 客户端：设置 → 高级 → 打开开发者模式。进入一个语音频道，点“活动（火箭）”按钮，选你的应用即可。

**每次重开 `start_tunnel.bat`，域名都会变**。只需要回到 URL Mappings 改一处 `Target`，其他都不用动。

填不填 Client ID / Secret 的区别：不填也能玩，玩家名是随机的 `Player 123`；填了则显示 Discord 昵称。

## 三、联机规则

- 所有人进入同一局游戏，没有房间。所有人都离开后，下次进来重新开始。
- 喂食、挖矿、订阅、黑市、回归现实、鞭打：任何人随时可点，结果共享。
- 黑市每天刷新，全场只能拿一件。
- 【下一天】：所有在线玩家都点了才会进入下一天（按钮上会显示 1/2）。
- Day 3：每位玩家都要对 whip[pet] 投票，全员“是”才安装，任何一个“否”就拒绝。
- Day 5：所有人各自看结局；全部看完后自动重新开始新的一局。
- 有人中途掉线或关页面，不会卡住进度。

## 四、常见问题

| 现象 | 处理 |
|---|---|
| 双击 bat 提示找不到 `backend\app\main.py` | bat 必须放在 `changedgame` 文件夹里（和 `index.html` 同级）。 |
| 提示找不到 Python | 安装 Python，并勾选 *Add python.exe to PATH*。 |
| `address already in use` | 已经开着一个黑窗口了，先关掉再开。 |
| 公告一直是“正在加载” | 按 F12 → Console 看红字；同时确认 `lang` 文件夹在 `changedgame` 里。 |
| Discord 里一直转圈 | 检查 `.env` 里 `DISCORD_CLIENT_ID` 是否填了、是否重启过服务。 |
| Discord 里提示无法连接 | URL Mappings 的 Target 是否是**当前**隧道域名（重开隧道会变）。 |

## 五、文件说明

- `backend/app/main.py`：后端（游戏规则、联机、同时提供网页、Discord 登录换取）。
- `index.html` `game.js` `multiplayer.js` `i18n.js` `config.js` `discord.js`：前端。
- `vendor/discord-sdk.mjs`：Discord 官方 Embedded App SDK（已打包成单个文件，Discord 里不能从外网加载脚本）。
- `run_game.py`：前端静态文件服务器；使用 `start_game.bat` 时不需要单独启动。
- `backend/requirements.txt`：后端运行所需的 Python 依赖。
- `backend/.env.example`：环境变量模板；实际配置保存在不会提交的 `backend/.env`。

## 六、正式上线（以后）

目前房间状态存在 Python 进程内存里，只适合单实例。正式部署时：用固定域名 + 反向代理（要支持 WebSocket）、把状态放进 Redis、对 `/ws/activity` 做连接数限制。
