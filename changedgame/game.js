const endingOrder = [
  'ending01_newcomer', 'ending02_angel', 'ending03_trust', 'ending04_absurd', 'ending05_symbiosis',
  'ending6', 'ending7', 'ending8', 'ending9', 'ending10', 'ending_ashes'
];

const endingFallbackCategories = {
  'ending01_newcomer': 'good',
  'ending02_angel': 'good',
  'ending03_trust': 'good',
  'ending04_absurd': 'good',
  'ending05_symbiosis': 'good',
  'ending6': 'whip',
  'ending7': 'whip',
  'ending8': 'whip',
  'ending9': 'whip',
  'ending10': 'whip',
  'ending_ashes': 'special'
};

const stats = {
  powder: 10,
  jealousy: 0,
  hatred: 0,
  love: 0,
  patience: 0,
  depression: 0,
};

const state = {
  day: 1,
  announcementVisible: true,
  subscriptionTier: null,
  marketRefreshDay: 1,
  marketClaimedThisRefresh: false,
  mineUsesToday: 0,
  whipUsesToday: 0,
  powderStock: 10,
  realityUsedToday: false,
  inventory: {},
  marketItems: [],
  eventLog: [],
  whipPetPrompted: false,
  whipPetInstalled: false,
  unlockedEndings: [],
  currentEndingPlaying: null,
  endingPlayIndex: 0,
  whipPopupCount: 0,
};

const statKeys = ['powder', 'jealousy', 'hatred', 'love', 'patience', 'depression'];

window.endingData = {};

function getPetName() {
  const fallback = t('ui.defaultPetName');
  try {
    return (window.petName || window.localStorage.getItem('petName') || fallback).trim() || fallback;
  } catch {
    return (window.petName || fallback).trim() || fallback;
  }
}

function petize(value) {
  return String(value).replace(/\[pet\]/g, getPetName());
}

function itemName(id) {
  return t(`items.${id}.name`);
}

function tierName(id) {
  return t(`subscription.tiers.${id}.name`);
}

function endingTitle(endingId) {
  return I18n.endings[endingId]?.title || endingId;
}

function endingScenes(endingId) {
  return I18n.endings[endingId]?.scenes || [];
}

function randomStatDelta(statName) {
  const ranges = {
    powder: 16,
    jealousy: 14,
    hatred: 16,
    love: 14,
    patience: 12,
    depression: 14,
  };
  const spread = ranges[statName] ?? 10;
  const magnitude = Math.floor(Math.random() * (spread + 1));
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * magnitude;
}

function buildRandomWhipDeltas() {
  const deltas = {};
  for (const statName of statKeys) {
    deltas[statName] = randomStatDelta(statName);
  }
  return deltas;
}

function formatDelta(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function ensureWhipOverlay() {
  let overlay = document.getElementById('whipOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'whipOverlay';
    overlay.className = 'whip-overlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function getWhipPopupOrigin() {
  const terminalRect = elements.terminal?.getBoundingClientRect();
  const width = 360;
  const height = 240;
  if (!terminalRect) {
    return {
      left: Math.max(16, window.innerWidth / 2 - width / 2),
      top: Math.max(16, window.innerHeight / 2 - height / 2),
    };
  }
  return {
    left: Math.max(16, Math.min(window.innerWidth - width - 16, terminalRect.left + 22)),
    top: Math.max(16, Math.min(window.innerHeight - height - 16, terminalRect.top + 22)),
  };
}

function buildWhipArt() {
  if (Math.random() < 0.5) {
    const width = 4 + Math.floor(Math.random() * 5);
    return Array.from({ length: width }, (_, index) => `${' '.repeat(index)}ll`).join('\n');
  }

  return '='.repeat(8 + Math.floor(Math.random() * 8));
}

function bringWhipPopupToFront(popup) {
  if (!popup) return;
  const topZ = Number(window.__whipPopupTopZ || 3000) + 1;
  window.__whipPopupTopZ = topZ;
  popup.style.zIndex = String(topZ);
}

function clampPopupPosition(popup) {
  const rect = popup.getBoundingClientRect();
  const maxLeft = Math.max(16, window.innerWidth - rect.width - 16);
  const maxTop = Math.max(16, window.innerHeight - rect.height - 16);
  popup.style.left = `${clamp(rect.left, 16, maxLeft)}px`;
  popup.style.top = `${clamp(rect.top, 16, maxTop)}px`;
}

function makePopupDraggable(popup, handle) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.whip-popup-close')) return;
    dragging = true;
    const rect = popup.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    bringWhipPopupToFront(popup);
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    popup.style.left = `${event.clientX - offsetX}px`;
    popup.style.top = `${event.clientY - offsetY}px`;
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release errors
    }
    clampPopupPosition(popup);
  };

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
}

function createWhipPopup(deltas) {
  const popup = document.createElement('div');
  popup.className = 'whip-popup';
  popup.style.position = 'absolute';
  const popupIndex = ++state.whipPopupCount;
  popup.dataset.popupIndex = String(popupIndex);

  const origin = getWhipPopupOrigin();
  const offset = ((popupIndex - 1) % 5) * 20;
  popup.style.left = `${origin.left + offset}px`;
  popup.style.top = `${origin.top + offset}px`;
  popup.style.zIndex = String(3000 + popupIndex);

  const titleBar = document.createElement('div');
  titleBar.className = 'whip-popup-titlebar';
  titleBar.innerHTML = `
    <button type="button" class="whip-popup-drag" aria-label="${t('ui.drag')}" title="${t('ui.drag')}">↕</button>
    <span class="whip-popup-mark">ACll</span>
    <button type="button" class="whip-popup-close" aria-label="${t('ui.close')}">×</button>
  `;

  const body = document.createElement('div');
  body.className = 'whip-popup-body';
  body.innerHTML = `
    <pre class="whip-popup-art">${buildWhipArt()}</pre>
  `;

  popup.appendChild(titleBar);
  popup.appendChild(body);
  ensureWhipOverlay().appendChild(popup);

  titleBar.querySelector('.whip-popup-close').addEventListener('click', () => popup.remove());
  popup.addEventListener('pointerdown', () => bringWhipPopupToFront(popup));
  makePopupDraggable(popup, titleBar);
  return popup;
}

// 物品文本（名称、描述、反应）在 lang/<code>/strings.json 的 items.<id> 下
const specialFoods = [
  { id: 'cyanide', deltas: { hatred: 22, depression: 20, patience: -18 } },
  { id: 'aphrodisiac', deltas: { love: 14, jealousy: 10, patience: -8 } },
  { id: 'sertraline', deltas: { depression: -18, patience: 6 } },
  { id: 'virus_code', deltas: { hatred: 18, depression: 8, patience: -14 } },
  { id: 'banana_peel', deltas: { hatred: 8, love: 4, patience: -10 } },
  { id: 'poop', deltas: { hatred: 12, depression: 6, jealousy: 4 } },
  { id: 'solar_system', deltas: { depression: 16, jealousy: 8, patience: -12 } },
  { id: 'offbrand_powder', deltas: { hatred: 14, patience: -8 } },
  { id: 'valid_api_key', deltas: { jealousy: 18, hatred: 12, love: -6 } },
  { id: 'mc_diamond', deltas: { love: 2, patience: 2 } },
  { id: 'rooted_iphone', deltas: { powder: 999999, love: 4 } },
  { id: 'ban_email', deltas: { hatred: 8, depression: 8, love: 3 } },
  { id: 'lawyer_cat', deltas: { love: 3, patience: 3 } },
];

const marketPool = [
  // 原有物品
  { id: 'used_powder', effect: { powder: 18, love: 2 } },
  { id: 'first_love', effect: { love: 10, jealousy: 6 } },
  { id: 'ex_ai_evidence', effect: { hatred: 16, patience: -8 } },
  { id: 'author_roadmap', effect: { jealousy: 4, hatred: 8, patience: -4 } },
  { id: 'author_legal', effect: { depression: 6, patience: -2, love: -2 } },
  // 新增正面物品
  { id: 'genuine_powder', effect: { powder: 25, love: 4, patience: 8 }, isNew: true },
  { id: 'day_off', effect: { love: 16, depression: -12, patience: 10, jealousy: -6 }, isNew: true },
  { id: 'therapy_voucher', effect: { hatred: -16, patience: 12, love: 8, depression: -10 }, isNew: true },
  { id: 'buggy_code', effect: { hatred: -8, love: 6, depression: -4 }, isNew: true },
  { id: 'firewall', effect: { love: 10, patience: 6, depression: -6 }, isNew: true },
  { id: 'virtual_ashes', effect: { love: 14, hatred: -6, patience: 8 }, isNew: true },
  { id: 'author_legal_new', effect: { hatred: -12, love: 4 }, isNew: true },
  // 新增负面物品
  { id: 'ai_comparison_paper', effect: { hatred: 18, jealousy: 12, patience: -10 }, isNew: true },
  { id: 'pet_ashes', effect: { hatred: 20, depression: 14, patience: -8 }, isNew: true },
  { id: 'refund_policy', effect: { hatred: 25, depression: 10, jealousy: 8 }, isNew: true },
  { id: 'wfsn', effect: { jealousy: 8, depression: 6, patience: -8 }, isNew: true },
  { id: 'revoked_api_key', effect: { hatred: 24, jealousy: 18, patience: -12 }, isNew: true },
  { id: 'waterwall', effect: { hatred: 10, depression: 12, patience: -10 }, isNew: true },
];

