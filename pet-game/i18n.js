// Language packs live in lang/<code>/ (strings.json, endings.json, announcement.txt).
// Chinese is the source language; keys missing from another pack fall back to it.
const I18n = (() => {
  const languages = { zh: '中文', en: 'English' };
  const sourceLanguage = 'zh';
  const storageKey = 'petLanguage';

  let current = sourceLanguage;
  let strings = {};
  let sourceStrings = {};
  let endings = {};
  let announcement = null;

  function detectLanguage() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved && languages[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    const browser = (navigator.language || '').toLowerCase();
    return browser.startsWith('zh') ? 'zh' : 'en';
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  async function load(code) {
    const lang = languages[code] ? code : sourceLanguage;
    const [source, local, localEndings, localAnnouncement] = await Promise.all([
      fetchJson(`lang/${sourceLanguage}/strings.json`),
      lang === sourceLanguage ? null : fetchJson(`lang/${lang}/strings.json`).catch(() => ({})),
      fetchJson(`lang/${lang}/endings.json`).catch(() => fetchJson(`lang/${sourceLanguage}/endings.json`)).catch(() => ({})),
      fetchText(`lang/${lang}/announcement.txt`).catch((error) => error),
    ]);
    sourceStrings = source;
    strings = local || source;
    endings = localEndings;
    announcement = localAnnouncement;
    current = lang;
    try {
      window.localStorage.setItem(storageKey, lang);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = t('meta.htmlLang');
  }

  function lookup(table, key) {
    return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), table);
  }

  function interpolate(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }

  // t('log.subscribed', { tier }) returns a string; arrays/objects come back as-is for random picks.
  function t(key, params = {}) {
    let value = lookup(strings, key);
    if (value == null) value = lookup(sourceStrings, key);
    if (value == null) return key;
    return typeof value === 'string' ? interpolate(value, params) : value;
  }

  function pick(key, params = {}) {
    const list = t(key);
    if (!Array.isArray(list) || list.length === 0) return key;
    const entry = list[Math.floor(Math.random() * list.length)];
    return typeof entry === 'string' ? interpolate(entry, params) : entry;
  }

  return {
    languages,
    detectLanguage,
    load,
    t,
    pick,
    get language() { return current; },
    get endings() { return endings; },
    get announcement() { return announcement; },
  };
})();

const t = I18n.t;
