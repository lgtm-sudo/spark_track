/* MindSpark — Quiz page: 5 adaptive questions and a personalised report */
renderNav(3);

const P = Store.get('profile');
const M = Store.get('metrics', {});
const LOG = Store.get('mentorLog', []);
let T = P && (P.topicId ? KB.find(k => k.id === P.topicId) : Store.get('lesson'));
const root = $('#quiz');
const TOTAL = 5;
let pool, used, diff, idx, answers, cur, hintsUsed, hintedThis;

if (!P || !T) {
  root.innerHTML = `<div class="loader"><h2>No lesson yet</h2><p class="muted">Talk with Nova first so the quiz knows what you learned.</p><a class="btn btn-p" href="talk.html">Talk to Nova</a></div>`;
} else start();

const CORRECT = ['Nailed it! 🎯', 'Yes! Your brain is on fire 🔥', 'Correct — I knew you had this 💜', 'Spot on. That\'s real understanding.'];
const WRONG = ['Not quite — but this is exactly how learning works.', 'Close! Let\'s see why.', 'Good attempt. Mistakes are just data 📊', 'Almost. Read the explanation — it\'ll stick now.'];
const LEVEL_NAME = { 1: 'Warm-up', 2: 'Core', 3: 'Stretch' };

let memMsg = '';
async function start() {
  pool = T.quiz.map((q, i) => ({ ...q, i, level: q.level || 2 }));
  used = new Set(); idx = 0; answers = []; hintsUsed = 0;
  diff = { new: 1, little: 1, decent: 2, pro: 3 }[P.level] || 1;
  const r = await Backend.agent('quiz', { action: 'start', topic: T.title }, 3000);
  if (ok(r)) { diff = r.startLevel || diff; memMsg = r.message || ''; }
  intro();
}

function intro() {
  const msg = `Hi ${P.name}! Five questions on ${T.title}. They get harder when you're right and gentler when you're not. Stuck? Ask me for a hint.${memMsg ? ' ' + memMsg : ''}`;
  root.innerHTML = `<div class="panel qcard" style="text-align:center;padding:40px 26px">
    <div class="big-orb" style="width:110px;height:110px;margin:0 auto 22px" aria-hidden="true"></div>
    <h2>${esc(T.emoji)} ${esc(T.title)} quiz</h2>
    <p class="muted" style="max-width:32em;margin:10px auto 24px">${esc(msg)}</p>
    <button class="btn btn-p" id="goBtn">Start the quiz</button></div>`;
  Voice.speak(msg);
  $('#goBtn').onclick = next;
}

function pickNext() {
  const left = pool.filter(q => !used.has(q.i));
  left.sort((a, b) => Math.abs(a.level - diff) - Math.abs(b.level - diff) || Math.random() - 0.5);
  return left[0];
}

function next() {
  if (idx >= TOTAL || used.size >= pool.length) return results();
  cur = pickNext(); used.add(cur.i); hintedThis = false;
  const prog = Array.from({ length: TOTAL }, (_, i) => {
    const a = answers[i];
    return `<i class="${a ? (a.ok ? 'ok' : 'bad') : i === idx ? 'on' : ''}"></i>`;
  }).join('');
  root.innerHTML = `
    <div class="qtop"><span>Question ${idx + 1} of ${TOTAL}</span><span class="badge">${LEVEL_NAME[cur.level]}</span></div>
    <div class="qprog">${prog}</div>
    <div class="panel qcard">
      <h2>${fmt(cur.q).replace(/^<p>|<\/p>$/g, '')}</h2>
      <div id="opts">${cur.options.map((o, i) => `<button class="qopt" data-i="${i}"><span class="l">${'ABCD'[i] || i + 1}</span><span>${fmt(o).replace(/^<p>|<\/p>$/g, '')}</span></button>`).join('')}</div>
      <div id="fb"></div>
      <div class="qactions">
        <button class="btn btn-g" id="hintBtn">💡 Ask Nova for a hint</button>
        <button class="btn btn-p" id="nextBtn" hidden>${idx + 1 === TOTAL ? 'See my results' : 'Next question'}</button>
      </div>
    </div>`;
  Voice.speak(`Question ${idx + 1}. ${cur.q}`);
  $$('.qopt').forEach(b => b.onclick = () => answer(+b.dataset.i));
  $('#hintBtn').onclick = hint;
  $('#nextBtn').onclick = () => { idx++; next(); };
}

