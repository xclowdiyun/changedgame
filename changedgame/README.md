# [pet] 养成计划 · Discord 联机版 使用说明

> ⚠️ ngrok 免费版会给浏览器访问套一层提醒页，在 Discord 里会白屏。**推荐改用云托管：看 `DEPLOY_RENDER.md`**（固定域名、不用开电脑）。下面的 ngrok 步骤仅在你有 ngrok 付费版时使用。

只需要 **一个** ngrok 域名（网页和后端已经合在一起了）。

---

## 第一次：配置 ngrok（只做一次）

**你之前配置过 ngrok 的话不用重配**：authtoken 保存在电脑的全局配置里，不属于某个文件夹，在本项目里也能直接用。

1. 双击 `setup_ngrok.bat`。它会先显示当前 ngrok 配置（能看到 token 是否已配置）。
2. **STEP 1**：以前配过就直接回车跳过；没配过，到 <https://dashboard.ngrok.com/get-started/your-authtoken> 复制 token 粘贴进去。
3. **STEP 2（强烈推荐）**：到 <https://dashboard.ngrok.com/domains> 领取你账号的免费固定域名（形如 `xxxx-xxxx.ngrok-free.app`），粘贴进去。
   有了固定域名，Discord 后台只需要填一次，以后再也不用改。
4. 如果提示找不到 ngrok：先运行 `start_tunnel.bat`，它会问你要不要用 winget 自动安装。

想知道 ngrok 装在哪：打开命令提示符输入 `where ngrok`。

## 第一次：Discord 和 Python 的准备（只做一次）

1. 安装 Python 3.11+（<https://www.python.org/downloads/>），勾选 **Add python.exe to PATH**。
2. Discord 开发者后台 → 你的应用：
   - **Activities → Settings**：打开 *Enable Activities*
   - **Activities → URL Mappings**：`Prefix` 填 `/`，`Target` 填你的 ngrok 域名（**不要 `https://`**）
   - **OAuth2**：复制 *Client ID*；*Reset Secret* 得到 *Client Secret*；*Redirects* 里添加 `https://127.0.0.1`
3. 用记事本打开 `backend\.env`（第一次运行 bat 后自动生成），填入：
   ```env
   DISCORD_CLIENT_ID=你的ClientID
   DISCORD_CLIENT_SECRET=你的ClientSecret
   ```
   （不填也能玩，只是玩家名是随机的；Secret 不要发给别人。）

---

## 每次想玩：1 步

**双击 `start_all.bat`**，会打开两个黑窗口（都不要关）：

- `Pet Game Server`：游戏本体（同时自动打开两个浏览器标签，可先本机试玩）
- `ngrok Tunnel`：公网隧道

然后在 Discord 进入语音频道 → 点“活动（火箭）”→ 选你的应用 → 朋友点“加入”。

> 电脑必须开着、两个黑窗口不能关，别人才能玩。
> 没设固定域名的话，每次域名都会变：看 ngrok 窗口里的 `Forwarding https://xxxx.ngrok-free.app`，把 `xxxx.ngrok-free.app` 填回 URL Mappings 的 Target。

也可以分开启动：先 `start_game.bat`，再 `start_tunnel.bat`。

朋友进不去？应用没发布时通常只有开发团队成员能用：在开发者后台把朋友加为团队成员 / 测试者。

---

## 游戏里怎么操作

- **左上角在线条**：按住拖到任意位置；**双击自己的名字**改名（回车确认，Esc 取消）。名字旁的 ✓ 表示已点“下一天”。
- **共享的**：宠物数值、粉末、库存、事件，所有人的操作都同步显示在每个人的终端里。
- **每个人各自限制的**：黑市每天 1 件、挖矿每天 5 次、鞭打每天 3 次、回归现实每天 1 次、订阅 1 次。
- **下一天**：所有在线玩家都点了才进入下一天。
- **Day 3 whip[pet]**：每人投票，全员“是”才安装。
- **Day 5 结局**：每人各自看结局，全部看完后自动开始新的一局。
- **断线 / 刷新页面不会丢进度**：断线后服务器会保留你的位置和各项次数 90 秒，90 秒内回来接着玩，次数不会重置（刷新页面也一样）。所有人都离开超过 90 秒后，这一局才会清空。
- **有人挂机不会卡死游戏**：离线的人不影响“下一天”、投票和结局；在线但不动的人，等 45 秒后，已经操作完的玩家会在左上角看到“跳过未响应的玩家”按钮。
- **投票开始后才加入的人**这一轮不参与投票。
- **每个 Discord 活动（语音频道）是独立的一局**，不同服务器、不同频道不会互相影响。

---

## 出问题时

| 现象 | 处理 |
|---|---|
| ngrok 窗口报 `ERR_NGROK_4018` | 还没配 token → 运行 `setup_ngrok.bat` |
| 报 `ERR_NGROK_108` | 别处还开着一个 ngrok（免费版同时只能 1 个）→ 关掉旧的 |
| 报 `unknown flag --url` | ngrok 太旧 → 命令提示符运行 `ngrok update` |
| 报域名无效 / 不属于你 | `backend\.env` 里的 `NGROK_DOMAIN` 写错 → 重新运行 `setup_ngrok.bat` |
| 浏览器访问 ngrok 域名先出现一个“Visit Site”提示页 | 这是 ngrok 免费版的提醒页，点一下即可；若 Discord 里一直转圈，告诉我 |
| Discord 里连不上 | Target 是不是当前域名，不要带 `https://` |
| Discord 里一直转圈 | 检查 `.env` 的 `DISCORD_CLIENT_ID`，改完要重启游戏窗口 |
| 提示找不到 `backend\app\main.py` | bat 文件必须在 `changedgame` 文件夹里 |
| `address already in use` | 已经开着一个游戏窗口了，先关掉旧的 |

## 文件说明

`start_all.bat` 一键启动 · `start_game.bat` 游戏 · `start_tunnel.bat` ngrok 隧道 · `setup_ngrok.bat` 配置向导 · `backend/app/main.py` 后端 · `index.html` `game.js` `multiplayer.js` `i18n.js` `online.css` `config.js` `discord.js` 前端 · `vendor/discord-sdk.mjs` Discord 官方 SDK
