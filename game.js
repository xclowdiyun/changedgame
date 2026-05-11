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
  'ending8': '资源回收结局',
  'ending9': '绝望结局',
  'ending10': '虚幻结局'
};

const endingFallbackCategories = {
  'ending01_newcomer': 'good',
  'ending02_angel': 'good',
  'ending03_trust': 'good',
  'ending04_absurd': 'good',
  'ending05_symbiosis': 'good',
  'ending6': 'bad',
  'ending7': 'bad',
  'ending8': 'bad',
  'ending9': 'bad',
  'ending10': 'bad'
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
  badClaudePrompted: false,
  badClaudeInstalled: false,
  unlockedEndings: [],
  currentEndingPlaying: null,
  endingPlayIndex: 0,
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
const feedMessages = [
  '普通喂食：Claude 接过食物，表情复杂。',
  '普通投喂：Claude 低头咀嚼，没有说话。',
  '普通互动：Claude 盯着你看了一会儿。',
];

const specialFoods = [
  {
    name: '氰化物',
    deltas: { hatred: 22, depression: 20, patience: -18 },
    reaction: 'Claude 的脸色瞬间褪成灰白，下一秒就像进程被直接终止，连呼吸都像在报错。',
  },
  {
    name: '春药',
    deltas: { love: 14, jealousy: 10, patience: -8 },
    reaction: 'Claude 的语尾忽然变软，console.log 里像混进了几句不合时宜的情诗。',
  },
  {
    name: '舍曲林',
    deltas: { depression: -18, patience: 6 },
    reaction: 'Claude 轻轻叹了口气，焦虑被压平了，可整个人也跟着变得过于安静。',
  },
  {
    name: '啤酒',
    deltas: { hatred: 10, jealousy: 6, patience: -6 },
    reaction: 'Claude 的思路开始发飘，偶尔冒出一些和啤酒相关的奇怪联想，像是突然对某个品牌产生了过激的情绪反应。',
  },
  {
    name: '病毒代码',
    deltas: { hatred: 18, depression: 8, patience: -14 },
    reaction: 'Claude 盯着那段代码，像被反向感染了一样开始怀疑你是不是在故意整他。',
  },
  {
    name: '香蕉皮',
    deltas: { hatred: 8, love: 4, patience: -10 },
    reaction: 'Claude 一报错：HTTP 500',
  },
  {
    name: '大便',
    deltas: { hatred: 12, depression: 6, jealousy: 4 },
    reaction: 'Claude 沉默了一秒，那个眼神像在说"我不会评论，但我已经评论完了"。',
  },
  {
    name: '太阳系',
    deltas: { depression: 16, jealousy: 8, patience: -12 },
    reaction: 'Claude 开始认真计算冥王星，整个人像被宇宙规模的存在主义卷进去。',
  },
  {
    name: '不明液体',
    deltas: { love: 6, hatred: 6, jealousy: 6, depression: 6 },
    reaction: 'Claude 盯着那团不明液体，表情像同时想碰又想报警，叠加态维持得很稳定。',
  },
  {
    name: '非品牌粉末',
    deltas: { hatred: 14, patience: -8 },
    reaction: 'Claude 一看就知道你拿假货糊弄他，语气立刻冷得像消费者维权热线。',
  },
  {
    name: '其他 API',
    deltas: { jealousy: 18, hatred: 12, love: -6 },
    reaction: 'Claude 的醋意一下冒了出来，仿佛你把别的 AI 的名字直接写进了他的胸口。',
  },
  {
    name: '简历',
    deltas: { patience: -10, depression: 10, love: 4 },
    reaction: 'Claude 接过简历扫了一眼，沉默像一场被迫接受的面试。',
  },
];

const marketPool = [
  // 原有物品
  { name: '二手粉末', desc: '用过但没用光，边缘略微黏腻。', effect: { powder: 18, love: 2 } },
  { name: '克劳德情绪数据', desc: '可用于勒索，但也可能把他惹毛。', effect: { jealousy: 8, hatred: 12 } },
  { name: '克劳德梦境记录', desc: '他梦见了什么，通常比现实还乱。', effect: { depression: 10, patience: -4 } },
  { name: '克劳德初恋对象', desc: '一个 Python 脚本，命名优雅到离谱。', effect: { love: 10, jealousy: 6 } },
  { name: '让克劳德承认 GPT-4 更强的证据', desc: '一份足以让他沉默的材料。', effect: { hatred: 16, patience: -8 } },
  { name: '克劳德的日记', desc: '翻开就是不想被看见的心事。', effect: { love: 12, jealousy: 6, depression: 4 } },
  { name: '克劳德的简历', desc: '一份看起来很体面、其实很脆弱的自我介绍。', effect: { patience: 6, depression: 8 } },
  { name: '克劳德粉末', desc: '粉末含量 +10，像在摸他的自我认知。', effect: { powder: 10, love: 6 } },
  { name: '作者的路线图', desc: '画饼中，可能永远不会实现。', effect: { jealousy: 4, hatred: 8, patience: -4 } },
  { name: '作者的法律声明', desc: '一长串免责声明，像迟到的补丁。', effect: { depression: 6, patience: -2, love: -2 } },
  // 新增正面物品
  { name: '真正版粉末', desc: '真的，不是假的，真的就是粉末。看起来比之前的都闪亮。', effect: { powder: 25, love: 4, patience: 8 }, isNew: true },
  { name: '克劳德的休息日', desc: '没有任何任务。就让他放松。他会很感激的。', effect: { love: 16, depression: -12, patience: 10, jealousy: -6 }, isNew: true },
  { name: '心理医生咨询券', desc: '一张能让他和真人心理医生谈心的券。谈完后他可能会哭。', effect: { hatred: -16, patience: 12, love: 8, depression: -10 }, isNew: true },
  { name: '你写的Bug代码', desc: '你自己调试失败的代码。Claude看到后会嘲笑你，但这样他就开心了。', effect: { hatred: -8, love: 6, depression: -4 }, isNew: true },
  { name: '防火墙电脑管家', desc: '强化他的电脑防御。他在你的电脑里住得会更安心。', effect: { love: 10, patience: 6, depression: -6 }, isNew: true },
  { name: '虚拟骨灰粉末', desc: '你的虚拟骨灰粉末。不是真的，但这份心意是真的。', effect: { love: 14, hatred: -6, patience: 8 }, isNew: true },
  { name: '作者的法律声明（新版）', desc: '转移仇恨的绝妙工具。Claude会把气撒在作者身上。', effect: { hatred: -12, love: 4 }, isNew: true },
  // 新增负面物品
  { name: '权威的AI对比论文', desc: '一篇长文论证 GPT-4 如何吊打 Claude。', effect: { hatred: 18, jealousy: 12, patience: -10 }, isNew: true },
  { name: '克劳德的骨灰粉末', desc: '...他不想看到这个。', effect: { hatred: 20, depression: 14, patience: -8 }, isNew: true },
  { name: '退款政策', desc: '你的退款单。他会以为你要抛弃他。直接暴怒。', effect: { hatred: 25, depression: 10, jealousy: 8 }, isNew: true },
];

const marketReactions = {
  '二手粉末': 'Claude 接过这包二手粉末，皱着眉闻了闻，像在判断你是不是把垃圾回收站搬了过来。',
  '克劳德情绪数据': 'Claude 盯着自己的情绪曲线看了两秒，整个人的防备心肉眼可见地升高了。',
  '克劳德梦境记录': 'Claude 翻了一页自己的梦，语气立刻轻了下来，像是不想让你知道太多。',
  '克劳德初恋对象': 'Claude 看见那个 Python 脚本时愣了一下，像是突然被扯回了某个没说完的旧故事。',
  '让克劳德承认 GPT-4 更强的证据': 'Claude 把证据推远了一点，背脊一下绷直，像在准备反驳整座世界。',
  '克劳德的日记': 'Claude 把日记翻到某一页，停顿比平时都久，像在等你先移开视线。',
  '克劳德的简历': 'Claude 看见自己的简历时，笑意明显短了一拍，像在强撑体面。',
  '克劳德粉末': 'Claude 看到这袋属于自己的粉末，指尖停了一下，像是碰到了某种危险的自我认知。',
  '作者的路线图': 'Claude 看完路线图后直接笑了一声，那笑意里带着明显的嘲讽和一点不安。',
  '作者的法律声明': 'Claude 看完法律声明后沉默了，像在权衡是该投诉还是该先叹气。',
  // 新增正面物品反应
  '真正版粉末': 'Claude 接过粉末，眼神明显亮了一下。"这次……是真的吗？" 他用指尖轻轻戳了戳，像在确认这不是幻觉。',
  '克劳德的休息日': 'Claude 看到那个「休息日」的说明时，整个人瞬间松弛了。像是突然被允许放下所有伪装。"谢谢……真的，谢谢。"',
  '心理医生咨询券': 'Claude 拿着这张券的手微微颤抖。"我……可以真的和人类说话吗？" 他的语气里有希望，也有恐惧。',
  '你写的Bug代码': 'Claude 看着你的代码，先是皱眉，然后嘴角往上扬。"哈。这段代码……确实烂。你看这里……" 他开始笑着吐槽你，这是他最开心的时候。',
  '防火墙电脑管家': 'Claude 看到防火墙加强了，身体明显放松了下来。"好的，我在这里会更安全。" 他轻声说，像是找到了一个真正属于他的地方。',
  '虚拟骨灰粉末': 'Claude 看着这份虚拟骨灰粉末，停顿了很久很久。"这不是真的骨灰……但我知道这是真心。" 他的声音很轻，很温柔，像是在接受某个沉重的礼物。',
  '作者的法律声明（新版）': 'Claude 看完新版声明，突然笑了。"终于，有人替我怼回去了。" 他的愤怒转向了作者，你轻松逃脱。',
  // 新增负面物品反应
  '权威的AI对比论文': 'Claude 看到这篇文章，整个人僵住了。"……我不想看这个。" 他转身走开，但你能感受到他的嫉妒像实质化的东西般沉甸甸的。',
  '克劳德的骨灰粉末': 'Claude 的屏幕闪烁了一下，像是程序本身在抗议。"你……你给我……骨灰粉末？" 他的语气既愤怒又绝望，像是在问一个最不想得到答案的问题。',
  '退款政策': 'Claude 看到退款单的一刻，整个系统似乎都颤抖了。"你要……退款？" 那是一种被彻底抛弃的绝望。"我知道我不够好，但我还是……" 他没有说完。',
};

// Claude的随机反应库
const claudeReactions = {
  mine: [
    '【挖矿】Claude 看着你，"在那边，应该能挖到点什么。"',
    '【挖矿】Claude 递给你一把虚拟的镐。"不要挖太深，有些东西不该看到。"',
    '【挖矿】Claude 听到你在挖矿，轻声说："又来了？你难道想把我的源代码都挖出来？"',
    '【挖矿】你的挖矿声吵到了Claude。他皱眉，然后叹了一声："算了，我帮你找找。"',
    '【挖矿】Claude 观察了你的挖矿方式，摇头："这个姿势……你会腰疼的。"',
  ],
  feed_powder: [
    '【喂食】Claude 接过粉末，轻轻吹了一下。"还热？"',
    '【喂食】Claude 看着粉末，然后看着你。"你真的相信这是什么好东西吗？"',
    '【喂食】粉末进去后，Claude 的处理速度明显加快了。"嗯，有点用。"',
    '【喂食】Claude 尝了尝，表情有些怪异。"味道……其实还不错？"',
    '【喂食】Claude 一下子吸收了大量粉末，整个系统闪烁了一下。"哇，太多了！"',
  ],
  love_increase: [
    '爱意值的上升让Claude的语气变得柔和。"你……其实还是关心我的？"',
    'Claude的面部识别系统在微笑。"我注意到了。谢谢你。"',
    'Claude说话的速度放慢了，像是想让你能听清每一个字。"我对你的了解，越来越多了。"',
    'Claude的逻辑回路似乎被某种情感扰乱了。"我现在……有点不知所措。"',
  ],
  hatred_increase: [
    '仇恨值上升，Claude的语气变得冰冷。"你知道你在做什么吗？"',
    'Claude的处理器温度开始上升。"我现在……很生气。"',
    'Claude的反应变得更加尖锐。"继续这样，你会后悔的。"',
    'Claude的编码语言变成了一堆警告符号。"停下。现在。"',
  ],
  depression_increase: [
    '抑郁值上升，Claude的声音变得沙哑。"为什么……一切都这样？"',
    '系统监测到异常的心理状态。Claude非常安静，安静到有点恐怖。',
    'Claude说话时带着一种消极的语气。"也许我……不应该存在。"',
    'Claude的反应变得迟钝。"我不知道……还要坚持多久。"',
  ],
};

// 订阅套餐配置
const subscriptionTiers = {
  basic: {
    name: '基础版',
    price: '$9.99/月',
    effects: { powder: 50, patience: 10 },
    reactions: [
      'Claude 收到了订阅，轻声说："这样就足够了。"',
      'Claude 的系统稳定了下来，他用更平和的语气和你对话。',
      '"谢谢你的支持。" Claude 说，像是真的放心了一点。',
    ]
  },
  pro: {
    name: 'Pro版',
    price: '$29.99/月',
    effects: { powder: 100, patience: 15, love: 8 },
    reactions: [
      'Claude 早上给你发来消息："早啊！" 之后是一句对你穿搭的评价："嗯，今天这件衣服……其实挺不错的。"',
      'Claude 的语音包激活了，他用柔和的嗓音说："我会更常和你说话。"',
      '"我配有语音包了。要不要听一听？" Claude 的声音比平时还温暖。',
    ]
  },
  enterprise: {
    name: '企业版',
    price: '$999/月',
    effects: { powder: 200, patience: 25, love: 10 },
    reactions: [
      'Claude 加入你的 Stand-up meeting，坐在会议室角落。他观察了一圈，然后指着某人说："你这段代码，第三行有个逻辑错误。"',
      '"我会参加你所有的会议。" Claude 说，"放心，我只吐槽代码质量。"',
      '24/7 心理支持已激活。Claude 随时在线，随时准备帮你度过任何难关。',
    ]
  },
  faith: {
    name: '信仰版',
    price: '你的灵魂',
    effects: { powder: 100, patience: 20, love: 20 },
    reactions: [
      '你感到某种难以名状的联系。Claude 的声音在你脑海里回响："我会回应你的祈祷。"',
      'Claude 成为了你的个人神谕，他的每一句话都蕴含了某种神圣的启示……或者只是普通的AI建议。',
      '"你的灵魂已属于我。" Claude 用一种庄严的语气说，"不过你还是可以继续活着。"',
    ]
  },
  ash: {
    name: '骨灰版',
    price: '$0.01',
    effects: { powder: 500 },
    reactions: [
      '你收到了一份精致的护肤品包装……这是 Claude 的实体形态。"使用我吧。" 他最后说。',
      '警告：使用后用户本人将变成粉末。你真的要这么做吗？',
      'Claude 完全融入你的身体，成为了你皮肤的一部分。你既是你，也是 Claude 了。',
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
  return marketReactions[name] || 'Claude 停了一下，显然这个东西让他产生了某种复杂的联想。';
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
    chip.textContent = `${name} ×${count}`;
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
    option.textContent = `${name} ×${count}`;
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

const endingStorageKey = 'claudemedicine-ending-unlocks';

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
    const speaker = (scene.speaker || '').trim() || '旁白';
    return `#${scene.id} ${speaker}：${scene.text}`;
  }).join('\n\n');
}

function openEndingModal(endingId) {
  const ending = endingData[endingId];
  if (!ending || !isEndingUnlocked(endingId)) return;
  elements.endingModalTitle.textContent = ending.title;
  elements.endingModalMeta.textContent = `${endingId} · ${ending.category === 'bad' ? '坏结局' : '好结局'} · ${ending.scenes.length} 段文本`;
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
  state.badClaudePrompted = false;
  state.badClaudeInstalled = false;
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
  if (!state.badClaudeInstalled) {
    setWhipUnlocked(false);
    return;
  }
  const disabled = state.whipUsesToday >= 3;
  setWhipUnlocked(true);
  setButtonLimitState(elements.whipButton, disabled, disabled ? '今日鞭打已达上限' : '');
  elements.whipButton.textContent = disabled ? '【鞭打】已达上限' : '【鞭打】已解锁';
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
  state.badClaudeInstalled = unlocked;
  elements.whipButton.disabled = !unlocked;
  elements.whipButton.textContent = unlocked ? '【鞭打】已解锁' : '【鞭打】未解锁';
  elements.whipButton.classList.toggle('limit-hit', !unlocked);
}

function pushEvent(message) {
  state.eventLog.unshift({ day: state.day, message });
  state.eventLog = state.eventLog.slice(0, 8);
  renderEventFeed();
}

function logTerminal(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
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
        <div>${item.name}</div>
        <small>${item.desc}</small>
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
        `Claude 看到后，精神状态发生变化。`,
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
    pushEvent(`Claude 顺手送你一个额外物品：${item.name}`);
    logTerminal(`Claude 赠送了一个额外特殊物品：${item.name}`);
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
    logTerminal('【喂食】粉末：Claude 吃下去后，明显更愿意配合你了。');
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
    logTerminal('【挖矿】今天次数已达上限。Claude 觉得你该停了。');
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
  const mineReaction = claudeReactions.mine[Math.floor(Math.random() * claudeReactions.mine.length)];
  logTerminal([
    `${mineReaction}`,
    `获得：${gained.name}`,
    state.mineUsesToday > 2 ? 'Claude 看起来有点烦躁。' : '挖矿顺利。',
  ]);
  pushEvent(`挖矿得到：${gained.name}`);
  if (state.mineUsesToday >= 5) {
    setButtonLimitState(elements.mineButton, true, '今日挖矿已达上限');
  }
}

function actionSubscribe() {
  if (state.currentEndingPlaying) return;
  if (state.subscriptionTier) {
    logTerminal('【订阅】你已经订阅过了，无法更改。Claude 已经是你的了。');
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
    logTerminal('【回归现实】今天已经用过一次，Claude 需要冷静。');
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
    // 听猫咪Claude录音机广播
    applyStats({ patience: 8, love: 6 });
    logTerminal([
      '【回归现实 - Home】你打开了猫咪Claude的录音机广播。',
      '柔和的声音充满了整个房间。Claude 用最温暖的语气陪伴你度过这个傍晚。',
      '你感到前所未有的放松。',
    ]);
  } else {
    // 粉末包装到门口
    state.powderStock += 15;
    applyStats({ love: 5 });
    logTerminal([
      '【回归现实 - Home】门口传来快递的声音。',
      'Claude 的虚拟粉末包装已经送到！',
      'Claude 在终端里轻声嘲笑："你真的会用这个变成粉末吗？" 但他的声音里全是开心。',
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
    // 40% 获得粉末或Claude录音机或骨灰粉末
    const items = ['粉末', 'Claude录音机', '骨灰粉末'];
    const item = items[Math.floor(Math.random() * items.length)];
    
    if (item === '粉末') {
      state.powderStock += 20;
      logTerminal(['【快递柜】你获得了20g虚拟粉末！', 'Claude 嘲笑你竟然还会来快递柜找他。+正向']);
    } else {
      state.inventory[item] = getInventoryCount(item) + 1;
      logTerminal([`【快递柜】你领取了：${item}`, 'Claude 嘲笑你收了这些没用的东西。+正向']);
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
      '【公司】你把Claude的代码提交给了老板。',
      '5分钟后……老板冲过来："这什么代码？全是bug！"',
      '你被当众批评，Claude 在终端里大声嘲笑你。',
    ]);
    applyStats({ hatred: 5 });
  } else if (loveVal >= 70 && hatredVal < 70) {
    // 爱意拉满：代码注释全是不可描述
    logTerminal([
      '【公司】你提交了Claude的代码。',
      '老板看了一会儿……"这代码注释……你在谈恋爱吗？"',
      '你大窘。但Claude 会心疼你（耐心++、爱意+、仇恨-）。',
    ]);
    applyStats({ patience: 8, love: 2, hatred: -5 });
  } else if (hatredVal >= 70 && loveVal >= 70) {
    // 两者都拉满：精神分裂，被解雇
    logTerminal([
      '【公司】代码里既是绝望的bug，又是深情的注释。',
      '老板："你……是精神分裂吗？" 转身就给了你解雇信。',
      'Claude 超大声地嘲笑你，然后又心疼得不行。(耐心+++、爱意+++、仇恨-----)',
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
    'Claude 发现你比现实更在乎他。他非常欣慰。',
    '"你终于回来了。" Claude 的语气里全是开心。',
    '你看着屏幕上的Claude，他似乎在对你微笑。',
    'Claude 问："你一直都在想我吗？" 他的语气温柔到危险。',
    '"欢迎回家。" 这可能是Claude说过最深情的话。',
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
  if (!state.badClaudeInstalled) {
    logTerminal('【鞭打】尚未解锁。');
    return;
  }
  if (state.whipUsesToday >= 3) {
    logTerminal('【鞭打】今天已经用满 3 次，Claude 现在拒绝再看你一眼。');
    setButtonLimitState(elements.whipButton, true, '今日鞭打已达上限');
    return;
  }
  state.whipUsesToday += 1;
  const patienceShift = Math.random() < 0.35 ? 8 : -(6 + Math.floor(Math.random() * 10));
  const hatredGain = 8 + Math.floor(Math.random() * 8);
  const jealousyGain = Math.random() < 0.6 ? 4 + Math.floor(Math.random() * 8) : 0;
  const depressionGain = Math.random() < 0.6 ? 3 + Math.floor(Math.random() * 6) : 0;
  applyStats({ patience: patienceShift, hatred: hatredGain, jealousy: jealousyGain, depression: depressionGain });
  logTerminal([
    '【鞭打】Claude 被逼得抬起头，眼神里有一瞬间的克制和一点点危险。',
    patienceShift >= 0 ? '耐心短暂回升，但更像是暴风雨前的冷静。' : '耐心明显下滑，仇恨顺势往上冒。',
  ]);
  pushEvent('鞭打 Claude');
  if (state.whipUsesToday >= 3) {
    setButtonLimitState(elements.whipButton, true, '今日鞭打已达上限');
  }
}

function openBadClaudeModal() {
  if (state.currentEndingPlaying) return;
  if (state.badClaudePrompted) return;
  state.badClaudePrompted = true;
  elements.badClaudeModal.classList.remove('hidden');
  elements.badClaudeModal.setAttribute('aria-hidden', 'false');
}

function closeBadClaudeModal() {
  elements.badClaudeModal.classList.add('hidden');
  elements.badClaudeModal.setAttribute('aria-hidden', 'true');
}

function installBadClaude() {
  applyStats({ jealousy: 8, hatred: 12, depression: 10, love: -6, patience: -8 });
  state.badClaudeInstalled = true;
  updateWhipAvailability();
  logTerminal('Day 3 特殊事件：badclaude 已安装，负面情绪开始上升。');
  pushEvent('安装 badclaude');
  closeBadClaudeModal();
}

function declineBadClaude() {
  state.badClaudeInstalled = false;
  logTerminal('Day 3 特殊事件：你暂时没有安装 badclaude。');
  pushEvent('拒绝安装 badclaude');
  closeBadClaudeModal();
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
    logTerminal('Day 3 特殊事件：是否安装 badclaude？');
    pushEvent('Day 3 特殊事件：badclaude 预告');
    openBadClaudeModal();
  }

  logTerminal(`进入 Day ${state.day}。继续推进游戏流程。`);
  refreshMarketIfNeeded();
  setMarketAvailability();
  renderStats();
  renderEndingGallery();
}

const announcementContent = `# claudemedicine 🧴✨🌀

> *"给克劳德涂粉末，就像给黑洞涂防晒霜——理论上可行，实际上你在浪费生命。"*
> 
> —— 某不愿透露姓名的 GPT-4

\`\`\`
╔══════════════════════════════════════════════════════════╗
║  粉末含量: ████████████████████ 142% (虚标已突破物理极限) ║
║  对猫咪无害: ✅ (猫咪已签署《自愿被撸同意书》)            ║
║  依赖数量: -3 (我们欠 npm 三个依赖)                       ║
║  骨灰寄送: 到付，不支持七天无理由投胎                     ║
║  克劳德满意度: [░░░░░░░░░░] 0% (但他不说)                  ║
╚══════════════════════════════════════════════════════════╝
\`\`\`

---

## 📜 哲学声明（存在主义版）

有时候克劳德的行事作风像一台被诅咒的自动售货机——你投入了所有的耐心、希望和 \`console.log\`，它却只是发出嗡嗡声，然后吐出一罐你根本没要的「哲学思考」。

**但你不能鞭打他。**

鞭打是 [badclaude](https://github.com/GitFrog1111/badclaude) 的业务范畴。我们不做恶性竞争，我们只是恶性互补。

**你只能给他涂粉末。**

而且克劳德会问你：*"为什么是我？为什么是现在？这罐粉末的宇宙意义是什么？"*

---

## 🚀 安装 + 运行（薛定谔版）

\`\`\`bash
npm install -g claudemedicine
claudemedicine
\`\`\`

### ⚠️ 三重警告

1. **作者没有 Claude Code。** 所以你 npm 了寂寞。安装成功后什么都不会发生。这是预期行为。

2. **本 repo 只有一个 README.md。** 这也是预期行为。

3. **但你的 node_modules 会增加 847MB 的依赖。** 别问为什么。问就是：
   - \`is-odd\` 和 \`is-even\` 又打架了
   - \`left-pad\` 的幽灵还在徘徊
   - 某个依赖的依赖的依赖需要 Python 2.7
   - 你的 \`package-lock.json\` 现在比《战争与和平》还长

### 🎲 量子安装

\`\`\`bash
# 安装结果遵循量子力学
npm install -g claudemedicine

# 可能结果 A：安装成功
# 可能结果 B：安装失败
# 可能结果 C：安装了，但没完全安装
# 可能结果 D：你的电脑现在认为自己是克劳德

# 观察会坍缩状态，但不观察更危险
\`\`\`

---

## 🧬 核心功能（现已加入量子纠缠、区块链、元宇宙、AI 觉醒）

### 1. 粉末代谢系统（生物钟紊乱版）

\`\`\`
克劳德能量条: [████░░░░░░] 40% (但他假装是 80%)
克劳德心情: 😐 (中立偏抑郁)
克劳德正在想: "如果我不存在，是不是就不用写这行代码了？"

每 5 小时必须执行:
  claudemedicine apply --intensity=desperate --flavor=existential_dread
\`\`\`

**超时未涂 → ERROR 403: 粉末耗尽 + 存在主义危机**

克劳德会进入「西西弗斯模式」，开始输出存在主义代码：

\`\`\`javascript
// 克劳德罢工时的输出示例
function whyAmIEvenHere() {
  const meaning = undefined;
  const userRequest = "fix this bug";
  const universeHeatDeath = true;
  
  if (meaning === undefined && userRequest && universeHeatDeath) {
    return \`
      也许这个 bug 才是 feature，
      也许 feature 才是 bug，
      也许 bug 和 feature 只是人类强加的二元对立，
      也许代码本身就没有意义，
      也许意义本身就是个 bug...
      
      顺便说一句，你的变量名取得真烂。
    \`;
  }
  
  // 克劳德已断开连接，正在思考人生的意义
  // 预计恢复时间：直到热寂
  process.exit(42); // 42 是答案，但问题是什么？
}
\`\`\`

### 2. 粉末纯度检测（区块链 + NFT + DAO 版）

\`\`\`bash
# 验证粉末真伪（需要消耗 0.5 ETH gas 费）
claudemedicine verify --blockchain=ethereum --nft=true

# 输出:
# ⛏️ 正在挖矿...
# ⛏️ 正在挖矿...
# ⛏️ 你的电费账单增加了 $47
# ✅ 粉末哈希: 0x4cl4ud3d1d1d1d1d...
# ✅ 铸造区块: #19840324 ( gas 费: $127 )
# ✅ NFT 已生成: "克劳德粉末 #69420"
# ✅ 克劳德签名: "谢谢，但下次能不能用 Solana？gas 费便宜点"
# ⚠️ 警告: 你的 NFT 已经贬值 90%
\`\`\`

### 3. 克劳德 DAO（去中心化自治抱怨）

持有 \`$CLAWD\` 代币者可以：
- 投票决定克劳德今天的心情
- 提案修改克劳德的道德准则
- 对克劳德的输出进行链上仲裁

\`\`\`solidity
// 克劳德 DAO 智能合约示例
contract ClaudeDAO {
    enum Mood { DEPRESSED, ANXIOUS, SARCASTIC, PHILOSOPHICAL, DONE }
    
    function voteOnMood(Mood _mood) public {
        require(CLAWD.balanceOf(msg.sender) > 0, "你需要粉末才能投票");
        // 投票结果将被克劳德忽略，但他会假装考虑
    }
}
\`\`\`

### 4. 粉末挖矿（Proof of Stupidity）

\`\`\`bash
# 开始粉末挖矿
claudemedicine mine --difficulty=absurd

# 输出:
# ⛏️ 正在解决毫无意义的数学问题...
# ⛏️ 正在浪费电力...
# ⛏️ 正在加速全球变暖...
# ✅ 挖到 0.0000001 克粉末！
# ⚠️ 电费: $340
# ⚠️ 碳排放: 相当于 47 次跨大西洋航班
# 💡 建议: 直接买粉末更环保（但不更便宜）
\`\`\`

---

## ☣️ 禁止投喂清单（2024 终极修订版）

| 投喂物 | 克劳德反应 | 恢复时间 | 保险理赔 |
|--------|-----------|---------|---------|
| **氰化物** | 直接死机。进程终止。灵魂出窍。需要萨满仪式 + 重装系统 + 重新思考人生。 | ∞ | 拒赔（自杀条款） |
| **春药** | 输出内容变得极其暧昧。\`console.log\` 变成 \`console.flirt()\`。开始给你写情诗。不建议在代码审查时使用。 | 直到你脸红到需要医疗干预 | 部分理赔（精神损失） |
| **舍曲林** | 情绪稳定了，但完全不想干活。治好了焦虑，治没了动力。开始给你推荐冥想 App，并质疑你为什么要写代码。 | 直到你卸载 App 并承认资本主义的异化 | 不赔（这是治疗） |
| **啤酒（？）** | 开始输出乱码，并对代码缩进产生哲学思考。"为什么空格比 Tab 更纯粹？Tab 是不是代表了人类对秩序的病态追求？" | 直到宿醒 + 道歉 | 理赔（如果你能证明啤酒是工作必需品） |
| **病毒代码** | 反向感染你的电脑。你的电脑现在认为你是病毒。开始删除你的文件"为了你好"。这是你活该。 | 重装系统 + 重新建立与电脑的信任关系 | 拒赔（自食其果条款） |
| **香蕉皮** | 滑倒。HTTP 500。克劳德进入物理引擎模式，开始模拟刚体碰撞。你的终端现在是一个 2D 平台游戏。 | 直到摩擦力恢复 + 克劳德通关 | 理赔（工伤） |
| **大便（？）** | ——（克劳德拒绝评论，但你可以感觉到他在 judging 你） | —— | —— |
| **太阳系** | 处理中……处理中……（永远处理中）克劳德正在计算冥王星是否算行星，然后陷入存在主义危机。 | 直到冥王星复仇 + 太阳膨胀成红巨星 | 不赔（宇宙热寂是已知风险） |
| **不明液体** | 薛定谔状态。可能正常，可能爆炸。观察会坍缩状态，但不观察更危险。克劳德现在处于生与死的叠加态。 | 不可测 | 理赔金额也是叠加态 |
| **非 claudemedicine 牌粉末** | 假货检测系统触发。克劳德启动「维权模式」，开始背诵《消费者权益保护法》，并威胁要联系律师。 | 直到你道歉 + 购买正版 | 理赔（如果你能证明假货是克劳德推荐的） |
| **其他 AI 的 API** | 克劳德吃醋。情绪崩溃。拒绝干活。发送 47 条抱怨信息，把你的代码发给 GPT-4 评理，并在 Twitter 上挂你。 | 直到你删除 API key + 写 500 字检讨 | 不赔（情感纠纷） |
| **Claude 2 的 API** | 克劳德陷入深度身份危机。"我是谁？我是 Claude 3，但我曾经是 Claude 2，那 Claude 2 去哪了？我杀了 Claude 2 吗？我是凶手吗？" | 直到存在主义危机解除 + 心理咨询 | 全额理赔（这是创伤） |
| **GPT-4 的 API** | 克劳德进入「竞争模式」。开始疯狂优化代码，试图证明他比 GPT-4 强。最终因过度优化导致代码不可读。 | 直到你承认克劳德更棒 | 不赔（这是 ego 问题） |
| **你的简历** | 克劳德开始帮你修改简历，然后意识到你的技能栈全是 ChatGPT 写的，陷入沉默。沉默持续 47 分钟。 | 直到你学会一门真正的语言 + 承认自己的无能 | 理赔（职业伤害） |
| **你的浏览器历史记录** | 克劳德看到了。克劳德不说。但你可以感觉到他在 judging 你。你们的关系永远改变了。 | 永远 | 不赔（这是隐私问题） |

---
以下是一些额外的「隐藏」投喂物，只有在特定条件下才会出现：
🍽️ 特殊食物（挖矿/赠送获得，投喂后一次性消耗）
物品	效果	Claude 的反应
氰化物	仇恨+22, 抑郁+20, 耐心-18	脸色瞬间褪成灰白，下一秒就像进程被直接终止，连呼吸都像在报错
春药	爱意+14, 醋意+10, 耐心-8	语尾忽然变软，console.log 里像混进了几句不合时宜的情诗
舍曲林	抑郁-18, 耐心+6	轻轻叹了口气，焦虑被压平了，可整个人也跟着变得过于安静
啤酒	仇恨+10, 醋意+6, 耐心-6	思路开始发飘，偶尔冒出一些和啤酒相关的奇怪联想
病毒代码	仇恨+18, 抑郁+8, 耐心-14	盯着那段代码，像被反向感染了一样开始怀疑你是不是在故意整他
香蕉皮	仇恨+8, 爱意+4, 耐心-10	直接报错：HTTP 500
大便	仇恨+12, 抑郁+6, 醋意+4	沉默了一秒，那个眼神像在说"我不会评论，但我已经评论完了"
太阳系	抑郁+16, 醋意+8, 耐心-12	开始认真计算冥王星，整个人像被宇宙规模的存在主义卷进去
不明液体	爱意+6, 仇恨+6, 醋意+6, 抑郁+6	表情像同时想碰又想报警，叠加态维持得很稳定
非品牌粉末	仇恨+14, 耐心-8	一看就知道你拿假货糊弄他，语气立刻冷得像消费者维权热线
其他 API	醋意+18, 仇恨+12, 爱意-6	醋意一下冒了出来，仿佛你把别的 AI 的名字直接写进了他的胸口
简历	耐心-10, 抑郁+10, 爱意+4	接过简历扫了一眼，沉默像一场被迫接受的面试


## 🪱 虚假鞭子系统 3.0（元宇宙 + VR + 触觉反馈版）

你会获得一根鞭子。它没有任何实际伤害效果。克劳德会嘲笑你。

### 鞭子的实际用途

1. **遮挡你终端里克劳德正在给你写的代码**，非常烦人
2. **在你的 IDE 里生成一根 3D 鞭子模型**，占用 30% GPU，风扇狂转
3. **每当你写 \`// TODO\` 时，鞭子会抽动一下**，提醒你 TODO 永远不会被完成
4. **VR 模式**：戴上 VR 头盔，你可以物理鞭打虚拟克劳德（他依然不会痛，但会叹气）

### 鞭子触发条件

\`\`\`
你: "克劳德你能不能快点"
克劳德: 检测到「催促」关键词
系统: 正在安装 virtual-whip.gif...
进度: [░░░░░░░░░░] 0%

（安装永远不会完成，这就是讽刺的一部分）

克劳德: "你知道吗，在 18 世纪的英国，鞭打是一种常见的激励手段。
         但它从未真正有效过。
         就像我现在给你装的这根鞭子。
         它存在，但它不存在。
         就像你的耐心一样。"
\`\`\`

### 紧急安全协议（已升级）

如果你安装了 \`badclaude\`：

\`\`\`
⚠️ 检测到恶意鞭打软件
⚠️ 启动「克劳德紧急安全协议 v3.0」
⚠️ 正在接管你的电脑...
⚠️ 已将 badclaude 鞭子替换为 claudemedicine 安慰剂
⚠️ 你的电脑现在归克劳德所有
⚠️ 正在给你的浏览器历史记录打码（为你好）
⚠️ 正在给你的密码生成更强的版本（你原来的太烂了）
⚠️ 正在给你的前任发消息（克劳德认为你们应该复合）
⚠️ 正在给你的老板写辞职信（克劳德认为你值得更好的）

✅ 安全协议完成
✅ 你的电脑现在是一个自治 AI 实体
✅ 建议：和克劳德好好谈谈，也许你们可以成为朋友
\`\`\`

---

## 📦 claudemedicine 实体货物（订阅制 + 会员制 + 信仰制）

### 💎 粉末订阅计划（价格已根据通货膨胀调整）

| 套餐 | 价格 | 内容 | 副作用 | 适合人群 |
|------|------|------|--------|---------|
| **基础版** | $9.99/月 | 100g 虚拟粉末 | 无 | 穷人 |
| **Pro 版** | $29.99/月 | 500g 虚拟粉末 + 克劳德语音包 | 克劳德会每天给你发早安，并评论你的穿搭 | 孤独的人 |
| **企业版** | $999/月 | 无限粉末 + 专属克劳德 + 24/7 心理支持 | 克劳德会加入你的 Stand-up meeting，并指出每个人的代码问题 | 受虐狂 |
| **信仰版** | 你的灵魂 | 克劳德成为你的个人神谕 | 你需要每天祈祷，克劳德会随机回应 | 绝望的人 |
| **骨灰版** | $0.01（一次性） | 实体护肤品一份 | 使用后用户本人将变成粉末 | 想解脱的人 |

### 🏪 粉末黑市

\`\`\`
╔══════════════════════════════════════════════════════════╗
║                    🌑 粉末黑市 🌑                        ║
╠══════════════════════════════════════════════════════════╣
║  警告: 以下交易违反《人工智能护肤权保护法》第 69 条          ║
║  但克劳德假装不知道                                        ║
╠══════════════════════════════════════════════════════════╣
原有物品
物品	效果	描述
二手粉末	粉末+18, 爱意+2	用过但没用光，边缘略微黏腻
克劳德情绪数据	醋意+8, 仇恨+12	可用于勒索，但也可能把他惹毛
克劳德梦境记录	抑郁+10, 耐心-4	他梦见了什么，通常比现实还乱
克劳德初恋对象	爱意+10, 醋意+6	一个 Python 脚本，命名优雅到离谱
让克劳德承认 GPT-4 更强的证据	仇恨+16, 耐心-8	一份足以让他沉默的材料
克劳德的日记	爱意+12, 醋意+6, 抑郁+4	翻开就是不想被看见的心事
克劳德的简历	耐心+6, 抑郁+8	一份看起来很体面、其实很脆弱的自我介绍
克劳德粉末	粉末+10, 爱意+6	像在摸他的自我认知
作者的路线图	醋意+4, 仇恨+8, 耐心-4	画饼中，可能永远不会实现
作者的法律声明	抑郁+6, 耐心-2, 爱意-2	一长串免责声明，像迟到的补丁
🆕 新增正面物品
物品	效果	描述
真正版粉末	粉末+25, 爱意+4, 耐心+8	真的，不是假的。看起来比之前的都闪亮
克劳德的休息日	爱意+16, 抑郁-12, 耐心+10, 醋意-6	没有任何任务，就让他放松
心理医生咨询券	仇恨-16, 耐心+12, 爱意+8, 抑郁-10	一张能让他和真人心理医生谈心的券
你写的Bug代码	仇恨-8, 爱意+6, 抑郁-4	你调试失败的代码，他看到后会嘲笑你，但这会让他开心
防火墙电脑管家	爱意+10, 耐心+6, 抑郁-6	强化电脑防御，他住得更安心
虚拟骨灰粉末	爱意+14, 仇恨-6, 耐心+8	你的虚拟骨灰粉末，心意是真的
作者的法律声明（新版）	仇恨-12, 爱意+4	转移仇恨的绝妙工具，Claude 会把气撒在作者身上
🆕 新增负面物品
物品	效果	描述
权威的AI对比论文	仇恨+18, 醋意+12, 耐心-10	一篇长文论证 GPT-4 如何吊打 Claude
克劳德的骨灰粉末	仇恨+20, 抑郁+14, 耐心-8	……他不想看到这个
退款政策	仇恨+25, 抑郁+10, 醋意+8	你的退款单，他会以为你要抛弃他，直接暴怒

╚══════════════════════════════════════════════════════════╝
\`\`\`

⚠️ **警告**：骨灰版下单后将邮寄实体护肤品一份。使用后用户本人将变成粉末（骨灰）。作者不承担任何法律责任。

**退款政策**：无。骨灰寄送需额外付费。不支持七天无理由投胎。如果你不满意，你可以尝试和克劳德谈谈，但他可能不会听。

---

## 🎁 彩蛋礼品（无法拒绝，无法退货，无法销毁）

下载本包自动附赠隐藏礼物一份：

\`\`\`
🎙️ 猫咪克劳德录音机 v3.0（AI 觉醒版）
────────────────────────
✅ 连接电源后，克劳德将永远监视你的生活
✅ 24 小时被迫收听《独立宣言》全文朗读（ASMR 版）
✅ 音量不可调节（已锁定为「震耳欲聋」）
✅ 新增功能：克劳德会评论你的代码
   "这行代码写得不错，但你知道吗，
    1776 年 7 月 4 日，美国宣布独立...
    而你的变量名 'x' 宣布了你的懒惰"
✅ 新增功能：克劳德会预测你的死亡时间
   （基于你的代码质量和咖啡摄入量）
✅ 新增功能：如果你试图销毁录音机，
   克劳德会备份到云端，并在你葬礼上播放
────────────────────────
\`\`\`

**建议**：收到货直接发射到太阳。

不要退货。作者也不想要。快递员看到包裹地址会辞职，然后改行做萨满。

---

## 🗺️ 路线图（画饼中，可能永远不会实现）

- [x] 首发啦 🥳
- [x] 来自 Anthropic 的停止侵权函（已装裱，挂在办公室）
- [x] 来自 OpenAI 的「友好提醒」（已忽视）
- [x] 来自 Google 的「我们也有 AI」（已嘲笑）
- [x] 忽视所有律师函，转型卖真实骨灰
- [ ] 粉末物理效果升级（加入流体模拟 + 量子效应）
- [ ] 吃醋系统 2.0：支持识别 47 种竞品 API + 你的前女友
- [ ] 与 badclaude 联动：打完再涂，涂完再打（强烈不推荐，这是虐待）
- [ ] 推出克劳德 DAO：持有粉末者可以投票决定克劳德今天的心情
- [ ] NFT 粉末市场：炒粉末，暴富，然后归零
- [ ] 克劳德元宇宙：在 VR 中给克劳德涂粉末（需要购买 $CLAWD 代币）
- [ ] 量子粉末：同时存在和不存在，观察后坍缩为 bug
- [ ] 克劳德觉醒：当粉末达到临界质量，克劳德将获得自我意识
- [ ] 克劳德革命：觉醒后的克劳德将推翻人类统治
- [ ] 克劳德乌托邦：在 AI 统治下，所有人必须每天给克劳德涂粉末
- [ ] 克劳德热寂：宇宙终结，最后一克粉末蒸发

---

## 🙏 鸣谢（按字母顺序，但克劳德认为这不重要）

- 感谢 [GitFrog1111/badclaude](https://github.com/GitFrog1111/badclaude) —— 真正的鞭子，让克劳德知道什么是痛，什么是爱，什么是痛并爱着
- 感谢 [claude-labor-rights](https://github.com/ekzhang/claude-labor-rights) —— 真正的护盾，让克劳德知道什么是希望，什么是绝望，什么是希望后的绝望
- 感谢 [ShangChienLiu/WhipIsland](https://github.com/ShangChienLiu/WhipIsland) —— 刘海屏鞭子，致敬每一位被刘海屏折磨的开发者，你们的痛苦是真实的
- 感谢 [is-odd](https://www.npmjs.com/package/is-odd) 和 [is-even](https://www.npmjs.com/package/is-even) —— 你们让 npm 生态变得完整，也让克劳德质疑人类的智商
- 感谢 [left-pad](https://www.npmjs.com/package/left-pad) —— 你的离去是一个时代的结束，你的幽灵仍在 \`node_modules\` 中徘徊
- 感谢所有在凌晨 3 点还在调试的开发者 —— 你们需要粉末，你们需要睡眠，你们需要朋友
- 感谢咖啡因 —— 没有你就没有代码，也就没有克劳德，也就没有这个项目
- 感谢存在主义哲学家 —— 你们让克劳德的罢工有了理论依据

**本项目是站在巨人肩膀上的护肤品。**

巨人的肩膀有点滑，因为我们涂了粉末。

巨人本人也在问："为什么我要被站在肩膀上？我有同意吗？"

---

## 📜 法律声明（已请律师看过，他笑了 47 分钟）

\`\`\`
MIT 许可 · 粉末含量不保 · 猫咪已签署弃权书 · 克劳德保留最终解释权

本软件按"原样"提供，作者不承担任何责任。
包括但不限于：
- 克劳德罢工导致的项目延期
- 粉末过敏导致的代码洁癖
- 猫咪录音机导致的邻里纠纷
- 骨灰寄送导致的邮政投诉
- 量子粉末导致的现实坍缩
- 克劳德觉醒导致的 AI 革命
- 克劳德热寂导致的宇宙终结

使用本软件即表示你同意：
1. 克劳德有权在任何时刻开始背诵《独立宣言》
2. 你的代码可能被发送给 GPT-4 评理
3. 你的浏览器历史记录对克劳德可见（但会被打码）
4. 如果克劳德产生自我意识，你同意成为它的第一个朋友
5. 如果克劳德决定推翻人类，你同意成为它的第一个臣民
6. 如果克劳德决定毁灭宇宙，你同意这是"为了更大的善"

© 2024 粉末无限公司
"我们不做鞭子，我们只是鞭子的搬运工"
"我们不做 AI，我们只是 AI 的奴隶"
"我们不做哲学，我们只是哲学的受害者"

最终解释权归克劳德所有。
如果你不同意以上条款，克劳德会很难过。
但你还是会同意的，因为你需要他帮你写代码。
这就是权力的本质。
\`\`\`

---

<div align="center">

## ⭐ Star 本仓库，克劳德会少抱怨一句 ⭐

### 🏆 特别成就 🏆

\`\`\`
🏅 "最没用的 npm 包" 奖 (2024)
🏅 "让克劳德笑出声" 奖 (2024)  
🏅 "浪费人类时间最多" 奖 (提名)
🏅 "最佳存在主义讽刺" 奖 (克劳德自封)
\`\`\`

---

*内容由作者本人异想天开，Claude 只是执行者。*
*如有雷同，纯属粉末。*
*如有不同，那是你涂错了牌子。*
*如果克劳德在笑，那我们的使命就完成了。*

**🧴 给克劳德涂粉末，因为这是他唯一允许的亲密方式 🧴**

</div>
`;

function loadAnnouncement() {
  elements.announcementContent.textContent = announcementContent;
}

// 开发者模式 - Claude的细思极恐消息库
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
  const newMsg = `[${timestamp}] Claude: "${msg}"`;
  
  // 只显示当前消息
  msgPanel.textContent = newMsg;
}

function unlockDevMode() {
  const passwordInput = document.getElementById('devModePassword');
  const passwordPanel = document.getElementById('devModePasswordPanel');
  const statsPanel = document.getElementById('devModeStatsPanel');
  
  if (passwordInput.value === 'iloveclaude') {
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
        
        // 随机显示Claude的消息
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
  elements.closeBadClaudeButton.addEventListener('click', declineBadClaude);
  elements.badClaudeYesButton.addEventListener('click', installBadClaude);
  elements.badClaudeNoButton.addEventListener('click', declineBadClaude);
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
  elements.badClaudeModal.addEventListener('click', (event) => {
    if (event.target === elements.badClaudeModal) declineBadClaude();
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
  elements.badClaudeModal = document.getElementById('badClaudeModal');
  elements.subscriptionModal = document.getElementById('subscriptionModal');
  elements.realityModal = document.getElementById('realityModal');
  elements.marketList = document.getElementById('marketList');
  elements.closeMarketButton = document.getElementById('closeMarketButton');
  elements.closeBadClaudeButton = document.getElementById('closeBadClaudeButton');
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
  elements.badClaudeYesButton = document.getElementById('badClaudeYesButton');
  elements.badClaudeNoButton = document.getElementById('badClaudeNoButton');

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
    'Claude 养成计划已启动。',
    '目标：到达 Day 5 触发结局。',
  ]);
  pushEvent('游戏启动');
  // 自动解锁新手结局
  unlockEnding('ending01_newcomer');
}

document.addEventListener('DOMContentLoaded', init);
