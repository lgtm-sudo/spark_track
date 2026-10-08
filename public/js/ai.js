/* MindSpark — AI layer.
   Offline first: built-in topics + a local answer engine.
   Optional: a Gemini key unlocks any topic and free-form doubt solving. */
const AI = {
  key() { return Store.get('apiKey', ''); },
  model() { return Store.get('model', 'gemini-2.5-flash') || 'gemini-2.5-flash'; },
  has() { return !!this.key() && navigator.onLine !== false; },

  async gemini(prompt, json = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model())}:generateContent?key=${encodeURIComponent(this.key())}`;
    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!r.ok) {
        let msg = 'AI request failed (' + r.status + ')';
        try { const e = await r.json(); if (e.error && e.error.message) msg = e.error.message; } catch (_) {}
        throw new Error(msg);
      }
      const d = await r.json();
      return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    } finally { clearTimeout(to); }
  },

  /* Build a full topic object (same schema as KB) personalised to the learner */
  async generateTopic(topic, p) {
    const prompt = `You are an expert, warm tutor. Create a personalised mini-lesson about "${topic}".
Learner profile: name ${p.name}; mood ${p.mood}; prior knowledge ${p.level} (new=never heard, little, decent, pro=wants challenge); preferred style ${p.style}; goal ${p.goal}; time ${p.time} minutes.
Match the vocabulary to the prior knowledge. Keep sentences short and friendly. Use **bold** for key words. Use \`\`\` code fences only for code.
Return ONLY valid JSON with exactly these keys:
{"title":string,"emoji":string,"subject":string,"hook":string (1-2 surprising sentences),"funFact":string,
"simple":[2-3 short paragraphs],"deep":[2 paragraphs, more advanced],
"story":string (a short relatable story/analogy, paragraphs separated by \\n\\n),
"steps":[4-6 strings],"diagram":[4-6 very short flow labels, each starting with an emoji],
"activity":string (a hands-on thing to try with no special equipment),
"realLife":[3 strings],"keyTerms":{"term":"short definition", ... 4-6 items},
"eli5":{"simple":string,"deep":string,"story":string,"steps":string,"diagram":string,"activity":string} (each a much simpler explain-like-I'm-10 version),
"challenge":string (one thought-provoking problem),"examTips":[3 strings],
"quiz":[8 objects {"q":string,"options":[4 strings],"answer":index 0-3,"explain":string,"level":1|2|3}] (3 of level 1, 3 of level 2, 2 of level 3, answers spread across positions)}`;
    const raw = await this.gemini(prompt, true);
    const t = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim());
    return this.validate(t, topic);
  },

  validate(t, topic) {
    const arr = (x, d = []) => Array.isArray(x) ? x.filter(Boolean).map(String) : d;
    const out = {
      id: null, title: t.title || cap(topic), emoji: t.emoji || '✨', subject: t.subject || 'Topic',
      hook: t.hook || '', funFact: t.funFact || '', simple: arr(t.simple), deep: arr(t.deep), story: t.story || '',
      steps: arr(t.steps), diagram: arr(t.diagram), activity: t.activity || '', realLife: arr(t.realLife),
      keyTerms: (t.keyTerms && typeof t.keyTerms === 'object') ? t.keyTerms : {}, eli5: t.eli5 || {},
      challenge: t.challenge || '', examTips: arr(t.examTips), aliases: [],
      quiz: (Array.isArray(t.quiz) ? t.quiz : []).filter(q => q && q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(+q.answer) && +q.answer < q.options.length)
        .map(q => ({ q: String(q.q), options: q.options.map(String), answer: +q.answer, explain: String(q.explain || ''), level: [1, 2, 3].includes(+q.level) ? +q.level : 2 }))
    };
    if (!out.simple.length || out.quiz.length < 5) throw new Error('The AI returned an incomplete lesson. Try again.');
    return out;
  },

  /* Nova answers a free-form doubt */
  async answer(question, T, p, context = '') {
    if (this.has()) {
      try {
        const prompt = `You are Nova, a kind 1-to-1 learning mentor talking to ${p.name} (prior knowledge: ${p.level}, prefers: ${p.style}, mood: ${p.mood}).
Topic being studied: ${T.title}. ${context ? 'They are on the section: ' + context + '.' : ''}
Their message: "${question}"
Reply in at most 90 words, plain friendly language, one concrete example or analogy. If they are off-topic or emotional, respond kindly and gently steer back. No headings.`;
        return await this.gemini(prompt);
      } catch (e) { console.warn(e); }
    }
    return this.localAnswer(question, T);
  },

  async evaluateChallenge(attempt, T, p) {
    if (this.has()) {
      try {
        return await this.gemini(`You are Nova, a supportive mentor. Challenge question on ${T.title}: "${T.challenge}". ${p.name}'s attempt: "${attempt}". In under 90 words: say what is right, gently correct what is off, and give the key idea. Encouraging tone.`);
      } catch (e) { console.warn(e); }
    }
    return `Love that you tried — thinking it through is the real workout. Compare your idea with the "Going deeper" part of this topic: ${T.deep[0] ? T.deep[0].replace(/\*\*/g, '') : ''}`;
  },

  /* Offline: find the most relevant sentence in the lesson */
  localAnswer(question, T) {
    const q = question.toLowerCase();
    const terms = Object.entries(T.keyTerms || {});
    const hit = terms.find(([k]) => q.includes(k.toLowerCase()));
    if (hit) return `**${hit[0]}** — ${hit[1]} ${T.eli5?.simple ? '\n\nIn simple words: ' + T.eli5.simple : ''}`;
    const stop = new Set('what why how when where which who is are the a an of to in on and or do does did i me my it this that for with be can you your about explain mean means not understand dont don\'t'.split(' '));
    const words = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
    const pool = [...T.simple, ...T.deep, T.story, ...T.steps, ...T.realLife, T.activity, ...Object.values(T.eli5 || {})]
      .join('\n').replace(/\*\*/g, '').split(/(?<=[.!?])\s+|\n+/).filter(s => s.length > 20);
    let best = null, score = 0;
    pool.forEach(s => { const l = s.toLowerCase(); const sc = words.reduce((a, w) => a + (l.includes(w) ? 1 : 0), 0); if (sc > score) { score = sc; best = s; } });
    if (best && score > 0) return `Good question! Here is the key bit: ${best}\n\nThink of it like this: ${T.eli5?.simple || ''}`;
    return `I want to get this right for you. In the simplest words: ${T.eli5?.simple || T.simple[0]}\n\nCan you tell me which word or step is the confusing one? (Tip: add an AI key in Settings and I can answer any question in detail.)`;
  }
};