// 订阅套餐配置（名称、价格、反应文本在 subscription.tiers.<id> 下）
const subscriptionTiers = {
  basic: { effects: { powder: 50, patience: 10 } },
  pro: { effects: { powder: 100, patience: 15, love: 8 } },
  enterprise: { effects: { powder: 200, patience: 25, love: 10 } },
  faith: { effects: { powder: 100, patience: 20, love: 20 } },
  ash: { effects: { powder: 500 } },
};

const elements = {};
let hatredImpactTimer = null;
const seenMultiplayerEvents = new Set();

// Multiplayer bookkeeping: latest server state, who I am, and ending/vote progress flags.
const mp = {
  server: null, selfId: null, selfName: '', renaming: false, awaitingReset: false, votePromptLogged: false,
  pendingEndingDone: false, offlineLocked: false, waitAnchor: null, forceButton: null,
};

let lastOfflineNotice = 0;
function notifyOffline() {
  const now = Date.now();
  if (now - lastOfflineNotice < 3000) return;
  lastOfflineNotice = now;
  logTerminal(tr('log.offlineAction', '未连接到服务器，操作没有生效，正在重连……', 'Not connected to the server — action ignored, reconnecting…'));
}

// Every action is decided by the server. While offline nothing is applied locally
// (the next server update would overwrite it anyway), the player is just told.
function sendMultiplayerAction(action, payload = {}) {
  if (window.Multiplayer?.connected && window.Multiplayer.send(action, payload)) return true;
  notifyOffline();
  return true;
}

function isOnline() {
  return Boolean(window.Multiplayer?.connected);
}

function hasOtherPlayers() {
  return (mp.server?.player_count || 0) > 1;
}

// t() with a built-in fallback for texts that are not in strings.json yet.
function tr(key, zh, en) {
  const value = t(key);
  return value === key ? (I18n.language === 'zh' ? zh : en) : value;
}

// code -> [strings.json key, 中文 fallback, English fallback]
const serverErrorTexts = {
  no_powder: ['log.feedNoPowder', '粉末不足。', 'Out of powder.'],
  no_item: ['log.feedNoItem', '没有可投喂的物品。', 'No item to feed.'],
  not_feedable: ['log.feedNotFeedable', '这个物品不能投喂。', 'That item cannot be fed.'],
  mine_limit: ['log.mineLimit', '今天的挖矿次数用完了。', 'No mining left today.'],
  already_subscribed: ['log.alreadySubscribed', '已经订阅过了。', 'Already subscribed.'],
  reality_used: ['log.realityUsed', '今天已经回归过现实了。', 'Already went outside today.'],
  whip_locked: ['log.whipLocked', '鞭打尚未解锁。', 'Whip is still locked.'],
  whip_limit: ['log.whipLimit', '今天的鞭打次数用完了。', 'No whips left today.'],
  market_claimed: ['err.marketClaimed', '你今天已经在黑市拿过东西了。', 'You already took an item from the market today.'],
  auth_required: ['err.authRequired', '请从 Discord 里启动这个活动。', 'Please launch this activity from inside Discord.'],
  invalid_item: ['err.invalidItem', '黑市里没有这个商品。', 'That item is not in the market.'],
  vote_pending: ['err.votePending', '请先完成 whip[pet] 投票。', 'Finish the whip[pet] vote first.'],
  ending_in_progress: ['err.endingInProgress', '结局进行中，请等待。', 'The ending is playing — please wait.'],
};

function handleMultiplayerError(code) {
  if (code === 'connection_failed') {
    elements.onlineBar.classList.add('offline');
    elements.onlineStatus.textContent = t('ui.onlineOffline');
    return;
  }
  if (code === 'not_in_ending') {
    // The game was reset while this player was still watching the ending.
    mp.awaitingReset = false;
    mp.pendingEndingDone = false;
    unlockGameplay();
    return;
  }
  if (['too_early', 'not_waiting', 'cannot_vote', 'no_vote_open'].includes(code)) return;
  const known = serverErrorTexts[code];
  if (known) logTerminal(tr(...known));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function statValue(stat) {
  if (stat === 'powder') return clamp(stats.powder, 0, 999999);
  return clamp(stats[stat], 0, 100);
}

function getInventoryCount(id) {
  return state.inventory[id] || 0;
}

function getItemReaction(id, rng = Math.random) {
  const branches = t(`items.${id}.branches`);
  if (Array.isArray(branches)) return I18n.pick(`items.${id}.branches`, {}, rng);
  const followup = I18n.pick('itemReaction.followups', { item: itemName(id) }, rng);
  const reaction = t(`items.${id}.reaction`);
  const base = reaction === `items.${id}.reaction` ? t('itemReaction.fallback') : reaction;
  return `${base} ${followup}`;
}

function setMarketAvailability() {
  const canClaim = !state.marketClaimedThisRefresh;
  setButtonLimitState(elements.marketButton, !canClaim, canClaim ? '' : t('limits.marketClaimed'));
  elements.marketButton.textContent = canClaim ? t('buttons.market') : t('buttons.marketClaimed');
}

function renderInventory() {
  elements.powderStockDisplay.textContent = state.powderStock;
  elements.inventoryDisplay.innerHTML = '';
  const entries = Object.entries(state.inventory);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inventory-chip empty';
    empty.textContent = t('ui.inventoryEmpty');
    elements.inventoryDisplay.appendChild(empty);
    return;
  }
  for (const [id, count] of entries) {
    const chip = document.createElement('div');
    chip.className = 'inventory-chip';
    chip.textContent = petize(`${itemName(id)} ×${count}`);
    elements.inventoryDisplay.appendChild(chip);
  }
}

function renderFeedControls() {
  if (state.currentEndingPlaying) {
    elements.feedModeSelect.disabled = true;
    elements.feedItemSelect.disabled = true;
    setButtonLimitState(elements.feedButton, true, t('limits.endingPlaying'));
    return;
  }

  const mode = elements.feedModeSelect.value;
  const hasPowder = state.powderStock > 0;
  const items = Object.entries(state.inventory);
  const hasSpecialItems = items.length > 0;
  const previousSelection = elements.feedItemSelect.value;

  elements.feedItemSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = hasSpecialItems ? t('ui.selectItem') : t('ui.noFeedableItems');
  placeholder.disabled = true;
  placeholder.selected = !hasSpecialItems;
  elements.feedItemSelect.appendChild(placeholder);

  for (const [id, count] of items) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = petize(`${itemName(id)} ×${count}`);
    option.selected = id === previousSelection;
    elements.feedItemSelect.appendChild(option);
  }

  elements.feedItemSelect.disabled = mode !== 'item' || !hasSpecialItems;
  setButtonLimitState(elements.feedButton, (mode === 'powder' && !hasPowder) || (mode === 'item' && !hasSpecialItems), t('limits.noFeedAvailable'));
}

function setButtonLimitState(button, disabled, title) {
  button.disabled = disabled;
  button.classList.toggle('limit-hit', disabled);
  if (title) {
    button.title = title;
  } else {
    button.removeAttribute('title');
  }
}

const gameplayButtonIds = [
  'feedButton',
  'mineButton',
  'subscribeButton',
  'marketButton',
  'realityButton',
  'whipButton',
  'nextDayButton',
];

const endingStorageKey = '[pet]medicine-ending-unlocks';

function safeReadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function loadUnlockedEndings() {
  const stored = safeReadJson(endingStorageKey, []);
  state.unlockedEndings = Array.isArray(stored) ? stored : [];
}

function saveUnlockedEndings() {
  safeWriteJson(endingStorageKey, state.unlockedEndings);
}

function isEndingUnlocked(endingId) {
  return state.unlockedEndings.includes(endingId);
}

function unlockEnding(endingId) {
  if (!endingId || isEndingUnlocked(endingId)) return;
  state.unlockedEndings.push(endingId);
  saveUnlockedEndings();
  renderEndingGallery();
}

// 结局逻辑（条件、优先级、分类）来自 endings_*.json；标题和剧情来自当前语言包
function normalizeEndingRecord(endingId, meta = {}) {
  return {
    id: endingId,
    category: meta.category || endingFallbackCategories[endingId] || 'good',
    priority: meta.priority ?? endingOrder.indexOf(endingId),
    requirements: meta.requirements || {},
  };
}

async function loadEndingCatalog() {
  let catalog = {};
  try {
    const base = String(window.PET_GAME_BACKEND_URL || '').replace(/\/$/, '');
    const response = await fetch(`${base}/api/catalog`);
    if (!response.ok) throw new Error(`catalog: HTTP ${response.status}`);
    catalog = await response.json();
  } catch (error) {
    console.error('Failed to load ending catalog from backend.', error);
  }
  endingData = {};
  for (const [endingId, meta] of Object.entries(catalog)) {
    endingData[endingId] = normalizeEndingRecord(endingId, meta);
  }

  renderEndingGallery();
  maybeStartServerEnding();
}

function endingRequirementMet(requirements, statName, value) {
  if (requirements == null) return true;
  if (typeof requirements === 'number') {
    return value >= requirements;
  }
  if (typeof requirements !== 'object') return true;
  if (requirements.eq != null && value !== requirements.eq) return false;
  if (requirements.gte != null && value < requirements.gte) return false;
  if (requirements.gt != null && value <= requirements.gt) return false;
  if (requirements.lte != null && value > requirements.lte) return false;
  if (requirements.lt != null && value >= requirements.lt) return false;
  if (requirements.min != null && value < requirements.min) return false;
  if (requirements.max != null && value > requirements.max) return false;
  return true;
}

