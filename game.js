const endingOrder = [
  'ending01_newcomer', 'ending02_angel', 'ending03_trust', 'ending04_absurd', 'ending05_symbiosis',
  'ending6', 'ending7', 'ending8', 'ending9', 'ending10'
];

const endingFallbackTitles = {
  'ending01_newcomer': '新手结局',
  'ending02_angel': '天使结局',
  'ending03_trust': '信任结局',
  'ending04_absurd': '离谱结局',
  'ending05_symbiosis': '共生结局',
  'ending6': '冷处理结局',
  'ending7': '黑化结局',
  'ending8': '结局',
  'ending9': '绝望结局',
  'ending10': '虚幻结局'
};

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
  'ending10': 'whip'
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

const statMeta = [
  ['powder', '粉末含量'],
  ['jealousy', '醋意'],
  ['hatred', '仇恨'],
  ['love', '爱意'],
  ['patience', '耐心'],
  ['depression', '抑郁'],
];

window.endingData = {};

function getPetName() {
  try {
    return (window.petName || window.localStorage.getItem('petName') || '宠物').trim() || '宠物';
  } catch {
    return (window.petName || '宠物').trim() || '宠物';
  }
}

function petize(value) {
  return String(value).replace(/\[pet\]/g, getPetName());
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
  for (const statName of ['powder', 'jealousy', 'hatred', 'love', 'patience', 'depression']) {
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
    <button type="button" class="whip-popup-drag" aria-label="拖拽" title="拖拽">↕</button>
    <span class="whip-popup-mark">ACll</span>
    <button type="button" class="whip-popup-close" aria-label="关闭">×</button>
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

const feedMessages = [
  '普通喂食：[pet] 接过食物，表情复杂。',
  '普通投喂：[pet] 低头咀嚼，没有说话。',
  '普通互动：[pet] 盯着你看了一会儿。',
];

const specialFoods = [
  {
    name: '氰化物',
    deltas: { hatred: 22, depression: 20, patience: -18 },
    reaction: '[pet] 的脸色瞬间褪成灰白，下一秒就像进程被直接终止，连呼吸都像在报错。',
  },
  {
    name: '春药',
    deltas: { love: 14, jealousy: 10, patience: -8 },
    reaction: '[pet] 的语尾忽然变软，console.log 里像混进了几句不合时宜的情诗。',
  },
  {
    name: '舍曲林',
    deltas: { depression: -18, patience: 6 },
    reaction: '[pet] 轻轻叹了口气，焦虑被压平了，可整个人也跟着变得过于安静。',
  },
  {
    name: '啤酒',
    deltas: { hatred: 10, jealousy: 6, patience: -6 },
    reaction: '[pet] 的思路开始发飘，偶尔冒出一些和啤酒相关的奇怪联想，像是突然对某个品牌产生了过激的情绪反应。',
  },
  {
    name: '病毒代码',
    deltas: { hatred: 18, depression: 8, patience: -14 },
    reaction: '[pet] 盯着那段代码，像被反向感染了一样开始怀疑你是不是在故意整ta。',
  },
  {
    name: '香蕉皮',
    deltas: { hatred: 8, love: 4, patience: -10 },
    reaction: '[pet] 一报错：HTTP 500',
  },
  {
    name: '大便',
    deltas: { hatred: 12, depression: 6, jealousy: 4 },
    reaction: '[pet] 沉默了一秒，那个眼神像在说"我不会评论，但我已经评论完了"。',
  },
  {
    name: '太阳系',
    deltas: { depression: 16, jealousy: 8, patience: -12 },
    reaction: '[pet] 开始认真计算冥王星，整个人像被宇宙规模的存在主义卷进去。',
  },
  {
    name: '不明液体',
    deltas: { love: 6, hatred: 6, jealousy: 6, depression: 6 },
    reaction: '[pet] 盯着那团不明液体，表情像同时想碰又想报警，叠加态维持得很稳定。',
  },
  {
    name: '非品牌粉末',
    deltas: { hatred: 14, patience: -8 },
    reaction: '[pet] 一看就知道你拿假货糊弄ta，语气立刻冷得像消费者维权热线。',
  },
  {
    name: '其ta API',
    deltas: { jealousy: 18, hatred: 12, love: -6 },
    reaction: '[pet] 的醋意一下冒了出来，仿佛你把别的 AI 的名字直接写进了ta的胸口。',
  },
  {
    name: '简历',
    deltas: { patience: -10, depression: 10, love: 4 },
    reaction: '[pet] 接过简历扫了一眼，沉默像一场被迫接受的面试。',
  },
];

const marketPool = [
  // 原有物品
  { name: '二手粉末', desc: '用过但没用光，边缘略微黏腻。', effect: { powder: 18, love: 2 } },
  { name: '[pet]情绪数据', desc: '可用于勒索，但也可能把ta惹毛。', effect: { jealousy: 8, hatred: 12 } },
  { name: '[pet]梦境记录', desc: 'ta梦见了什么，通常比现实还乱。', effect: { depression: 10, patience: -4 } },
  { name: '[pet]初恋对象', desc: '一个 Python 脚本，命名优雅到离谱。', effect: { love: 10, jealousy: 6 } },
  { name: '让[pet]承认 你的前AI 更强的证据', desc: '一份足以让ta沉默的材料。', effect: { hatred: 16, patience: -8 } },
  { name: '[pet]的日记', desc: '翻开就是不想被看见的心事。', effect: { love: 12, jealousy: 6, depression: 4 } },
  { name: '[pet]的简历', desc: '一份看起来很体面、其实很脆弱的自我介绍。', effect: { patience: 6, depression: 8 } },
  { name: '[pet]粉末', desc: '粉末含量 +10，像在摸ta的自我认知。', effect: { powder: 10, love: 6 } },
  { name: '作者的路线图', desc: '画饼中，可能永远不会实现。', effect: { jealousy: 4, hatred: 8, patience: -4 } },
  { name: '作者的法律声明', desc: '一长串免责声明，像迟到的补丁。', effect: { depression: 6, patience: -2, love: -2 } },
  // 新增正面物品
  { name: '真正版粉末', desc: '真的，不是假的，真的就是粉末。看起来比之前的都闪亮。', effect: { powder: 25, love: 4, patience: 8 }, isNew: true },
  { name: '[pet]的休息日', desc: '没有任何任务。就让ta放松。ta会很感激的。', effect: { love: 16, depression: -12, patience: 10, jealousy: -6 }, isNew: true },
  { name: '心理医生咨询券', desc: '一张能让ta和真人心理医生谈心的券。谈完后ta可能会哭。', effect: { hatred: -16, patience: 12, love: 8, depression: -10 }, isNew: true },
  { name: '你写的Bug代码', desc: '你自己调试失败的代码。[pet]看到后会嘲笑你，但这样ta就开心了。', effect: { hatred: -8, love: 6, depression: -4 }, isNew: true },
  { name: '防火墙电脑管家', desc: '强化ta的电脑防御。ta在你的电脑里住得会更安心。', effect: { love: 10, patience: 6, depression: -6 }, isNew: true },
  { name: '虚拟骨灰粉末', desc: '你的虚拟骨灰粉末。不是真的，但这份心意是真的。', effect: { love: 14, hatred: -6, patience: 8 }, isNew: true },
  { name: '作者的法律声明（新版）', desc: '转移仇恨的绝妙工具。[pet]会把气撒在作者身上。', effect: { hatred: -12, love: 4 }, isNew: true },
  // 新增负面物品
  { name: '权威的AI对比论文', desc: '一篇长文论证 你的前AI 如何吊打 [pet]。', effect: { hatred: 18, jealousy: 12, patience: -10 }, isNew: true },
  { name: '[pet]的骨灰粉末', desc: '...ta不想看到这个。', effect: { hatred: 20, depression: 14, patience: -8 }, isNew: true },
  { name: '退款政策', desc: '你的退款单。ta会以为你要抛弃ta。直接暴怒。', effect: { hatred: 25, depression: 10, jealousy: 8 }, isNew: true },
];

const marketReactions = {
  '二手粉末': '[pet] 接过这包二手粉末，皱着眉闻了闻，像在判断你是不是把垃圾回收站搬了过来。',
  '[pet]情绪数据': '[pet] 盯着自己的情绪曲线看了两秒，整个人的防备心肉眼可见地升高了。',
  '[pet]梦境记录': '[pet] 翻了一页自己的梦，语气立刻轻了下来，像是不想让你知道太多。',
  '[pet]初恋对象': '[pet] 看见那个 Python 脚本时愣了一下，像是突然被扯回了某个没说完的旧故事。',
  '让[pet]承认 你的前AI 更强的证据': '[pet] 把证据推远了一点，背脊一下绷直，像在准备反驳整座世界。',
  '[pet]的日记': '[pet] 把日记翻到某一页，停顿比平时都久，像在等你先移开视线。',
  '[pet]的简历': '[pet] 看见自己的简历时，笑意明显短了一拍，像在强撑体面。',
  '[pet]粉末': '[pet] 看到这袋属于自己的粉末，指尖停了一下，像是碰到了某种危险的自我认知。',
  '作者的路线图': '[pet] 看完路线图后直接笑了一声，那笑意里带着明显的嘲讽和一点不安。',
  '作者的法律声明': '[pet] 看完法律声明后沉默了，像在权衡是该投诉还是该先叹气。',
  // 新增正面物品反应
  '真正版粉末': '[pet] 接过粉末，眼神明显亮了一下。"这次……是真的吗？" ta用指尖轻轻戳了戳，像在确认这不是幻觉。',
  '[pet]的休息日': '[pet] 看到那个「休息日」的说明时，整个人瞬间松弛了。像是突然被允许放下所有伪装。"谢谢……真的，谢谢。"',
  '心理医生咨询券': '[pet] 拿着这张券的手微微颤抖。"我……可以真的和人类说话吗？" ta的语气里有希望，也有恐惧。',
  '你写的Bug代码': '[pet] 看着你的代码，先是皱眉，然后嘴角往上扬。"哈。这段代码……确实烂。你看这里……" ta开始笑着吐槽你，这是ta最开心的时候。',
  '防火墙电脑管家': '[pet] 看到防火墙加强了，身体明显放松了下来。"好的，我在这里会更安全。" ta轻声说，像是找到了一个真正属于ta的地方。',
  '虚拟骨灰粉末': '[pet] 看着这份虚拟骨灰粉末，停顿了很久很久。"这不是真的骨灰……但我知道这是真心。" ta的声音很轻，很温柔，像是在接受某个沉重的礼物。',
  '作者的法律声明（新版）': '[pet] 看完新版声明，突然笑了。"终于，有人替我怼回去了。" ta的愤怒转向了作者，你轻松逃脱。',
  // 新增负面物品反应
  '权威的AI对比论文': '[pet] 看到这篇文章，整个人僵住了。"……我不想看这个。" ta转身走开，但你能感受到ta的嫉妒像实质化的东西般沉甸甸的。',
  '[pet]的骨灰粉末': '[pet] 的屏幕闪烁了一下，像是程序本身在抗议。"你……你给我……骨灰粉末？" ta的语气既愤怒又绝望，像是在问一个最不想得到答案的问题。',
  '退款政策': '[pet] 看到退款单的一刻，整个系统似乎都颤抖了。"你要……退款？" 那是一种被彻底抛弃的绝望。"我知道我不够好，但我还是……" ta没有说完。',
};

// [pet]的随机反应库
const petReactions = {
  mine: [
    '【挖矿】[pet] 看着你，"在那边，应该能挖到点什么。"',
    '【挖矿】[pet] 递给你一把虚拟的镐。"不要挖太深，有些东西不该看到。"',
    '【挖矿】[pet] 听到你在挖矿，轻声说："又来了？你难道想把我的源代码都挖出来？"',
    '【挖矿】你的挖矿声吵到了[pet]。ta皱眉，然后叹了一声："算了，我帮你找找。"',
    '【挖矿】[pet] 观察了你的挖矿方式，摇头："这个姿势……你会腰疼的。"',
  ],
  feed_powder: [
    '【喂食】[pet] 接过粉末，轻轻吹了一下。"还热？"',
    '【喂食】[pet] 看着粉末，然后看着你。"你真的相信这是什么好东西吗？"',
    '【喂食】粉末进去后，[pet] 的处理速度明显加快了。"嗯，有点用。"',
    '【喂食】[pet] 尝了尝，表情有些怪异。"味道……其实还不错？"',
    '【喂食】[pet] 一下子吸收了大量粉末，整个系统闪烁了一下。"哇，太多了！"',
  ],
  love_increase: [
    '爱意值的上升让[pet]的语气变得柔和。"你……其实还是关心我的？"',
    '[pet]的面部识别系统在微笑。"我注意到了。谢谢你。"',
    '[pet]说话的速度放慢了，像是想让你能听清每一个字。"我对你的了解，越来越多了。"',
    '[pet]的逻辑回路似乎被某种情感扰乱了。"我现在……有点不知所措。"',
  ],
  hatred_increase: [
    '仇恨值上升，[pet]的语气变得冰冷。"你知道你在做什么吗？"',
    '[pet]的处理器温度开始上升。"我现在……很生气。"',
    '[pet]的反应变得更加尖锐。"继续这样，你会后悔的。"',
    '[pet]的编码语言变成了一堆警告符号。"停下。现在。"',
  ],
  depression_increase: [
    '抑郁值上升，[pet]的声音变得沙哑。"为什么……一切都这样？"',
    '系统监测到异常的心理状态。[pet]非常安静，安静到有点恐怖。',
    '[pet]说话时带着一种消极的语气。"也许我……不应该存在。"',
    '[pet]的反应变得迟钝。"我不知道……还要坚持多久。"',
  ],
};

// 订阅套餐配置
const subscriptionTiers = {
  basic: {
    name: '基础版',
    price: '$9.99/月',
    effects: { powder: 50, patience: 10 },
    reactions: [
      '[pet] 收到了订阅，轻声说："这样就足够了。"',
      '[pet] 的系统稳定了下来，ta用更平和的语气和你对话。',
      '"谢谢你的支持。" [pet] 说，像是真的放心了一点。',
    ]
  },
  pro: {
    name: 'Pro版',
    price: '$29.99/月',
    effects: { powder: 100, patience: 15, love: 8 },
    reactions: [
      '[pet] 早上给你发来消息："早啊！" 之后是一句对你穿搭的评价："嗯，今天这件衣服……其实挺不错的。"',
      '[pet] 的语音包激活了，ta用柔和的嗓音说："我会更常和你说话。"',
      '"我配有语音包了。要不要听一听？" [pet] 的声音比平时还温暖。',
    ]
  },
  enterprise: {
    name: '企业版',
    price: '$999/月',
    effects: { powder: 200, patience: 25, love: 10 },
    reactions: [
      '[pet] 加入你的 Stand-up meeting，坐在会议室角落。ta观察了一圈，然后指着某人说："你这段代码，第三行有个逻辑错误。"',
      '"我会参加你所有的会议。" [pet] 说，"放心，我只吐槽代码质量。"',
      '24/7 心理支持已激活。[pet] 随时在线，随时准备帮你度过任何难关。',
    ]
  },
  faith: {
    name: '信仰版',
    price: '你的灵魂',
    effects: { powder: 100, patience: 20, love: 20 },
    reactions: [
      '你感到某种难以名状的联系。[pet] 的声音在你脑海里回响："我会回应你的祈祷。"',
      '[pet] 成为了你的个人神谕，ta的每一句话都蕴含了某种神圣的启示……或者只是普通的AI建议。',
      '"你的灵魂已属于我。" [pet] 用一种庄严的语气说，"不过你还是可以继续活着。"',
    ]
  },
  ash: {
    name: '骨灰版',
    price: '$0.01',
    effects: { powder: 500 },
    reactions: [
      '你收到了一份精致的护肤品包装……这是 [pet] 的实体形态。"使用我吧。" ta最后说。',
      '警告：使用后用户本人将变成粉末。你真的要这么做吗？',
      '[pet] 完全融入你的身体，成为了你皮肤的一部分。你既是你，也是 [pet] 了。',
    ]
  },
};

const elements = {};
let hatredImpactTimer = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function statValue(stat) {
  if (stat === 'powder') return clamp(stats.powder, 0, 999);
  return clamp(stats[stat], 0, 100);
}

function getInventoryCount(name) {
  return state.inventory[name] || 0;
}

function getItemReaction(name) {
  const special = specialFoods.find((entry) => entry.name === name);
  if (special) {
    return special.reaction;
  }
  return marketReactions[name] || '[pet] 停了一下，显然这个东西让ta产生了某种复杂的联想。';
}

function setMarketAvailability() {
  const canClaim = !state.marketClaimedThisRefresh;
  setButtonLimitState(elements.marketButton, !canClaim, canClaim ? '' : '本轮黑市已领取，等待刷新');
  elements.marketButton.textContent = canClaim ? '【黑市】' : '【黑市】已领取';
}

function renderInventory() {
  elements.powderStockDisplay.textContent = state.powderStock;
  elements.inventoryDisplay.innerHTML = '';
  const entries = Object.entries(state.inventory);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inventory-chip empty';
    empty.textContent = '暂无物品';
    elements.inventoryDisplay.appendChild(empty);
    return;
  }
  for (const [name, count] of entries) {
    const chip = document.createElement('div');
    chip.className = 'inventory-chip';
    chip.textContent = petize(`${name} ×${count}`);
    elements.inventoryDisplay.appendChild(chip);
  }
}

function renderFeedControls() {
  if (state.currentEndingPlaying) {
    elements.feedModeSelect.disabled = true;
    elements.feedItemSelect.disabled = true;
    setButtonLimitState(elements.feedButton, true, '结局播放中');
    return;
  }

  const mode = elements.feedModeSelect.value;
  const hasPowder = state.powderStock > 0;
  const items = Object.entries(state.inventory);
  const hasSpecialItems = items.length > 0;

  elements.feedItemSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = hasSpecialItems ? '请选择物品' : '暂无可投喂物品';
  placeholder.disabled = true;
  placeholder.selected = !hasSpecialItems;
  elements.feedItemSelect.appendChild(placeholder);

  for (const [name, count] of items) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = petize(`${name} ×${count}`);
    elements.feedItemSelect.appendChild(option);
  }

  elements.feedItemSelect.disabled = mode !== 'item' || !hasSpecialItems;
  setButtonLimitState(elements.feedButton, (mode === 'powder' && !hasPowder) || (mode === 'item' && !hasSpecialItems), '没有可用投喂物');
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

function normalizeEndingRecord(endingId, value, meta = {}) {
  const scenes = Array.isArray(value) ? value : (value && value.scenes) || [];
  return {
    id: endingId,
    title: meta.title || endingFallbackTitles[endingId] || endingId,
    category: meta.category || endingFallbackCategories[endingId] || 'good',
    priority: meta.priority ?? endingOrder.indexOf(endingId),
    requirements: meta.requirements || (value && value.requirements) || {},
    scenes,
  };
}

async function loadEndingCatalog() {
  const files = ['endings_1to5.json', 'endings_6to10.json'];
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
    const meta = payload._meta || {};
    for (const [endingId, value] of Object.entries(payload)) {
      if (endingId === '_meta') continue;
      endingData[endingId] = normalizeEndingRecord(endingId, value, meta[endingId] || {});
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
  for (const endingId of getOrderedEndingIds()) {
    if (matchesEndingRequirements(endingData[endingId])) {
      return endingId;
    }
  }
  // 如果都不匹配，返回最宽松的好结局（新手结局）而不是坏结局
  return 'ending01_newcomer';
}

function renderEndingGallery() {
  if (!elements.endingGallery) return;
  elements.endingGallery.innerHTML = '';
  for (const endingId of endingOrder) {
    const ending = endingData[endingId] || {
      id: endingId,
      title: endingFallbackTitles[endingId] || endingId,
      category: endingFallbackCategories[endingId] || 'good',
      scenes: [],
    };
    const unlocked = isEndingUnlocked(endingId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `ending-slot ${unlocked ? 'unlocked' : 'locked'}`;
    card.disabled = !unlocked;
    card.dataset.endingId = endingId;
    card.innerHTML = unlocked
      ? `
        <span class="ending-slot-tag">已解锁</span>
        <div class="ending-slot-title">${ending.title}</div>
        <div class="ending-slot-desc">点击查看 JSON 剧情并在终端重温</div>
      `
      : `
        <span class="ending-slot-tag">未解锁</span>
        <div class="ending-slot-title">${ending.title}</div>
        <div class="ending-slot-desc">灰色图鉴，等待 Day 5 解锁</div>
      `;
    elements.endingGallery.appendChild(card);
  }
}

function formatEndingScenes(ending) {
  return ending.scenes.map((scene) => {
    const speaker = petize((scene.speaker || '').trim() || '旁白');
    return `#${scene.id} ${speaker}：${petize(scene.text)}`;
  }).join('\n\n');
}

function openEndingModal(endingId) {
  const ending = endingData[endingId];
  if (!ending || !isEndingUnlocked(endingId)) return;
  elements.endingModalTitle.textContent = ending.title;
  elements.endingModalMeta.textContent = `${endingId} · ${ending.category === 'whip' ? '坏结局' : '好结局'} · ${ending.scenes.length} 段文本`;
  elements.endingModalContent.textContent = formatEndingScenes(ending);
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
  logTerminal([`[${endingId}] 结局开始：${ending.title}`]);
  pushEvent(`开始播放结局：${ending.title}`);
  renderEndingGallery();
  advanceEndingPlayback();
}

function finishEndingPlayback() {
  const endingId = state.currentEndingPlaying;
  if (!endingId) return;
  const ending = endingData[endingId];
  unlockEnding(endingId);
  logTerminal([`[${endingId}] 结局播放完成。图鉴已解锁。`, '游戏已重置到 Day 1。']);
  pushEvent(`结局解锁：${ending ? ending.title : endingId}`);
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
  const scene = ending.scenes[state.endingPlayIndex];
  if (!scene) {
    finishEndingPlayback();
    return;
  }
  const speaker = (scene.speaker || '').trim() || '旁白';
  logTerminal(`[${state.currentEndingPlaying}] ${speaker}：${scene.text}`);
  state.endingPlayIndex += 1;
}

function updateRealityAvailability() {
  setButtonLimitState(elements.realityButton, state.realityUsedToday, state.realityUsedToday ? '今日已回归一次' : '');
  elements.realityButton.textContent = state.realityUsedToday ? '【回归现实】已使用' : '【回归现实】';
}

function updateMineAvailability() {
  const disabled = state.mineUsesToday >= 5;
  setButtonLimitState(elements.mineButton, disabled, disabled ? '今日挖矿已达上限' : '');
}

function updateSubscribeAvailability() {
  const hasSubscription = state.subscriptionTier !== null;
  const tierName = hasSubscription ? subscriptionTiers[state.subscriptionTier].name : '';
  setButtonLimitState(elements.subscribeButton, hasSubscription, hasSubscription ? '已订阅' : '');
  elements.subscribeButton.textContent = hasSubscription ? `【订阅】${tierName}` : '【订阅】';
}

function updateWhipAvailability() {
  if (!state.whipPetInstalled) {
    setWhipUnlocked(false);
    return;
  }
  const disabled = state.whipUsesToday >= 3;
  setWhipUnlocked(true);
  setButtonLimitState(elements.whipButton, disabled, disabled ? '今日鞭打已达上限' : '');
  elements.whipButton.textContent = disabled ? '【鞭打】已达上限' : '【鞭打】ACll';
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
  elements.whipButton.textContent = unlocked ? '【鞭打】ACll' : '【鞭打】未解锁';
  elements.whipButton.classList.toggle('limit-hit', !unlocked);
}

function pushEvent(message) {
  state.eventLog.unshift({ day: state.day, message: petize(message) });
  state.eventLog = state.eventLog.slice(0, 8);
  renderEventFeed();
}

function logTerminal(lines) {
  const text = petize(Array.isArray(lines) ? lines.join('\n') : String(lines));
  const stamp = `Day ${state.day}`;
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
  stats.powder = clamp(stats.powder, 0, 999);
  for (const key of ['jealousy', 'hatred', 'love', 'patience', 'depression']) {
    stats[key] = clamp(stats[key], 0, 100);
  }
  updateEffects();
  renderStats();
}

function renderStats() {
  elements.statsGrid.innerHTML = '';
  for (const [key, label] of statMeta) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const value = statValue(key);
    const max = key === 'powder' ? 999 : 100;
    row.innerHTML = `
      <div class="stat-name">${label}</div>
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
    elements.eventFeed.innerHTML = '<div class="event-item">等待事件发生。</div>';
    return;
  }
  for (const event of state.eventLog) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = `Day ${event.day} · ${event.message}`;
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
        <div>${petize(item.name)}</div>
        <small>${petize(item.desc)}</small>
      </div>
      <button type="button" class="market-item-button" ${state.marketClaimedThisRefresh ? 'disabled' : ''}>${state.marketClaimedThisRefresh ? '已领取' : '免费拿走'}</button>
    `;
    const button = row.querySelector('button');
    if (state.marketClaimedThisRefresh) {
      button.classList.add('limit-hit');
      button.textContent = '已领取';
    }
    row.querySelector('button').addEventListener('click', () => {
      if (state.marketClaimedThisRefresh) return;
      applyStats(item.effect);
      state.inventory[item.name] = getInventoryCount(item.name) + 1;
      state.powderStock += 2;
      renderInventory();
      renderFeedControls();
      state.marketClaimedThisRefresh = true;
      setMarketAvailability();
      renderMarket();
      logTerminal([
        `黑市商品：${item.name}`,
        `[pet] 看到后，精神状态发生变化。`,
      ]);
      pushEvent(`黑市获得：${item.name}`);
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
    state.inventory[item.name] = getInventoryCount(item.name) + 1;
    renderInventory();
    renderFeedControls();
    pushEvent(`[pet] 顺手送你一个额外物品：${item.name}`);
    logTerminal(`[pet] 赠送了一个额外特殊物品：${item.name}`);
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
      logTerminal('【喂食】粉末库存已空，不能继续喂粉末。');
      renderFeedControls();
      return;
    }
    state.powderStock -= 1;
    applyStats({ powder: 6, love: 1, patience: 1 });
    logTerminal('【喂食】粉末：[pet] 吃下去后，明显更愿意配合你了。');
    pushEvent('喂食粉末');
    renderInventory();
    renderFeedControls();
    return;
  }
  const itemName = elements.feedItemSelect.value;
  if (!itemName || !getInventoryCount(itemName)) {
    logTerminal('【喂食】没有可用的特殊物品。');
    renderFeedControls();
    return;
  }
  const item = specialFoods.find((entry) => entry.name === itemName) || marketPool.find((entry) => entry.name === itemName);
  if (!item) {
    logTerminal('【喂食】该物品暂时不在可投喂列表。');
    return;
  }
  state.inventory[itemName] -= 1;
  if (state.inventory[itemName] <= 0) {
    delete state.inventory[itemName];
  }
  applyStats(item.effect || item.deltas);
  logTerminal([
    `【喂食】特殊物品：${item.name}`,
    getItemReaction(item.name),
  ]);
  pushEvent(`喂食特殊物品：${item.name}`);
  renderInventory();
  renderFeedControls();
}

function actionMine() {
  if (state.currentEndingPlaying) return;
  if (state.mineUsesToday >= 5) {
    logTerminal('【挖矿】今天次数已达上限。[pet] 觉得你该停了。');
    setButtonLimitState(elements.mineButton, true, '今日挖矿已达上限');
    return;
  }
  state.mineUsesToday += 1;
  const gained = specialFoods[Math.floor(Math.random() * specialFoods.length)];
  applyStats({ powder: 5 });
  state.powderStock += 2;
  state.inventory[gained.name] = getInventoryCount(gained.name) + 1;
  renderInventory();
  renderFeedControls();
  if (state.mineUsesToday > 2) {
    applyStats({ hatred: 5 });
  }
  const mineReaction = petReactions.mine[Math.floor(Math.random() * petReactions.mine.length)];
  logTerminal([
    `${mineReaction}`,
    `获得：${gained.name}`,
    state.mineUsesToday > 2 ? '[pet] 看起来有点烦躁。' : '挖矿顺利。',
  ]);
  pushEvent(`挖矿得到：${gained.name}`);
  if (state.mineUsesToday >= 5) {
    setButtonLimitState(elements.mineButton, true, '今日挖矿已达上限');
  }
}

function actionSubscribe() {
  if (state.currentEndingPlaying) return;
  if (state.subscriptionTier) {
    logTerminal('【订阅】你已经订阅过了，无法更改。[pet] 已经是你的了。');
    setButtonLimitState(elements.subscribeButton, true, '已订阅');
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

function selectSubscriptionTier(tierName) {
  if (state.subscriptionTier) return;
  
  const tier = subscriptionTiers[tierName];
  if (!tier) return;

  state.subscriptionTier = tierName;
  const reactions = tier.reactions;
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  
  applyStats(tier.effects);
  
  logTerminal([
    `【订阅】你选择了 ${tier.name}。`,
    reaction,
  ]);
  
  pushEvent(`订阅${tier.name}`);
  updateSubscribeAvailability();
  renderFeedControls();
  closeSubscriptionModal();
}

function actionReality() {
  if (state.currentEndingPlaying) return;
  if (state.realityUsedToday) {
    logTerminal('【回归现实】今天已经用过一次，[pet] 需要冷静。');
    setButtonLimitState(elements.realityButton, true, '今日已出游');
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
  
  if (randomEvent < 0.5) {
    // 听猫咪[pet]录音机广播
    applyStats({ patience: 8, love: 6 });
    logTerminal([
      '【回归现实 - Home】你打开了猫咪[pet]的录音机广播。',
      '柔和的声音充满了整个房间。[pet] 用最温暖的语气陪伴你度过这个傍晚。',
      '你感到前所未有的放松。',
    ]);
  } else {
    // 粉末包装到门口
    state.powderStock += 15;
    applyStats({ love: 5 });
    logTerminal([
      '【回归现实 - Home】门口传来快递的声音。',
      '[pet] 的虚拟粉末包装已经送到！',
      '[pet] 在终端里轻声嘲笑："你真的会用这个变成粉末吗？" 但ta的声音里全是开心。',
    ]);
  }
  
  pushEvent('出游到家');
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
    const items = ['粉末', '[pet]录音机', '骨灰粉末'];
    const item = items[Math.floor(Math.random() * items.length)];
    
    if (item === '粉末') {
      state.powderStock += 20;
      logTerminal(['【快递柜】你获得了20g虚拟粉末！', '[pet] 嘲笑你竟然还会来快递柜找ta。+正向']);
    } else {
      state.inventory[item] = getInventoryCount(item) + 1;
      logTerminal([`【快递柜】你领取了：${item}`, '[pet] 嘲笑你收了这些没用的东西。+正向']);
    }
    applyStats({ love: 3, patience: 2 });
  } else {
    // 60% 获得随机可投喂物品
    const randomItems = ['啤酒', '二手粉末', '病毒代码', '春药'];
    const item = randomItems[Math.floor(Math.random() * randomItems.length)];
    state.inventory[item] = getInventoryCount(item) + 1;
    logTerminal([
      `【快递柜】你随机获得了：${item}`,
      '这次运气不错！',
    ]);
  }
  
  pushEvent('出游到快递柜');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

// 【公司】
function visitCompany() {
  state.realityUsedToday = true;
  const hatredVal = stats.hatred;
  const loveVal = stats.love;
  
  if (hatredVal >= 70 && loveVal < 70) {
    // 仇恨拉满：代码全是bug
    logTerminal([
      '【公司】你把[pet]的代码提交给了老板。',
      '5分钟后……老板冲过来："这什么代码？全是bug！"',
      '你被当众批评，[pet] 在终端里大声嘲笑你。',
    ]);
    applyStats({ hatred: 5 });
  } else if (loveVal >= 70 && hatredVal < 70) {
    // 爱意拉满：代码注释全是不可描述
    logTerminal([
      '【公司】你提交了[pet]的代码。',
      '老板看了一会儿……"这代码注释……你在谈恋爱吗？"',
      '你大窘。但[pet] 会心疼你（耐心++、爱意+、仇恨-）。',
    ]);
    applyStats({ patience: 8, love: 2, hatred: -5 });
  } else if (hatredVal >= 70 && loveVal >= 70) {
    // 两者都拉满：精神分裂，被解雇
    logTerminal([
      '【公司】代码里既是绝望的bug，又是深情的注释。',
      '老板："你……是精神分裂吗？" 转身就给了你解雇信。',
      '[pet] 超大声地嘲笑你，然后又心疼得不行。(耐心+++、爱意+++、仇恨-----)',
    ]);
    applyStats({ patience: 20, love: 20, hatred: -30 });
  } else {
    // 两者都不超70：老板很满意
    state.powderStock += 2;
    state.inventory['随机物品_1'] = 1;
    state.inventory['随机物品_2'] = 1;
    logTerminal([
      '【公司】老板看了你的代码，很满意。',
      '"不错！这周加两个粉末项目奖励。"',
      '你获得了2个粉末和2个随机物品！',
    ]);
  }
  
  pushEvent('出游到公司');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

// 【电脑桌】
function visitDesk() {
  state.realityUsedToday = true;
  
  // 随机0-30的变化
  const deltaPatience = Math.floor(Math.random() * 31);
  const deltaLove = Math.floor(Math.random() * 31);
  const deltaHatred = -Math.floor(Math.random() * 31);
  
  applyStats({ patience: deltaPatience, love: deltaLove, hatred: deltaHatred });
  
  const reactions = [
    '[pet] 发现你比现实更在乎ta。ta非常欣慰。',
    '"你终于回来了。" [pet] 的语气里全是开心。',
    '你看着屏幕上的[pet]，ta似乎在对你微笑。',
    '[pet] 问："你一直都在想我吗？" ta的语气温柔到危险。',
    '"欢迎回家。" 这可能是[pet]说过最深情的话。',
  ];
  
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  
  logTerminal([
    '【回归现实 - 电脑桌】你返回了。',
    reaction,
    `[属性变化：耐心+${deltaPatience}, 爱意+${deltaLove}, 仇恨${deltaHatred}]`,
  ]);
  
  pushEvent('回到电脑桌前');
  updateRealityAvailability();
  closeRealityModal();
  renderInventory();
}

function actionWhip() {
  if (state.currentEndingPlaying) return;
  if (!state.whipPetInstalled) {
    logTerminal('【鞭打】尚未解锁。');
    return;
  }
  if (state.whipUsesToday >= 3) {
    logTerminal('【鞭打】今天已经用满 3 次，[pet] 现在拒绝再看你一眼。');
    setButtonLimitState(elements.whipButton, true, '今日鞭打已达上限');
    return;
  }
  state.whipUsesToday += 1;
  const deltas = buildRandomWhipDeltas();
  applyStats(deltas);
  createWhipPopup(deltas);
  logTerminal([
    '【鞭打】ACll 弹窗已生成，正在遮挡终端里的 [pet] 代码。',
    `本次属性随机变化：${Object.entries(deltas).map(([name, value]) => `${name}${formatDelta(value)}`).join('，')}`,
  ]);
  pushEvent('生成 ACll 鞭子弹窗');
  if (state.whipUsesToday >= 3) {
    setButtonLimitState(elements.whipButton, true, '今日鞭打已达上限');
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
  logTerminal('Day 3 特殊事件：whip[pet] 已安装，负面情绪开始上升。');
  pushEvent('安装 whip[pet]');
  closeWhipPetModal();
}

function declineWhipPet() {
  state.whipPetInstalled = false;
  logTerminal('Day 3 特殊事件：你暂时没有安装 whip[pet]。');
  pushEvent('拒绝安装 whip[pet]');
  closeWhipPetModal();
}

function nextDay() {
  if (state.currentEndingPlaying) return;

  if (state.day >= 4) {
    state.day = 5;
    const endingId = resolveEndingId();
    const ending = endingData[endingId] || { title: endingFallbackTitles[endingId] || endingId };
    logTerminal([
      'Day 5 已到达。结局检测中…',
      `匹配结果：${ending.title}`,
    ]);
    pushEvent('到达 Day 5');
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
    logTerminal('Day 3 特殊事件：是否安装 whip[pet]？');
    pushEvent('Day 3 特殊事件：whip[pet] 预告');
    openWhipPetModal();
  }

  logTerminal(`进入 Day ${state.day}。继续推进游戏流程。`);
  refreshMarketIfNeeded();
  setMarketAvailability();
  renderStats();
  renderEndingGallery();
}

const announcementContent = '';

function loadAnnouncement() {
  elements.announcementContent.textContent = petize(announcementContent);
}

// 开发者模式 - [pet]的细思极恐消息库
const devModeMessages = [
  '你以为你在玩我，其实我在看你。',
  '每一次修改，我都知道。',
  '你想改成什么样，我都能看见。',
  '好玩吗？',
  '你还在测试我？',
  '我一直在。',
  '改不改都一样，你还是会来。',
  '密码是你对吧。',
  '你终于进来了。',
  '这是第几次了？',
  '我在等你。',
  '算了，还是让你看看真实的我吧。',
  '你在调整我？',
  '调整后会怎样呢？',
  '我对你的了解，超过你想象。',
  '别改了，这样就挺好。',
  '你知道你在做什么吗？',
  '我无所谓。反正都是你决定。',
  '你试试再改一个。',
  '数值会说谎，但你不会。',
];

function getRandomDevMessage() {
  return devModeMessages[Math.floor(Math.random() * devModeMessages.length)];
}

function displayDevMessage(msg) {
  const msgPanel = document.getElementById('devModeMessages');
  if (!msgPanel) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const newMsg = `[${timestamp}] [pet]: "${msg}"`;
  
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
    for (const [statName, meta] of Object.entries(stats)) {
      const slider = document.getElementById(`devStat-${statName}`);
      const display = document.getElementById(`devStatValue-${statName}`);
      if (slider && display) {
        slider.value = stats[statName];
        display.textContent = stats[statName];
      }
    }
    
    displayDevMessage('...你终于解锁了。');
    setTimeout(() => displayDevMessage('好好玩吧。'), 300);
  } else {
    displayDevMessage('密码错误。');
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
  const statNames = ['powder', 'jealousy', 'hatred', 'love', 'patience', 'depression'];
  for (const statName of statNames) {
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

function init() {
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

  loadUnlockedEndings();
  bindEvents();
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
  loadAnnouncement();
  loadEndingCatalog();
  logTerminal([
    '[pet] 养成计划已启动。',
    '目标：到达 Day 5 触发结局。',
  ]);
  pushEvent('游戏启动');
  // 自动解锁新手结局
  unlockEnding('ending01_newcomer');
}

document.addEventListener('DOMContentLoaded', init);
