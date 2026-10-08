/* Agent registry — agents are independent modules. They never import or call each other.
   The ONLY thing they share is memory (blackboard pattern): each gets a scoped handle to the
   same learner memory, the same LLM gateway, and the same topic library. */
const Store = require('../memory/store');
const Memory = require('../memory/memoryAgent');
const llm = require('../llm');
const kb = require('../../public/js/knowledge.js');

const AGENTS = {};
for (const name of ['profiler', 'tutor', 'mentor', 'quiz']) {
  const a = require('./' + name);
  AGENTS[a.name] = a;
}

function contextFor(learnerId, sessionId, agentName) {
  return {
    learnerId, sessionId, llm, kb,
    memory: {
      context: opts => Memory.context(learnerId, opts),
      record: (type, data) => Memory.ingest(learnerId, [{ type, data, agent: agentName, sessionId }]),
      state: () => Store.getState(learnerId),
      setState: patch => Store.setState(learnerId, patch),
      summarize: () => Memory.summarize(learnerId, { force: true })
    },
    learner: {
      get: () => Store.getLearner(learnerId),
      async update(patch) {
        const l = (await Store.getLearner(learnerId)) || { id: learnerId, createdAt: Date.now() };
        Object.assign(l, patch, { updatedAt: Date.now() });
        await Store.saveLearner(learnerId, l);
        return l;
      }
    }
  };
}

async function run(name, learnerId, sessionId, input) {
  const agent = AGENTS[name];
  if (!agent) throw Object.assign(new Error(`No agent called "${name}"`), { status: 404 });
  const started = Date.now();
  const ctx = contextFor(learnerId, sessionId, name);
  try {
    return await agent.handle(input, ctx);
  } finally {
    // every agent call is itself raw data
    Memory.ingest(learnerId, [{ type: 'agent.call', agent: name, sessionId, data: { action: input.action || null, ms: Date.now() - started } }]).catch(() => {});
  }
}

module.exports = {
  run,
  list: () => Object.values(AGENTS).map(a => ({ name: a.name, description: a.description }))
};