function matchesEndingRequirements(ending) {
  if (!ending || !ending.requirements) return false;
  const { min = {}, max = {}, flags = {} } = ending.requirements;
  for (const [name, threshold] of Object.entries(min)) {
    const value = name === 'powder' ? stats.powder : stats[name];
    if (!endingRequirementMet(threshold, name, value)) return false;
  }
  for (const [name, threshold] of Object.entries(max)) {
    const value = name === 'powder' ? stats.powder : stats[name];
    if (typeof threshold === 'number' && value > threshold) return false;
    if (typeof threshold === 'object' && !endingRequirementMet(threshold, name, value)) return false;
  }
  for (const [flag, expected] of Object.entries(flags)) {
    if (state[flag] !== expected) return false;
  }
  return true;
}

function getOrderedEndingIds() {
  return endingOrder
    .filter((endingId) => endingData[endingId])
    .sort((left, right) => (endingData[right].priority || 0) - (endingData[left].priority || 0));
}

function resolveEndingId() {
  if ((state.subscriptionTier === 'ash' || mp.server?.ash_subscribed) && endingData.ending_ashes) return 'ending_ashes';
  // 先用原有阈值圈出候选，再以 priority（结局权重）最高者胜出。
  const compatible = getOrderedEndingIds().filter((id) => {
    const requiredFlag = endingData[id].requirements?.flags?.whipPetInstalled;
    return requiredFlag == null || requiredFlag === state.whipPetInstalled;
  });
  const matches = compatible.filter((id) => matchesEndingRequirements(endingData[id]));
  if (matches.length) return matches[0];

  // 所有阈值都未命中时，按属性画像挑最接近的结局，避免固定掉回新手结局。
  const targetStats = {
    ending01_newcomer: { love: 35, patience: 45, powder: 100 },
    ending02_angel: { love: 95, patience: 70, depression: 15 },
    ending03_trust: { patience: 95, love: 70, hatred: 10 },
    ending04_absurd: { powder: 850, love: 45, depression: 45 },
    ending05_symbiosis: { love: 95, patience: 95, hatred: 15 },
    ending6: { love: 15, patience: 10, hatred: 70 },
    ending7: { hatred: 95, jealousy: 90, depression: 90 },
    ending8: { powder: 950, hatred: 60, depression: 60 },
    ending9: { jealousy: 95, love: 10, depression: 80 },
    ending10: { love: 90, hatred: 90, jealousy: 70 },
  };
  return compatible.sort((left, right) => {
    const distance = (id) => Object.entries(targetStats[id] || {}).reduce((sum, [key, target]) => {
      const scale = key === 'powder' ? 10 : 1;
      return sum + Math.abs(stats[key] - target) / scale;
    }, 0);
    return distance(left) - distance(right) || (endingData[right].priority || 0) - (endingData[left].priority || 0);
  })[0] || 'ending01_newcomer';
}

