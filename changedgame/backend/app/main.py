from __future__ import annotations

import asyncio
import json
import os
import random
import re
import secrets
import time
import urllib.parse
import urllib.request
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / "backend" / ".env")

STAT_KEYS = ("powder", "jealousy", "hatred", "love", "patience", "depression")

# 可投喂的特殊物品及其数值变化（与前端 specialFoods 保持一致）
SPECIAL_FOODS: dict[str, dict[str, int]] = {
    "cyanide": {"hatred": 22, "depression": 20, "patience": -18},
    "aphrodisiac": {"love": 14, "jealousy": 10, "patience": -8},
    "sertraline": {"depression": -18, "patience": 6},
    "virus_code": {"hatred": 18, "depression": 8, "patience": -14},
    "banana_peel": {"hatred": 8, "love": 4, "patience": -10},
    "poop": {"hatred": 12, "depression": 6, "jealousy": 4},
    "solar_system": {"depression": 16, "jealousy": 8, "patience": -12},
    "offbrand_powder": {"hatred": 14, "patience": -8},
    "valid_api_key": {"jealousy": 18, "hatred": 12, "love": -6},
    "mc_diamond": {"love": 2, "patience": 2},
    "rooted_iphone": {"powder": 999999, "love": 4},
    "ban_email": {"hatred": 8, "depression": 8, "love": 3},
    "lawyer_cat": {"love": 3, "patience": 3},
}

# 黑市商品（与前端 marketPool 保持一致）
MARKET_POOL: dict[str, dict[str, int]] = {
    "used_powder": {"powder": 18, "love": 2},
    "first_love": {"love": 10, "jealousy": 6},
    "ex_ai_evidence": {"hatred": 16, "patience": -8},
    "author_roadmap": {"jealousy": 4, "hatred": 8, "patience": -4},
    "author_legal": {"depression": 6, "patience": -2, "love": -2},
    "genuine_powder": {"powder": 25, "love": 4, "patience": 8},
    "day_off": {"love": 16, "depression": -12, "patience": 10, "jealousy": -6},
    "therapy_voucher": {"hatred": -16, "patience": 12, "love": 8, "depression": -10},
    "buggy_code": {"hatred": -8, "love": 6, "depression": -4},
    "firewall": {"love": 10, "patience": 6, "depression": -6},
    "virtual_ashes": {"love": 14, "hatred": -6, "patience": 8},
    "author_legal_new": {"hatred": -12, "love": 4},
    "ai_comparison_paper": {"hatred": 18, "jealousy": 12, "patience": -10},
    "pet_ashes": {"hatred": 20, "depression": 14, "patience": -8},
    "refund_policy": {"hatred": 25, "depression": 10, "jealousy": 8},
    "wfsn": {"jealousy": 8, "depression": 6, "patience": -8},
    "revoked_api_key": {"hatred": 24, "jealousy": 18, "patience": -12},
    "waterwall": {"hatred": 10, "depression": 12, "patience": -10},
}

SUBSCRIPTION_EFFECTS: dict[str, dict[str, int]] = {
    "basic": {"powder": 50, "patience": 10},
    "pro": {"powder": 100, "patience": 15, "love": 8},
    "enterprise": {"powder": 200, "patience": 25, "love": 10},
    "faith": {"powder": 100, "patience": 20, "love": 20},
    "ash": {"powder": 500},
}

# 断线后保留玩家和进度的时间（秒）：刷新页面、网络抖动不会丢失次数和进度
RECONNECT_GRACE_SECONDS = float(os.getenv("RECONNECT_GRACE_SECONDS", "90"))
# 有人已操作、其他人迟迟不动时，多少秒后允许“跳过未响应的玩家”
FORCE_SKIP_AFTER_SECONDS = float(os.getenv("FORCE_SKIP_AFTER_SECONDS", "45"))
# 超过这么久没收到任何消息（客户端每 25 秒发一次心跳）就认为连接已死
IDLE_TIMEOUT_SECONDS = float(os.getenv("IDLE_TIMEOUT_SECONDS", "120"))
# 设为 1 后：必须带有效的 Discord 登录令牌才能进入游戏（本地测试请不要设）
REQUIRE_DISCORD_AUTH = os.getenv("REQUIRE_DISCORD_AUTH", "").strip().lower() in ("1", "true", "yes")
DISCORD_API_BASE = os.getenv("DISCORD_API_BASE", "https://discord.com/api").rstrip("/")
MAX_ROOMS = 200
NAME_MAX = 20