function hint() {
  if (hintedThis) return;
  hintedThis = true; hintsUsed++;
  const wrong = $$('.qopt').filter(b => +b.dataset.i !== cur.answer && !b.disabled);
  const rm = wrong.sort(() => Math.random() - 0.5).slice(0, Math.max(1, wrong.length - 1));
  rm.forEach(b => { b.classList.add('gone'); b.disabled = true; });
  const tip = `I've crossed out ${rm.length === 1 ? 'one option' : rm.length + ' options'} that can't be right. Think back to the big idea.`;
  $('#fb').innerHTML = `<div class="feedback"><div class="av" aria-hidden="true"></div><div><b>Nova</b><p>${esc(tip)}</p></div></div>`;
  Voice.speak(tip);
  $('#hintBtn').disabled = true;
}

function answer(i) {
  const ok = i === cur.answer;
  answers.push({ q: cur.q, ok, chosen: cur.options[i], right: cur.options[cur.answer], explain: cur.explain, level: cur.level, hinted: hintedThis });
  diff = ok ? Math.min(3, diff + 1) : Math.max(1, diff - 1);
  Backend.track('quiz.answer', { q: cur.q, ok, level: cur.level, hinted: hintedThis, topic: T.title });
  $$('.qopt').forEach(b => {
    b.disabled = true;
    const bi = +b.dataset.i;
    if (bi === cur.answer) b.classList.add('ok');
    else if (bi === i) b.classList.add('bad');
  });
  const react = ok ? pick(CORRECT) : pick(WRONG);
  const extra = ok ? (diff === 3 && cur.level < 3 ? ' Turning up the difficulty.' : '') : (cur.level > 1 ? ' I\'ll make the next one a little gentler.' : '');
  $('#fb').innerHTML = `<div class="feedback"><div class="av" aria-hidden="true"></div><div><b>${esc(react)}${esc(extra)}</b><p>${fmt(cur.explain).replace(/^<p>|<\/p>$/g, '')}</p></div></div>`;
  Voice.speak(`${react}${extra} ${cur.explain}`);
  $('#hintBtn').hidden = true;
  const n = $('#nextBtn'); n.hidden = false; n.focus();
}