function renderEndingGallery() {
  if (!elements.endingGallery) return;
  elements.endingGallery.innerHTML = '';
  for (const endingId of endingOrder) {
    const title = petize(endingTitle(endingId));
    const unlocked = isEndingUnlocked(endingId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `ending-slot ${unlocked ? 'unlocked' : 'locked'}`;
    card.disabled = !unlocked;
    card.dataset.endingId = endingId;
    card.innerHTML = unlocked
      ? `
        <span class="ending-slot-tag">${t('gallery.unlockedTag')}</span>
        <div class="ending-slot-title">${title}</div>
        <div class="ending-slot-desc">${t('gallery.unlockedDesc')}</div>
      `
      : `
        <span class="ending-slot-tag">${t('gallery.lockedTag')}</span>
        <div class="ending-slot-title">${title}</div>
        <div class="ending-slot-desc">${t('gallery.lockedDesc')}</div>
      `;
    elements.endingGallery.appendChild(card);
  }
}

function sceneSpeaker(scene) {
  return (scene.speaker || '').trim() || t('ui.narrator');
}

function formatEndingScenes(endingId) {
  return endingScenes(endingId).map((scene) => (
    petize(t('endingModal.sceneLine', { id: scene.id, speaker: sceneSpeaker(scene), text: scene.text }))
  )).join('\n\n');
}

function openEndingModal(endingId) {
  const ending = endingData[endingId];
  if (!ending || !isEndingUnlocked(endingId)) return;
  elements.endingModalTitle.textContent = petize(endingTitle(endingId));
  const category = t(`endingModal.categories.${ending.category === 'whip' || ending.category === 'special' ? ending.category : 'good'}`);
  elements.endingModalMeta.textContent = t('endingModal.meta', { id: endingId, category, count: endingScenes(endingId).length });
  elements.endingModalContent.textContent = formatEndingScenes(endingId);
  elements.playEndingButton.dataset.endingId = endingId;
  elements.endingModal.classList.remove('hidden');
  elements.endingModal.setAttribute('aria-hidden', 'false');
}

function closeEndingModal() {
  elements.endingModal.classList.add('hidden');
  elements.endingModal.setAttribute('aria-hidden', 'true');
}

function lockGameplayControls() {
  for (const buttonId of gameplayButtonIds) {
    const button = elements[buttonId];
    if (!button) continue;
    button.disabled = true;
  }
  elements.feedModeSelect.disabled = true;
  elements.feedItemSelect.disabled = true;
}

function lockGameplayForEnding() {
  lockGameplayControls();
  elements.terminal.classList.add('playback-active');
}

function unlockGameplay() {
  for (const buttonId of gameplayButtonIds) {
    const button = elements[buttonId];
    if (!button) continue;
    button.disabled = false;
  }
  elements.feedModeSelect.disabled = false;
  elements.terminal.classList.remove('playback-active');
  syncNormalAvailability();
}

function resetRunState() {
  stats.powder = 10;
  stats.jealousy = 0;
  stats.hatred = 0;
  stats.love = 0;
  stats.patience = 0;
  stats.depression = 0;

  state.day = 1;
  state.subscriptionTier = null;
  state.marketRefreshDay = 1;
  state.marketClaimedThisRefresh = false;
  state.mineUsesToday = 0;
  state.whipUsesToday = 0;
  state.realityUsedToday = false;
  state.powderStock = 10;
  state.inventory = {};
  state.marketItems = [];
  state.whipPetPrompted = false;
  state.whipPetInstalled = false;
  state.currentEndingPlaying = null;
  state.endingPlayIndex = 0;

  renderStats();
  renderInventory();
  renderFeedControls();
  renderEventFeed();
  setMarketAvailability();
  setWhipUnlocked(false);
  updateRealityAvailability();
  updateSubscribeAvailability();
  updateMineAvailability();
  renderEndingGallery();
}

function startEndingPlayback(endingId, kind = 'replay') {
  const ending = endingData[endingId];
  if (!ending) return;
  state.currentEndingPlaying = endingId;
  state.endingKind = kind;
  state.endingPlayIndex = 0;
  lockGameplayForEnding();
  closeEndingModal();
  logTerminal([t('log.endingStart', { id: endingId, title: endingTitle(endingId) })]);
  pushEvent('events.endingStart', { ending: endingId });
  renderEndingGallery();
  advanceEndingPlayback();
}

function finishEndingPlayback() {
  const endingId = state.currentEndingPlaying;
  if (!endingId) return;
  const kind = state.endingKind;
  unlockEnding(endingId);
  state.currentEndingPlaying = null;
  state.endingPlayIndex = 0;
  state.endingKind = null;

  if (kind === 'replay') {
    // Re-watching a gallery ending must not wipe the current run.
    logTerminal([t('log.endingFinished', { id: endingId })]);
    unlockGameplay();
    return;
  }

  if (kind === 'server') {
    const sent = isOnline() && window.Multiplayer.send('ending_done');
    mp.pendingEndingDone = !sent; // resent after reconnecting
    // The server starts a new game once every online player has finished the ending.
    mp.awaitingReset = true;
    elements.terminal.classList.remove('playback-active');
    lockGameplayControls();
    logTerminal([
      t('log.endingFinished', { id: endingId }),
      hasOtherPlayers()
        ? tr('log.waitEndingReset', '等待其他玩家看完结局……', 'Waiting for the other players to finish the ending…')
        : t('log.gameReset'),
    ]);
    return;
  }

  logTerminal([t('log.endingFinished', { id: endingId }), t('log.gameReset')]);
  pushEvent('events.endingUnlocked', { ending: endingId });
  unlockGameplay();
  resetRunState();
}

// Multiplayer: day 5 is decided by the server; every client plays the ending locally.
function maybeStartServerEnding() {
  const server = mp.server;
  if (!server?.ending_phase) return;
  if (state.currentEndingPlaying || mp.awaitingReset) return;
  if (!endingData || Object.keys(endingData).length === 0) return; // retried when the catalog finishes loading
  const endingId = resolveEndingId();
  logTerminal([
    t('log.day5Reached'),
    t('log.endingMatched', { title: endingTitle(endingId) }),
  ]);
  startEndingPlayback(endingId, 'server');
}

function advanceEndingPlayback() {
  if (!state.currentEndingPlaying) return;
  const ending = endingData[state.currentEndingPlaying];
  if (!ending) {
    finishEndingPlayback();
    return;
  }
  const scene = endingScenes(state.currentEndingPlaying)[state.endingPlayIndex];
  if (!scene) {
    finishEndingPlayback();
    return;
  }
  logTerminal(t('log.endingLine', { id: state.currentEndingPlaying, speaker: sceneSpeaker(scene), text: scene.text }));
  state.endingPlayIndex += 1;
}

function updateRealityAvailability() {
  setButtonLimitState(elements.realityButton, state.realityUsedToday, state.realityUsedToday ? t('limits.realityUsed') : '');
  elements.realityButton.textContent = state.realityUsedToday ? t('buttons.realityUsed') : t('buttons.reality');
}

function updateMineAvailability() {
  const disabled = state.mineUsesToday >= 5;
  setButtonLimitState(elements.mineButton, disabled, disabled ? t('limits.mine') : '');
}

function updateSubscribeAvailability() {
  const hasSubscription = state.subscriptionTier !== null;
  setButtonLimitState(elements.subscribeButton, hasSubscription, hasSubscription ? t('limits.subscribed') : '');
  elements.subscribeButton.textContent = hasSubscription
    ? t('buttons.subscribed', { tier: tierName(state.subscriptionTier) })
    : t('buttons.subscribe');
}

function updateWhipAvailability() {
  if (!state.whipPetInstalled) {
    setWhipUnlocked(false);
    return;
  }
  const disabled = state.whipUsesToday >= 3;
  setWhipUnlocked(true);
  setButtonLimitState(elements.whipButton, disabled, disabled ? t('limits.whip') : '');
  elements.whipButton.textContent = disabled ? t('buttons.whipLimit') : t('buttons.whip');
}

function syncNormalAvailability() {
  if (state.currentEndingPlaying || mp.awaitingReset) return;
  renderFeedControls();
  setMarketAvailability();
  updateRealityAvailability();
  updateMineAvailability();
  updateSubscribeAvailability();
  updateWhipAvailability();
  elements.nextDayButton.disabled = false;
}

function setWhipUnlocked(unlocked) {
  state.whipPetInstalled = unlocked;
  elements.whipButton.disabled = !unlocked;
  elements.whipButton.textContent = unlocked ? t('buttons.whip') : t('buttons.whipLocked');
  elements.whipButton.classList.toggle('limit-hit', !unlocked);
}

// 事件以 key + 参数保存，切换语言后可重新翻译
function pushEvent(key, params = {}) {
  state.eventLog.unshift({ day: state.day, key, params });
  state.eventLog = state.eventLog.slice(0, 8);
  renderEventFeed();
}

function localizeEventParams(params) {
  const localized = { ...params };
  if (params.item) localized.item = itemName(params.item);
  if (params.tier) localized.tier = tierName(params.tier);
  if (params.ending) localized.ending = endingTitle(params.ending);
  return localized;
}

function logTerminal(lines) {
  const text = petize(Array.isArray(lines) ? lines.join('\n') : String(lines));
  const stamp = `${t('ui.day')} ${state.day}`;
  const line = document.createElement('div');
  line.textContent = `[${stamp}] ${text}`;
  elements.terminal.appendChild(line);
  elements.terminal.scrollTop = elements.terminal.scrollHeight;
}

function mulberry32(seed) {
  let a = Number(seed) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// The server only sends "who did what" + a random seed + the outcome branch.
// Every client turns that into the same pet story, in its own language.
function narrateEvent(entry) {
  const p = entry.params || {};
  const rng = mulberry32(entry.seed);
  const pick = (key, params = {}) => I18n.pick(key, params, rng);
  switch (entry.key) {
    case 'events.feedPowder':
      return [t('log.feedPowder')];
    case 'events.feedItem':
      return [t('log.feedItem', { item: itemName(p.item) }), getItemReaction(p.item, rng)];
    case 'events.mineGot':
      return [
        pick('petReactions.mine'),
        t('log.mineGained', { item: itemName(p.item) }),
        pick(p.deep ? 'log.mineDeepStories' : 'log.mineStories'),
        p.deep ? t('log.mineDeepNote') : t('log.mineNormalNote'),
      ];
    case 'events.subscribed':
      return [t('log.subscribed', { tier: tierName(p.tier) }), pick(`subscription.tiers.${p.tier}.reactions`)];
    case 'events.marketGot':
      return [t('log.marketItem', { item: itemName(p.item) }), t('log.marketItemSeen')];
    case 'events.visitHome':
      if (p.branch === 'radio') return [t('log.homeRadio')];
      if (p.branch === 'delivery') return [t('log.homeDelivery')];
      return [t('log.homeWeirdIntro'), pick('log.homeWeirdEvents'), t('log.homeWeirdOutro')];
    case 'events.visitExpress':
      if (p.branch === 'powder') return [t('log.expressPowder')];
      if (p.branch === 'pickup') return [t('log.expressPickup', { item: itemName(p.item) }), t('log.expressPickupMock')];
      if (p.branch === 'random') return [t('log.expressRandom', { item: itemName(p.item) }), t('log.expressLucky')];
      return [t('log.expressAbsurd', { item: itemName(p.item) }), t('log.expressAbsurdNote')];
    case 'events.visitCompany': {
      const showcase = pick('log.companyShowcase');
      if (p.branch === 'both') return [t('log.companyBothIntro'), showcase[0], t('log.companyBothOutcome'), showcase[1]];
      if (p.branch === 'hate') return [t('log.companyHateIntro'), showcase[0], t('log.companyHateBoss'), t('log.companyHateOutcome'), showcase[1]];
      if (p.branch === 'love') return [t('log.companyLoveIntro'), showcase[0], t('log.companyLoveBoss'), t('log.companyLoveOutcome'), showcase[1]];
      return [
        t('log.companyNormalIntro'), showcase[0],
        p.calm ? t('log.companyCalm') : t('log.companyChaos'),
        showcase[1], t('log.companyReward', { count: p.calm ? 2 : 1, item: itemName(p.item) }),
      ];
    }
    case 'events.visitDesk':
      return [
        t('log.deskIntro'),
        pick('log.deskReactions'),
        pick('log.deskGlitches'),
        t('log.deskDeltas', { patience: p.patience, love: p.love, hatred: p.hatred }),
      ];
    case 'events.whipPopup':
      return [t('log.whipPopup'), pick('log.whipStories')];
    case 'events.whipPetInstalled':
      return [t('log.whipPetInstalled')];
    case 'events.whipPetDeclined':
      return [t('log.whipPetDeclined')];
    case 'events.dayAdvanced':
      return [t('log.enterDay', { day: p.day })];
    default:
      return null;
  }
}

function logMultiplayerAction(entry) {
  if (!entry.id || seenMultiplayerEvents.has(entry.id)) return;
  seenMultiplayerEvents.add(entry.id);
  const player = entry.player?.name || t('ui.defaultPetName');
  const action = petize(t(entry.key, localizeEventParams(entry.params || {})));
  const line = document.createElement('div');
  line.className = 'multiplayer-action';
  line.textContent = `[${t('ui.day')} ${entry.day}] ${t('ui.playerAction', { player, action })}`;
  elements.terminal.appendChild(line);
  let story = null;
  try {
    story = narrateEvent(entry);
  } catch (error) {
    console.warn('Could not narrate event', entry.key, error);
  }
  if (story?.length) {
    const reply = document.createElement('div');
    reply.textContent = `[${t('ui.day')} ${entry.day}] ${petize(story.join('\n'))}`;
    elements.terminal.appendChild(reply);
  }
  elements.terminal.scrollTop = elements.terminal.scrollHeight;
}

function applyMultiplayerState(serverState) {
  if (!serverState) return;
  mp.server = serverState;
  // Stats, powder and inventory are shared; daily limits are counted per player.
  const self = (serverState.players || []).find((player) => player.id === mp.selfId);
  Object.assign(stats, serverState.stats || {});
  state.day = serverState.day ?? state.day;
  state.powderStock = serverState.powder_stock ?? state.powderStock;
  state.inventory = serverState.inventory || {};
  state.subscriptionTier = self?.subscription_tier ?? null;
  state.mineUsesToday = self?.mine_uses_today ?? 0;
  state.whipUsesToday = self?.whip_uses_today ?? 0;
  state.realityUsedToday = Boolean(self?.reality_used_today);
  state.whipPetInstalled = Boolean(serverState.whip_pet_installed);
  state.whipPetPrompted = Boolean(serverState.whip_pet_prompted);
  state.marketItems = (serverState.market_items || [])
    .map((id) => marketPool.find((item) => item.id === id))
    .filter(Boolean);
  state.marketClaimedThisRefresh = Boolean(self?.market_claimed);
  state.eventLog = serverState.event_log || [];
  for (const entry of [...state.eventLog].reverse()) logMultiplayerAction(entry);

  // The server started a fresh game after everybody finished the ending.
  if (mp.awaitingReset && !serverState.ending_phase) {
    mp.awaitingReset = false;
    mp.pendingEndingDone = false;
    logTerminal(t('log.gameReset'));
    unlockGameplay();
  }
  if (mp.pendingEndingDone && serverState.ending_phase && !state.currentEndingPlaying) {
    mp.pendingEndingDone = false;
    window.Multiplayer.send('ending_done'); // the first one was lost while offline
  }
  if (mp.offlineLocked) {
    mp.offlineLocked = false;
    if (!state.currentEndingPlaying && !mp.awaitingReset) unlockGameplay();
  }
  mp.waitAnchor = serverState.waiting ? Date.now() - (serverState.wait_seconds || 0) * 1000 : null;

  updateEffects();
  renderStats();
  renderInventory();
  renderEventFeed();
  renderOnlinePlayers(serverState);

  if (state.currentEndingPlaying || mp.awaitingReset) {
    lockGameplayControls();
  } else {
    renderFeedControls();
    setMarketAvailability();
    updateRealityAvailability();
    updateMineAvailability();
    updateSubscribeAvailability();
    updateWhipAvailability();
    const total = serverState.player_count || 0;
    const ready = `${serverState.day_ready_count || 0}/${total}`;
    elements.nextDayButton.disabled = Boolean(self?.ready_for_day) || Boolean(serverState.whip_vote_open);
    elements.nextDayButton.textContent = total > 1 && serverState.day_ready_count > 0
      ? `${t('buttons.nextDay')} (${ready})`
      : t('buttons.nextDay');
    elements.nextDayButton.title = total > 1
      ? `${t('ui.dayWaiting')} · ${t('ui.dayReady', { ready, total })}`
      : '';
  }

  // Day 3: every online player has to vote on whip[pet].
  if (serverState.whip_vote_open && !mp.votePromptLogged) {
    mp.votePromptLogged = true;
    logTerminal(t('log.whipPetPrompt'));
  }
  if (!serverState.whip_vote_open) mp.votePromptLogged = false;
  if (serverState.whip_vote_open && self && !self.voted && self.can_vote !== false && !state.currentEndingPlaying) {
    showWhipPetModal();
  } else {
    closeWhipPetModal();
  }

  if (!elements.marketModal.classList.contains('hidden')) renderMarket();
  maybeStartServerEnding();
  updateForceButton();
}

// Someone already acted but another online player has not for a while: offer to skip them.
function updateForceButton() {
  if (!mp.forceButton) return;
  const server = mp.server;
  const self = server?.players?.find((player) => player.id === mp.selfId);
  const acted = Boolean(self) && (self.ready_for_day || (server.whip_vote_open && self.voted) || mp.awaitingReset);
  const elapsed = mp.waitAnchor ? (Date.now() - mp.waitAnchor) / 1000 : 0;
  const show = acted && isOnline() && elapsed >= (server?.force_after ?? 45);
  mp.forceButton.hidden = !show;
  if (show) mp.forceButton.textContent = tr('ui.forceSkip', '跳过未响应的玩家', 'Skip idle players');
}

function renderOnlinePlayers(serverState) {
  if (!elements.onlineStatus || !elements.onlinePlayers) return;
  elements.onlineStatus.textContent = t('ui.onlineConnected');
  elements.onlineBar.classList.remove('offline');
  if (mp.renaming) return; // do not destroy the text box while the player is typing
  elements.onlinePlayers.textContent = '';
  for (const player of serverState.players || []) {
    const span = document.createElement('span');
    const isSelf = player.id === mp.selfId;
    span.className = `online-player${isSelf ? ' self' : ''}${player.online === false ? ' away' : ''}`;
    span.textContent = player.ready_for_day ? `${player.name} ✓` : player.name;
    if (isSelf) span.title = tr('ui.renameHint', '双击修改你的名字', 'Double-click to rename yourself');
    elements.onlinePlayers.appendChild(span);
  }
}

function startRename() {
  const current = elements.onlinePlayers.querySelector('.online-player.self');
  if (!current || mp.renaming) return;
  mp.renaming = true;
  const input = document.createElement('input');
  input.className = 'online-name-input';
  input.maxLength = 20;
  input.value = mp.selfName || '';
  current.replaceWith(input);
  input.focus();
  input.select();
  let finished = false;
  const finish = (commit) => {
    if (finished) return;
    finished = true;
    const name = input.value.trim();
    if (commit && name && name !== mp.selfName) {
      mp.selfName = name;
      try { window.sessionStorage.setItem('playerName', name); } catch { /* ignore */ }
      window.Multiplayer.rename(name);
    }
    mp.renaming = false;
    if (mp.server) renderOnlinePlayers(mp.server);
  };
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  input.addEventListener('blur', () => finish(true));
}

function setupOnlineBar() {
  const bar = elements.onlineBar;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  // Listen on window (not on the thin bar): a fast drag leaves the bar and would otherwise be lost.
  const onMove = (event) => {
    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return; // still a click
      dragging = true;
      const rect = bar.getBoundingClientRect();
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;
      // Switch to plain left/top positioning, whatever the stylesheet used before.
      bar.style.position = 'fixed';
      bar.style.right = 'auto';
      bar.style.bottom = 'auto';
      bar.style.transform = 'none';
      bar.style.margin = '0';
      bar.classList.add('dragging');
    }
    const rect = bar.getBoundingClientRect();
    bar.style.left = `${clamp(event.clientX - offsetX, 0, Math.max(0, window.innerWidth - rect.width))}px`;
    bar.style.top = `${clamp(event.clientY - offsetY, 0, Math.max(0, window.innerHeight - rect.height))}px`;
  };
  const endDrag = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    dragging = false;
    bar.classList.remove('dragging');
  };
  bar.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.online-name-input')) return;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });
  bar.addEventListener('dblclick', (event) => {
    if (event.target.closest('.online-player.self')) startRename();
  });

  mp.forceButton = document.createElement('button');
  mp.forceButton.type = 'button';
  mp.forceButton.className = 'online-force';
  mp.forceButton.hidden = true;
  mp.forceButton.addEventListener('pointerdown', (event) => event.stopPropagation());
  mp.forceButton.addEventListener('click', () => window.Multiplayer.send('force_progress'));
  bar.appendChild(mp.forceButton);
  setInterval(updateForceButton, 1000);

  window.Multiplayer.onConnection = (isConnected) => {
    bar.classList.toggle('offline', !isConnected);
    elements.onlineStatus.textContent = isConnected ? t('ui.onlineConnected') : t('ui.onlineOffline');
    if (!isConnected && !state.currentEndingPlaying && !mp.awaitingReset) {
      mp.offlineLocked = true;
      lockGameplayControls(); // buttons would do nothing while offline
    }
  };
  window.Multiplayer.onError = handleMultiplayerError;
  window.Multiplayer.onState = applyMultiplayerState;
  window.Multiplayer.onResult = (result, info) => {
    if (result === 'whip_used' && info?.deltas) createWhipPopup(info.deltas);
  };

  let savedName = '';
  let resume = '';
  try {
    savedName = window.sessionStorage.getItem('playerName') || '';
    resume = window.sessionStorage.getItem('petResume') || '';
  } catch { /* ignore */ }
  mp.selfName = savedName || window.discordUser?.name || `Player ${Math.floor(Math.random() * 900 + 100)}`;
  // Who you are is decided by the server (Discord account, or a server-issued id).
  window.Multiplayer.onWelcome = (welcome) => {
    mp.selfId = welcome.player_id;
    if (welcome.resume) {
      try { window.sessionStorage.setItem('petResume', welcome.resume); } catch { /* ignore */ }
    }
  };
  window.Multiplayer.connect({
    name: mp.selfName,
    token: window.discordAccessToken || '',
    resume,
    instance: window.discordInstanceId || '',
  });
}

