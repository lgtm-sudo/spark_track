/* MindSpark — Talk page: Nova gets to know the learner */
renderNav(1);

const chat = $('#chat'), optsEl = $('#opts'), inp = $('#msgInput');
const preTopic = Store.get('preTopic', '');
let profile = {};
let step = -1;
let handler = null; // {list, cb, free}

const REACT = {
  mood: {
    excited: 'Love that energy! Let\'s use it before it fades. 🔥',
    curious: 'Curiosity is a superpower. I\'ll feed it with a few surprises.',
    bored: 'Totally fair — boring lessons are the worst. So I won\'t give you one. Short, punchy, surprising. Deal?',
    tired: 'Got it. I\'ll keep it light and bite-sized, and check in so you don\'t drift.',
    stressed: 'Take a breath. We\'ll go slow, one small piece at a time. No pressure here.'
  },
  level: {
    new: 'Starting from zero is a great place to start. No jargon without an explanation.',
    little: 'Nice — we\'ll build on what you already know.',
    decent: 'Cool, I\'ll skip the baby steps and go deeper.',
    pro: 'Oh, you want a challenge? I\'ll throw in the harder stuff. 😏'
  },
  style: {
    visual: 'A visual thinker! Diagrams and flows coming up.',
    story: 'Stories it is — your brain remembers stories far better than lists of facts.',
    steps: 'Step by step, clear and in order. Nothing skipped.',
    hands: 'Learning by doing — I\'ll give you something to actually try.'
  },
  goal: {
    exam: 'Exam mode: I\'ll add key terms and the traps examiners love.',
    homework: 'Let\'s make sure you actually get it, not just finish it.',
    curious: 'Learning for fun is the best kind. I\'ll add a rabbit hole or two.',
    real: 'Real world first — I\'ll show you where this shows up in life.'
  },
  time: {
    '5': 'Five minutes — essentials only, no fluff.',
    '15': 'Fifteen minutes is perfect for a solid lesson.',
    '30': 'Plenty of time. We can go deep.'
  },
  setup: {
    good: 'Great — full experience unlocked.',
    slow: 'I\'ve switched on Lite mode — fewer effects, everything still works.',
    shared: 'Lite mode is on, so this runs smoothly even on an older phone.'
  }
};

const FLOW = [
  { key: 'name', ask: () => 'Let\'s start simple. What should I call you?', free: true, placeholder: 'Type your name…' },
  { key: 'mood', ask: p => `${p.returning ? `Good to see you again, ${p.name}!` : `Nice to meet you, ${p.name}! 💜`} Be honest — how are you feeling about studying right now?`, group: 'mood' },
  { key: 'topic', ask: p => preTopic ? `You mentioned "${preTopic}". Is that what we're learning, or something else?` : `What do you want to explore today, ${p.name}? Pick one or type anything.`, topic: true },
  { key: 'level', ask: p => `How much do you already know about ${p.topic}?`, group: 'level' },
  { key: 'style', ask: () => 'Think of the last time something really clicked for you. How did you learn it?', group: 'style' },
  { key: 'goal', ask: () => 'What\'s making you want to learn this?', group: 'goal' },
  { key: 'time', ask: () => 'How much time do you have right now?', group: 'time' },
  { key: 'setup', ask: () => 'Last one — what\'s your setup like? I\'ll adapt to it.', group: 'setup' }
];

const PF_FIELDS = [['name', 'Name'], ['mood', 'Mood'], ['topic', 'Topic'], ['level', 'Knows'], ['style', 'Learns by'], ['goal', 'Goal'], ['time', 'Time'], ['setup', 'Setup']];