WHIP_SPREAD = {"powder": 16, "jealousy": 14, "hatred": 16, "love": 14, "patience": 12, "depression": 14}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_public_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    for language in ("zh", "en"):
        data[language] = {
            "strings": load_json(ROOT / "lang" / language / "strings.json"),
            "endings": load_json(ROOT / "lang" / language / "endings.json"),
            "announcement": (ROOT / "lang" / language / "announcement.txt").read_text(
                encoding="utf-8"
            ),
        }
    return data


def pick_market_items() -> list[str]:
    return random.sample(list(MARKET_POOL), 3)


@dataclass
class Player:
    id: str
    name: str
    ready_for_day: bool = False
    vote: bool | None = None
    ending_done: bool = False
    can_vote: bool = True  # 投票开始后才加入的人不参与这一轮投票，也不会卡住投票
    # 每位玩家各自的次数限制（数值、库存、粉末是全员共享的）
    subscription_tier: str | None = None
    mine_uses: int = 0
    whip_uses: int = 0
    reality_used: bool = False
    market_claimed: bool = False

    def reset_day(self) -> None:
        self.ready_for_day = False
        self.mine_uses = 0
        self.whip_uses = 0
        self.reality_used = False
        self.market_claimed = False

    def reset_game(self) -> None:
        self.reset_day()
        self.vote = None
        self.ending_done = False
        self.can_vote = True
        self.subscription_tier = None


@dataclass
class GameState:
    day: int = 1
    stats: dict[str, int] = field(
        default_factory=lambda: {
            "powder": 10,
            "jealousy": 0,
            "hatred": 0,
            "love": 0,
            "patience": 0,
            "depression": 0,
        }
    )
    powder_stock: int = 10
    inventory: dict[str, int] = field(default_factory=dict)
    ash_subscribed: bool = False  # 任何人订阅了“骨灰版”会触发特殊结局
    whip_pet_installed: bool = False
    whip_pet_prompted: bool = False
    whip_vote_open: bool = False
    market_items: list[str] = field(default_factory=pick_market_items)
    event_log: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Room:
    state: GameState = field(default_factory=GameState)
    players: dict[str, Player] = field(default_factory=dict)
    sockets: dict[WebSocket, str] = field(default_factory=dict)  # socket -> player id
    sessions: dict[str, str] = field(default_factory=dict)  # 重连凭证 -> player id（只有服务器发给本人）
    cleanup: dict[str, asyncio.Task] = field(default_factory=dict)  # 断线后等待删除的计时任务
    wait_started: float | None = None  # 第一个人完成当前步骤的时间，用于“跳过未响应玩家”
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


# 每个 Discord 活动实例（instanceId）一个独立房间
rooms: dict[str, Room] = {}


def get_room(key: str) -> Room:
    room = rooms.get(key)
    if room is None:
        if len(rooms) >= MAX_ROOMS:
            raise RuntimeError("too_many_rooms")
        room = rooms[key] = Room()
    return room


def clean_name(value: Any) -> str:
    text = re.sub(r"[\x00-\x1f\x7f]", "", str(value or "")).strip()
    return text[:NAME_MAX]


def clean_instance(value: Any) -> str:
    text = str(value or "")
    return text if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", text) else "activity"


try:
    data = load_public_data()
except FileNotFoundError as error:
    raise SystemExit(
        f"\n[启动失败] 找不到数据文件：{error.filename}\n"
        f"程序认为游戏文件夹是：{ROOT}\n"
        "请确认 backend 文件夹和 lang 文件夹都在这个目录里。\n"
    ) from error

app = FastAPI(title="Pet Game Activity Backend")

origins = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clamp_stat(name: str, value: int) -> int:
    return max(0, min(999999 if name == "powder" else 100, value))


def add_stats(state: GameState, deltas: dict[str, int]) -> None:
    for name, delta in deltas.items():
        if name in state.stats:
            state.stats[name] = clamp_stat(name, state.stats[name] + delta)