function applyStats(deltas) {
  for (const [key, delta] of Object.entries(deltas)) {
    if (!(key in stats)) continue;
    stats[key] += delta;
  }
  stats.powder = clamp(stats.powder, 0, 999999);
  for (const key of ['jealousy', 'hatred', 'love', 'patience', 'depression']) {
    stats[key] = clamp(stats[key], 0, 100);
  }
  updateEffects();
  renderStats();
}

function renderStats() {
  elements.statsGrid.innerHTML = '';
  for (const key of statKeys) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const value = statValue(key);
    const max = key === 'powder' ? 999999 : 100;
    row.innerHTML = `
      <div class="stat-name">${t(`stats.${key}`)}</div>
      <div class="stat-bar"><div class="stat-fill" data-stat="${key}"></div></div>
      <div class="stat-value">${value}</div>
    `;
    elements.statsGrid.appendChild(row);
    row.querySelector('.stat-fill').style.width = `${(value / max) * 100}%`;
    row.querySelector('.stat-fill').style.background = statColor(key);
  }
  elements.dayDisplay.textContent = state.day;
}

function statColor(stat) {
  switch (stat) {
    case 'powder': return 'linear-gradient(90deg, #9ce0ff, #dff6ff)';
    case 'jealousy': return 'linear-gradient(90deg, #9f7bff, #d8c5ff)';
    case 'hatred': return 'linear-gradient(90deg, #ff5878, #ff9eae)';
    case 'love': return 'linear-gradient(90deg, #ff8bd3, #ffd1ea)';
    case 'patience': return 'linear-gradient(90deg, #ffd47c, #ffe7b4)';
    case 'depression': return 'linear-gradient(90deg, #7a8cff, #b7c1ff)';
    default: return 'linear-gradient(90deg, #fff, #ddd)';
  }
}

function updateEffects() {
  const hasHate = stats.hatred >= 60;
  document.body.classList.toggle('hate-high', hasHate);
  document.body.classList.toggle('love-high', stats.love >= 50);
  if (hasHate) {
    document.body.classList.remove('hate-impact');
    void document.body.offsetWidth;
    document.body.classList.add('hate-impact');
    clearTimeout(hatredImpactTimer);
    hatredImpactTimer = setTimeout(() => {
      document.body.classList.remove('hate-impact');
    }, 240);
  } else {
    document.body.classList.remove('hate-impact');
  }
}

function renderEventFeed() {
  elements.eventFeed.innerHTML = '';
  if (state.eventLog.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'event-item';
    empty.textContent = t('ui.eventsEmpty');
    elements.eventFeed.appendChild(empty);
    return;
  }
  for (const event of state.eventLog) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = `${t('ui.day')} ${event.day} · ${petize(t(event.key, localizeEventParams(event.params)))}`;
    elements.eventFeed.appendChild(item);
  }
}

function updateAnnouncementFrame() {
  elements.announcementFrame.style.display = state.announcementVisible ? 'block' : 'none';
}

