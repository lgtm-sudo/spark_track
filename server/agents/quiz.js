/* Quiz agent — sets the starting difficulty from memory and writes the end-of-quiz report.
   Forces a memory summary at the end so the next session starts with up-to-date memory. */
module.exports = {
  name: 'quiz',
  description: 'Picks the starting difficulty from memory and writes a cross-session progress report.',

  async handle(input, ctx) {
    const state = await ctx.memory.state();
    const p = state.profile || {};
    const T = state.currentLesson;
    const topic = input.topic || (T && T.title) || p.topic;

    if (input.action === 'start') {
      const mem = await ctx.memory.context();
      let level = { new: 1, little: 1, decent: 2, pro: 3 }[p.level] || 1;
      let message = '';
      const t = mem.model && mem.model.topics[topic];
      if (t && t.bestScore !== null) {
        if (t.bestScore >= 0.8) { level = Math.min(3, level + 1); message = `Your best on this was ${Math.round(t.bestScore * 100)}%, so I'm starting a bit harder.`; }
        else message = `Last time you got ${Math.round(t.lastScore * 100)}%. Let's beat that.`;
      }
      const sessionConf = mem.recent.filter(e => e.type === 'section.confused' && (!ctx.sessionId || e.sessionId === ctx.sessionId)).length;
      if (sessionConf >= 2 && level > 1) { level--; message = message || 'You worked through some tricky parts, so we\'ll warm up first.'; }
      return { startLevel: level, message };
    }

    if (input.action === 'report') {
      const score = +input.score || 0, total = +input.total || 5;
      await ctx.memory.record('quiz.result', { topic, score, total, hints: +input.hints || 0 });
      await ctx.memory.summarize(); // fold this whole session into smart memory now
      const mem = await ctx.memory.context();
      const m = mem.model;
      const insights = [], nextSteps = [];
      if (m) {
        const history = m.quiz.filter(q => q.topic === topic);
        if (history.length >= 2) {
          const prev = history[history.length - 2];
          insights.push(score > prev.score ? `Up from ${prev.score}/${prev.total} last time on ${topic}. Real progress.` : score === prev.score ? `Same as last time (${prev.score}/${prev.total}) — steady. One more push.` : `Lower than last time (${prev.score}/${prev.total}) — totally normal on a harder set.`);
        }
        if (m.sessions > 1) insights.push(`That's ${m.sessions} sessions together across ${Object.keys(m.topics).length} topic(s).`);
        const helped = mem.top(m.styles.helped, 1)[0];
        if (helped) insights.push(`Across sessions, ${helped} explanations have helped you most.`);
        const st = mem.top(m.struggles, 1)[0];
        if (st) nextSteps.push(`Revisit "${st}" — it's come up more than anything else.`);
        nextSteps.push(...(m.nextSteps || []));
      }
      let provider = 'memory';
      if (ctx.llm.available()) {
        try {
          const { data, provider: pv } = await ctx.llm.json({
            system: 'You are Nova, a supportive learning mentor writing a short end-of-session report.',
            prompt: `Quiz: ${score}/${total} on ${topic}.\nLearner memory:\n${mem.text}\nReturn JSON {"insights":[2-3 short, specific observations using the memory],"nextSteps":[2 concrete suggestions]}. Second person, encouraging, no fluff.`,
            maxTokens: 400, timeout: 20000
          });
          if (Array.isArray(data.insights)) insights.unshift(...data.insights.map(String));
          if (Array.isArray(data.nextSteps)) nextSteps.unshift(...data.nextSteps.map(String));
          provider = pv;
        } catch (_) {}
      }
      return {
        insights: [...new Set(insights)].slice(0, 5),
        nextSteps: [...new Set(nextSteps)].slice(0, 4),
        summary: mem.lastSummary && mem.lastSummary.text,
        narrative: m && m.narrative,
        provider
      };
    }
    throw Object.assign(new Error('Unknown action for quiz'), { status: 400 });
  }
};
