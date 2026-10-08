/* Profiler agent — understands WHO the learner is.
   Reads shared memory to recognise returning learners; writes the new profile to shared memory. */
module.exports = {
  name: 'profiler',
  description: 'Greets returning learners from memory and turns the Talk-page answers into a stored learner profile.',

  async handle(input, ctx) {
    const { model, top } = await ctx.memory.context();

    if (input.action === 'greet') {
      if (!model || !model.sessions) return { returning: false };
      const last = model.lastProfile || {};
      const lastQuiz = model.quiz[model.quiz.length - 1];
      const struggle = top(model.struggles, 1)[0];
      let text = `Welcome back, ${model.name}! 💜`;
      if (last.topic) text += ` Last time we did ${last.topic}${lastQuiz && lastQuiz.topic === last.topic ? ` and you scored ${lastQuiz.score}/${lastQuiz.total}` : ''}.`;
      if (struggle) text += ` I remember "${struggle.replace(/ \(.*\)$/, '')}" was tricky — we can revisit it anytime.`;
      if (ctx.llm.available()) {
        try {
          text = (await ctx.llm.chat({
            system: 'You are Nova, a warm learning mentor. Use only the memory given. Max 2 sentences, one emoji at most.',
            prompt: `Welcome this returning learner back, referencing something specific from memory:\n${(await ctx.memory.context()).text}`,
            maxTokens: 120, timeout: 8000
          })).text;
        } catch (_) { /* heuristic text stays */ }
      }
      return { returning: true, name: model.name, text, lastProfile: last };
    }

    if (input.action === 'set') {
      const p = input.profile || {};
      await ctx.memory.record('profile.set', { profile: p });
      await ctx.memory.setState({ profile: p, sessionStartedAt: Date.now() });
      await ctx.learner.update({ name: p.name, lastTopic: p.topic });
      const notes = [];
      if (model) {
        const helped = top(model.styles.helped, 1)[0];
        const styleWord = { story: 'story', diagram: 'visual', visual: 'visual', steps: 'step-by-step', activity: 'hands-on', hands: 'hands-on' };
        if (helped && styleWord[helped] && styleWord[helped] !== styleWord[p.style]) notes.push(`Last time, ${styleWord[helped]} explanations helped you most — I'll mix one in.`);
        const t = model.topics[p.topic];
        if (t && t.lastScore !== null) notes.push(`Your last ${p.topic} quiz was ${Math.round(t.lastScore * 100)}% — let's beat it.`);
        const st = Object.keys(model.struggles).find(s => s.includes(`(${p.topic})`));
        if (st) notes.push(`I'll go extra slow on "${st.replace(/ \(.*\)$/, '')}", which tripped you up before.`);
      }
      return { notes };
    }
    throw Object.assign(new Error('Unknown action for profiler'), { status: 400 });
  }
};