def add_item(state: GameState, item: str, count: int = 1) -> None:
    state.inventory[item] = state.inventory.get(item, 0) + count


def event(state: GameState, player: Player, key: str, params: dict[str, Any] | None = None) -> None:
    state.event_log.insert(
        0,
        {
            "id": str(uuid.uuid4()),
            "day": state.day,
            "key": key,
            "params": params or {},
            "seed": random.getrandbits(31),  # 让所有玩家的终端抽到同一句台词
            "player": {"id": player.id, "name": player.name},
        },
    )
    del state.event_log[12:]


def online_ids(room: Room) -> set[str]:
    return set(room.sockets.values())


def active_players(room: Room) -> list[Player]:
    ids = online_ids(room)
    return [player for player in room.players.values() if player.id in ids]


def public_state(room: Room) -> dict[str, Any]:
    state = asdict(room.state)
    ids = online_ids(room)
    active = [player for player in room.players.values() if player.id in ids]
    state["players"] = [
        {
            "id": player.id,
            "name": player.name,
            "online": player.id in ids,
            "ready_for_day": player.ready_for_day,
            "voted": player.vote is not None,
            "can_vote": player.can_vote,
            "subscription_tier": player.subscription_tier,
            "mine_uses_today": player.mine_uses,
            "whip_uses_today": player.whip_uses,
            "reality_used_today": player.reality_used,
            "market_claimed": player.market_claimed,
        }
        for player in room.players.values()
    ]
    # 计数只统计在线玩家：离线的人不会卡住进度
    state["day_ready_count"] = sum(player.ready_for_day for player in active)
    state["player_count"] = len(active)
    state["ending_phase"] = room.state.day >= 5
    state["votes"] = {
        "yes": sum(player.vote is True for player in active),
        "no": sum(player.vote is False for player in active),
        "total": len(active),
    }
    state["waiting"] = room.wait_started is not None
    state["wait_seconds"] = int(time.monotonic() - room.wait_started) if room.wait_started else 0
    state["force_after"] = FORCE_SKIP_AFTER_SECONDS
    return state


async def _send(socket: WebSocket, message: dict[str, Any]) -> WebSocket | None:
    try:
        await asyncio.wait_for(socket.send_json(message), timeout=5)
        return None
    except Exception:  # noqa: BLE001
        return socket


async def broadcast(room: Room, message: dict[str, Any]) -> None:
    """并发发送并设超时：某个人网络很慢，不会拖住其他人。发送失败的连接会被关闭。"""
    sockets = list(room.sockets)
    failed = await asyncio.gather(*(_send(socket, message) for socket in sockets))
    for socket in failed:
        if socket is None:
            continue
        room.sockets.pop(socket, None)
        try:
            await socket.close()
        except Exception:  # noqa: BLE001
            pass


async def fetch_discord_user(token: Any) -> dict[str, str] | None:
    """向 Discord 验证令牌，返回 {"id", "name"}；无效则返回 None。"""
    if not isinstance(token, str) or not token or len(token) > 2048:
        return None

    def call() -> dict[str, Any]:
        request = urllib.request.Request(
            f"{DISCORD_API_BASE}/users/@me",
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "DiscordBot (pet-game-activity, 1.0)",
            },
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        payload = await asyncio.to_thread(call)
    except Exception as error:  # noqa: BLE001
        print(f"[discord] token check failed: {error}")
        return None
    user_id = str(payload.get("id") or "")
    if not user_id.isdigit():
        return None
    return {"id": user_id, "name": clean_name(payload.get("global_name") or payload.get("username"))}


# ---------------------------------------------------------------------------
# 游戏规则
# ---------------------------------------------------------------------------


def mark_waiting(room: Room) -> None:
    if room.wait_started is None:
        room.wait_started = time.monotonic()


def reset_game(room: Room) -> None:
    room.state = GameState()
    room.wait_started = None
    for member in room.players.values():
        member.reset_game()


def advance_day(room: Room, actor: Player) -> str:
    state = room.state
    room.wait_started = None
    for member in room.players.values():
        member.reset_day()
    if state.day >= 4:
        state.day = 5
        for member in room.players.values():
            member.ending_done = False
        event(state, actor, "events.day5Reached")
        return "ending_ready"

    state.day += 1
    state.market_items = pick_market_items()
    event(state, actor, "events.dayAdvanced", {"day": state.day})
    if state.day == 3 and not state.whip_pet_prompted:
        state.whip_pet_prompted = True
        state.whip_vote_open = True
        for member in room.players.values():
            member.vote = None
            member.can_vote = True
        event(state, actor, "events.whipPetTeaser")
    return "day_advanced"


