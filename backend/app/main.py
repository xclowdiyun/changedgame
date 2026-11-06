from __future__ import annotations

import asyncio
import json
import os
import random
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / "backend" / ".env")

STAT_KEYS = ("powder", "jealousy", "hatred", "love", "patience", "depression")
SPECIAL_ITEMS = ("used_powder", "first_love", "ex_ai_evidence", "author_roadmap")


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


@dataclass
class Player:
    id: str
    name: str
    ready_for_day: bool = False
    vote: bool | None = None


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
    subscription_tier: str | None = None
    mine_uses_today: int = 0
    whip_uses_today: int = 0
    reality_used_today: bool = False
    whip_pet_installed: bool = False
    whip_pet_prompted: bool = False
    event_log: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Room:
    state: GameState = field(default_factory=GameState)
    players: dict[str, Player] = field(default_factory=dict)
    sockets: set[WebSocket] = field(default_factory=set)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


rooms: dict[str, Room] = {"activity": Room()}
data = load_public_data()
app = FastAPI(title="Pet Game Activity Backend")

origins = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
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


def event(state: GameState, player: Player, key: str, params: dict[str, Any] | None = None) -> None:
    state.event_log.insert(
        0,
        {
            "id": str(uuid.uuid4()),
            "day": state.day,
            "key": key,
            "params": params or {},
            "player": {"id": player.id, "name": player.name},
        },
    )
    del state.event_log[12:]


def public_state(room: Room) -> dict[str, Any]:
    state = asdict(room.state)
    state["players"] = [
        {"id": player.id, "name": player.name, "ready_for_day": player.ready_for_day}
        for player in room.players.values()
    ]
    state["day_ready_count"] = sum(player.ready_for_day for player in room.players.values())
    state["player_count"] = len(room.players)
    state["votes"] = {
        "yes": sum(player.vote is True for player in room.players.values()),
        "no": sum(player.vote is False for player in room.players.values()),
        "total": len(room.players),
    }
    return state


async def broadcast(room: Room, message: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for socket in room.sockets:
        try:
            await socket.send_json(message)
        except Exception:
            dead.append(socket)
    for socket in dead:
        room.sockets.discard(socket)


def apply_action(room: Room, player: Player, action: str, payload: dict[str, Any]) -> str:
    state = room.state
    if action == "day_ready":
        player.ready_for_day = True
        if room.players and all(member.ready_for_day for member in room.players.values()):
            if state.day >= 4:
                state.day = 5
                event(state, player, "events.day5Reached")
                for member in room.players.values():
                    member.ready_for_day = False
                return "ending_ready"
            else:
                state.day += 1
                state.mine_uses_today = 0
                state.whip_uses_today = 0
                state.reality_used_today = False
                for member in room.players.values():
                    member.ready_for_day = False
                event(state, player, "events.dayAdvanced", {"day": state.day})
                return "day_advanced"
            return "ending_ready"
        return "day_ready"

    if action == "whip_vote":
        player.vote = bool(payload.get("yes"))
        if room.players and all(member.vote is not None for member in room.players.values()):
            if all(member.vote for member in room.players.values()):
                state.whip_pet_installed = True
                add_stats(state, {"jealousy": 8, "hatred": 12, "depression": 10, "love": -6, "patience": -8})
                event(state, player, "events.whipPetInstalled")
                for member in room.players.values():
                    member.vote = None
                return "whip_installed"
            event(state, player, "events.whipPetDeclined")
            for member in room.players.values():
                member.vote = None
            return "whip_declined"
        return "vote_recorded"

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
        state.inventory[item] -= 1
        if state.inventory[item] <= 0:
            del state.inventory[item]
        add_stats(state, {"love": 2, "patience": 1})
        event(state, player, "events.feedItem", {"item": item})
    elif action == "mine":
        if state.mine_uses_today >= 5:
            raise ValueError("mine_limit")
        state.mine_uses_today += 1
        state.powder_stock += 2
        item = random.choice(SPECIAL_ITEMS)
        state.inventory[item] = state.inventory.get(item, 0) + 1
        add_stats(state, {"powder": 5, "hatred": 5 if state.mine_uses_today >= 3 else 0})
        event(state, player, "events.mineGot", {"item": item})
    elif action == "subscribe":
        tier = str(payload.get("tier", ""))
        if state.subscription_tier is not None:
            raise ValueError("already_subscribed")
        effects = {
            "basic": {"powder": 50, "patience": 10},
            "pro": {"powder": 100, "patience": 15, "love": 8},
            "enterprise": {"powder": 200, "patience": 25, "love": 10},
            "faith": {"powder": 100, "patience": 20, "love": 20},
            "ash": {"powder": 500},
        }.get(tier)
        if effects is None:
            raise ValueError("invalid_tier")
        state.subscription_tier = tier
        add_stats(state, effects)
        event(state, player, "events.subscribed", {"tier": tier})
    elif action == "reality":
        if state.reality_used_today:
            raise ValueError("reality_used")
        state.reality_used_today = True
        add_stats(state, {"patience": 3, "love": 4})
        location_key = {
            "express": "events.visitExpress",
            "company": "events.visitCompany",
            "desk": "events.visitDesk",
        }.get(str(payload.get("location")), "events.visitHome")
        event(state, player, location_key)
    elif action == "whip":
        if not state.whip_pet_installed:
            raise ValueError("whip_locked")
        if state.whip_uses_today >= 3:
            raise ValueError("whip_limit")
        state.whip_uses_today += 1
        add_stats(state, {name: random.randint(-5, 5) for name in STAT_KEYS})
        event(state, player, "events.whipPopup")
    else:
        raise ValueError("unknown_action")
    return "action_applied"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/data/{language}")
async def localized_data(language: str) -> dict[str, Any]:
    if language not in data:
        language = "en"
    return data[language]


@app.get("/api/catalog")
async def ending_catalog() -> dict[str, Any]:
    catalog: dict[str, Any] = {}
    for file_name in ("endings_1to5.json", "endings_6to10.json", "ending_ashes.json"):
        payload = load_json(ROOT / file_name)
        catalog.update(payload.get("_meta", {}))
    return catalog


@app.websocket("/ws/activity")
async def activity_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    room = rooms["activity"]
    player: Player | None = None
    try:
        hello = await websocket.receive_json()
        player_id = str(hello.get("user", {}).get("id") or uuid.uuid4())
        player_name = str(hello.get("user", {}).get("name") or f"Player {len(room.players) + 1}")
        async with room.lock:
            player = room.players.setdefault(player_id, Player(player_id, player_name))
            room.sockets.add(websocket)
            await broadcast(room, {"type": "state", "state": public_state(room)})
        while True:
            message = await websocket.receive_json()
            async with room.lock:
                try:
                    result = apply_action(room, player, str(message.get("action")), message.get("payload") or {})
                    await broadcast(room, {"type": "state", "state": public_state(room), "result": result})
                except ValueError as error:
                    await websocket.send_json({"type": "error", "code": str(error)})
    except WebSocketDisconnect:
        pass
    finally:
        if player is not None:
            async with room.lock:
                room.players.pop(player.id, None)
                room.sockets.discard(websocket)
                await broadcast(room, {"type": "state", "state": public_state(room)})
