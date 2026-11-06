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

function getItemReaction(id) {
  const branches = t(`items.${id}.branches`);
  if (Array.isArray(branches)) return I18n.pick(`items.${id}.branches`);
  const followup = I18n.pick('itemReaction.followups', { item: itemName(id) });
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
  const files = ['endings_1to5.json', 'endings_6to10.json', 'ending_ashes.json'];
  const loaded = await Promise.all(files.map(async (file) => {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(file);
      return await response.json();
    } catch {
      return null;
    }
  }));

  endingData = {};
  for (const payload of loaded) {
    if (!payload) continue;
    for (const [endingId, meta] of Object.entries(payload._meta || {})) {
      endingData[endingId] = normalizeEndingRecord(endingId, meta);
    }
  }

  renderEndingGallery();
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
  if (state.subscriptionTier === 'ash' && endingData.ending_ashes) return 'ending_ashes';
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

function lockGameplayForEnding() {
  for (const buttonId of gameplayButtonIds) {
    const button = elements[buttonId];
    if (!button) continue;
    button.disabled = true;
  }
  elements.feedModeSelect.disabled = true;
  elements.feedItemSelect.disabled = true;
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

function startEndingPlayback(endingId) {
  const ending = endingData[endingId];
  if (!ending) return;
  state.currentEndingPlaying = endingId;
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
  unlockEnding(endingId);
  logTerminal([t('log.endingFinished', { id: endingId }), t('log.gameReset')]);
  pushEvent('events.endingUnlocked', { ending: endingId });
  state.currentEndingPlaying = null;
  state.endingPlayIndex = 0;
  unlockGameplay();
  resetRunState();
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
  if (state.currentEndingPlaying) return;
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
  const next = `[${stamp}] ${text}`;
  elements.terminal.textContent = elements.terminal.textContent
    ? `${elements.terminal.textContent}\n${next}`
    : next;
  elements.terminal.scrollTop = elements.terminal.scrollHeight;
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
  refreshMarketIfNeeded();
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

function openWhipPetModal() {
  if (state.currentEndingPlaying) return;
  if (state.whipPetPrompted) return;
  state.whipPetPrompted = true;
  elements.whipPetModal.classList.remove('hidden');
  elements.whipPetModal.setAttribute('aria-hidden', 'false');
}

function closeWhipPetModal() {
  elements.whipPetModal.classList.add('hidden');
  elements.whipPetModal.setAttribute('aria-hidden', 'true');
}

function installWhipPet() {
  applyStats({ jealousy: 8, hatred: 12, depression: 10, love: -6, patience: -8 });
  state.whipPetInstalled = true;
  updateWhipAvailability();
  logTerminal(t('log.whipPetInstalled'));
  pushEvent('events.whipPetInstalled');
  closeWhipPetModal();
}

function declineWhipPet() {
  state.whipPetInstalled = false;
  logTerminal(t('log.whipPetDeclined'));
  pushEvent('events.whipPetDeclined');
  closeWhipPetModal();
}

function nextDay() {
  if (state.currentEndingPlaying) return;

  if (state.day >= 4) {
    state.day = 5;
    const endingId = resolveEndingId();
    logTerminal([
      t('log.day5Reached'),
      t('log.endingMatched', { title: endingTitle(endingId) }),
    ]);
    pushEvent('events.day5Reached');
    startEndingPlayback(endingId);
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

  await I18n.load(I18n.detectLanguage());

  loadUnlockedEndings();
  setupLanguageAndPetName();
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
