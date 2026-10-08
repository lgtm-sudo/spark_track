/* MindSpark — Learn page: personalised lesson + Nova, the 1-to-1 mentor agent */
renderNav(2);

const P = Store.get('profile');
if (!P) location.replace('talk.html');

let T = null;
const M = Object.assign({ start: Date.now(), checkins: 0, confusions: [], bored: 0, distracted: 0, questions: 0, gotIt: [], confidence: [], styleSwitches: 0, idle: 0, away: 0, skim: 0 }, Store.get('metrics', {}));
const saveM = () => Store.set('metrics', M);
let LOG = Store.get('mentorLog', []);
let sectionKeys = [];
let ADAPT = { extraSections: [], notes: [] }; // from the tutor agent (memory-based)
let started = false, startedAt = 0, lastRegular = 0, skimDone = false, awayAt = 0, sprintTimer = null;

/* ---------- section catalogue ---------- */
const STYLE_SEC = { visual: 'diagram', story: 'story', steps: 'steps', hands: 'activity' };
const STYLE_NAME = { visual: 'visual', story: 'story', steps: 'step-by-step', hands: 'hands-on' };
const flowHTML = nodes => `<div class="flow">${nodes.map(n => `<div class="node">${esc(n)}</div>`).join('<div class="arrow" aria-hidden="true">→</div>')}</div>`;
const stepsHTML = steps => `<ol class="steps">${steps.map(s => `<li>${fmt(s).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ol>`;
const listHTML = arr => `<ul class="dotlist">${arr.map(s => `<li>${fmt(s).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>`;

const SEC = {
  hook: { icon: '🤯', title: 'Wait, what?', body: t => t.hook && `<p class="hook">${esc(t.hook)}</p>${t.funFact ? `<div class="fact"><b>Fun fact:</b> ${esc(t.funFact)}</div>` : ''}` },
  simple: { icon: '💡', title: 'The big idea', body: t => t.simple.map(fmt).join('') },
  diagram: { icon: '🎨', title: 'See it', body: t => t.diagram.length && flowHTML(t.diagram) + '<p class="muted" style="margin-top:12px">Follow the arrows from left to right.</p>' },
  story: { icon: '📖', title: 'Story time', body: t => t.story && fmt(t.story) },
  steps: { icon: '🪜', title: 'Step by step', body: t => t.steps.length && stepsHTML(t.steps) },
  activity: { icon: '🛠', title: 'Try it yourself', body: t => t.activity && fmt(t.activity) },
  realLife: { icon: '🌍', title: 'Where you\'ll see this', body: t => t.realLife.length && listHTML(t.realLife) },
  deep: { icon: '🔬', title: 'Going deeper', body: t => t.deep.length && t.deep.map(fmt).join('') },
  terms: { icon: '🔑', title: 'Key words', body: t => Object.keys(t.keyTerms).length && `<div class="terms">${Object.entries(t.keyTerms).map(([k, v]) => `<button class="term" type="button"><b>${esc(k)}</b><small>Tap to reveal</small><span>${esc(v)}</span></button>`).join('')}</div>` },
  exam: { icon: '📝', title: 'Exam tips and traps', body: t => t.examTips.length && listHTML(t.examTips) },
  challenge: { icon: '🔥', title: 'Challenge round', body: t => t.challenge && fmt(t.challenge) }
};

function plan(p) {
  const s = [];
  const t = +p.time || 15;
  const primary = STYLE_SEC[p.style] || 'steps';
  const others = ['diagram', 'story', 'steps', 'activity'].filter(x => x !== primary);
  if (['bored', 'tired', 'curious', 'excited'].includes(p.mood) || p.goal === 'curious') s.push('hook');
  s.push('simple', primary);
  if (t >= 15) s.push(others[0]);
  if (p.goal === 'real' || t >= 15) s.push('realLife');
  if (t >= 30) s.push(...others);
  if (p.level === 'decent' || p.level === 'pro' || t >= 30) s.push('deep');
  s.push('terms');
  if (p.goal === 'exam') s.push('exam');
  if (p.level === 'pro' || ['excited', 'bored', 'curious'].includes(p.mood) || t >= 30) s.push('challenge');
  (ADAPT.extraSections || []).forEach(k => { if (SEC[k] && !s.includes(k)) s.splice(Math.max(2, s.indexOf('terms')), 0, k); });
  return [...new Set(s)];
}

/* ---------- lesson rendering ---------- */
function renderLesson() {
  sectionKeys = plan(P).filter(k => SEC[k].body(T));
  const essential = new Set(['hook', 'simple', 'terms', STYLE_SEC[P.style]]);
  const badges = ['mood', 'level', 'style', 'goal', 'time', 'setup'].map(k => `<span class="badge">${esc(optLabel(k, P[k]))}</span>`).join('');
  const why = describePlan(P).slice(0, 2).join(' ');
  $('#lesson').innerHTML = `
    <div class="lesson-head">
      <span class="badge">${esc(T.emoji)} ${esc(T.subject)}</span>
      <h1>${esc(T.title)}</h1>
      <p class="intro">Built for ${esc(P.name)}. ${esc(why)}${ADAPT.notes && ADAPT.notes.length ? ' ' + esc(ADAPT.notes.join(' ')) : ''}</p>
      <div class="badges">${badges}</div>
    </div>
    <div class="progress-line" style="margin:18px 0 0"><i id="prog"></i></div>
    ${sectionKeys.map(k => secHTML(k, !essential.has(k))).join('')}
    <div class="ready-box">
      <h3>Feeling ready?</h3>
      <p>Five questions that adapt to you. Hints are there if you need them.</p>
      <button class="btn btn-p" id="readyBtn">I'm ready for the quiz</button>
    </div>`;
  M.gotIt.forEach(k => { const s = $('#sec-' + k); if (s) { s.classList.add('done'); const b = $(`[data-act="got"][data-k="${k}"]`, s); if (b) { b.classList.add('ok'); b.textContent = '✓ Done'; } } });
  $('#readyBtn').onclick = () => { if (Mentor.isOpen) Mentor.close(); Mentor.open('ready'); flowReady(); };
  updateStats();
}
function secHTML(k, optional) {
  const s = SEC[k];
  const foot = k === 'challenge'
    ? `<button class="mini" data-act="challenge">🔥 Answer the challenge with Nova</button>`
    : `<button class="mini" data-act="got" data-k="${k}">✓ Got it</button>
       <button class="mini" data-act="confused" data-k="${k}">😕 This is confusing</button>
       <button class="mini" data-act="another" data-k="${k}">🔄 Explain another way</button>`;
  return `<section class="sec" id="sec-${k}" data-k="${k}" data-optional="${optional ? 1 : 0}">
    <h2><span aria-hidden="true">${s.icon}</span>${s.title}</h2>${s.body(T)}
    <div class="sec-foot">${foot}</div></section>`;
}

$('#lesson').addEventListener('click', e => {
  const term = e.target.closest('.term');
  if (term) { term.classList.toggle('open'); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const k = b.dataset.k;
  if (b.dataset.act === 'got') markGot(k, true);
  if (b.dataset.act === 'confused') { reopen('confused'); flowLost(k); }
  if (b.dataset.act === 'another') { reopen('another'); howStudy(k); }
  if (b.dataset.act === 'challenge') { reopen('challenge'); flowChallenge(); }
});

function markGot(k, fromButton) {
  if (!k || !SEC[k]) return;
  if (!M.gotIt.includes(k)) { M.gotIt.push(k); Backend.track('section.gotit', { section: SEC[k].title, topic: T.title }); }
  saveM();
  const s = $('#sec-' + k);
  if (s) { s.classList.add('done'); const b = $(`[data-act="got"][data-k="${k}"]`, s); if (b) { b.classList.add('ok'); b.textContent = '✓ Done'; } }
  updateStats();
  const need = sectionKeys.filter(x => x !== 'challenge');
  if (fromButton && need.every(x => M.gotIt.includes(x)) && !Mentor.isOpen) {
    setTimeout(() => { Mentor.open('ready'); flowReady(); }, 500);
  }
}
function focusSec(k) {
  $$('.sec.focus').forEach(s => s.classList.remove('focus'));
  const s = $('#sec-' + k);
  if (s) { s.classList.add('focus'); s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

/* ---------- stats sidebar ---------- */
let moodNow = 'Settling in';
function setMood(m) { moodNow = m; updateStats(); }
function updateStats() {
  const need = sectionKeys.filter(x => x !== 'challenge');
  const done = need.filter(k => M.gotIt.includes(k)).length;
  if ($('#prog')) $('#prog').style.width = (need.length ? done / need.length * 100 : 0) + '%';
  $('#stDone').textContent = `${done} / ${need.length}`;
  $('#stCheck').textContent = M.checkins;
  $('#stMood').textContent = moodNow;
  let e = 50 + done * 7 + M.questions * 4 + M.styleSwitches * 3 - M.bored * 5 - M.distracted * 5 - M.idle * 4 - M.away * 3;
  e = Math.max(5, Math.min(100, e));
  $('#engMeter').style.width = e + '%';
  $('#engPct').textContent = e + '%';
}

/* ---------- mentor log ---------- */
function log(who, text, trig) {
  LOG.push({ who, text: String(text).replace(/\*\*/g, '').slice(0, 220), trig, t: Date.now() });
  Backend.track('mentor.message', { who, text: String(text).slice(0, 300), trigger: trig });
  Store.set('mentorLog', LOG);
  renderLog();
}
function renderLog() {
  const el = $('#log');
  if (!LOG.length) return;
  el.innerHTML = LOG.map(l => `<div class="log-item ${l.who}"><small>${l.who === 'nova' ? 'Nova asked' : 'You said'}${l.trig ? ' · ' + esc(l.trig) : ''} · ${new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${esc(l.text)}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

/* ---------- Nova: the mentor popup ---------- */
const TRIG = { start: 'Welcome', timer: 'Regular check-in', idle: 'You went quiet', away: 'You came back', skim: 'You scrolled fast', confused: 'You flagged confusion', another: 'Another way', manual: 'You called Nova', ready: 'Before the quiz', sprint: 'Focus sprint done', challenge: 'Challenge round' };
const pop = $('#pop'), popBody = $('#popBody'), popOpts = $('#popOpts'), dim = $('#dim');

const Mentor = {
  isOpen: false, lastClosed: 0, auto: 0, handler: null, freeCb: null, trig: '', ctx: null, busy: 0,
  open(trigger) {
    if (!this.isOpen) popBody.innerHTML = '';
    this.isOpen = true; this.trig = TRIG[trigger] || 'Your mentor';
    $('#popTrig').textContent = this.trig;
    pop.classList.add('show'); dim.classList.add('show');
    M.checkins++; saveM(); updateStats();
  },
  close() {
    this.isOpen = false; this.handler = null; this.freeCb = null;
    pop.classList.remove('show'); dim.classList.remove('show');
    popOpts.innerHTML = ''; this.lastClosed = Date.now();
    Voice.stop();
    $$('.sec.focus').forEach(s => s.classList.remove('focus'));
  },
  bubble(who, html) {
    const d = document.createElement('div');
    d.className = 'msg ' + (who === 'nova' ? 'ai' : 'user');
    d.innerHTML = who === 'nova' ? `<div class="av" aria-hidden="true"></div><div class="bubble">${html}</div>` : `<div class="bubble">${html}</div>`;
    popBody.appendChild(d); popBody.scrollTop = popBody.scrollHeight;
    return d;
  },
  say(text, opts, cb, html) {
    popOpts.innerHTML = ''; this.handler = null;
    const myTurn = ++this.busy;
    const t = this.bubble('nova', '<span class="dots"><i></i><i></i><i></i></span>');
    setTimeout(() => {
      if (myTurn !== this.busy) { t.remove(); return; }
      t.remove();
      this.bubble('nova', html || fmt(text));
      log('nova', text, this.trig);
      Voice.speak(text);
      if (opts) this.options(opts, cb);
    }, Store.get('lite', false) ? 120 : 550);
  },
  options(list, cb) {
    this.handler = { list, cb };
    popOpts.innerHTML = '';
    list.forEach(([v, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.textContent = label;
      b.onclick = () => this.choose(v, label);
      popOpts.appendChild(b);
    });
  },
  choose(v, label) {
    if (!this.handler) return;
    const cb = this.handler.cb;
    this.handler = null; popOpts.innerHTML = '';
    this.user(label);
    if (v === 'close') { setTimeout(() => this.close(), 250); return; }
    cb && cb(v, label);
  },
  user(text) { this.bubble('you', esc(text)); log('you', text, this.trig); }
};

function submitPop() {
  const inpEl = $('#popInput');
  const text = inpEl.value.trim();
  if (!text) return;
  inpEl.value = '';
  if (Mentor.handler && text.split(/\s+/).length <= 4) {
    const m = matchOption(text, Mentor.handler.list);
    if (m) { Mentor.choose(m[0], m[1]); return; }
  }
  Mentor.handler = null; popOpts.innerHTML = '';
  Mentor.user(text);
  const cb = Mentor.freeCb || (q => answerQ(q, Mentor.ctx));
  Mentor.freeCb = null;
  cb(text);
}
$('#popForm').addEventListener('submit', e => { e.preventDefault(); submitPop(); });
wireMic($('#popMic'), t => { $('#popInput').value = t; submitPop(); });
$('#popClose').onclick = () => Mentor.close();
dim.onclick = () => Mentor.close();
$('#orb').onclick = () => Mentor.isOpen ? Mentor.close() : checkIn('manual');
Voice.onState = on => $('#orb').classList.toggle('speaking', on);
function reopen(trigger) { if (Mentor.isOpen) Mentor.close(); Mentor.open(trigger); Backend.track('mentor.trigger', { trigger }); }

/* ---------- conversation flows ---------- */
const MAIN_OPTS = [['good', '👍 Following along'], ['lost', '😕 Something\'s not clicking'], ['bored', '😴 Not interested'], ['distracted', '📱 Got distracted'], ['ask', '💬 I have a question']];

async function checkIn(trigger) {
  if (Mentor.isOpen) Mentor.close();
  Mentor.open(trigger);
  Backend.track('mentor.trigger', { trigger });
  const n = P.name;
  const typing = Mentor.bubble('nova', '<span class="dots"><i></i><i></i><i></i></span>');
  const g = Backend.online ? await Backend.agent('mentor', { action: 'checkin', trigger }, 2500) : null;
  typing.remove();
  if (ok(g) && g.text) { Mentor.say(g.text, trigger === 'skim' ? [['know', '😎 I already know this'], ['bored', '😴 It\'s not grabbing me'], ['lost', '😕 Honestly, I\'m lost']] : MAIN_OPTS, route); return; }
  if (trigger === 'skim') {
    Mentor.say(`Whoa, that was fast, ${n}! 🏎️ Are you skimming because you already know this, or because it's not grabbing you?`,
      [['know', '😎 I already know this'], ['bored', '😴 It\'s not grabbing me'], ['lost', '😕 Honestly, I\'m lost']], route);
    return;
  }
  const Q = {
    timer: `Hey ${n}, quick check-in 👋 What are you doing right now, and how is it going?`,
    idle: `You've gone a bit quiet, ${n}… still with me? Is something not going through?`,
    away: `Welcome back! 👀 Something pulled you away — is the topic not interesting, or was it just a distraction?`,
    manual: `Hey ${n}, I'm right here. What do you need?`
  };
  Mentor.say(Q[trigger] || Q.timer, MAIN_OPTS, route);
}

function route(v) {
  ({ good: flowGood, lost: () => flowLost(), bored: flowBored, distracted: flowDistracted, ask: () => flowAsk(), know: flowKnow, challenge: flowChallenge, quiz: () => { Mentor.trig = TRIG.ready; flowReady(); } }[v] || (() => Mentor.close()))();
}

function flowGood() {
  setMood('Focused'); Backend.track('mood.signal', { mood: 'focused' });
  Mentor.say(`Love that! Quick pulse check — how confident do you feel about ${T.title} right now?`,
    [['1', '😬 1'], ['2', '😕 2'], ['3', '🙂 3'], ['4', '😃 4'], ['5', '🤩 5']], v => {
      M.confidence.push(+v); saveM(); Backend.track('confidence', { value: +v });
      if (+v <= 2) Mentor.say('Thanks for being honest — low confidence early on is completely normal. Want me to explain the trickiest part more simply?', [['lost', '🙏 Yes, simplify it'], ['close', '📖 No, I\'ll keep reading']], route);
      else Mentor.say(+v >= 4 ? 'That\'s what I like to hear. Keep going — I\'ll check back later. 💜' : 'Solid. Keep going, and tap my orb if anything feels fuzzy.', [['close', '📖 Back to the lesson']]);
    });
}

function flowLost(k) {
  setMood('Needs help');
  if (k) return explain(k);
  const list = sectionKeys.filter(x => !['hook', 'challenge'].includes(x)).map(x => [x, `${SEC[x].icon} ${SEC[x].title}`]);
  list.push(['all', '🤷 Honestly, all of it']);
  Mentor.say('No worries — that\'s exactly what I\'m here for. Tell me, which part isn\'t going through?', list, v => explain(v === 'all' ? 'simple' : v));
}

function explain(k) {
  Mentor.ctx = k;
  if (!M.confusions.includes(k)) M.confusions.push(k);
  Backend.track('section.confused', { section: SEC[k].title, topic: T.title });
  saveM(); focusSec(k);
  const e = (T.eli5 && T.eli5[k]) || (T.eli5 && T.eli5.simple) || T.simple[0];
  Mentor.say(`Let me put "${SEC[k].title}" really simply:\n\n${e}`, [['yes', '✅ Got it now'], ['no', '❌ Still confusing']], v => {
    if (v === 'yes') { markGot(k); setMood('Back on track'); Mentor.say('Yes! 🎉 That\'s the click. Keep going — you\'re doing great.', [['close', '📖 Back to the lesson']]); }
    else howStudy(k);
  });
}

function altContent(style) {
  if (style === 'story') return { text: T.story, html: fmt(T.story) };
  if (style === 'diagram') return { text: 'Here it is as a picture: ' + T.diagram.join(', then '), html: '<p>Here it is as a picture:</p>' + flowHTML(T.diagram) };
  if (style === 'steps') return { text: 'Here it is in small steps. ' + T.steps.join(' '), html: stepsHTML(T.steps) };
  return { text: 'Try this: ' + T.activity, html: fmt(T.activity) };
}

function howStudy(k) {
  Mentor.ctx = k || Mentor.ctx;
  setMood('Trying another way');
  Mentor.say('Okay, let\'s try a completely different angle. How do you want to study this?',
    [['story', '📖 As a story'], ['diagram', '🎨 As a picture'], ['steps', '🪜 In small steps'], ['activity', '🛠 Let me try it'], ['ask', '💬 Let me type my exact doubt']], v => {
      if (v === 'ask') return flowAsk(k);
      M.styleSwitches++; saveM(); updateStats();
      Backend.track('style.switch', { style: v, section: k ? SEC[k].title : null });
      const c = altContent(v);
      Mentor.say(c.text, null, null, c.html);
      setTimeout(() => Mentor.say('Did that help?', [['yes', '✅ That helped'], ['no', '❌ Still stuck']], r => {
        if (r === 'yes') { if (k) markGot(k); setMood('Back on track'); Backend.track('style.helped', { style: v }); Mentor.say(`Great. Want me to rebuild the whole lesson in ${({ story: 'story', diagram: 'visual', steps: 'step-by-step', activity: 'hands-on' })[v]} mode?`, [['rebuild', '🔄 Yes, rebuild it'], ['close', '📖 No, this is fine']], x => { if (x === 'rebuild') rebuild({ story: 'story', diagram: 'visual', steps: 'steps', activity: 'hands' }[v]); }); }
        else flowAsk(k, true);
      }), 900);
    });
}

function rebuild(style) {
  P.style = style; Store.set('profile', P);
  Backend.track('style.switch', { style, rebuilt: true });
  renderLesson();
  Mentor.say(`Done — your lesson is now in ${STYLE_NAME[style]} mode. I moved that section to the top for you.`, [['close', '📖 Show me']]);
}

function flowBored() {
  M.bored++; saveM(); setMood('Bored'); Backend.track('mood.signal', { mood: 'bored' });
  Mentor.say('Thanks for being honest 💜 Boredom just means the lesson isn\'t fitting you yet. What would make it more interesting?',
    [['challenge', '🔥 Give me a challenge'], ['fact', '🤯 Blow my mind'], ['real', '🌍 Why does this matter?'], ['short', '⚡ Make it shorter'], ['style', '🔄 Teach it differently']], v => {
      if (v === 'challenge') return flowChallenge();
      if (v === 'fact') return Mentor.say(`Here's one: ${T.funFact || T.hook}`, [['challenge', '🔥 Now challenge me'], ['close', '📖 Okay, back to it']], route);
      if (v === 'real') return Mentor.say('This shows up everywhere:', [['close', '📖 Okay, that\'s cool']], null, '<p>This shows up everywhere:</p>' + listHTML(T.realLife));
      if (v === 'short') {
        $('#lesson').classList.add('compact');
        return Mentor.say('Done — I hid the extras and kept only the essentials. Shorter beats skipped. You can always ask me for more.', [['close', '📖 Show me']]);
      }
      Mentor.say('Pick a style and I\'ll rebuild the whole lesson that way:', OPT.style.filter(o => o[0] !== P.style).map(([s, e, l]) => [s, `${e} ${l}`]), s => { M.styleSwitches++; saveM(); rebuild(s); });
    });
}

function flowChallenge() {
  setMood('Challenged');
  focusSec('challenge');
  Mentor.say(`Challenge time 🔥\n\n${T.challenge}\n\nType your thinking below — there are no wrong answers, I just want to see how you think.`);
  setTimeout(() => $('#popInput').focus(), 600);
  Mentor.freeCb = async attempt => {
    const t = Mentor.bubble('nova', '<span class="dots"><i></i><i></i><i></i></span>');
    const r = await Backend.agent('mentor', { action: 'challenge', attempt }, 25000);
    const reply = ok(r) ? r.text : await AI.evaluateChallenge(attempt, T, P);
    t.remove();
    Mentor.say(reply, [['close', '📖 Back to the lesson'], ['quiz', '📝 Take the quiz']], route);
  };
}

function flowDistracted() {
  M.distracted++; saveM(); setMood('Distracted'); Backend.track('mood.signal', { mood: 'distracted' });
  Mentor.say('Happens to everyone — no judgement. Let\'s try a 2-minute focus sprint: just the next section, nothing else. I\'ll check back when it\'s done.',
    [['sprint', '🚀 Start the sprint'], ['break', '☕ I need a short break']], v => {
      if (v === 'break') return Mentor.say('Take five. Stretch, drink some water. I\'ll be right here when you\'re back. 💜', [['close', '👍 Okay']]);
      Mentor.close(); toast('Focus sprint: 2 minutes. Go!');
      clearTimeout(sprintTimer);
      sprintTimer = setTimeout(() => {
        if (Mentor.isOpen) Mentor.close();
        Mentor.open('sprint');
        Mentor.say('Sprint done! ⏱ How did that feel?', [['good', '💪 Focused'], ['lost', '😕 Still confusing'], ['distracted', '📱 Still distracted']], route);
      }, 120000);
    });
}

function flowAsk(k, stuck) {
  Mentor.ctx = k || Mentor.ctx;
  Mentor.say(stuck
    ? 'Let\'s get to the bottom of it. Tell me exactly which word or step is confusing — I can clear that.'
    : `Ask me anything about ${T.title}. What don't you understand? Tell me — I can clear that.`);
  setTimeout(() => $('#popInput').focus(), 600);
  Mentor.freeCb = q => answerQ(q, k);
}

async function answerQ(q, k) {
  M.questions++; saveM(); updateStats(); setMood('Curious');
  const t = Mentor.bubble('nova', '<span class="dots"><i></i><i></i><i></i></span>');
  const r = await Backend.agent('mentor', { action: 'answer', message: q, section: k && SEC[k] ? SEC[k].title : null }, 25000);
  let ans;
  if (ok(r)) ans = r.text;
  else { ans = await AI.answer(q, T, P, k && SEC[k] ? SEC[k].title : ''); Backend.track('mentor.question', { text: q, section: k && SEC[k] ? SEC[k].title : null, topic: T.title }); }
  t.remove();
  Mentor.say(ans, [['yes', '✅ That helped'], ['more', '💬 Another question'], ['no', '❌ Still confused']], v => {
    if (v === 'yes') { if (k) markGot(k); setMood('Back on track'); Mentor.say('Brilliant. Questions are how you learn fastest — keep them coming.', [['close', '📖 Back to the lesson']]); }
    else if (v === 'more') flowAsk(k);
    else howStudy(k || 'simple');
  });
}

function flowKnow() {
  setMood('Confident');
  Mentor.say('Then let\'s test that! 😎 Want to jump to the quiz, or take on the challenge first?',
    [['quiz', '📝 Take me to the quiz'], ['challenge', '🔥 Challenge first']], route);
}

function flowReady() {
  Mentor.say(`Before the quiz, ${P.name} — honestly, how ready do you feel?`,
    [['ready', '💪 Ready!'], ['kinda', '🤏 Kind of'], ['no', '😬 Not really']], v => {
      if (v === 'ready') { M.confidence.push(5); saveM(); Backend.track('confidence', { value: 5 }); return goQuiz('Let\'s go! Five questions, and they adapt to you. Good luck 💜'); }
      if (v === 'no') { M.confidence.push(1); saveM(); return flowLost(); }
      M.confidence.push(3); saveM();
      Mentor.say('That\'s fine — the quiz has hints if you need them. Want a 20-second recap first?', [['recap', '⚡ Quick recap'], ['go', '📝 Straight to the quiz']], r => {
        if (r === 'go') return goQuiz('You\'ve got this. Let\'s go!');
        const terms = Object.entries(T.keyTerms).slice(0, 4);
        Mentor.say(`Quick recap: ${T.eli5?.simple || T.simple[0]}`, [['go', '📝 Now I\'m ready']], () => goQuiz('Let\'s do it!'),
          `<p><b>Quick recap:</b> ${esc(T.eli5?.simple || T.simple[0])}</p><ul class="dotlist" style="margin-top:8px">${terms.map(([a, b]) => `<li><b>${esc(a)}</b> — ${esc(b)}</li>`).join('')}</ul>`);
      });
    });
}
function goQuiz(msg) {
  Mentor.say(msg);
  setTimeout(() => { Voice.stop(); Backend.flush().finally(() => { location.href = 'quiz.html'; }); }, 1800);
}

/* ---------- engagement signals ---------- */
function startWatching() {
  started = true; startedAt = Date.now(); lastRegular = Date.now() - 50000;
  let lastAct = Date.now();
  ['scroll', 'mousemove', 'keydown', 'touchstart', 'click'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  const canAuto = () => !Mentor.isOpen && Date.now() - Mentor.lastClosed > 25000 && Mentor.auto < 8;
  setInterval(() => {
    const now = Date.now();
    if (document.hidden) return;
    if (now - lastAct > 30000 && canAuto()) { Mentor.auto++; M.idle++; saveM(); checkIn('idle'); }
    else if (now - lastRegular > 100000 && now - lastAct < 10000 && canAuto()) { lastRegular = now; Mentor.auto++; checkIn('timer'); }
  }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { awayAt = Date.now(); return; }
    if (awayAt && Date.now() - awayAt > 8000 && !Mentor.isOpen) { M.away++; saveM(); updateStats(); checkIn('away'); }
  });
  addEventListener('scroll', () => {
    if (skimDone || Mentor.isOpen) return;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 250;
    if (atBottom && Date.now() - startedAt < 25000) { skimDone = true; M.skim++; saveM(); checkIn('skim'); }
  }, { passive: true });
}

$$('[data-demo]').forEach(b => b.onclick = () => {
  const d = b.dataset.demo;
  if (d === 'idle') { M.idle++; saveM(); }
  if (d === 'away') { M.away++; saveM(); }
  if (d === 'skim') { M.skim++; saveM(); }
  updateStats(); checkIn(d);
});

/* ---------- boot ---------- */
async function boot() {
  if (!P) return;
  if (await Backend.check() && Backend.learnerId) {
    $('#loaderMsg').textContent = `The tutor agent is building a ${STYLE_NAME[P.style]} lesson on ${P.topic} using what it remembers about you…`;
    const r = await Backend.agent('tutor', { topic: P.topic, topicId: P.topicId, profile: P }, 100000);
    if (ok(r)) { T = r.lesson; ADAPT = r.adaptations || ADAPT; Store.set('lesson', T); }
    else if (r && r.error && !P.topicId && !AI.has()) return showError(r.error);
  }
  if (!T && P.topicId) T = KB.find(k => k.id === P.topicId);
  if (!T) { const cached = Store.get('lesson'); if (cached && cached.title && cached.title.toLowerCase() === String(P.topic).toLowerCase()) T = cached; }
  if (!T) {
    if (!AI.has()) return showError('This topic needs an AI key (or pick a built-in topic). Add a key in Settings, then reload this page.');
    try {
      $('#loaderMsg').textContent = `Writing a ${STYLE_NAME[P.style]} lesson on ${P.topic} for ${P.name}…`;
      T = await AI.generateTopic(P.topic, P);
      Store.set('lesson', T);
    } catch (e) { return showError(e.message || 'Could not reach the AI.'); }
  }
  $('#side').hidden = false; $('#orb').hidden = false;
  renderLesson(); renderLog();
  const greet = Backend.online ? await Backend.agent('mentor', { action: 'greet' }, 5000) : null;
  setTimeout(() => {
    Mentor.open('start');
    Mentor.say(ok(greet) && greet.text ? greet.text : `Hi ${P.name}! I built this ${T.title} lesson around you — ${describePlan(P)[0].charAt(0).toLowerCase() + describePlan(P)[0].slice(1)} I'll pop in now and then to ask how it's going. And you can tap my orb anytime.`,
      [['ok', '👍 Let\'s go'], ['ask', '💬 I already have a question']], v => { if (v === 'ok') { Mentor.close(); } else flowAsk(); });
    startWatching();
  }, 900);
}
function showError(msg) {
  $('#lesson').innerHTML = `<div class="loader"><h2>Your lesson couldn't be built</h2><p class="muted">${esc(msg)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn btn-g" onclick="openSettings()">Open settings</button><button class="btn btn-g" onclick="location.reload()">Try again</button><a class="btn btn-p" href="talk.html">Pick another topic</a></div></div>`;
}
document.addEventListener('settings-saved', () => { if (!T) location.reload(); });
boot();