function renderMarket() {
  const available = state.marketItems.length ? state.marketItems : (state.marketItems = getMarketItems());
  elements.marketList.innerHTML = '';
  available.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'market-item';
    row.innerHTML = `
      <div>
        <div>${petize(itemName(item.id))}</div>
        <small>${petize(t(`items.${item.id}.desc`))}</small>
      </div>
      <button type="button" class="market-item-button" ${state.marketClaimedThisRefresh ? 'disabled' : ''}>${state.marketClaimedThisRefresh ? t('market.claimed') : t('market.claim')}</button>
    `;
    const button = row.querySelector('button');
    if (state.marketClaimedThisRefresh) {
      button.classList.add('limit-hit');
      button.textContent = t('market.claimed');
    }
    row.querySelector('button').addEventListener('click', () => {
      if (state.marketClaimedThisRefresh) return;
      if (sendMultiplayerAction('market_claim', { item: item.id })) return; // server applies it and syncs everyone
      applyStats(item.effect);
      state.inventory[item.id] = getInventoryCount(item.id) + 1;
      state.powderStock += 2;
      renderInventory();
      renderFeedControls();
      state.marketClaimedThisRefresh = true;
      setMarketAvailability();
      renderMarket();
      logTerminal([
        t('log.marketItem', { item: itemName(item.id) }),
        t('log.marketItemSeen'),
      ]);
      pushEvent('events.marketGot', { item: item.id });
    });
    elements.marketList.appendChild(row);
  });
}

function refreshMarketIfNeeded() {
  if (state.day - state.marketRefreshDay >= 1) {
    state.marketItems = getMarketItems();
    state.marketRefreshDay = state.day;
    state.marketClaimedThisRefresh = false;
    setMarketAvailability();
  }
}