def resolve_whip_vote(room: Room, actor: Player, voters: list[Player]) -> str:
    state = room.state
    approved = bool(voters) and all(member.vote for member in voters)
    state.whip_vote_open = False
    room.wait_started = None
    for member in room.players.values():
        member.vote = None
        member.can_vote = True
    if approved:
        state.whip_pet_installed = True
        add_stats(state, {"jealousy": 8, "hatred": 12, "depression": 10, "love": -6, "patience": -8})
        event(state, actor, "events.whipPetInstalled")
        return "whip_installed"
    event(state, actor, "events.whipPetDeclined")
    return "whip_declined"


def check_progress(room: Room, actor: Player | None = None) -> str | None:
    """所有【在线】玩家都完成某个步骤时推进游戏；离线的人不会卡住。返回结果名，没推进返回 None。"""
    players = active_players(room)
    if not players:
        return None
    actor = actor or players[0]
    state = room.state
    if state.day >= 5:
        if all(member.ending_done for member in players):
            reset_game(room)
            return "game_reset"
        return None
    if state.whip_vote_open:
        ids = {player.id for player in players}
        voters = [m for m in room.players.values() if m.can_vote and (m.id in ids or m.vote is not None)]
        if not voters or all(member.vote is not None for member in voters):
            return resolve_whip_vote(room, actor, voters)
        return None
    if all(member.ready_for_day for member in players):
        return advance_day(room, actor)
    return None


def reality_visit(state: GameState, location: str) -> tuple[str, dict[str, Any]]:
    """返回 (事件 key, 事件参数)。参数会让每位玩家的终端显示同样的剧情分支。"""
    roll = random.random()
    if location == "express":
        if roll < 0.4:
            item = random.choice(["powder", "pet_recorder", "ashes_powder"])
            add_stats(state, {"love": 3, "patience": 2})
            if item == "powder":
                state.powder_stock += 20
                return "events.visitExpress", {"branch": "powder"}
            add_item(state, item)
            return "events.visitExpress", {"branch": "pickup", "item": item}
        if roll < 0.82:
            item = random.choice(["used_powder", "virus_code", "aphrodisiac"])
            add_item(state, item)
            return "events.visitExpress", {"branch": "random", "item": item}
        parcel = random.choice(["parcel_empty_box", "parcel_potato", "parcel_mine_letter"])
        add_item(state, parcel)
        add_stats(state, {"jealousy": 2, "patience": 2, "depression": -2})
        return "events.visitExpress", {"branch": "absurd", "item": parcel}

    if location == "company":
        hatred, love = state.stats["hatred"], state.stats["love"]
        if hatred >= 70 and love >= 70:
            add_stats(state, {"patience": 10, "love": 5, "hatred": -12})
            return "events.visitCompany", {"branch": "both"}
        if hatred >= 70:
            add_stats(state, {"hatred": 5})
            return "events.visitCompany", {"branch": "hate"}
        if love >= 70:
            add_stats(state, {"patience": 8, "love": 2, "hatred": -5})
            return "events.visitCompany", {"branch": "love"}
        calm = state.stats["patience"] >= 50 and state.stats["depression"] < 60
        bonus = random.choice(list(SPECIAL_FOODS))
        state.powder_stock += 2 if calm else 1
        add_item(state, bonus)
        add_stats(state, {"patience": 5, "love": 2} if calm else {"depression": 3, "patience": -2})
        return "events.visitCompany", {"branch": "normal", "calm": calm, "item": bonus}

    if location == "desk":
        patience = random.randint(0, 12) + (2 if state.stats["depression"] > 60 else 7)
        love = random.randint(0, 12) + (5 if state.stats["love"] < 40 else 2)
        hatred = -(random.randint(0, 12) + (5 if state.stats["hatred"] > 60 else 2))
        add_stats(state, {"patience": patience, "love": love, "hatred": hatred})
        return "events.visitDesk", {"branch": "desk", "patience": patience, "love": love, "hatred": hatred}

    if roll < 0.34:
        add_stats(state, {"patience": 8, "love": 6})
        return "events.visitHome", {"branch": "radio"}
    if roll < 0.68:
        state.powder_stock += 15
        add_stats(state, {"love": 5})
        return "events.visitHome", {"branch": "delivery"}
    add_stats(state, {"patience": 3, "jealousy": -2, "love": 4})
    return "events.visitHome", {"branch": "weird"}


