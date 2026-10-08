/* Lesson schema helpers shared by the tutor and mentor agents */
const cap = s => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

function lessonPrompt(topic, p, memoryText) {
  return `Create a personalised mini-lesson about "${topic}".
Learner profile: name ${p.name}; mood ${p.mood}; prior knowledge ${p.level} (new=never heard, little, decent, pro=wants challenge); preferred style ${p.style}; goal ${p.goal}; time ${p.time} minutes.
What we remember about this learner:
${memoryText}
Use the memory: avoid explanations that confused them before, lean on styles that helped, connect to their interests.
Match vocabulary to prior knowledge. Short friendly sentences. **bold** key words. \`\`\` fences only for code.
Return JSON with exactly these keys:
{"title":string,"emoji":string,"subject":string,"hook":string,"funFact":string,
"simple":[2-3 short paragraphs],"deep":[2 paragraphs, more advanced],
"story":string (relatable story/analogy, paragraphs separated by \\n\\n),
"steps":[4-6 strings],"diagram":[4-6 very short flow labels, each starting with an emoji],
"activity":string (hands-on, no special equipment),
"realLife":[3 strings],"keyTerms":{"term":"short definition"} (4-6 items),
"eli5":{"simple":string,"deep":string,"story":string,"steps":string,"diagram":string,"activity":string},
"challenge":string,"examTips":[3 strings],
"quiz":[8 objects {"q":string,"options":[4 strings],"answer":0-3,"explain":string,"level":1|2|3}] (3 level-1, 3 level-2, 2 level-3, answers spread across positions)}`;
}

function validateLesson(t, topic) {
  const arr = x => Array.isArray(x) ? x.filter(Boolean).map(String) : [];
  const out = {
    id: null, title: t.title || cap(topic), emoji: t.emoji || '✨', subject: t.subject || 'Topic',
    hook: t.hook || '', funFact: t.funFact || '', simple: arr(t.simple), deep: arr(t.deep), story: t.story || '',
    steps: arr(t.steps), diagram: arr(t.diagram), activity: t.activity || '', realLife: arr(t.realLife),
    keyTerms: (t.keyTerms && typeof t.keyTerms === 'object') ? t.keyTerms : {}, eli5: t.eli5 || {},
    challenge: t.challenge || '', examTips: arr(t.examTips), aliases: [],
    quiz: (Array.isArray(t.quiz) ? t.quiz : [])
      .filter(q => q && q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(+q.answer) && +q.answer >= 0 && +q.answer < q.options.length)
      .map(q => ({ q: String(q.q), options: q.options.map(String), answer: +q.answer, explain: String(q.explain || ''), level: [1, 2, 3].includes(+q.level) ? +q.level : 2 }))
  };
  if (!out.simple.length || out.quiz.length < 5) throw new Error('The AI returned an incomplete lesson. Try again.');
  return out;
}

/* offline doubt-solver: best matching sentence from the lesson */
function localAnswer(question, T) {
  if (!T) return 'Tell me which word or step feels confusing and I\'ll break it down.';
  const q = String(question).toLowerCase();
  const hit = Object.entries(T.keyTerms || {}).find(([k]) => q.includes(k.toLowerCase()));
  if (hit) return `**${hit[0]}** — ${hit[1]}${T.eli5 && T.eli5.simple ? '\n\nIn simple words: ' + T.eli5.simple : ''}`;
  const stop = new Set('what why how when where which who is are the a an of to in on and or do does did i me my it this that for with be can you your about explain mean means not understand dont'.split(' '));
  const words = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  const pool = [...(T.simple || []), ...(T.deep || []), T.story || '', ...(T.steps || []), ...(T.realLife || []), T.activity || '', ...Object.values(T.eli5 || {})]
    .join('\n').replace(/\*\*/g, '').split(/(?<=[.!?])\s+|\n+/).filter(s => s.length > 20);
  let best = null, score = 0;
  pool.forEach(s => { const l = s.toLowerCase(); const sc = words.reduce((a, w) => a + (l.includes(w) ? 1 : 0), 0); if (sc > score) { score = sc; best = s; } });
  if (best) return `Good question! Here's the key bit: ${best}\n\nThink of it like this: ${(T.eli5 && T.eli5.simple) || ''}`;
  return `In the simplest words: ${(T.eli5 && T.eli5.simple) || (T.simple || [''])[0]}\n\nWhich word or step is the confusing one?`;
}

module.exports = { lessonPrompt, validateLesson, localAnswer };