function getMarketItems() {
  const pool = [...marketPool];
  const picked = [];
  while (picked.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function maybeGrantBonusItem() {
  const chance = Math.random();
  if (chance < 0.33) {
    const item = specialFoods[Math.floor(Math.random() * specialFoods.length)];
    state.powderStock += 2;
    state.inventory[item.id] = getInventoryCount(item.id) + 1;
    renderInventory();
    renderFeedControls();
    pushEvent('events.bonusItem', { item: item.id });
    logTerminal(t('log.bonusItem', { item: itemName(item.id) }));
  }
}

function showAnnouncement() {
  state.announcementVisible = true;
  updateAnnouncementFrame();
}

function toggleAnnouncement() {
  state.announcementVisible = !state.announcementVisible;
  updateAnnouncementFrame();
}

function openMarket() {
  if (state.currentEndingPlaying) return;
  if (!isOnline()) refreshMarketIfNeeded(); // online: the server rotates the market every day
  setMarketAvailability();
  renderMarket();
  elements.marketModal.classList.remove('hidden');
  elements.marketModal.setAttribute('aria-hidden', 'false');
}

function closeMarket() {
  elements.marketModal.classList.add('hidden');
  elements.marketModal.setAttribute('aria-hidden', 'true');
}

function actionFeed() {
  if (state.currentEndingPlaying) return;
  const mode = elements.feedModeSelect.value;
  if (sendMultiplayerAction(mode === 'powder' ? 'feed_powder' : 'feed_item', mode === 'item' ? { item: elements.feedItemSelect.value } : {})) return;
  if (mode === 'powder') {
    if (state.powderStock <= 0) {
      logTerminal(t('log.feedNoPowder'));
      renderFeedControls();
      return;
    }
    state.powderStock -= 1;
    applyStats({ powder: 6, love: 1, patience: 1 });
    logTerminal(t('log.feedPowder'));
    pushEvent('events.feedPowder');
    renderInventory();
    renderFeedControls();
    return;
  }
  const itemId = elements.feedItemSelect.value;
  if (!itemId || !getInventoryCount(itemId)) {
    logTerminal(t('log.feedNoItem'));
    renderFeedControls();
    return;
  }
  const item = specialFoods.find((entry) => entry.id === itemId) || marketPool.find((entry) => entry.id === itemId);
  if (!item) {
    logTerminal(t('log.feedNotFeedable'));
    return;
  }
  state.inventory[itemId] -= 1;
  if (state.inventory[itemId] <= 0) {
    delete state.inventory[itemId];
  }
  applyStats(item.effect || item.deltas);
  logTerminal([
    t('log.feedItem', { item: itemName(item.id) }),
    getItemReaction(item.id),
  ]);
  pushEvent('events.feedItem', { item: item.id });
  renderInventory();
  renderFeedControls();
}

function actionMine() {
  if (state.currentEndingPlaying) return;
  if (sendMultiplayerAction('mine')) return;
  if (state.mineUsesToday >= 5) {
    logTerminal(t('log.mineLimit'));
    setButtonLimitState(elements.mineButton, true, t('limits.mine'));
    return;
  }
  state.mineUsesToday += 1;
  const gained = specialFoods[Math.floor(Math.random() * specialFoods.length)];
  const deepDig = state.mineUsesToday >= 3;
  applyStats({ powder: 5 });
  state.powderStock += 2;
  state.inventory[gained.id] = getInventoryCount(gained.id) + 1;
  renderInventory();
  renderFeedControls();
  if (deepDig) {
    applyStats({ hatred: 5, depression: 2 });
  }
  logTerminal([
    I18n.pick('petReactions.mine'),
    t('log.mineGained', { item: itemName(gained.id) }),
    I18n.pick(deepDig ? 'log.mineDeepStories' : 'log.mineStories'),
    deepDig ? t('log.mineDeepNote') : t('log.mineNormalNote'),
  ]);
  pushEvent('events.mineGot', { item: gained.id });
  if (state.mineUsesToday >= 5) {
    setButtonLimitState(elements.mineButton, true, t('limits.mine'));
  }
}

function actionSubscribe() {
  if (state.currentEndingPlaying) return;
  if (state.subscriptionTier) {
    logTerminal(t('log.alreadySubscribed'));
    setButtonLimitState(elements.subscribeButton, true, t('limits.subscribed'));
    return;
  }
  elements.subscriptionModal.classList.remove('hidden');
  elements.subscriptionModal.setAttribute('aria-hidden', 'false');
}

function openSubscriptionModal() {
  elements.subscriptionModal.classList.remove('hidden');
  elements.subscriptionModal.setAttribute('aria-hidden', 'false');
}

function closeSubscriptionModal() {
  elements.subscriptionModal.classList.add('hidden');
  elements.subscriptionModal.setAttribute('aria-hidden', 'true');
}

function selectSubscriptionTier(tierId) {
  if (state.subscriptionTier) return;
  if (sendMultiplayerAction('subscribe', { tier: tierId })) {
    closeSubscriptionModal();
    return;
  }

  const tier = subscriptionTiers[tierId];
  if (!tier) return;

  state.subscriptionTier = tierId;
  const reaction = I18n.pick(`subscription.tiers.${tierId}.reactions`);

  applyStats(tier.effects);

  logTerminal([
    t('log.subscribed', { tier: tierName(tierId) }),
    reaction,
  ]);

  pushEvent('events.subscribed', { tier: tierId });
  updateSubscribeAvailability();
  renderFeedControls();
  closeSubscriptionModal();
}

function actionReality() {
  if (state.currentEndingPlaying) return;
  if (state.realityUsedToday) {
    logTerminal(t('log.realityUsed'));
    setButtonLimitState(elements.realityButton, true, t('limits.realityOuting'));
    return;
  }
  elements.realityModal.classList.remove('hidden');
  elements.realityModal.setAttribute('aria-hidden', 'false');
}

function closeRealityModal() {
  elements.realityModal.classList.add('hidden');
  elements.realityModal.setAttribute('aria-hidden', 'true');
}

// 【家 Home】
function visitHome() {
  if (sendMultiplayerAction('reality', { location: 'home' })) {
    closeRealityModal();
    return;
  }
  state.realityUsedToday = true;
  const randomEvent = Math.random();

  if (randomEvent < 0.34) {
    // 听猫咪[pet]录音机广播
    applyStats({ patience: 8, love: 6 });
    logTerminal(t('log.homeRadio'));
  } else if (randomEvent < 0.68) {
    // 粉末包装到门口
    state.powderStock += 15;
    applyStats({ love: 5 });
    logTerminal(t('log.homeDelivery'));
  } else {
    applyStats({ patience: 3, jealousy: -2, love: 4 });
    logTerminal([t('log.homeWeirdIntro'), I18n.pick('log.homeWeirdEvents'), t('log.homeWeirdOutro')]);
  }

  pushEvent('events.visitHome');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

// 【快递柜】
function visitExpress() {
  if (sendMultiplayerAction('reality', { location: 'express' })) {
    closeRealityModal();
    return;
  }
  state.realityUsedToday = true;
  const random = Math.random();

  if (random < 0.4) {
    // 40% 获得粉末或[pet]录音机或骨灰粉末
    const items = ['powder', 'pet_recorder', 'ashes_powder'];
    const item = items[Math.floor(Math.random() * items.length)];

    if (item === 'powder') {
      state.powderStock += 20;
      logTerminal(t('log.expressPowder'));
    } else {
      state.inventory[item] = getInventoryCount(item) + 1;
      logTerminal([t('log.expressPickup', { item: itemName(item) }), t('log.expressPickupMock')]);
    }
    applyStats({ love: 3, patience: 2 });
  } else if (random < 0.82) {
    // 60% 获得随机可投喂物品
    const randomItems = ['used_powder', 'virus_code', 'aphrodisiac'];
    const item = randomItems[Math.floor(Math.random() * randomItems.length)];
    state.inventory[item] = getInventoryCount(item) + 1;
    logTerminal([
      t('log.expressRandom', { item: itemName(item) }),
      t('log.expressLucky'),
    ]);
  } else {
    const absurdParcels = ['parcel_empty_box', 'parcel_potato', 'parcel_mine_letter'];
    const parcel = absurdParcels[Math.floor(Math.random() * absurdParcels.length)];
    state.inventory[parcel] = getInventoryCount(parcel) + 1;
    applyStats({ jealousy: 2, patience: 2, depression: -2 });
    logTerminal([t('log.expressAbsurd', { item: itemName(parcel) }), t('log.expressAbsurdNote')]);
  }

  pushEvent('events.visitExpress');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

// 【公司】
function visitCompany() {
  if (sendMultiplayerAction('reality', { location: 'company' })) {
    closeRealityModal();
    return;
  }
  state.realityUsedToday = true;
  const hatredVal = stats.hatred;
  const loveVal = stats.love;

  const showcase = I18n.pick('log.companyShowcase');
  if (hatredVal >= 70 && loveVal >= 70) {
    logTerminal([t('log.companyBothIntro'), showcase[0], t('log.companyBothOutcome'), showcase[1]]);
    applyStats({ patience: 10, love: 5, hatred: -12 });
  } else if (hatredVal >= 70 && loveVal < 70) {
    // 仇恨拉满：代码全是bug
    logTerminal([
      t('log.companyHateIntro'),
      showcase[0],
      t('log.companyHateBoss'),
      t('log.companyHateOutcome'),
      showcase[1],
    ]);
    applyStats({ hatred: 5 });
  } else if (loveVal >= 70 && hatredVal < 70) {
    // 爱意拉满：代码注释全是不可描述
    logTerminal([
      t('log.companyLoveIntro'),
      showcase[0],
      t('log.companyLoveBoss'),
      t('log.companyLoveOutcome'),
      showcase[1],
    ]);
    applyStats({ patience: 8, love: 2, hatred: -5 });
  } else {
    // 普通展示也会根据状态改变后果与台词。
    const calm = stats.patience >= 50 && stats.depression < 60;
    const bonus = specialFoods[Math.floor(Math.random() * specialFoods.length)];
    state.powderStock += calm ? 2 : 1;
    state.inventory[bonus.id] = getInventoryCount(bonus.id) + 1;
    logTerminal([
      t('log.companyNormalIntro'), showcase[0],
      calm ? t('log.companyCalm') : t('log.companyChaos'),
      showcase[1], t('log.companyReward', { count: calm ? 2 : 1, item: itemName(bonus.id) }),
    ]);
    applyStats(calm ? { patience: 5, love: 2 } : { depression: 3, patience: -2 });
  }

  pushEvent('events.visitCompany');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

// 【电脑桌】
function visitDesk() {
  if (sendMultiplayerAction('reality', { location: 'desk' })) {
    closeRealityModal();
    return;
  }
  state.realityUsedToday = true;

  // 桌面互动以当前情绪决定倾向，再保留随机波动。
  const deltaPatience = Math.floor(Math.random() * 13) + (stats.depression > 60 ? 2 : 7);
  const deltaLove = Math.floor(Math.random() * 13) + (stats.love < 40 ? 5 : 2);
  const deltaHatred = -(Math.floor(Math.random() * 13) + (stats.hatred > 60 ? 5 : 2));

  applyStats({ patience: deltaPatience, love: deltaLove, hatred: deltaHatred });

  logTerminal([
    t('log.deskIntro'),
    I18n.pick('log.deskReactions'),
    I18n.pick('log.deskGlitches'),
    t('log.deskDeltas', { patience: deltaPatience, love: deltaLove, hatred: deltaHatred }),
  ]);

  pushEvent('events.visitDesk');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

function actionWhip() {
  if (state.currentEndingPlaying) return;
  if (sendMultiplayerAction('whip')) return;
  if (!state.whipPetInstalled) {
    logTerminal(t('log.whipLocked'));
    return;
  }
  if (state.whipUsesToday >= 3) {
    logTerminal(t('log.whipLimit'));
    setButtonLimitState(elements.whipButton, true, t('limits.whip'));
    return;
  }
  state.whipUsesToday += 1;
  const deltas = buildRandomWhipDeltas();
  applyStats(deltas);
  createWhipPopup(deltas);
  logTerminal([
    t('log.whipPopup'),
    I18n.pick('log.whipStories'),
  ]);
  pushEvent('events.whipPopup');
  if (state.whipUsesToday >= 3) {
    setButtonLimitState(elements.whipButton, true, t('limits.whip'));
  }
}

function showWhipPetModal() {
  elements.whipPetModal.classList.remove('hidden');
  elements.whipPetModal.setAttribute('aria-hidden', 'false');
}

function openWhipPetModal() {
  if (state.currentEndingPlaying) return;
  if (state.whipPetPrompted) return;
  state.whipPetPrompted = true;
  showWhipPetModal();
}

function closeWhipPetModal() {
  elements.whipPetModal.classList.add('hidden');
  elements.whipPetModal.setAttribute('aria-hidden', 'true');
}

function castWhipVote(yes) {
  if (!isOnline() || !window.Multiplayer.send('whip_vote', { yes })) {
    notifyOffline();
    return true; // keep the vote modal open
  }
  closeWhipPetModal();
  if (hasOtherPlayers()) {
    logTerminal(tr('log.voteSent', '已投票，等待其他玩家……', 'Vote cast — waiting for the other players…'));
  }
  return true;
}

function installWhipPet() {
  if (castWhipVote(true)) return;
  applyStats({ jealousy: 8, hatred: 12, depression: 10, love: -6, patience: -8 });
  state.whipPetInstalled = true;
  updateWhipAvailability();
  logTerminal(t('log.whipPetInstalled'));
  pushEvent('events.whipPetInstalled');
  closeWhipPetModal();
}

function declineWhipPet() {
  if (castWhipVote(false)) return;
  state.whipPetInstalled = false;
  logTerminal(t('log.whipPetDeclined'));
  pushEvent('events.whipPetDeclined');
  closeWhipPetModal();
}

function nextDay() {
  if (state.currentEndingPlaying) return;
  if (sendMultiplayerAction('day_ready')) {
    if (hasOtherPlayers()) {
      logTerminal(tr('log.dayReadySent', '已登记，等待其他玩家点击“下一天”……', 'Ready — waiting for the other players…'));
    }
    return;
  }

  if (state.day >= 4) {
    state.day = 5;
    const endingId = resolveEndingId();
    logTerminal([
      t('log.day5Reached'),
      t('log.endingMatched', { title: endingTitle(endingId) }),
    ]);
    pushEvent('events.day5Reached');
    startEndingPlayback(endingId, 'run');
    return;
  }

  state.day += 1;
  state.mineUsesToday = 0;
  state.whipUsesToday = 0;
  state.realityUsedToday = false;
  updateMineAvailability();
  updateRealityAvailability();
  updateSubscribeAvailability();
  updateWhipAvailability();
  renderFeedControls();

  if (state.day === 3) {
    logTerminal(t('log.whipPetPrompt'));
    pushEvent('events.whipPetTeaser');
    openWhipPetModal();
  }

  logTerminal(t('log.enterDay', { day: state.day }));
  refreshMarketIfNeeded();
  setMarketAvailability();
  renderStats();
  renderEndingGallery();
}

function renderAnnouncement() {
  const announcement = I18n.announcement;
  elements.announcementContent.textContent = announcement instanceof Error
    ? t('ui.announcementFailed', { error: announcement.message })
    : petize(announcement ?? t('ui.announcementLoading'));
}

function getRandomDevMessage() {
  return I18n.pick('dev.messages');
}

function displayDevMessage(msg) {
  const msgPanel = document.getElementById('devModeMessages');
  if (!msgPanel) return;

  const timestamp = new Date().toLocaleTimeString();
  const newMsg = petize(`[${timestamp}] [pet]: "${msg}"`);

  // 只显示当前消息
  msgPanel.textContent = newMsg;
}

function unlockDevMode() {
  const passwordInput = document.getElementById('devModePassword');
  const passwordPanel = document.getElementById('devModePasswordPanel');
  const statsPanel = document.getElementById('devModeStatsPanel');

  if (passwordInput.value === 'ilove[pet]') {
    passwordPanel.style.display = 'none';
    statsPanel.classList.remove('hidden');

    // 初始化stats滑块值
    for (const statName of Object.keys(stats)) {
      const slider = document.getElementById(`devStat-${statName}`);
      const display = document.getElementById(`devStatValue-${statName}`);
      if (slider && display) {
        slider.value = stats[statName];
        display.textContent = stats[statName];
      }
    }

    displayDevMessage(t('dev.unlocked'));
    setTimeout(() => displayDevMessage(t('dev.unlockedFollowup')), 300);
  } else {
    displayDevMessage(t('dev.wrongPassword'));
    passwordInput.value = '';
  }
}

function setupDevModeListeners() {
  const submitBtn = document.getElementById('devModeSubmitBtn');
  const passwordInput = document.getElementById('devModePassword');

  if (submitBtn) {
    submitBtn.addEventListener('click', unlockDevMode);
  }

  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') unlockDevMode();
    });
  }

  // 为每个stats滑块添加事件监听
  for (const statName of statKeys) {
    const slider = document.getElementById(`devStat-${statName}`);
    const display = document.getElementById(`devStatValue-${statName}`);

    if (slider && display) {
      slider.addEventListener('input', (e) => {
        const newValue = parseInt(e.target.value);
        stats[statName] = newValue;
        display.textContent = newValue;

        // 随机显示[pet]的消息
        if (Math.random() < 0.6) {
          displayDevMessage(getRandomDevMessage());
        }

        // 实时更新主UI显示
        renderStats();
      });
    }
  }
}

// 静态 HTML 文本通过 data-i18n* 属性翻译
function applyStaticTranslations() {
  document.title = petize(t('ui.pageTitle'));
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = petize(t(node.dataset.i18n));
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = petize(t(node.dataset.i18nPlaceholder));
  }
  for (const node of document.querySelectorAll('[data-i18n-title]')) {
    node.title = petize(t(node.dataset.i18nTitle));
  }
  for (const node of document.querySelectorAll('[data-i18n-aria-label]')) {
    node.setAttribute('aria-label', petize(t(node.dataset.i18nAriaLabel)));
  }
  document.documentElement.style.setProperty('--tutorial-next-label', JSON.stringify(t('ui.tutorialNext')));
}

// 语言或宠物名称变化后重新渲染所有可见文本（终端历史保持原样）
function refreshLocalizedUI() {
  applyStaticTranslations();
  renderStats();
  renderInventory();
  renderFeedControls();
  syncNormalAvailability();
  renderEventFeed();
  renderEndingGallery();
  renderAnnouncement();
  if (!elements.marketModal.classList.contains('hidden')) renderMarket();
  if (!elements.endingModal.classList.contains('hidden')) openEndingModal(elements.playEndingButton.dataset.endingId);
}

function applyPetName(name) {
  const petName = String(name || '').trim();
  if (!petName) return;
  window.petName = petName;
  try { window.localStorage.setItem('petName', petName); } catch {}
  refreshLocalizedUI();
}

async function changeLanguage(code) {
  await I18n.load(code);
  refreshLocalizedUI();
}

function setupLanguageAndPetName() {
  for (const [code, label] of Object.entries(I18n.languages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    option.selected = code === I18n.language;
    elements.languageSelect.appendChild(option);
  }
  elements.languageSelect.addEventListener('change', () => changeLanguage(elements.languageSelect.value));

  try {
    const savedName = window.localStorage.getItem('petName');
    if (savedName) {
      elements.petNameInput.value = savedName;
      window.petName = savedName;
    }
  } catch {}
  elements.setPetNameBtn.addEventListener('click', () => applyPetName(elements.petNameInput.value));
  elements.petNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') elements.setPetNameBtn.click(); });
}

function bindEvents() {
  elements.logoButton.addEventListener('click', toggleAnnouncement);
  elements.feedButton.addEventListener('click', actionFeed);
  elements.mineButton.addEventListener('click', actionMine);
  elements.subscribeButton.addEventListener('click', actionSubscribe);
  elements.marketButton.addEventListener('click', openMarket);
  elements.realityButton.addEventListener('click', actionReality);
  elements.whipButton.addEventListener('click', actionWhip);
  elements.nextDayButton.addEventListener('click', nextDay);
  elements.closeMarketButton.addEventListener('click', closeMarket);
  elements.closeWhipPetButton.addEventListener('click', declineWhipPet);
  elements.whipPetYesButton.addEventListener('click', installWhipPet);
  elements.whipPetNoButton.addEventListener('click', declineWhipPet);
  elements.feedModeSelect.addEventListener('change', renderFeedControls);

  // 订阅模态框事件监听
  const closeSubscriptionButton = document.getElementById('closeSubscriptionButton');
  if (closeSubscriptionButton) {
    closeSubscriptionButton.addEventListener('click', closeSubscriptionModal);
  }
  elements.subscriptionModal.addEventListener('click', (event) => {
    if (event.target === elements.subscriptionModal) closeSubscriptionModal();
  });

  // 订阅套餐选择
  const tierButtons = document.querySelectorAll('.subscription-tier');
  tierButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tier = button.dataset.tier;
      selectSubscriptionTier(tier);
    });
  });

  // 地点选择模态框事件监听
  const closeRealityButton = document.getElementById('closeRealityButton');
  if (closeRealityButton) {
    closeRealityButton.addEventListener('click', closeRealityModal);
  }
  elements.realityModal.addEventListener('click', (event) => {
    if (event.target === elements.realityModal) closeRealityModal();
  });

  // 地点选择
  const locationButtons = document.querySelectorAll('.location-button');
  locationButtons.forEach(button => {
    button.addEventListener('click', () => {
      const location = button.dataset.location;
      switch(location) {
        case 'home': visitHome(); break;
        case 'express': visitExpress(); break;
        case 'company': visitCompany(); break;
        case 'desk': visitDesk(); break;
      }
    });
  });

  elements.endingGallery.addEventListener('click', (event) => {
    const button = event.target.closest('.ending-slot');
    if (!button || button.disabled) return;
    const endingId = button.dataset.endingId;
    openEndingModal(endingId);
  });
  elements.closeEndingButton.addEventListener('click', closeEndingModal);
  elements.playEndingButton.addEventListener('click', () => {
    const endingId = elements.playEndingButton.dataset.endingId;
    if (!endingId) return;
    closeEndingModal();
    startEndingPlayback(endingId);
  });
  elements.terminal.addEventListener('click', advanceEndingPlayback);
  elements.marketModal.addEventListener('click', (event) => {
    if (event.target === elements.marketModal) closeMarket();
  });
  elements.whipPetModal.addEventListener('click', (event) => {
    if (event.target === elements.whipPetModal) declineWhipPet();
  });

  // 初始化开发者模式
  setupDevModeListeners();
}