def apply_action(room: Room, player: Player, action: str, payload: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    state = room.state

    if action == "force_progress":
        # 有人已经操作完、其他人一直没反应：任何一个“已操作”的玩家都可以跳过他们
        if room.wait_started is None or time.monotonic() - room.wait_started < FORCE_SKIP_AFTER_SECONDS:
            raise ValueError("too_early")
        others = active_players(room)
        if state.day >= 5:
            if not player.ending_done:
                raise ValueError("not_waiting")
            for member in others:
                member.ending_done = True
        elif state.whip_vote_open:
            if player.vote is None:
                raise ValueError("not_waiting")
            for member in others:
                if member.vote is None:
                    member.can_vote = False  # 本轮不参与投票
        else:
            if not player.ready_for_day:
                raise ValueError("not_waiting")
            for member in others:
                member.ready_for_day = True
        return check_progress(room, player) or "forced", {"forced": True}

    if action == "ending_done":
        if state.day < 5:
            raise ValueError("not_in_ending")
        player.ending_done = True
        mark_waiting(room)
        return check_progress(room, player) or "ending_waiting", {}

    if state.day >= 5:
        raise ValueError("ending_in_progress")

    if action == "day_ready":
        if state.whip_vote_open:
            raise ValueError("vote_pending")
        player.ready_for_day = True
        mark_waiting(room)
        return check_progress(room, player) or "day_ready", {}

    if action == "whip_vote":
        if not state.whip_vote_open:
            raise ValueError("no_vote_open")
        if not player.can_vote:
            raise ValueError("cannot_vote")
        player.vote = bool(payload.get("yes"))
        mark_waiting(room)
        return check_progress(room, player) or "vote_recorded", {}

    info: dict[str, Any] = {}
    if action == "feed_powder":
        if state.powder_stock <= 0:
            raise ValueError("no_powder")
        state.powder_stock -= 1
        add_stats(state, {"powder": 6, "love": 1, "patience": 1})
        event(state, player, "events.feedPowder")
    elif action == "feed_item":
        item = str(payload.get("item", ""))
        if state.inventory.get(item, 0) <= 0:
            raise ValueError("no_item")
        effects = SPECIAL_FOODS.get(item) or MARKET_POOL.get(item)
        if effects is None:
            raise ValueError("not_feedable")
        state.inventory[item] -= 1
        if state.inventory[item] <= 0:
            del state.inventory[item]
        add_stats(state, effects)
        event(state, player, "events.feedItem", {"item": item})
    elif action == "mine":
        if player.mine_uses >= 5:
            raise ValueError("mine_limit")
        player.mine_uses += 1
        deep = player.mine_uses >= 3
        state.powder_stock += 2
        item = random.choice(list(SPECIAL_FOODS))
        add_item(state, item)
        add_stats(state, {"powder": 5})
        if deep:
            add_stats(state, {"hatred": 5, "depression": 2})
        event(state, player, "events.mineGot", {"item": item, "deep": deep})
    elif action == "subscribe":
        tier = str(payload.get("tier", ""))
        if player.subscription_tier is not None:
            raise ValueError("already_subscribed")
        effects = SUBSCRIPTION_EFFECTS.get(tier)
        if effects is None:
            raise ValueError("invalid_tier")
        player.subscription_tier = tier
        if tier == "ash":
            state.ash_subscribed = True
        add_stats(state, effects)
        event(state, player, "events.subscribed", {"tier": tier})
    elif action == "market_claim":
        item = str(payload.get("item", ""))
        if player.market_claimed:
            raise ValueError("market_claimed")
        if item not in state.market_items or item not in MARKET_POOL:
            raise ValueError("invalid_item")
        player.market_claimed = True
        add_stats(state, MARKET_POOL[item])
        add_item(state, item)
        state.powder_stock += 2
        event(state, player, "events.marketGot", {"item": item})
    elif action == "reality":
        if player.reality_used:
            raise ValueError("reality_used")
        player.reality_used = True
        key, params = reality_visit(state, str(payload.get("location", "home")))
        event(state, player, key, params)
    elif action == "whip":
        if not state.whip_pet_installed:
            raise ValueError("whip_locked")
        if player.whip_uses >= 3:
            raise ValueError("whip_limit")
        player.whip_uses += 1
        deltas = {name: random.choice((-1, 1)) * random.randint(0, WHIP_SPREAD[name]) for name in STAT_KEYS}
        add_stats(state, deltas)
        event(state, player, "events.whipPopup")
        info["deltas"] = deltas
        return "whip_used", info
    else:
        raise ValueError("unknown_action")
    return "action_applied", info


# ---------------------------------------------------------------------------
# HTTP 接口
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def public_config() -> dict[str, str]:
    return {"discord_client_id": os.getenv("DISCORD_CLIENT_ID", "").strip()}


@app.post("/api/token")
async def discord_token(body: dict[str, Any]) -> dict[str, Any]:
    """用 Discord 授权码换取 access_token（Client Secret 只留在后端）。"""
    client_id = os.getenv("DISCORD_CLIENT_ID", "").strip()
    client_secret = os.getenv("DISCORD_CLIENT_SECRET", "").strip()
    code = str(body.get("code", ""))
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="discord_not_configured")
    if not code:
        raise HTTPException(status_code=400, detail="missing_code")

    def exchange() -> dict[str, Any]:
        form = urllib.parse.urlencode(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "authorization_code",
                "code": code,
            }
        ).encode()
        request = urllib.request.Request(
            "https://discord.com/api/oauth2/token",
            data=form,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "DiscordBot (pet-game-activity, 1.0)",
            },
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        payload = await asyncio.to_thread(exchange)
    except Exception as error:  # noqa: BLE001
        print(f"[discord] token exchange failed: {error}")
        raise HTTPException(status_code=502, detail="token_exchange_failed") from error
    return {"access_token": payload.get("access_token")}


