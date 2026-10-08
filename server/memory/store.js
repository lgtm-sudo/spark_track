/* Raw data store — zero dependencies, plain files you can open and inspect.
   data/learners/<id>/
     learner.json   identity (name, created, sessions)
     events.jsonl   RAW memory: every event from every agent, append-only, never edited
     meta.json      event counter
     memory.json    SMART memory: summaries + long-term learner model (built by memoryAgent)
     state.json     shared working state (current profile, current lesson) all agents can read */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('../config');

const locks = new Map();
function lock(id, fn) {
  const prev = locks.get(id) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(id, next.catch(() => {}));
  return next;
}
const safe = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
const dir = id => path.join(DATA_DIR, 'learners', safe(id));
const file = (id, f) => path.join(dir(id), f);

async function readJSON(f, d) { try { return JSON.parse(await fsp.readFile(f, 'utf8')); } catch (_) { return d; } }
async function writeJSON(f, v) {
  await fsp.mkdir(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(v, null, 2));
  await fsp.rename(tmp, f);
}

const Store = {
  newId: prefix => `${prefix}_${crypto.randomBytes(6).toString('hex')}`,
  safe,
  exists: id => !!safe(id) && fs.existsSync(file(id, 'learner.json')),

  getLearner: id => readJSON(file(id, 'learner.json'), null),
  saveLearner: (id, obj) => lock(id, () => writeJSON(file(id, 'learner.json'), obj)),
  async listLearners() {
    try {
      const ids = await fsp.readdir(path.join(DATA_DIR, 'learners'));
      return (await Promise.all(ids.map(i => Store.getLearner(i)))).filter(Boolean);
    } catch (_) { return []; }
  },

  appendEvents(id, events) {
    return lock(id, async () => {
      await fsp.mkdir(dir(id), { recursive: true });
      await fsp.appendFile(file(id, 'events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
      const m = await readJSON(file(id, 'meta.json'), { count: 0 });
      m.count += events.length;
      await writeJSON(file(id, 'meta.json'), m);
      return m.count;
    });
  },
  async readEvents(id, { from = 0, limit = Infinity, last } = {}) {
    let lines;
    try { lines = (await fsp.readFile(file(id, 'events.jsonl'), 'utf8')).split('\n').filter(Boolean); } catch (_) { return []; }
    const slice = last ? lines.slice(-last) : lines.slice(from, from + limit);
    return slice.map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  },
  eventCount: async id => (await readJSON(file(id, 'meta.json'), { count: 0 })).count,

  getMemory: id => readJSON(file(id, 'memory.json'), { cursor: 0, summaries: [], model: null, updatedAt: null }),
  saveMemory: (id, m) => lock(id, () => writeJSON(file(id, 'memory.json'), m)),

  getState: id => readJSON(file(id, 'state.json'), {}),
  setState: (id, patch) => lock(id, async () => {
    const s = await readJSON(file(id, 'state.json'), {});
    Object.assign(s, patch, { updatedAt: Date.now() });
    await writeJSON(file(id, 'state.json'), s);
    return s;
  }),

  wipe: id => lock(id, () => fsp.rm(dir(id), { recursive: true, force: true }))
};

module.exports = Store;
