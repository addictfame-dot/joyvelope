const app = document.querySelector('#app');
const toast = document.querySelector('#toast');

const templates = {
  birthday: { name: 'Birthday Night', art: '🎂', detail: 'Candles, balloons and a final wish', theme: 'sunset' },
  letter: { name: 'Secret Letter', art: '💌', detail: 'A sealed note for someone special', theme: 'moon' },
  memories: { name: 'Memory Book', art: '📖', detail: 'Turn the pages of your story', theme: 'rose' }
};
const themes = { sunset: 'Birthday Glow', moon: 'Midnight Sky', rose: 'Rose Hour' };
const storageKey = 'joyvelope-gifts-v2';
const legacyKey = 'memora-gifts-v1';
const nested = window.__JOYW_ENV?.gift;
let draft = newGift('birthday');
let step = 0;
let finalLink = '';
let timeline;
let toastTimer;
let uploadPending = false;
let audioContext;
let previewStage = 'intro';
let previewPage = 0;
let rejectedShare = false;
let hostedPending = false;
const startingView = route();

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const matchObject = (object, key, fallback) => Object.hasOwn(object, key) ? key : fallback;

function sampleGift() {
  return {
    ...newGift('birthday'),
    recipient: 'Ananya',
    sender: 'Aarav',
    title: 'Midnight Birthday',
    message: 'Happy birthday! I made this little corner of the internet for you. Here’s to more late-night talks, ridiculous photos and reasons to laugh till our stomachs hurt.',
    memories: ['That photo we had to retake five times.', 'Every “one last song” that turned into an hour.', 'All the inside jokes we can never explain.'],
    sound: 'dream'
  };
}

function newGift(template) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
    template,
    title: templates[template].name,
    recipient: '',
    sender: '',
    message: '',
    memories: ['', '', ''],
    theme: templates[template].theme,
    sound: 'none',
    photos: [],
    created: Date.now()
  };
}

function cleanGift(value, allowPhotos = false, allowRemotePhotos = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid gift');
  const template = matchObject(templates, value.template, 'birthday');
  const string = (input, limit) => typeof input === 'string' ? input.slice(0, limit) : '';
  return {
    ...newGift(template),
    id: string(value.id, 90) || newGift(template).id,
    title: string(value.title, 70) || templates[template].name,
    recipient: string(value.recipient, 50),
    sender: string(value.sender, 50),
    message: string(value.message, 1200),
    memories: [0, 1, 2].map((index) => string(value.memories?.[index], 110)),
    theme: matchObject(themes, value.theme, templates[template].theme),
    sound: ['dream', 'sparkle'].includes(value.sound) ? value.sound : 'none',
    photos: allowPhotos && Array.isArray(value.photos)
      ? value.photos.slice(0, 6).filter((photo) => typeof photo === 'string' && (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo) || (allowRemotePhotos && /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/storage\/v1\/object\/sign\//.test(photo))))
      : [],
    created: Number.isFinite(value.created) ? value.created : Date.now()
  };
}

function readRecords(key) {
  try {
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(records) ? records.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
}

function adaptLegacy(gift) {
  return cleanGift({
    ...gift,
    template: /birthday/i.test(gift.template) ? 'birthday' : /book|memor/i.test(gift.template) ? 'memories' : 'letter',
    theme: gift.theme === 'Midnight' ? 'moon' : gift.theme === 'Rose Glow' ? 'rose' : 'sunset',
    sound: gift.music
  }, true);
}

function savedGifts() {
  const current = readRecords(storageKey).map((value) => cleanGift(value, true));
  try {
    if (localStorage.getItem(storageKey) !== null) return current;
  } catch {
    return current;
  }
  return readRecords(legacyKey).map(adaptLegacy);
}

function writeGifts(gifts) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(gifts));
    return true;
  } catch {
    return false;
  }
}

function route() {
  if (nested) return 'gift';
  const hash = location.hash.slice(1);
  if (hash.startsWith('gift=') || hash.startsWith('g=')) return 'gift';
  return ['home', 'create', 'templates', 'gifts', 'premium', 'demo', 'preview'].find((view) => hash.split('/')[0] === view) ?? 'home';
}

function freshTimeline() {
  return { screen: 0, candleOut: false, popped: [], opened: false, page: 0, sound: false };
}

function stars(className = 'stars', count = 34) {
  const colors = ['#ffd2a9', '#f8a1c5', '#a994ee', '#fff0c4'];
  return `<div class="${className}" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
    const style = `--x:${(index * 37 + 4) % 101}%;--y:${(index * 61 + 8) % 101}%;--size:${index % 6 === 0 ? 18 : 6 + index % 5}px;--star:${colors[index % colors.length]};--alpha:${.24 + (index % 5) * .13};--rot:${(index * 31) % 130}deg`;
    return className === 'confetti' ? `<i style="${style}"></i>` : `<span class="star" style="${style}">${index % 6 === 0 ? '✦' : '·'}</span>`;
  }).join('')}</div>`;
}

