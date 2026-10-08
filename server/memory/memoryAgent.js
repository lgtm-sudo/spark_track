/* Smart memory — turns RAW events into compact, useful memory that every agent shares.

   Layer 1  RAW events        everything, append-only (store.events.jsonl)
   Layer 2  Episode summaries every SUMMARIZE_EVERY new events, the AI compresses the batch
   Layer 3  Learner model     long-term facts merged across all sessions (topics, struggles,
                              what helps, mood pattern, engagement, quiz history, narrative)

   Old summaries are folded into the narrative so memory never grows without limit.
   If no AI key is configured, a deterministic summariser does the same job (offline). */
const Store = require('./store');
const llm = require('../llm');
const cfg = require('../config');

const running = new Set();
const inc = (o, k, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
const top = (o, n = 3) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
const uniq = arr => [...new Set(arr.filter(Boolean))];

function blankModel() {
  return {
    name: null, sessions: 0, totalEvents: 0, lastSeen: null, lastProfile: null,
    topics: {}, struggles: {}, strengths: {}, moods: {},
    styles: { chosen: {}, switchedTo: {}, helped: {} },
    engagement: { idle: 0, away: 0, skim: 0, bored: 0, distracted: 0, questions: 0, gotIt: 0, checkins: 0 },
    confidence: [], quiz: [], recentQuestions: [],
    narrative: '', interests: [], effectiveStrategies: [], nextSteps: []
  };
}

/* deterministic fact extraction from a batch of raw events */
function extractFacts(events) {
  const f = { topics: [], confusions: [], gotIt: [], questions: [], moods: [], profile: null, switches: [], helped: [], triggers: {}, confidence: [], quiz: [] };
  for (const e of events) {
    const d = e.data || {};
    switch (e.type) {
      case 'profile.set': f.profile = d.profile; if (d.profile) { f.topics.push(d.profile.topic); f.moods.push(d.profile.mood); } break;
      case 'lesson.built': f.topics.push(d.topic); break;
      case 'section.confused': f.confusions.push(d.topic ? `${d.section} (${d.topic})` : d.section); break;
      case 'section.gotit': f.gotIt.push(d.section); break;
      case 'mentor.question': f.questions.push(d.text); break;
      case 'mentor.trigger': inc(f.triggers, d.trigger); break;
      case 'mood.signal': f.moods.push(d.mood); break;
      case 'style.switch': f.switches.push(d.style); break;
      case 'style.helped': f.helped.push(d.style); break;
      case 'confidence': f.confidence.push(+d.value); break;
      case 'quiz.result': f.quiz.push({ topic: d.topic, score: +d.score, total: +d.total, ts: e.ts }); break;
    }
  }
  f.topics = uniq(f.topics);
  return f;
}

function mergeModel(m, f, events) {
  m.totalEvents += events.length;
  m.lastSeen = (events[events.length - 1] || {}).ts || Date.now();
  const topic = t => (m.topics[t] = m.topics[t] || { sessions: 0, bestScore: null, lastScore: null });
  f.topics.forEach(topic);
  if (f.profile) {
    m.sessions++;
    m.lastProfile = f.profile;
    if (f.profile.name) m.name = f.profile.name;
    if (f.profile.topic) topic(f.profile.topic).sessions++;
    inc(m.styles.chosen, f.profile.style);
  }
  f.confusions.forEach(c => inc(m.struggles, c));
  f.moods.forEach(x => inc(m.moods, x));
  f.switches.forEach(s => inc(m.styles.switchedTo, s));
  f.helped.forEach(s => inc(m.styles.helped, s));
  ['idle', 'away', 'skim'].forEach(k => { m.engagement[k] += f.triggers[k] || 0; });
  m.engagement.checkins += Object.values(f.triggers).reduce((a, b) => a + b, 0);
  m.engagement.bored += f.moods.filter(x => x === 'bored').length;
  m.engagement.distracted += f.moods.filter(x => x === 'distracted').length;
  m.engagement.questions += f.questions.length;
  m.engagement.gotIt += f.gotIt.length;
  m.confidence = m.confidence.concat(f.confidence).slice(-20);
  m.recentQuestions = m.recentQuestions.concat(f.questions).slice(-12);
  f.quiz.forEach(q => {
    m.quiz.push(q); m.quiz = m.quiz.slice(-30);
    const t = topic(q.topic);
    t.lastScore = q.total ? q.score / q.total : 0;
    t.bestScore = Math.max(t.bestScore || 0, t.lastScore);
    if (t.lastScore >= 0.8) inc(m.strengths, q.topic);
  });
  return m;
}

function heuristicSummary(f) {
  const s = [];
  if (f.topics.length) s.push(`Studied ${f.topics.join(', ')}.`);
  const moods = uniq(f.moods);
  if (moods.length) s.push(`Mood signals: ${moods.join(', ')}.`);
  if (f.confusions.length) s.push(`Got stuck on ${uniq(f.confusions).join('; ')}.`);
  if (f.gotIt.length) s.push(`Understood ${f.gotIt.length} section(s).`);
  if (f.questions.length) s.push(`Asked ${f.questions.length} question(s), e.g. "${String(f.questions[0]).slice(0, 80)}".`);
  if (f.helped.length) s.push(`Switching to ${uniq(f.helped).join(', ')} explanations helped.`);
  const drift = Object.entries(f.triggers).filter(([k]) => ['idle', 'away', 'skim'].includes(k));
  if (drift.length) s.push(`Focus drifted (${drift.map(([k, v]) => `${k}×${v}`).join(', ')}).`);
  f.quiz.forEach(q => s.push(`Quiz on ${q.topic}: ${q.score}/${q.total}.`));
  return s.join(' ') || 'Light activity, nothing notable yet.';
}

function heuristicNarrative(m) {
  const parts = [];
  if (m.name) parts.push(`${m.name} has done ${m.sessions} session(s) on ${Object.keys(m.topics).join(', ') || 'no topics yet'}.`);
  const mood = top(m.moods, 2); if (mood.length) parts.push(`Usually arrives feeling ${mood.join(' or ')}.`);
  const st = top(m.struggles, 2); if (st.length) parts.push(`Tends to struggle with ${st.join(' and ')}.`);
  const help = top(m.styles.helped, 1); if (help.length) parts.push(`${help[0].charAt(0).toUpperCase() + help[0].slice(1)} explanations have helped most.`);
  const strong = top(m.strengths, 2); if (strong.length) parts.push(`Strong in ${strong.join(', ')}.`);
  return parts.join(' ');
}

/* compact raw lines for the AI summariser */
function rawLines(events, max = 80) {
  return events.slice(-max).map(e => {
    const d = e.data || {};
    const brief = d.text || d.section || d.style || d.mood || d.trigger || (d.profile ? `${d.profile.topic}/${d.profile.mood}/${d.profile.style}/${d.profile.level}` : '') || (d.score !== undefined ? `${d.score}/${d.total}` : '') || (d.ok !== undefined ? (d.ok ? 'correct' : 'wrong') + ': ' + (d.q || '') : '') || d.topic || '';
    return `- [${e.agent}] ${e.type}: ${String(brief).replace(/\s+/g, ' ').slice(0, 140)}`;
  }).join('\n');
}

const MemoryAgent = {
  async ingest(learnerId, events) {
    const clean = (Array.isArray(events) ? events : [events]).slice(0, 200).map(e => ({
      id: Store.newId('ev'), ts: +e.ts || Date.now(), learnerId,
      sessionId: e.sessionId || null, agent: String(e.agent || 'client').slice(0, 20),
      type: String(e.type || 'unknown').slice(0, 40), data: e.data || {}
    }));
    if (!clean.length) return 0;
    const count = await Store.appendEvents(learnerId, clean);
    const mem = await Store.getMemory(learnerId);
    if (count - mem.cursor >= cfg.SUMMARIZE_EVERY) this.summarize(learnerId).catch(e => console.warn('[memory]', e.message));
    return count;
  },

  async summarize(learnerId, { force = false } = {}) {
    if (running.has(learnerId)) return { skipped: 'already running' };
    running.add(learnerId);
    try {
      const mem = await Store.getMemory(learnerId);
      const events = await Store.readEvents(learnerId, { from: mem.cursor });
      if (!events.length || (!force && events.length < cfg.SUMMARIZE_EVERY)) return { skipped: 'not enough new events', pending: events.length };
      const NOISE = ['agent.call', 'session.start', 'mentor.answer'];
      if (!events.some(e => !NOISE.includes(e.type))) { // nothing worth remembering: just move the cursor
        mem.cursor += events.length; await Store.saveMemory(learnerId, mem);
        return { skipped: 'nothing meaningful to summarise' };
      }
      const facts = extractFacts(events);
      const model = mergeModel(mem.model || blankModel(), facts, events);
      const summary = { id: Store.newId('sum'), from: mem.cursor, to: mem.cursor + events.length, eventCount: events.length, createdAt: Date.now(), by: 'heuristic', text: heuristicSummary(facts) };

      if (llm.available()) {
        try {
          const { data, provider } = await llm.json({
            system: 'You are the memory system of a learning app. You compress raw learner activity into short, factual, useful memory for tutor agents. Never invent facts.',
            prompt: `Previous long-term narrative about this learner:\n${mem.model && mem.model.narrative || '(none yet)'}\n\nFacts already extracted:\n${JSON.stringify(facts)}\n\nRaw events (oldest first):\n${rawLines(events)}\n\nReturn JSON: {"summary": "2-3 sentences on what happened in this batch", "narrative": "updated 3-4 sentence portrait of who this learner is overall (merge with previous)", "interests": [up to 5], "effectiveStrategies": [up to 4 things that clearly helped], "nextSteps": [up to 3 concrete suggestions for the tutor]}`,
            maxTokens: 700
          });
          if (data.summary) { summary.text = String(data.summary); summary.by = provider; }
          if (data.narrative) model.narrative = String(data.narrative);
          if (Array.isArray(data.interests)) model.interests = uniq([...data.interests.map(String), ...model.interests]).slice(0, 10);
          if (Array.isArray(data.effectiveStrategies)) model.effectiveStrategies = uniq([...data.effectiveStrategies.map(String), ...model.effectiveStrategies]).slice(0, 8);
          if (Array.isArray(data.nextSteps)) model.nextSteps = data.nextSteps.map(String).slice(0, 3);
        } catch (e) { console.warn('[memory] AI summary failed, using heuristic:', e.message); }
      }
      if (summary.by === 'heuristic') model.narrative = heuristicNarrative(model);

      mem.summaries.push(summary);
      if (mem.summaries.length > cfg.KEEP_SUMMARIES) mem.summaries = mem.summaries.slice(-cfg.KEEP_SUMMARIES); // older ones already live in the narrative
      mem.cursor = summary.to;
      mem.model = model;
      mem.updatedAt = Date.now();
      await Store.saveMemory(learnerId, mem);
      return mem;
    } finally { running.delete(learnerId); }
  },

  /* The shared context every agent reads before acting */
  async context(learnerId, { recent = 14 } = {}) {
    const [mem, state, recentEvents] = await Promise.all([Store.getMemory(learnerId), Store.getState(learnerId), Store.readEvents(learnerId, { last: recent })]);
    const m = mem.model;
    const last = mem.summaries[mem.summaries.length - 1];
    const lines = [];
    if (m) {
      lines.push(`LONG-TERM: ${m.name || 'Learner'}, ${m.sessions} session(s).`);
      const topics = Object.entries(m.topics).map(([t, v]) => `${t}${v.bestScore !== null ? ` (best ${Math.round(v.bestScore * 100)}%)` : ''}`);
      if (topics.length) lines.push(`Topics: ${topics.join(', ')}.`);
      if (m.narrative) lines.push(`Portrait: ${m.narrative}`);
      const st = top(m.struggles, 3); if (st.length) lines.push(`Struggles with: ${st.join('; ')}.`);
      const help = top(m.styles.helped, 2); if (help.length) lines.push(`Explanation styles that helped: ${help.join(', ')}.`);
      if (m.effectiveStrategies.length) lines.push(`What works: ${m.effectiveStrategies.slice(0, 3).join('; ')}.`);
      const mood = top(m.moods, 2); if (mood.length) lines.push(`Common moods: ${mood.join(', ')}.`);
    }
    if (last) lines.push(`LATEST SUMMARY: ${last.text}`);
    if (recentEvents.length) lines.push('RECENT ACTIVITY:\n' + rawLines(recentEvents, recent));
    return { text: lines.join('\n') || 'New learner, no memory yet.', model: m, state, recent: recentEvents, lastSummary: last || null, top };
  },

  blankModel, top
};

module.exports = MemoryAgent;