/* ---------- rendering ---------- */
function addMsg(who, html) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = who === 'ai' ? `<div class="av" aria-hidden="true"></div><div class="bubble">${html}</div>` : `<div class="bubble">${html}</div>`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}
function aiSay(text, cb, opts = {}) {
  const t = addMsg('ai', '<span class="dots" aria-label="Nova is typing"><i></i><i></i><i></i></span>');
  const delay = Store.get('lite', false) ? 150 : Math.min(1100, 350 + text.length * 8);
  setTimeout(() => {
    t.remove();
    addMsg('ai', opts.html || esc(text));
    Voice.speak(text);
    cb && cb();
  }, delay);
}
function setOptions(list, cb, free = false) {
  handler = { list, cb, free };
  optsEl.innerHTML = '';
  list.forEach(([v, label], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt'; b.textContent = label;
    b.style.animationDelay = (i * 40) + 'ms';
    b.onclick = () => choose(v, label);
    optsEl.appendChild(b);
  });
}
function clearOptions() { optsEl.innerHTML = ''; handler = null; }
function choose(v, label) {
  if (!handler) return;
  const cb = handler.cb;
  clearOptions();
  addMsg('user', esc(label));
  cb(v, label);
}
function groupOpts(g) { return OPT[g].map(([v, e, l]) => [v, `${e} ${l}`]); }

function submitText(text) {
  text = text.trim();
  if (!text || !handler) return;
  inp.value = '';
  if (handler.free) { const cb = handler.cb; clearOptions(); addMsg('user', esc(text)); cb(text, text); return; }
  const m = matchOption(text, handler.list);
  if (m) choose(m[0], m[1]);
  else { addMsg('user', esc(text)); aiSay('Hmm, I didn\'t quite catch that — tap one of the options below 👇'); }
}
$('#inputRow').addEventListener('submit', e => { e.preventDefault(); submitText(inp.value); });
wireMic($('#micBtn'), t => { inp.value = t; submitText(t); });

/* ---------- profile sidebar ---------- */
function renderProfile() {
  const filled = PF_FIELDS.filter(([k]) => profile[k]).length;
  $('#pfRows').innerHTML = PF_FIELDS.map(([k, l]) => {
    let v = profile[k];
    if (v && OPT[k]) v = optLabel(k, v);
    return `<div class="pf-row ${v ? 'filled' : ''}"><span class="k">${l}</span><span class="v">${v ? esc(v) : '…'}</span></div>`;
  }).join('');
  const pct = Math.round(filled / PF_FIELDS.length * 100);
  $('#pfMeter').style.width = pct + '%';
  $('#pfPct').textContent = pct + '% understood';
}

/* ---------- flow ---------- */
function next() {
  step++;
  if (step >= FLOW.length) return finish();
  const f = FLOW[step];
  if (f.key === 'name' && profile.name) return next();
  inp.placeholder = f.placeholder || 'Type, tap an option, or use the mic…';
  aiSay(f.ask(profile), () => {
    if (f.free) { setOptions([], v => answer(f, cap(v)), true); inp.focus(); }
    else if (f.topic) askTopic();
    else setOptions(groupOpts(f.group), v => answer(f, v));
  });
}

function answer(f, v) {
  profile[f.key] = v;
  renderProfile();
  if (f.key === 'name') (Backend.sessionStarted ? Promise.resolve() : Backend.startSession(v)).then(() => Backend.track('profile.answer', { key: 'name', value: v }));
  else Backend.track('profile.answer', { key: f.key, value: v });
  if (f.key === 'setup' && (v === 'slow' || v === 'shared')) { Store.set('lite', true); document.body.classList.add('lite'); }
  if (f.key === 'setup' && v === 'good') { Store.set('lite', false); document.body.classList.remove('lite'); }
  const r = REACT[f.key] && REACT[f.key][v];
  r ? aiSay(r, next) : next();
}

function askTopic() {
  const list = [];
  if (preTopic) list.push(['__pre', `✅ Yes, ${preTopic}`]);
  KB.forEach(k => { if (!preTopic || k.title.toLowerCase() !== preTopic.toLowerCase()) list.push([k.title, `${k.emoji} ${k.title}`]); });
  setOptions(list, v => handleTopic(v === '__pre' ? preTopic : v), true);
  // free text allowed: typed topics come through as text
  handler.free = true;
  handler.cb = (v) => handleTopic(v === '__pre' ? preTopic : v);
  inp.placeholder = 'Or type any topic…';
}