function envelope(name = 'Someone special', closed = false) {
  return `<div class="envelope" aria-hidden="true">
    <div class="envelope-back"></div>
    <div class="envelope-note"><small>Made just for</small><b>${escapeHtml(name)}</b></div>
    <div class="envelope-front"></div><div class="flap"></div>
    <div class="seal">${closed ? '♥' : '♡'}</div>
  </div>`;
}

function wordmark() {
  return nested
    ? '<span class="wordmark">Joyvelope</span>'
    : '<a class="wordmark" href="#home"><img src="./icon.svg" alt="">Joyvelope</a>';
}

function publicRecipientSite() {
  const configured = window.JOYW_CONFIG?.recipientSiteUrl;
  if (typeof configured !== 'string' || !configured) return null;
  try {
    const url = new URL(configured);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !host.includes('.') || host === 'localhost' || host.endsWith('.local') || /^\d+(?:\.\d+){3}$/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function sharingSetupMessage() {
  const missing = [];
  const endpoint = window.JOYW_CONFIG?.giftApiUrl;
  if (typeof endpoint !== 'string' || !endpoint) missing.push('JOYW_CONFIG.giftApiUrl (deployed Supabase Edge Function HTTPS URL)');
  else {
    try {
      if (new URL(endpoint).protocol !== 'https:') missing.push('JOYW_CONFIG.giftApiUrl must use HTTPS');
    } catch { missing.push('JOYW_CONFIG.giftApiUrl must be a valid HTTPS URL'); }
  }
  if (!publicRecipientSite()) missing.push('JOYW_CONFIG.recipientSiteUrl (public HTTPS website URL)');
  return missing;
}

function header(view, giftOnly = false) {
  const link = (target, title, classes = '') => `<a href="#${target}" class="${classes}"${view === target ? ' aria-current="page"' : ''}>${title}</a>`;
  return `<header class="topbar${giftOnly ? ' gift-top' : ''}"><div class="wrap header">${wordmark()}
    ${giftOnly ? `<nav aria-label="Gift controls">${timelineGift.sound !== 'none' ? `<button type="button" class="btn ghost" data-action="sound" aria-pressed="${timeline.sound}">${timeline.sound ? 'Sound on' : 'Sound off'}</button>` : ''}${view === 'preview' ? link('create', 'Back to editor', 'nav-cta') : ''}</nav>`
      : `<nav aria-label="Main">${link('templates', 'Templates', 'desktop-link')}${link('gifts', 'My gifts', 'desktop-link')}${link('premium', 'Premium', 'desktop-link')}${link('create', 'Create a gift ↗', 'btn primary nav-cta')}</nav>`}
  </div></header>`;
}

function footer() {
  return `<footer class="wrap footer"><small>Joyvelope · Personalised digital gifts</small><div class="actions"><a href="#gifts" class="text-link">My gifts</a><a href="#templates" class="text-link">Templates</a><a class="text-link" href="#premium">Premium</a></div></footer>`;
}

function cards(forEditor = false) {
  return Object.entries(templates).map(([key, value]) => {
    const body = `<div class="tile-art ${key}">${stars('stars', 13)}<span aria-hidden="true">${value.art}</span></div>
      <div class="tile-body"><h3>${value.name}</h3><p>${value.detail}</p><span aria-hidden="true">↗</span></div>`;
    return forEditor
      ? `<button type="button" class="tile" data-template="${key}" aria-pressed="${draft.template === key}">${body}</button>`
      : `<a class="tile" href="#create/${key}">${body}</a>`;
  }).join('');
}

function home() {
  return `${header('home')}<main id="main">
    <section class="hero">${stars('stars', 42)}<div class="wrap">
      <div class="hero-copy">
        <div class="eyebrow">Personalised digital gifts</div>
        <h1>Little surprises,<em>big feelings.</em></h1>
        <p>Put your favourite photos, a handwritten-style note and a few surprises into a gift they can open with a tap.</p>
        <div class="actions"><a class="btn primary" href="#create">Create a gift <span aria-hidden="true">↗</span></a><a class="btn ghost" href="#demo"><span aria-hidden="true">▷</span> Open birthday demo</a></div>
      </div>
      <div class="hero-art" aria-hidden="true"><span class="hero-halo"></span><span class="art-star one">✦</span><span class="art-star two">✧</span><span class="art-star three">✦</span>${envelope('You')}</div>
    </div></section>
    <section class="wrap section"><div class="section-head"><div><h2>Pick a gift to make</h2><p>Start with a template, then add your own memories.</p></div><a class="text-link" href="#templates">All templates ↗</a></div><div class="tile-grid">${cards()}</div></section>
    <section class="pro-strip"><div class="wrap"><div><h2>Joyvelope Premium</h2><p>Premium themes and photo sharing are planned.</p></div><a class="btn ghost" href="#premium">See the ₹199 plan</a></div></section>
  </main>${footer()}`;
}

function field(name, label, options = {}) {
  const { wide = false, max = 50, value = draft[name] ?? '', area = false, required = false, placeholder = '' } = options;
  const attributes = `id="${name}" name="${name}" maxlength="${max}" placeholder="${escapeHtml(placeholder)}"${required ? ' required' : ''}`;
  return `<label class="field${wide ? ' wide' : ''}">${label}${area
    ? `<textarea ${attributes}>${escapeHtml(value)}</textarea>`
    : `<input ${attributes} value="${escapeHtml(value)}">`}</label>`;
}

function themeOptions() {
  return Object.entries(themes).map(([id, label]) => `<option value="${id}"${id === draft.theme ? ' selected' : ''}>${label}</option>`).join('');
}

function editor() {
  const labels = ['Template', 'Personalise', 'Share'];
  const steps = `<ol class="steps">${labels.map((name, index) => `<li${index === step ? ' aria-current="step"' : ''}>${index + 1}. ${name}</li>`).join('')}</ol>`;
  const content = [
    () => `<h2>Choose a template</h2><div class="tile-grid">${cards(true)}</div>
      <div class="form-actions"><span></span><button class="btn primary" data-action="next-step" type="button">Personalise →</button></div>`,
    () => `<h2>Make it theirs</h2><form id="gift-form">
      <div class="form-grid">
        ${field('recipient', 'Their name', { placeholder: 'Ananya', required: true })}
        ${field('sender', 'Your name', { placeholder: 'Aarav' })}
        ${field('title', 'Gift title', { max: 70, wide: true })}
        ${field('message', 'Your letter', { max: 1200, wide: true, area: true, placeholder: 'Write something they will want to keep…' })}
        ${draft.template === 'birthday' ? draft.memories.map((value, index) => field(`memory-${index}`, `Balloon message ${index + 1}`, { value, max: 110, wide: true, placeholder: 'A memory or a wish' })).join('') : ''}
        <label class="field">Theme<select name="theme" id="theme">${themeOptions()}</select></label>
        <label class="field">Music<select name="sound" id="sound">
          <option value="none"${draft.sound === 'none' ? ' selected' : ''}>Silent</option>
          <option value="dream"${draft.sound === 'dream' ? ' selected' : ''}>Dream notes</option>
          <option value="sparkle"${draft.sound === 'sparkle' ? ' selected' : ''}>Soft sparkle</option>
        </select></label>
        <label class="field wide">Photos (up to 6)<input type="file" id="photos" accept="image/*" multiple></label>
      </div>
      <div class="photos" id="thumbnails">${thumbnails()}</div>
      <p class="form-note">Uploaded photos appear in the memory book and downloadable gift.</p>
      <div class="form-actions"><button type="button" class="btn ghost" data-action="previous-step">← Templates</button><button class="btn primary" type="submit">Review gift →</button></div>
    </form>`,
    () => `<h2>Preview and share</h2><p class="form-note"><strong>${escapeHtml(draft.title)}</strong> for ${escapeHtml(draft.recipient)}</p>
      <div class="form-actions"><a class="btn ghost" href="#preview">Open full preview ↗</a><button class="btn ghost" data-action="save">Save to My gifts</button></div>
      <div class="form-actions"><button class="btn primary" data-action="hosted-link"${hostedPending ? ' disabled' : ''}>Share gift link</button><button class="btn ghost" data-action="copy"${finalLink ? '' : ' disabled'}>Copy link</button></div>
      <div id="share-result" class="share-result"${finalLink ? '' : ' hidden'}><label class="field" for="share-url">Gift link</label><input id="share-url" value="${escapeHtml(finalLink)}" readonly></div>
      <p class="form-note">Your gift, messages, and photos will be uploaded to Joyvelope hosting before Android opens the share sheet.</p>
      <div class="form-actions"><button class="btn ghost" data-action="previous-step">← Personalise</button></div>`
  ];
  return `${header('create')}<main class="wrap editor" id="main"><h1>Create a gift</h1><p class="muted">A few personal touches make it yours.</p>
    <div class="editor-layout"><section class="panel">${steps}${content[step]()}</section>
      <aside class="preview-pane" aria-label="Live preview"><div class="preview-bar"><label for="preview-stage">Live preview</label><select id="preview-stage">${previewOptions()}</select></div><div id="live-preview">${previewScene()}</div></aside>
    </div></main>${footer()}`;
}

const stageNames = { intro: 'Cover', cake: 'Cake', balloons: 'Balloons', envelope: 'Envelope', letter: 'Letter', book: 'Memory book', finale: 'Finale' };

function previewOptions() {
  return stagesFor(draft).map((stage) => `<option value="${stage}"${previewStage === stage ? ' selected' : ''}>${stageNames[stage]}</option>`).join('');
}

function previewScene() {
  const screen = Math.max(0, stagesFor(draft).indexOf(previewStage));
  const state = { ...freshTimeline(), screen, page: previewPage, popped: [0, 1, 2] };
  return scene(draft, state, true);
}

function thumbnails() {
  return draft.photos.map((photo, index) => `<div class="thumb"><img src="${photo}" alt="Photo ${index + 1}"><button type="button" data-remove="${index}" aria-label="Remove photo ${index + 1}">×</button></div>`).join('');
}

function gallery() {
  return `${header('templates')}<main class="wrap subpage" id="main"><h1>Gift templates</h1><p class="muted">Pick what they will open first.</p><section class="section"><div class="tile-grid">${cards()}</div></section></main>${footer()}`;
}

function hostedRecords() {
  try { return JSON.parse(localStorage.getItem('joyvelope-hosted-management-v1') || '{}'); } catch { return {}; }
}

function myGifts() {
  const records = savedGifts();
  const hosted = hostedRecords();
  return `${header('gifts')}<main class="wrap subpage" id="main"><h1>My gifts</h1><p class="muted">${records.length ? 'Gifts saved in this browser.' : 'Your saved gifts will show up here.'}</p>
    <div class="saved-grid">${records.map((gift) => `<article class="panel"><h2>${escapeHtml(gift.title)}</h2><p class="muted">For ${escapeHtml(gift.recipient || 'someone special')}</p>
      <div class="actions"><button class="btn primary" data-edit="${escapeHtml(gift.id)}">Edit and share</button>${hosted[gift.id] ? `<button class="btn ghost" data-copy-hosted="${escapeHtml(gift.id)}">Copy gift link</button><button class="btn ghost" data-revoke-hosted="${escapeHtml(gift.id)}">Revoke link</button>` : ''}<button class="btn ghost" data-delete="${escapeHtml(gift.id)}">Delete</button></div></article>`).join('')}</div>
    <div class="actions"><a href="#create" class="btn ghost">Create a gift</a></div></main>${footer()}`;
}

function premium() {
  return `${header('premium')}<main class="wrap subpage" id="main"><h1>Joyvelope Premium</h1>
    <section class="panel" style="max-width: 520px; margin-top: 24px"><h2>₹199 <small>per gift</small></h2>
    <p class="form-note"><strong>Checkout coming soon</strong></p>
    <p class="form-note">Premium payment is not available yet. No charge can be made from this screen.</p>
    <div class="form-actions"><button class="btn primary" type="button" disabled>Checkout coming soon</button></div></section></main>${footer()}`;
}

function stagesFor(gift) {
  if (gift.template === 'birthday') return ['intro', 'cake', 'balloons', 'envelope', 'letter', 'book', 'finale'];
  if (gift.template === 'memories') return ['intro', 'envelope', 'letter', 'book', 'finale'];
  return ['intro', 'envelope', 'letter', 'book', 'finale'];
}

function scene(gift, state, isPreview = false) {
  const stages = stagesFor(gift);
  const item = stages[state.screen];
  const recipient = escapeHtml(gift.recipient || 'someone special');
  const sender = escapeHtml(gift.sender || 'someone who cares');
  const title = escapeHtml(gift.title);
  const next = (label, kind = 'primary') => `<button type="button" class="btn ${kind}" data-action="gift-next">${label}</button>`;
  const openButton = (className, name, action) => `<button type="button" class="visual-button ${className}" data-action="${action}" aria-label="${name}">${envelope(gift.recipient || 'you', true)}</button>`;
  const defaults = ['A little reminder of how much you mean to me.', 'Here’s to more of our favourite moments.', 'Hope today is as special as you are.'];
  let body = '';
  if (item === 'intro') {
    body = `<div class="eyebrow">A gift for ${recipient}</div><h1>${title}</h1><p>Made with love by ${sender}.</p>
      ${isPreview ? `<div class="visual-button" aria-hidden="true">${envelope(gift.recipient || 'you', true)}</div><a class="btn ghost" href="#preview">Open full preview ↗</a>`
        : `${openButton('', 'Open surprise', 'gift-next')}${next('Open your surprise →')}`}`;
  } else if (item === 'cake') {
    body = `<h2>${state.candleOut ? `Happy birthday, <em>${recipient}!</em>` : 'Make a wish'}</h2>
      <div class="cake"><div class="plate"></div><div class="cake-body"></div><div class="frosting"></div><div class="candle"></div>${state.candleOut ? '' : '<div class="flame"></div><button type="button" data-action="candle" aria-label="Blow out the candle"></button>'}</div>
      ${state.candleOut ? next('Pop the balloons →') : '<button class="btn primary" data-action="candle" type="button">Blow out the candle</button>'}`;
  } else if (item === 'balloons') {
    body = `<h2>Pop the balloons</h2><p>A little message is tucked inside each one.</p>
      <div class="balloons">${defaults.map((_, index) => `<button type="button" class="balloon${state.popped.includes(index) ? ' popped' : ''}" data-pop="${index}" aria-label="Balloon ${index + 1}" aria-pressed="${state.popped.includes(index)}">${state.popped.includes(index) ? '✧' : index + 1}</button>`).join('')}</div>
      <div class="memory-list">${defaults.map((message, index) => state.popped.includes(index) ? `<div class="memory-line">${escapeHtml(gift.memories[index] || message)}</div>` : '').join('')}</div>
      ${next(state.popped.length === 3 ? 'Open the letter →' : 'Skip to the letter →', state.popped.length === 3 ? 'primary' : 'ghost')}`;
  } else if (item === 'envelope') {
    body = `<h2>A letter for <em>${recipient}</em></h2>${openButton(state.opened ? 'opened' : '', 'Unseal the letter', 'unseal')}<p>Tap the seal to open it.</p>`;
  } else if (item === 'letter') {
    body = `<article class="paper"><h3>Dear ${recipient},</h3><p>${escapeHtml(gift.message || 'I made this little surprise especially for you. I hope it makes you smile. ♡')}</p><p class="sign">With love, ${sender}</p></article>
      ${next(gift.template === 'memories' ? 'One last surprise →' : 'Open the memory book →')}`;
  } else if (item === 'book') {
    const pages = Math.max(3, gift.photos.length);
    const page = state.page;
    const words = [gift.title, 'Good times together', 'To more memories'];
    body = `<h2>Our memory book</h2><div class="book"><div class="spread"><div class="leaf"><h3>${escapeHtml(words[Math.min(page, 2)])}</h3><small>Made for ${recipient}</small></div>
      <div class="leaf">${gift.photos[page] ? `<img src="${gift.photos[page]}" alt="Memory photo ${page + 1}">` : '<span class="empty-photo" aria-hidden="true">♡</span>'}</div></div></div>
      <p>Page ${page + 1} of ${pages}</p>
      <div class="actions book-controls"><button class="btn ghost" data-page="-1"${page === 0 ? ' disabled' : ''}>← Previous</button>
      ${page + 1 < pages ? '<button class="btn primary" data-page="1">Next page →</button>' : next(stages[state.screen + 1] === 'envelope' ? 'Open the letter →' : 'One last surprise →')}</div>`;
  } else {
    body = `<div class="finale" aria-hidden="true">${gift.template === 'birthday' ? '🎉' : '💐'}</div>
      <h2>${gift.template === 'birthday' ? 'Happy birthday,' : 'This was for you,'}<br><em>${recipient} ♡</em></h2>
      <p>With love, ${sender}.</p><div class="actions"><button class="btn primary" data-action="replay">Open it again ↺</button>${nested || route() === 'preview' ? '' : '<a class="btn ghost" href="#create">Make your own gift ↗</a>'}</div>`;
  }
  const progress = stages.map((_, index) => `<span class="${index <= state.screen ? 'done' : ''}"></span>`).join('');
  const previewBody = item === 'book' ? body.replace(/data-page="(-?\d+)"/g, 'data-preview-page="$1"') : body;
  return `<section class="scene theme-${gift.theme}" aria-label="${isPreview ? 'Gift preview' : 'Gift'}">${stars()}${item === 'finale' ? stars('confetti', 35) : ''}
    <div class="scene-inner" tabindex="-1">${isPreview ? '' : `<div class="scene-progress" role="img" aria-label="Scene ${state.screen + 1} of ${stages.length}">${progress}</div>`}${isPreview && item !== 'intro'
      ? `${previewBody.replace(/<button\b([^>]*)>/g, (tag, attrs) => attrs.includes('data-preview-page=') ? `<button${attrs}>` : `<button${attrs} disabled tabindex="-1">`)}<a class="btn ghost" href="#preview">Open full preview ↗</a>`
      : body}</div></section>`;
}

let timelineGift = sampleGift();
function sharedGift() {
  try {
    if (nested) return cleanGift(nested, true);
    const hash = location.hash.slice(1);
    if (hash.startsWith('g=')) throw new Error('Hosted gift needs an API lookup');
    const encoded = hash.startsWith('gift=') ? hash.slice(5) : '';
    if (!encoded || encoded.length > 35000) throw new Error('Gift link is invalid or too long');
    const value = JSON.parse(decodeURIComponent(encoded));
    return value.theme === 'Midnight' || value.theme === 'Rose Glow' || value.theme === 'Golden Love' ? adaptLegacy(value) : cleanGift(value);
  } catch {
    rejectedShare = true;
    return sampleGift();
  }
}

async function loadHostedGift(token) {
  const endpoint = window.JOYW_CONFIG?.giftApiUrl;
  if (!endpoint) throw new Error('Hosted gifts are not configured for this deployment.');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', token }) });
  if (!response.ok) throw new Error('This gift link is unavailable or has expired.');
  const result = await response.json();
  return cleanGift(result.gift, true, true);
}

function render(view = route()) {
  document.body.classList.toggle('gift-only', ['gift', 'demo', 'preview'].includes(view));
  if (['gift', 'demo', 'preview'].includes(view)) {
    if (view === 'gift' && (rejectedShare || hostedPending)) {
      const content = hostedPending ? '<h1>Opening your surprise…</h1><p class="muted">Just a moment while your gift arrives.</p>' : '<h1>Gift link unavailable</h1><p class="muted">Ask the sender for a fresh link, or check that the gift has not been revoked.</p>';
      app.innerHTML = `${header('gift', true)}<main class="wrap subpage">${content}</main>`;
      return;
    }
    app.innerHTML = `${header(view, true)}<main id="main">${scene(timelineGift, timeline)}</main>`;
    return;
  }
  app.innerHTML = { home, create: editor, templates: gallery, gifts: myGifts, premium }[view]();
}

function showScene() {
  const main = document.querySelector('#main');
  main.innerHTML = scene(timelineGift, timeline);
  main.querySelector('.scene-inner').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function enter(view) {
  stopSound();
  timeline = freshTimeline();
  rejectedShare = false;
  hostedPending = false;
  const hash = location.hash.slice(1);
  if (view === 'gift' && hash.startsWith('g=')) {
    const token = hash.slice(2).split('&')[0];
    hostedPending = true;
    render(view);
    loadHostedGift(token).then((gift) => { timelineGift = gift; hostedPending = false; timeline = freshTimeline(); render('gift'); })
      .catch(() => { hostedPending = false; rejectedShare = true; render('gift'); });
    return;
  }
  if (view === 'gift') timelineGift = sharedGift();
  if (view === 'demo') timelineGift = sampleGift();
  if (view === 'preview') timelineGift = cleanGift(draft, true);
  const preset = location.hash.split('/')[1];
  if (view === 'create' && Object.hasOwn(templates, preset)) {
    draft = newGift(preset);
    previewStage = 'intro';
    step = 1;
    finalLink = '';
    history.replaceState(null, '', '#create');
  }
  render(view);
  window.scrollTo(0, 0);
}

function toastText(message) {
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ''; }, 3900);
}

function updatePreview() {
  const preview = document.querySelector('#live-preview');
  if (preview) preview.innerHTML = previewScene();
}

function updatePhotoStrip() {
  const strip = document.querySelector('#thumbnails');
  if (strip) strip.innerHTML = thumbnails();
}

async function resizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    const scale = Math.min(1, 960 / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff3e5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .74);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function addPhotos(input) {
  const target = draft;
  const files = [...input.files];
  const available = Math.max(0, 6 - target.photos.length);
  uploadPending = true;
  input.disabled = true;
  const submit = document.querySelector('#gift-form [type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const loaded = await Promise.allSettled(files.slice(0, available).map(resizePhoto));
    if (target !== draft) return;
    target.photos.push(...loaded.filter(({ status }) => status === 'fulfilled').map(({ value }) => value));
    updatePhotoStrip();
    updatePreview();
    if (files.length > available) toastText('Each gift can hold up to six photos.');
    else if (loaded.some(({ status }) => status === 'rejected')) toastText('Some photos could not be opened. Try JPEG or PNG.');
  } finally {
    uploadPending = false;
    input.value = '';
    input.disabled = false;
    if (submit) submit.disabled = false;
  }
}

function saveDraft() {
  const gift = cleanGift(draft, true);
  const records = [gift, ...savedGifts().filter((item) => item.id !== gift.id)];
  toastText(writeGifts(records) ? 'Saved to My gifts.' : 'Browser storage is full or unavailable. You can still download your gift.');
}

async function downloadGift() {
  try {
    let css;
    let javascript;
    if (window.JoyvelopeAndroid) {
      css = window.JoyvelopeAndroid.readAsset('styles.css');
      javascript = window.JoyvelopeAndroid.readAsset('app.js');
    } else {
      const sources = await Promise.all([fetch('./styles.css'), fetch('./app.js')]);
      if (sources.some((response) => !response.ok)) throw new Error('Could not read gift assets');
      [css, javascript] = await Promise.all(sources.map((response) => response.text()));
    }
    const json = JSON.stringify({ gift: cleanGift(draft, true) }).replace(/</g, '\\u003c');
    const code = javascript.replace(/<\/script/gi, '<\\/script');
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A gift from Joyvelope</title><style>${css}</style><body><div id="app"></div><div id="toast" role="status"></div><script>window.__JOYW_ENV=${json};\n${code}</script></body></html>`;
    if (window.JoyvelopeAndroid) {
      window.JoyvelopeAndroid.exportGift(html);
      toastText('Gift ready to share.');
      return;
    }
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Joyvelope-Gift.html';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toastText('Gift downloaded. Open the HTML file in a browser.');
  } catch {
    toastText('Gift export could not start. Please try again.');
  }
}

function stopSound() {
  if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
  audioContext = null;
}

function playNotes() {
  if (!audioContext || audioContext.state === 'closed') return;
  const notes = timelineGift.sound === 'sparkle' ? [523.25, 659.25, 783.99, 1046.5] : [261.63, 329.63, 392, 440, 392, 329.63];
  const now = audioContext.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const time = now + index * .28;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, time);
    gain.gain.exponentialRampToValueAtTime(.041, time + .035);
    gain.gain.exponentialRampToValueAtTime(.001, time + .57);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + .58);
  });
}

async function toggleSound(button) {
  if (timeline.sound) {
    timeline.sound = false;
    stopSound();
  } else {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioEngine();
      await audioContext.resume();
      timeline.sound = true;
      playNotes();
    } catch {
      stopSound();
      toastText('Sound is unavailable in this browser.');
    }
  }
  button.textContent = timeline.sound ? 'Sound on' : 'Sound off';
  button.setAttribute('aria-pressed', String(timeline.sound));
}

function advanceGift() {
  timeline.screen = Math.min(timeline.screen + 1, stagesFor(timelineGift).length - 1);
  if (timeline.sound) playNotes();
  showScene();
}

async function requestHosted(action, payload = {}) {
  const endpoint = window.JOYW_CONFIG?.giftApiUrl;
  if (!endpoint) throw new Error('Missing setup: JOYW_CONFIG.giftApiUrl (deployed Supabase Edge Function HTTPS URL).');
  const body = JSON.stringify({ action, ...payload });
  let status;
  let result;
  if (window.JoyvelopeAndroid) {
    const response = JSON.parse(window.JoyvelopeAndroid.postGiftRequest(endpoint, body));
    status = response.status;
    result = JSON.parse(response.body || '{}');
    if (response.error) throw new Error(response.error);
  } else {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    status = response.status;
    result = await response.json().catch(() => ({}));
  }
  if (status < 200 || status >= 300) throw new Error(result.error || `Supabase request failed (${status}).`);
  return result;
}

async function createHostedLink() {
  if (hostedPending) return;
  const missing = sharingSetupMessage();
  if (missing.length) {
    toastText(`Online sharing isn’t set up yet. Missing: ${missing.join('; ')}.`);
    return;
  }
  hostedPending = true;
  render();
  let revokeToken = '';
  try {
    const gift = cleanGift(draft, true);
    const result = await requestHosted('create', { gift: { ...gift, photos: [] }, photoCount: gift.photos.length });
    if (!result.token || !result.revokeToken) throw new Error('Supabase did not return a public gift token.');
    revokeToken = result.revokeToken;
    for (let index = 0; index < gift.photos.length; index += 1) {
      const uploaded = await requestHosted('upload', { revokeToken, index, photo: gift.photos[index] });
      if (!uploaded.ok) throw new Error(`Photo ${index + 1} could not be uploaded.`);
    }
    const recipientSite = publicRecipientSite();
    recipientSite.hash = 'g=' + encodeURIComponent(result.token);
    const sharedUrl = recipientSite.href;
    const records = hostedRecords();
    records[draft.id] = { token: revokeToken, url: sharedUrl };
    localStorage.setItem('joyvelope-hosted-management-v1', JSON.stringify(records));
    finalLink = sharedUrl;
    const resultPanel = document.querySelector('#share-result');
    resultPanel.querySelector('input').value = finalLink;
    resultPanel.hidden = false;
    if (window.JoyvelopeAndroid) window.JoyvelopeAndroid.shareText(finalLink);
    else if (navigator.share) await navigator.share({ title: 'A Joyvelope gift', text: 'Open your surprise:', url: finalLink });
    toastText('Gift published. Share the link to open the surprise.');
  } catch (error) {
    if (revokeToken) requestHosted('revoke', { revokeToken }).catch(() => {});
    toastText(error.message || 'Could not publish the gift.');
  } finally {
    hostedPending = false;
    render();
    const resultPanel = document.querySelector('#share-result');
    if (resultPanel && finalLink) {
      resultPanel.hidden = false;
      resultPanel.querySelector('input').value = finalLink;
    }
  }
}

async function copyLink() {
  const publicSite = publicRecipientSite();
  let sharedUrl;
  try {
    sharedUrl = new URL(finalLink);
  } catch {
    toastText('A public HTTPS recipient site is not configured.');
    return;
  }
  if (!publicSite || sharedUrl.protocol !== 'https:' || sharedUrl.hostname !== publicSite.hostname) {
    toastText('This is not a public HTTPS gift link.');
    return;
  }
  if (window.JoyvelopeAndroid) {
    window.JoyvelopeAndroid.copyText(finalLink);
    toastText('Surprise link copied.');
    return;
  }
  try {
    await navigator.clipboard.writeText(finalLink);
    toastText('Surprise link copied.');
  } catch {
    const output = document.querySelector('#share-url');
    output.focus();
    output.select();
    toastText('Link selected. Copy it from the field.');
  }
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { action, template, remove, edit, delete: deletion, page, pop } = button.dataset;
  const hostedCopyId = button.dataset.copyHosted;
  const hostedRevokeId = button.dataset.revokeHosted;
  if (template) {
    draft = { ...draft, template, title: templates[template].name, theme: templates[template].theme };
    previewStage = 'intro';
    previewPage = 0;
    render();
    app.querySelector(`[data-template="${template}"]`)?.focus();
  }
  if (remove !== undefined) {
    draft.photos.splice(Number(remove), 1);
    updatePhotoStrip();
    updatePreview();
    (document.querySelector('[data-remove]') || document.querySelector('#photos'))?.focus();
  }
  if (edit) {
    const gift = savedGifts().find((item) => item.id === edit);
    if (!gift) return;
    draft = gift;
    previewStage = 'intro';
    step = 1;
    finalLink = '';
    location.hash = 'create';
  }
  if (deletion && window.confirm('Delete this saved gift?')) {
    if (writeGifts(savedGifts().filter((item) => item.id !== deletion))) render();
    else toastText('The saved gift could not be deleted.');
  }
  if (hostedCopyId) {
    const record = hostedRecords()[hostedCopyId];
    if (record?.url) { finalLink = record.url; copyLink(); }
  }
  if (hostedRevokeId) {
    const record = hostedRecords()[hostedRevokeId];
    if (record?.token) requestHosted('revoke', { revokeToken: record.token }).then(() => {
      const records = hostedRecords(); delete records[hostedRevokeId]; localStorage.setItem('joyvelope-hosted-management-v1', JSON.stringify(records)); render('gifts'); toastText('Hosted link revoked.');
    }).catch((error) => toastText(error.message || 'Could not revoke this link.'));
  }
  if (button.dataset.previewPage !== undefined) {
    const pageCount = Math.max(3, draft.photos.length);
    const nextPage = Math.max(0, Math.min(pageCount - 1, previewPage + Number(button.dataset.previewPage)));
    if (nextPage === previewPage) return;
    const book = document.querySelector('#live-preview .book');
    if (book && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      book.classList.add('flipping');
      setTimeout(() => { previewPage = nextPage; updatePreview(); }, 260);
    } else {
      previewPage = nextPage;
      updatePreview();
    }
    return;
  }
  if (page && !button.disabled) {
    const before = timeline;
    const book = document.querySelector('.book');
    book.classList.add('flipping');
    document.querySelectorAll('[data-page]').forEach((item) => { item.disabled = true; });
    const changePage = () => {
      if (timeline !== before || !book.isConnected) return;
      timeline.page += Number(page);
      showScene();
    };
    setTimeout(changePage, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
  }
  if (pop !== undefined && !timeline.popped.includes(Number(pop))) {
    timeline.popped.push(Number(pop));
    if (timeline.sound) playNotes();
    showScene();
    document.querySelector(`[data-pop="${pop}"]`)?.focus();
  }
  switch (action) {
    case 'next-step': step = Math.min(2, step + 1); render(); break;
    case 'previous-step': step = Math.max(0, step - 1); render(); break;
    case 'save': saveDraft(); break;
    case 'hosted-link': createHostedLink(); break;
    case 'copy': copyLink(); break;
    case 'download': downloadGift(); break;
    default: break;
    case 'sound': toggleSound(button); break;
    case 'gift-next': advanceGift(); break;
    case 'candle': timeline.candleOut = true; if (timeline.sound) playNotes(); showScene(); break;
    case 'unseal': {
      if (timeline.opened) break;
      const before = timeline;
      timeline.opened = true;
      button.classList.add('opened');
      button.disabled = true;
      setTimeout(() => { if (timeline === before) advanceGift(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620);
      break;
    }
    case 'replay': {
      const sound = timeline.sound;
      timeline = { ...freshTimeline(), sound };
      showScene();
      break;
    }
  }
});

app.addEventListener('input', ({ target }) => {
  if (!target.closest('#gift-form') || target.type === 'file') return;
  const { name, value } = target;
  if (name.startsWith('memory-')) draft.memories[Number(name.slice(-1))] = value;
  else draft[name] = value;
  finalLink = '';
  updatePreview();
});

app.addEventListener('change', ({ target }) => {
  if (target.id === 'photos') addPhotos(target);
  if (target.id === 'preview-stage') {
    previewStage = target.value;
    updatePreview();
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id !== 'gift-form') return;
  event.preventDefault();
  if (uploadPending) return;
  if (!draft.recipient.trim()) {
    const name = document.querySelector('#recipient');
    name.value = '';
    name.reportValidity();
    return;
  }
  draft = cleanGift(draft, true);
  step = 2;
  render();
  window.scrollTo(0, 0);
});

window.addEventListener('hashchange', () => enter(route()));
enter(startingView);
if (!nested && 'serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
