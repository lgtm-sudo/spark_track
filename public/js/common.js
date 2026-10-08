/* MindSpark — shared helpers: storage, voice in/out, nav, settings */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const Store = {
  get(k, d = null) { try { const v = localStorage.getItem('ms_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ms_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('ms_' + k); } catch (e) {} }
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/* tiny markdown: ```code```, `code`, **bold**, paragraphs */
function fmt(s) {
  let t = esc(s);
  t = t.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (m, c) => `\n\n<pre><code>${c.replace(/\n$/, '')}</code></pre>\n\n`);
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => p.startsWith('<pre>') ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}
function cap(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------- Voice output (text-to-speech) ---------- */
const Voice = {
  enabled: Store.get('voice', false),
  synth: window.speechSynthesis || null,
  onState: null,
  clean(t) {
    return String(t).replace(/<[^>]+>/g, ' ').replace(/[`*#_]/g, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/\s+/g, ' ').trim();
  },
  pickVoice() {
    if (!this.synth) return null;
    const vs = this.synth.getVoices();
    return vs.find(v => /en/i.test(v.lang) && /(female|samantha|zira|aria|jenny|google uk english female|veena|heera)/i.test(v.name))
      || vs.find(v => /en[-_]IN/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  },
  speak(text, onend) {
    if (!this.enabled || !this.synth) { onend && onend(); return; }
    this.synth.cancel();
    const u = new SpeechSynthesisUtterance(this.clean(text));
    const v = this.pickVoice(); if (v) u.voice = v;
    u.rate = 1.02; u.pitch = 1.05;
    u.onstart = () => this.onState && this.onState(true);
    u.onend = u.onerror = () => { this.onState && this.onState(false); onend && onend(); };
    this.synth.speak(u);
  },
  stop() { if (this.synth) this.synth.cancel(); this.onState && this.onState(false); },
  toggle() {
    this.enabled = !this.enabled; Store.set('voice', this.enabled);
    if (!this.enabled) this.stop();
    updateVoiceBtn(); return this.enabled;
  },
  set(on) { if (this.enabled !== on) this.toggle(); }
};
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};

/* ---------- Voice input (speech-to-text) ---------- */
const Listen = {
  SR: window.SpeechRecognition || window.webkitSpeechRecognition,
  get supported() { return !!this.SR; },
  rec: null,
  start(onText, onEnd) {
    if (!this.SR) { toast('Voice input is not supported in this browser — try Chrome.'); onEnd && onEnd(); return; }
    Voice.stop();
    const r = new this.SR();
    r.lang = navigator.language || 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = e => onText(e.results[0][0].transcript);
    r.onerror = e => { if (e.error === 'not-allowed') toast('Microphone blocked. Allow mic access, or run the site from localhost.'); };
    r.onend = () => { this.rec = null; onEnd && onEnd(); };
    this.rec = r; r.start();
  },
  stop() { if (this.rec) this.rec.stop(); }
};
function wireMic(btn, onText) {
  if (!btn) return;
  if (!Listen.supported) { btn.style.display = 'none'; return; }
  btn.onclick = () => {
    if (Listen.rec) { Listen.stop(); return; }
    btn.classList.add('rec'); btn.textContent = '■';
    Listen.start(onText, () => { btn.classList.remove('rec'); btn.textContent = '🎙'; });
  };
}

/* match a typed / spoken answer to an option */
function matchOption(text, list) {
  const t = text.toLowerCase();
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s+]/gu, '').trim();
  return list.find(([v, l]) => t === String(v).toLowerCase() || norm(l) === norm(t))
    || list.find(([v, l]) => norm(l).split(/\s+/).filter(w => w.length > 3).some(w => t.includes(w)))
    || list.find(([v]) => String(v).length > 2 && t.includes(String(v).toLowerCase()))
    || null;
}


const ok = r => !!(r && !r.error);

/* ---------- toast ---------- */
function toast(msg, ms = 2600) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- nav ---------- */
function renderNav(step) {
  const names = ['Home', 'Talk', 'Learn', 'Quiz'];
  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = `<div class="container nav-in">
    <a href="index.html" class="logo"><span class="logo-orb" aria-hidden="true"></span>MindSpark</a>
    <nav class="journey" aria-label="Your progress">${names.map((n, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}. ${n}</span>`).join('<i>/</i>')}</nav>
    <div class="nav-actions">
      <a class="icon-btn" href="memory.html" title="See what Nova remembers">🧠<span class="lbl">Memory</span></a>
      <button class="icon-btn" id="voiceBtn" aria-pressed="false"></button>
      <button class="icon-btn" id="settingsBtn">⚙<span class="lbl">Settings</span></button>
    </div></div>`;
  document.body.prepend(nav);
  $('#voiceBtn').onclick = () => { Voice.toggle(); toast(Voice.enabled ? 'Nova will speak out loud' : 'Voice off — Nova will only type'); };
  $('#settingsBtn').onclick = openSettings;
  updateVoiceBtn();
  if (Store.get('lite', false)) document.body.classList.add('lite');
}
function updateVoiceBtn() {
  const b = $('#voiceBtn'); if (!b) return;
  b.classList.toggle('active', Voice.enabled);
  b.setAttribute('aria-pressed', Voice.enabled);
  b.innerHTML = Voice.enabled ? '🔊<span class="lbl">Voice on</span>' : '🔇<span class="lbl">Voice off</span>';
  b.title = Voice.enabled ? 'Turn Nova\'s voice off' : 'Let Nova speak out loud';
}

/* ---------- settings modal ---------- */
function openSettings() {
  let m = $('#settingsModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'settingsModal'; m.className = 'modal-back';
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <h3 id="setTitle">Settings</h3>
      <p id="setBackend" style="font-size:.92rem;margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid var(--line)"></p>
      <p class="muted" style="font-size:.92rem">With the server running, AI keys live in the server's <code>.env</code> file. The key below is only used when the server is off (browser-only mode).</p>
      <div class="field"><label for="setKey">Gemini API key (optional)</label>
        <input type="password" id="setKey" placeholder="Paste key here" autocomplete="off">
        <small>Free key: aistudio.google.com → Get API key. Stored only in this browser.</small></div>
      <div class="field"><label for="setModel">Model name</label>
        <input type="text" id="setModel" placeholder="gemini-2.5-flash"></div>
      <div class="field"><label class="switch"><input type="checkbox" id="setLite"> Lite mode (slow internet / older phones)</label>
        <small>Turns off animations and effects. Everything else keeps working.</small></div>
      <div class="field"><label class="switch"><input type="checkbox" id="setVoice"> Nova speaks out loud</label></div>
      <div class="modal-actions">
        <button class="btn btn-g" id="setReset">Start fresh</button>
        <button class="btn btn-g" id="setCancel">Cancel</button>
        <button class="btn btn-p" id="setSave">Save</button>
      </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
    $('#setCancel').onclick = () => m.classList.remove('show');
    $('#setSave').onclick = () => {
      Store.set('apiKey', $('#setKey').value.trim());
      Store.set('model', $('#setModel').value.trim() || 'gemini-2.5-flash');
      Store.set('lite', $('#setLite').checked);
      document.body.classList.toggle('lite', $('#setLite').checked);
      Voice.set($('#setVoice').checked);
      m.classList.remove('show'); toast('Settings saved');
      document.dispatchEvent(new CustomEvent('settings-saved'));
    };
    $('#setReset').onclick = () => {
      ['profile', 'lesson', 'metrics', 'mentorLog', 'quizResult', 'preTopic'].forEach(k => Store.del(k));
      location.href = 'index.html';
    };
  }
  const bs = $('#setBackend');
  if (typeof Backend !== 'undefined' && Backend.online) {
    const prov = (Backend.health.llm || []).filter(p => p.configured).map(p => p.name);
    bs.innerHTML = `✅ Server connected. Agents share memory. AI: <b>${prov.length ? esc(prov.join(' → ')) : 'none — offline library + heuristic memory'}</b>`;
  } else bs.innerHTML = '⚪ Server not running — browser-only mode. Run <code>npm start</code> for shared memory.';
  $('#setKey').value = Store.get('apiKey', '');
  $('#setModel').value = Store.get('model', 'gemini-2.5-flash');
  $('#setLite').checked = Store.get('lite', false);
  $('#setVoice').checked = Voice.enabled;
  m.classList.add('show');
  $('#setKey').focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = $('#settingsModal'); if (m) m.classList.remove('show'); } });

/* ---------- profile vocabulary (shared by all pages) ---------- */
const OPT = {
  mood: [['excited', '😃', 'Excited'], ['curious', '🤔', 'Curious'], ['bored', '😴', 'Bored'], ['tired', '😩', 'Tired'], ['stressed', '😰', 'Stressed']],
  level: [['new', '🌱', 'Never heard of it'], ['little', '🌿', 'I know a little'], ['decent', '🌳', 'Pretty decent'], ['pro', '🚀', 'Challenge me']],
  style: [['visual', '🎨', 'Show me visuals'], ['story', '📖', 'Tell me a story'], ['steps', '🪜', 'Step by step'], ['hands', '🛠', 'Let me try it']],
  goal: [['exam', '📝', 'Exam or test'], ['homework', '📚', 'Homework'], ['curious', '✨', 'Just curious'], ['real', '🌍', 'Real-life use']],
  time: [['5', '⚡', '5 minutes'], ['15', '⏱', '15 minutes'], ['30', '🧘', '30+ minutes']],
  setup: [['good', '📶', 'Good internet'], ['slow', '🐢', 'Slow internet'], ['shared', '📱', 'Shared or old phone']]
};
function optLabel(group, val) { const o = (OPT[group] || []).find(x => x[0] === val); return o ? `${o[1]} ${o[2]}` : (val || '—'); }

/* what Nova will change, based on the profile */
function describePlan(p) {
  const out = [];
  const style = { visual: 'Diagrams and flows come first, because you think in pictures.', story: 'Starts with a story — narratives stick better than facts for you.', steps: 'Broken into clear numbered steps, nothing skipped.', hands: 'A try-it-yourself activity comes early, so you learn by doing.' };
  out.push(style[p.style] || style.steps);
  if (p.mood === 'bored' || p.mood === 'tired') out.push('Opens with a surprising hook and keeps every section short.');
  if (p.mood === 'stressed') out.push('Calm pace, small chunks, and you can ask me anything at any time.');
  if (p.mood === 'excited' || p.mood === 'curious') out.push('Extra fun facts and a challenge round to feed that energy.');
  if (p.level === 'new') out.push('Zero jargon without an explanation first.');
  if (p.level === 'decent' || p.level === 'pro') out.push('Includes a "going deeper" section with the harder ideas.');
  if (p.goal === 'exam') out.push('Exam tips and common traps included.');
  if (p.goal === 'real') out.push('Shows where this appears in everyday life.');
  out.push(`Sized for about ${p.time === '30' ? '30+' : p.time} minutes.`);
  if (p.setup === 'slow' || p.setup === 'shared') out.push('Lite mode is on, so it runs smoothly on your connection.');
  return out;
}