function handleTopic(text) {
  const clean = String(text).replace(/^✅ Yes, /, '').trim();
  const kb = matchTopic(clean);
  if (kb) {
    profile.topic = kb.title; profile.topicId = kb.id;
    renderProfile(); Backend.track('profile.answer', { key: 'topic', value: kb.title });
    aiSay(`${kb.emoji} ${kb.title} — great choice.`, next);
  } else if (AI.has() || Backend.llmReady) {
    profile.topic = cap(clean); profile.topicId = null;
    renderProfile(); Backend.track('profile.answer', { key: 'topic', value: profile.topic });
    aiSay(`"${cap(clean)}" — ooh, I like it. I'll build this one fresh for you.`, next);
  } else {
    aiSay(`I don't have "${clean}" in my offline library yet. Add a free AI key (server .env or ⚙ Settings) to unlock any topic — or pick one I know by heart:`, () => {
      const list = KB.map(k => [k.title, `${k.emoji} ${k.title}`]);
      list.push(['__settings', '⚙ Add an AI key']);
      setOptions(list, v => {
        if (v === '__settings') { openSettings(); aiSay('Once you save a key, just type your topic again.', askTopic); return; }
        handleTopic(v);
      }, true);
      handler.cb = v => {
        if (v === '__settings') { openSettings(); aiSay('Once you save a key, just type your topic again.', askTopic); return; }
        handleTopic(v);
      };
    });
  }
}

async function finish() {
  Store.set('profile', profile);
  Store.set('metrics', { start: Date.now(), checkins: 0, confusions: [], bored: 0, distracted: 0, questions: 0, gotIt: [], confidence: [], styleSwitches: 0, idle: 0, away: 0, skim: 0 });
  ['lesson', 'mentorLog', 'quizResult', 'preTopic'].forEach(k => Store.del(k));
  const plan = describePlan(profile);
  if (!Backend.learnerId) await Backend.startSession(profile.name);
  const pr = await Backend.agent('profiler', { action: 'set', profile }, 8000);
  const memNotes = ok(pr) ? (pr.notes || []) : [];
  const moodWord = optLabel('mood', profile.mood).split(' ').slice(1).join(' ').toLowerCase();
  const intro = `Thanks, ${profile.name}. Here's what I understood: you're feeling ${moodWord}, you learn best when I ${{ visual: 'show you visuals', story: 'tell you a story', steps: 'go step by step', hands: 'let you try things' }[profile.style]}, and you've got about ${profile.time === '30' ? '30+' : profile.time} minutes. So your ${profile.topic} lesson will be built like this:`;
  aiSay(intro, () => {
    addMsg('ai', `<ul class="plan">${plan.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${memNotes.length ? `<p style="margin-top:10px"><b>From our past sessions:</b></p><ul class="plan">${memNotes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <p style="margin-top:10px">I'll also pop in while you read to ask how it's going. Just be honest with me.</p>`);
    setOptions([['go', '🚀 Build my lesson'], ['redo', '↺ Change my answers']], v => {
      if (v === 'go') { Voice.stop(); Backend.flush().finally(() => { location.href = 'learn.html'; }); }
      else restart();
    });
  });
}

function restart() {
  Voice.stop();
  profile = {}; step = -1; chat.innerHTML = ''; clearOptions(); renderProfile();
  start();
}
$('#restartBtn').onclick = restart;

function start() {
  aiSay('Hi! I\'m Nova ✦ your personal learning mentor. I don\'t start with a lesson — I start by getting to know you. First: do you want me to speak out loud, or keep it text-only? You can change this anytime with the button at the top.', () => {
    setOptions([['on', '🔊 Yes, talk to me'], ['off', '🔇 Text only']], v => {
      Voice.set(v === 'on');
      const go = () => greetReturning().then(next);
      if (v === 'on') aiSay('Great, you\'ll hear me now. You can also answer by tapping the mic.', go);
      else go();
    });
  });
}

async function greetReturning() {
  if (!Backend.learnerId || !(await Backend.check())) return;
  await Backend.startSession();
  const g = await Backend.agent('profiler', { action: 'greet' }, 10000);
  if (!ok(g) || !g.returning) return;
  profile.name = g.name; profile.returning = true; renderProfile();
  await new Promise(r => aiSay(g.text, r));
}

renderProfile();
Backend.check().then(on => { $('#pfNote').textContent = on ? 'Fills in as you talk. Saved to your private learning memory.' : 'Fills in as you talk. Stays on this device.'; });
start();