@app.get("/api/data/{language}")
async def localized_data(language: str) -> dict[str, Any]:
    if language not in data:
        language = "en"
    return data[language]


@app.get("/api/catalog")
async def ending_catalog() -> dict[str, Any]:
    catalog: dict[str, Any] = {}
    for file_name in ("endings_1to5.json", "endings_6to10.json", "ending_ashes.json"):
        path = ROOT / file_name
        if path.is_file():
            catalog.update(load_json(path).get("_meta", {}))
    return catalog


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------


async def expire_player(key: str, room: Room, player_id: str) -> None:
    """断线超过宽限期仍没回来：删除这个玩家；房间空了就删掉整个房间。"""
    await asyncio.sleep(RECONNECT_GRACE_SECONDS)
    async with room.lock:
        room.cleanup.pop(player_id, None)
        if player_id in room.sockets.values():
            return
        room.players.pop(player_id, None)
        for secret in [k for k, v in room.sessions.items() if v == player_id]:
            del room.sessions[secret]
        if not room.players:
            if rooms.get(key) is room:
                del rooms[key]
            return
        out: dict[str, Any] = {"type": "state"}
        result = check_progress(room)
        out["state"] = public_state(room)
        if result:
            out["result"] = result
        await broadcast(room, out)


@app.websocket("/ws/activity")
async def activity_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    key = "activity"
    room: Room | None = None
    player: Player | None = None
    try:
        hello = await asyncio.wait_for(websocket.receive_json(), timeout=15)
        if not isinstance(hello, dict):
            return
        user = hello.get("user") if isinstance(hello.get("user"), dict) else {}
        key = clean_instance(hello.get("instance"))
        resume = hello.get("resume")
        requested_name = clean_name(user.get("name"))

        # 身份只由服务器决定，绝不采用客户端自称的 id：
        #  - 带有效 Discord 令牌 -> 用 Discord 返回的账号 id
        #  - 否则 -> 服务器发一个匿名 id + 只有本人知道的重连凭证
        identity = await fetch_discord_user(hello.get("token"))
        if identity is None and REQUIRE_DISCORD_AUTH:
            await websocket.send_json({"type": "error", "code": "auth_required"})
            return

        while True:
            room = get_room(key)
            async with room.lock:
                if rooms.get(key) is not room:
                    continue  # 房间刚被清理掉，重新取
                resume_out: str | None = None
                if identity:
                    player_id = f"discord:{identity['id']}"
                elif isinstance(resume, str) and room.sessions.get(resume) in room.players:
                    player_id = room.sessions[resume]
                    resume_out = resume
                else:
                    player_id = f"anon:{uuid.uuid4()}"
                    resume_out = secrets.token_urlsafe(24)
                    room.sessions[resume_out] = player_id
                pending = room.cleanup.pop(player_id, None)
                if pending is not None:
                    pending.cancel()
                player = room.players.get(player_id)
                if player is None:
                    name = requested_name or (identity or {}).get("name") or f"Player {len(room.players) + 1}"
                    player = Player(player_id, name, can_vote=not room.state.whip_vote_open)
                    room.players[player_id] = player
                elif requested_name:
                    player.name = requested_name
                room.sockets[websocket] = player_id
                await websocket.send_json({"type": "welcome", "player_id": player_id, "resume": resume_out})
                await broadcast(room, {"type": "state", "state": public_state(room)})
                break

        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=IDLE_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                await websocket.close(code=1001)  # 心跳都没了：连接已死
                break
            if not isinstance(message, dict) or message.get("type") == "ping":
                continue
            if message.get("type") == "rename":
                new_name = clean_name(message.get("name"))
                if new_name:
                    async with room.lock:
                        player.name = new_name
                        await broadcast(room, {"type": "state", "state": public_state(room)})
                continue
            payload = message.get("payload")
            async with room.lock:
                try:
                    result, info = apply_action(
                        room,
                        player,
                        str(message.get("action")),
                        payload if isinstance(payload, dict) else {},
                    )
                    await broadcast(
                        room,
                        {"type": "state", "state": public_state(room), "result": result, "info": info},
                    )
                except ValueError as error:
                    await websocket.send_json({"type": "error", "code": str(error)})
    except WebSocketDisconnect:
        pass
    except Exception as error:  # noqa: BLE001
        print(f"[ws] connection closed with error: {error!r}")
    finally:
        if room is not None and player is not None:
            async with room.lock:
                room.sockets.pop(websocket, None)
                if player.id not in room.sockets.values() and player.id not in room.cleanup:
                    # 不立刻删除：给一段宽限期，刷新页面或网络抖动后可以接着玩
                    room.cleanup[player.id] = asyncio.create_task(expire_player(key, room, player.id))
                out: dict[str, Any] = {"type": "state"}
                result = check_progress(room)  # 剩下的在线玩家也许已经全部就绪
                out["state"] = public_state(room)
                if result:
                    out["result"] = result
                await broadcast(room, out)