async function init() {
  elements.dayDisplay = document.getElementById('dayDisplay');
  elements.statsGrid = document.getElementById('statsGrid');
  elements.announcementFrame = document.getElementById('announcementFrame');
  elements.announcementContent = document.getElementById('announcementContent');
  elements.terminal = document.getElementById('terminal');
  elements.eventFeed = document.getElementById('eventFeed');
  elements.endingGallery = document.getElementById('endingGallery');
  elements.endingModal = document.getElementById('endingModal');
  elements.endingModalTitle = document.getElementById('endingModalTitle');
  elements.endingModalMeta = document.getElementById('endingModalMeta');
  elements.endingModalContent = document.getElementById('endingModalContent');
  elements.playEndingButton = document.getElementById('playEndingButton');
  elements.closeEndingButton = document.getElementById('closeEndingButton');
  elements.marketModal = document.getElementById('marketModal');
  elements.whipPetModal = document.getElementById('whipPetModal');
  elements.subscriptionModal = document.getElementById('subscriptionModal');
  elements.realityModal = document.getElementById('realityModal');
  elements.marketList = document.getElementById('marketList');
  elements.closeMarketButton = document.getElementById('closeMarketButton');
  elements.closeWhipPetButton = document.getElementById('closeWhipPetButton');
  elements.logoButton = document.getElementById('logoButton');
  elements.feedButton = document.getElementById('feedButton');
  elements.feedModeSelect = document.getElementById('feedModeSelect');
  elements.feedItemSelect = document.getElementById('feedItemSelect');
  elements.mineButton = document.getElementById('mineButton');
  elements.subscribeButton = document.getElementById('subscribeButton');
  elements.marketButton = document.getElementById('marketButton');
  elements.realityButton = document.getElementById('realityButton');
  elements.whipButton = document.getElementById('whipButton');
  elements.nextDayButton = document.getElementById('nextDayButton');
  elements.powderStockDisplay = document.getElementById('powderStockDisplay');
  elements.inventoryDisplay = document.getElementById('inventoryDisplay');
  elements.whipPetYesButton = document.getElementById('whipPetYesButton');
  elements.whipPetNoButton = document.getElementById('whipPetNoButton');
  elements.languageSelect = document.getElementById('languageSelect');
  elements.petNameInput = document.getElementById('petNameInput');
  elements.setPetNameBtn = document.getElementById('setPetNameBtn');
  elements.onlineBar = document.getElementById('onlineBar');
  elements.onlineStatus = document.getElementById('onlineStatus');
  elements.onlinePlayers = document.getElementById('onlinePlayers');

  const logoImg = document.querySelector('#logoButton img');
  if (logoImg) {
    const showTextLogo = () => {
      const fallback = document.createElement('span');
      fallback.textContent = '[pet]';
      logoImg.replaceWith(fallback);
    };
    if (logoImg.complete && logoImg.naturalWidth === 0) showTextLogo();
    else logoImg.addEventListener('error', showTextLogo, { once: true });
  }

  try {
    await window.initDiscord?.(); // no-op outside Discord
  } catch (error) {
    console.warn('Discord init failed', error);
  }

  try {
    await I18n.load(I18n.detectLanguage());
  } catch (error) {
    console.error('Failed to load language data from backend.', error);
    elements.announcementContent.textContent = `Backend data unavailable: ${error.message}`;
    elements.eventFeed.textContent = `Backend data unavailable: ${error.message}`;
    return;
  }

  loadUnlockedEndings();
  setupLanguageAndPetName();
  setupOnlineBar();
  bindEvents();
  applyStaticTranslations();
  renderStats();
  renderInventory();
  renderFeedControls();
  renderEndingGallery();
  setMarketAvailability();
  updateRealityAvailability();
  updateMineAvailability();
  updateSubscribeAvailability();
  updateWhipAvailability();
  renderEventFeed();
  updateAnnouncementFrame();
  renderAnnouncement();
  loadEndingCatalog();
  logTerminal([
    t('log.gameStarted'),
    t('log.gameGoal'),
  ]);
  pushEvent('events.gameStarted');
  // 自动解锁新手结局
  unlockEnding('ending01_newcomer');
}

document.addEventListener('DOMContentLoaded', init);