function results() {
  const score = answers.filter(a => a.ok).length;
  const total = answers.length;
  const pct = total ? score / total : 0;
  Store.set('quizResult', { score, total, at: Date.now(), topic: T.title });
  const reportP = Backend.agent('quiz', { action: 'report', score, total, hints: hintsUsed, topic: T.title }, 45000);
  const C = 2 * Math.PI * 64;
  const title = pct === 1 ? 'Perfect score!' : pct >= 0.8 ? 'Excellent work' : pct >= 0.6 ? 'Solid progress' : pct >= 0.4 ? 'Getting there' : 'Good start';
  const lead = pct >= 0.8 ? `You really understand ${T.title}, ${P.name}.` : pct >= 0.6 ? `The core of ${T.title} is clicking, ${P.name}. A couple of ideas need one more look.` : `Every expert started exactly here, ${P.name}. Let's look at what tripped you up.`;

  const ins = [];
  const moodWord = optLabel('mood', P.mood).split(' ').slice(1).join(' ').toLowerCase();
  if (P.mood === 'bored' || P.mood === 'tired') ins.push(`You started out feeling ${moodWord} — and still finished a full lesson and quiz. That counts.`);
  if (P.mood === 'stressed') ins.push('You came in stressed and kept going anyway. Small steps worked.');
  if ((M.confusions || []).length) ins.push(`You told me ${M.confusions.length} part${M.confusions.length > 1 ? 's weren\'t' : ' wasn\'t'} clicking, and we worked through it together. Speaking up is a learning skill.`);
  if (M.questions) ins.push(`You asked ${M.questions} question${M.questions > 1 ? 's' : ''}. Curious learners learn fastest.`);
  if (M.bored) ins.push('You were honest when you got bored, which let me change the lesson for you.');
  if (M.styleSwitches) ins.push(`Switching to a different explanation style helped you ${M.styleSwitches > 1 ? M.styleSwitches + ' times' : 'once'}.`);
  if (M.idle || M.away || M.distracted) ins.push(`Your focus drifted ${(M.idle || 0) + (M.away || 0) + (M.distracted || 0)} time${((M.idle || 0) + (M.away || 0) + (M.distracted || 0)) > 1 ? 's' : ''}. Try a 2-minute focus sprint next time.`);
  if (hintsUsed) ins.push(`You used ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} — smart, not cheating.`);
  const hard = answers.filter(a => a.ok && a.level === 3).length;
  if (hard) ins.push(`You got ${hard} stretch-level question${hard > 1 ? 's' : ''} right.`);
  const conf = (M.confidence || []).slice(-1)[0];
  if (conf && conf <= 2 && pct >= 0.6) ins.push('You felt unsure before the quiz, but your score says you knew more than you thought.');
  if (!ins.length) ins.push('You stayed focused the whole way through. Nice.');

  const otherStyle = { visual: 'a story', story: 'a diagram', steps: 'a hands-on activity', hands: 'step by step' }[P.style];
  const recs = pct >= 0.8
    ? ['Try teaching this to a friend in 60 seconds — it locks it in.', T.challenge ? 'Take on the challenge round if you haven\'t yet.' : 'Pick a new topic and keep the streak going.']
    : pct >= 0.6
      ? [`Revisit the lesson and ask Nova about the questions below.`, `Try the topic as ${otherStyle} — a new angle often makes it click.`]
      : [`Go back to the lesson and ask Nova to teach it as ${otherStyle}.`, 'Ask Nova "explain it like I\'m 10" on the part that felt hardest.', 'Retry the quiz — the questions will adapt again.'];

  const wrong = answers.filter(a => !a.ok);
  root.innerHTML = `
    <div class="panel">
      <div class="result-top">
        <div class="ring" role="img" aria-label="Score ${score} out of ${total}">
          <svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" fill="none" stroke="#2a1f40" stroke-width="12"/>
          <circle id="arc" cx="75" cy="75" r="64" fill="none" stroke="url(#g)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s ease"/>
          <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#e879f9"/></linearGradient></defs></svg>
          <div class="num">${score}/${total}</div>
        </div>
        <div style="flex:1;min-width:220px">
          <h2 style="font-size:2rem">${title}</h2>
          <p class="muted" style="margin-top:6px">${esc(lead)}</p>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <h3 style="margin-bottom:8px">What Nova noticed</h3>
      <ul class="insights">${ins.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="panel" style="margin-top:18px;border-color:rgba(168,85,247,.5)" id="memPanel" ${Backend.online && Backend.learnerId ? '' : 'hidden'}>
      <h3 style="margin-bottom:8px">🧠 From your learning memory</h3>
      <p class="muted" id="memBody">Nova is updating your memory with this session…</p>
    </div>
    <div class="panel" style="margin-top:18px">
      <h3 style="margin-bottom:8px">What to do next</h3>
      <ul class="insights">${recs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${wrong.length ? `<h3 style="margin:18px 0 4px;font-size:1rem">Questions to revisit</h3>${wrong.map(a => `<div class="review"><b>${esc(a.q)}</b><br><small>You chose: ${esc(a.chosen)} · Right answer: ${esc(a.right)}</small><p style="margin-top:6px">${esc(a.explain)}</p></div>`).join('')}` : ''}
    </div>
    <div class="panel" style="margin-top:18px">
      <h3 style="margin-bottom:8px">Your session</h3>
      <div class="state"><span class="muted">Mentor messages exchanged</span><b>${LOG.length}</b></div>
      <div class="state"><span class="muted">Check-ins</span><b>${M.checkins || 0}</b></div>
      <div class="state"><span class="muted">Time learning</span><b>${M.start ? Math.max(1, Math.round((Date.now() - M.start) / 60000)) + ' min' : '—'}</b></div>
    </div>
    <div class="qactions">
      <a class="btn btn-g" href="learn.html">Back to the lesson</a>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-g" id="retryBtn">Retry quiz</button>
        <a class="btn btn-p" href="talk.html">Learn something new</a>
      </div>
    </div>`;
  requestAnimationFrame(() => setTimeout(() => { const a = $('#arc'); if (a) a.style.strokeDashoffset = C * (1 - pct); }, 60));
  Voice.speak(`${title}. You scored ${score} out of ${total}. ${lead}`);
  $('#retryBtn').onclick = start;
  reportP.then(r => {
    const el = $('#memBody'); if (!el) return;
    if (!ok(r)) { el.textContent = 'Memory is offline right now — your results are saved on this device.'; return; }
    el.outerHTML = `<div>
      ${r.insights && r.insights.length ? `<ul class="insights">${r.insights.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.nextSteps && r.nextSteps.length ? `<p style="margin-top:10px"><b>Next time:</b></p><ul class="insights">${r.nextSteps.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.summary ? `<p class="muted" style="margin-top:10px">Session summary: ${esc(r.summary)}</p>` : ''}
      <a class="btn btn-g" href="memory.html" style="margin-top:14px">See everything Nova remembers</a></div>`;
  });
}
