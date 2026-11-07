# 把游戏放到 Render（不用再开电脑、不用隧道）

放上去之后你会得到一个固定的 `https://xxxx.onrender.com` 域名，Discord 后台只填一次。
需要：一个 GitHub 账号、一个 Render 账号（都免费，Render 免费服务不需要信用卡）。

> 为什么不用 ngrok：ngrok 免费版会给浏览器访问先套一层“Visit Site”提醒页，Discord 里就变成白屏，只有付费才能去掉。

---

## 第 1 步：把项目放到 GitHub（用 GitHub Desktop，不用敲命令）

1. 注册 <https://github.com>，再下载安装 **GitHub Desktop**（<https://desktop.github.com>），用你的账号登录。
2. GitHub Desktop 菜单：**File → Add local repository…** → 选你的 `changedgame` 文件夹。
   如果提示“这不是一个仓库”，点蓝色的 **create a repository**，直接点 Create。
3. 左下角 Summary 里随便写个标题（比如 `first`），点 **Commit to main**。
4. 点上方的 **Publish repository**，**保持勾选 “Keep this code private”**，点 Publish。

自检：`.gitignore` 已经把 `backend\.env`（里面有你的 Client Secret）排除了，不会被上传。
你可以在 GitHub 网页上打开这个仓库，确认里面**没有** `.env` 文件。

## 第 2 步：在 Render 上创建服务

1. 打开 <https://render.com>，**Sign up → 用 GitHub 登录**，授权它读取你刚发布的仓库。
2. 右上角 **New + → Web Service**，选你的仓库（Git Provider 那一栏）。
3. 按下面填写，没提到的保持默认：

   | 项目 | 填什么 |
   |---|---|
   | Name | 随便，比如 `pet-game`（会变成域名的一部分） |
   | Region | **Singapore** |
   | Branch | `main` |
   | Runtime / Language | **Python 3** |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | **Free** |

4. 往下找到 **Environment Variables**，添加两个（这里才是填 Secret 的地方）：
   - `DISCORD_CLIENT_ID` = 你的 Client ID
   - `DISCORD_CLIENT_SECRET` = 你的 Client Secret
5. 点 **Deploy Web Service**。等几分钟，日志出现 `Your service is live` 就成功了。
6. 页面左上角会显示你的域名，形如 `https://pet-game-abcd.onrender.com`。**先在浏览器打开它**，能看到游戏就对了。

## 第 3 步：填到 Discord

开发者后台 → 你的应用 → **Activities → URL Mappings**：

| Prefix | Target |
|---|---|
| `/` | `pet-game-abcd.onrender.com`（只要域名，不带 `https://`） |

然后在 Discord 语音频道里启动活动，邀请朋友加入。这个域名是固定的，以后不用再改。

---

## 要知道的事

- **会休眠**：免费服务在 15 分钟没有任何访问后会休眠，再次打开要等约 1 分钟。大家在玩的时候，网页每 25 秒发一次心跳，不会休眠。
  所以**开局前，先用浏览器打开一次你的 onrender 域名，等游戏页面出来，再在 Discord 里启动活动**，否则第一次可能白屏或转圈。
- **每月流量**免费额度有限（约 5GB），几个朋友玩是够的。
- 服务重启（休眠后唤醒、重新部署）后，游戏进度会重置，这是正常的。
- **以后改了代码**：在 GitHub Desktop 里 Commit，再点 **Push origin**，Render 会自动重新部署。
- 想在自己电脑上测试，仍然可以双击 `start_game.bat`。
- Render 的免费政策可能变动，以官网为准。

## 出问题时

| 现象 | 处理 |
|---|---|
| Render 日志里 `Could not open requirements.txt` | 仓库里没有 `requirements.txt`，确认它在仓库最外层，重新 Commit + Push |
| 日志里 `找不到数据文件` | `lang` 文件夹没被上传，检查 GitHub 仓库里有没有 `lang` |
| 域名打开是 `Not Found` | 仓库里缺 `index.html`，或 Start Command 写错了 |
| Discord 白屏/转圈 | 先用浏览器打开域名唤醒；再确认 Target 没带 `https://`、没有多余的 `/` |
| Discord 里看不到真实昵称 | 检查 Render 的两个环境变量是否填对（改完 Render 会自动重启） |
