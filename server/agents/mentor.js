/* Mentor agent (Nova) — the 1-to-1 check-ins.
   Reads the current lesson + memory from shared state; never calls other agents directly. */
const { localAnswer } = require('../lib/lesson');

const SYSTEM = 'You are Nova, a kind, upbeat 1-to-1 learning mentor for students. Plain language, short, one concrete example or analogy. Use the learner memory to personalise. Never mention that you have a memory system or JSON.';

function sessionEvents(recent, sessionId) { return recent.filter(e => !sessionId || e.sessionId === sessionId); }

module.exports = {
  name: 'mentor',
  description: 'Greets, checks in, answers doubts and evaluates challenges, personalised from shared memory.',

  async handle(input, ctx) {
    const mem = await ctx.memory.context({ recent: 20 });
    const state = mem.state || {};
    const T = state.currentLesson;
    const p = state.profile || {};
    const name = p.name || (mem.model && mem.model.name) || 'there';

    switch (input.action) {
      case 'greet': {
        let text = `Hi ${name}! I built this ${T ? T.title : ''} lesson around you. I'll pop in now and then to ask how it's going — and you can tap my orb anytime.`;
        const st = mem.model && Object.keys(mem.model.struggles).find(s => T && s.includes(`(${T.title})`));
        if (st) text = `Hi ${name}! Welcome back to ${T.title}. Last time "${st.replace(/ \(.*\)$/, '')}" was tricky, so I've made it clearer this time. Tap me whenever something doesn't click.`;
        return { text };
      }

      case 'checkin': {
        // fast + deterministic so popups appear instantly; personalised from this session's raw events
        const ev = sessionEvents(mem.recent, ctx.sessionId);
        const lastConfused = [...ev].reverse().find(e => e.type === 'section.confused');
        const wasBored = ev.some(e => e.type === 'mood.signal' && e.data.mood === 'bored');
        const t = input.trigger;
        let text = null;
        if (t === 'idle' && lastConfused) text = `You've gone quiet, ${name}… is "${lastConfused.data.section}" still not going through? Tell me what's not clicking.`;
        else if (t === 'timer' && wasBored) text = `Checking in, ${name} — still feeling bored, or is it better now? What are you doing right now?`;
        else if (t === 'away' && wasBored) text = `Welcome back! Did the topic lose you again? Be honest — I can change how I'm teaching it.`;
        else if (t === 'timer' && lastConfused) text = `Hey ${name}, quick check — is "${lastConfused.data.section}" making more sense now? How's it going?`;
        return { text };
      }

      case 'answer': {
        const q = String(input.message || '').slice(0, 1000);
        await ctx.memory.record('mentor.question', { text: q, section: input.section || null, topic: T && T.title });
        let text, provider = 'offline';
        if (ctx.llm.available()) {
          try {
            const r = await ctx.llm.chat({
              system: SYSTEM,
              prompt: `Topic: ${T ? T.title : p.topic}. ${input.section ? `They are on the section "${input.section}".` : ''}
Lesson core: ${T ? (T.simple || []).join(' ').slice(0, 600) : ''}
Learner memory:\n${mem.text}\n
Their message: "${q}"
Reply in at most 90 words. If they're emotional or off-topic, respond kindly and steer back.`,
              maxTokens: 260, timeout: 20000
            });
            text = r.text; provider = r.provider;
          } catch (_) {}
        }
        if (!text) text = localAnswer(q, T);
        await ctx.memory.record('mentor.answer', { text: text.slice(0, 400), provider });
        return { text, provider };
      }

      case 'challenge': {
        const attempt = String(input.attempt || '').slice(0, 1500);
        await ctx.memory.record('challenge.attempt', { text: attempt, topic: T && T.title });
        if (ctx.llm.available() && T) {
          try {
            const r = await ctx.llm.chat({ system: SYSTEM, prompt: `Challenge on ${T.title}: "${T.challenge}". Learner's attempt: "${attempt}". In under 90 words: what's right, gently fix what's off, give the key idea.`, maxTokens: 260, timeout: 20000 });
            return { text: r.text, provider: r.provider };
          } catch (_) {}
        }
        return { text: `Love that you tried — thinking it through is the real workout. Compare your idea with this: ${T && T.deep && T.deep[0] ? T.deep[0].replace(/\*\*/g, '') : ''}`, provider: 'offline' };
      }
    }
    throw Object.assign(new Error('Unknown action for mentor'), { status: 400 });
  }
};