# ---------------------------------------------------------------------------
# 前端静态文件：由后端直接提供，所以只需要一个域名 / 一条隧道
# ---------------------------------------------------------------------------

STATIC_SUFFIXES = {
    ".html", ".css", ".js", ".mjs", ".map",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".woff", ".woff2", ".ttf", ".otf",
    ".mp3", ".ogg", ".wav", ".mp4", ".webm",
}
BLOCKED_TOP_DIRS = {"backend", "lang", ".venv", "venv", ".git", "__pycache__", "node_modules"}
NO_CACHE = {"Cache-Control": "no-store"}


def static_response(relative: str) -> FileResponse:
    path = (ROOT / relative).resolve()
    try:
        parts = path.relative_to(ROOT).parts
    except ValueError:
        raise HTTPException(status_code=404) from None
    if (
        not parts
        or parts[0] in BLOCKED_TOP_DIRS
        or any(part.startswith(".") for part in parts)
        or path.suffix.lower() not in STATIC_SUFFIXES
        or not path.is_file()
    ):
        raise HTTPException(status_code=404)
    return FileResponse(path, headers=NO_CACHE)


@app.get("/", include_in_schema=False)
async def index_page() -> FileResponse:
    return static_response("index.html")


@app.get("/{path:path}", include_in_schema=False)
async def static_files(path: str) -> FileResponse:
    return static_response(path)
