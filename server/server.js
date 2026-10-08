/* MindSpark API — one server, one API, zero npm dependencies (Node 18+).
   Serves the frontend from /public and exposes:
     GET    /api/health                      status of providers, agents, storage
     POST   /api/learners                    create or resume a learner, start a session
     GET    /api/learners                    list learners (dashboard)
     POST   /api/events                      save RAW events (batched)
     GET    /api/memory/:id                  smart memory: model + summaries + recent raw
     GET    /api/memory/:id/raw?limit=200    raw events
     POST   /api/memory/:id/summarize        force the smart-memory summariser
     DELETE /api/memory/:id                  delete everything about a learner
     GET    /api/agents                      list agents
     POST   /api/agents/:name                run an agent (profiler | tutor | mentor | quiz) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const Store = require('./memory/store');
const Memory = require('./memory/memoryAgent');
const llm = require('./llm');
const agents = require('./agents/registry');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' };

const httpError = (status, msg) => Object.assign(new Error(msg), { status });
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', ...CORS }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((ok, bad) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 1e6) { bad(httpError(413, 'Body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return ok({}); try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { bad(httpError(400, 'Invalid JSON')); } });
    req.on('error', bad);
  });
}
function needLearner(id) { if (!Store.exists(id)) throw httpError(404, 'Unknown learner — call POST /api/learners first'); return Store.safe(id); }

const routes = [
  ['GET', /^\/api\/health$/, async () => ({ ok: true, llmReady: llm.available(), llm: llm.status(), agents: agents.list(), storage: 'files', summarizeEvery: cfg.SUMMARIZE_EVERY })],

  ['POST', /^\/api\/learners$/, async (req, m, body) => {
    let id = body.learnerId && Store.exists(body.learnerId) ? Store.safe(body.learnerId) : null;
    const known = !!id;
    if (!id) { id = Store.newId('lrn'); await Store.saveLearner(id, { id, name: body.name || null, createdAt: Date.now(), sessions: 0 }); }
    const learner = await Store.getLearner(id);
    if (body.name && !learner.name) learner.name = body.name;
    learner.sessions = (learner.sessions || 0) + 1; learner.lastSeen = Date.now();
    await Store.saveLearner(id, learner);
    const sessionId = Store.newId('ses');
    if (known) await Memory.summarize(id, { force: true }).catch(() => {}); // fold the previous session into memory
    await Memory.ingest(id, [{ type: 'session.start', agent: 'server', sessionId, data: { ua: String(req.headers['user-agent'] || '').slice(0, 120) } }]);
    return { learnerId: id, sessionId, known, name: learner.name };
  }],

  ['GET', /^\/api\/learners$/, async () => ({ learners: await Store.listLearners() })],

  ['POST', /^\/api\/events$/, async (req, m, body) => {
    const id = needLearner(body.learnerId);
    const events = (body.events || []).map(e => ({ ...e, sessionId: e.sessionId || body.sessionId }));
    return { saved: events.length, total: await Memory.ingest(id, events) };
  }],

  ['GET', /^\/api\/memory\/([\w-]+)$/, async (req, m) => {
    const id = needLearner(m[1]);
    const [learner, mem, state, count, recent] = await Promise.all([Store.getLearner(id), Store.getMemory(id), Store.getState(id), Store.eventCount(id), Store.readEvents(id, { last: 50 })]);
    const { currentLesson, ...stateLite } = state;
    return { learner, model: mem.model, summaries: mem.summaries, cursor: mem.cursor, pending: count - mem.cursor, eventCount: count, state: { ...stateLite, currentLesson: currentLesson ? currentLesson.title : null }, recent };
  }],

  ['GET', /^\/api\/memory\/([\w-]+)\/raw$/, async (req, m, body, url) => {
    const id = needLearner(m[1]);
    const limit = Math.min(1000, +url.searchParams.get('limit') || 200);
    return { events: await Store.readEvents(id, { last: limit }) };
  }],

  ['POST', /^\/api\/memory\/([\w-]+)\/summarize$/, async (req, m) => {
    const id = needLearner(m[1]);
    const r = await Memory.summarize(id, { force: true });
    return r.skipped ? r : { ok: true, summaries: r.summaries.length, model: r.model };
  }],

  ['DELETE', /^\/api\/memory\/([\w-]+)$/, async (req, m) => { const id = needLearner(m[1]); await Store.wipe(id); return { deleted: true }; }],

  ['GET', /^\/api\/agents$/, async () => ({ agents: agents.list() })],

  ['POST', /^\/api\/agents\/(\w+)$/, async (req, m, body) => {
    const id = needLearner(body.learnerId);
    return agents.run(m[1], id, body.sessionId || null, body);
  }]
];

function serveStatic(req, res, pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.normalize(path.join(cfg.PUBLIC_DIR, p));
  if (!full.startsWith(cfg.PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
  const route = routes.find(([method, re]) => method === req.method && re.test(url.pathname));
  if (!route) return send(res, 404, { error: 'No such endpoint' });
  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const out = await route[2](req, url.pathname.match(route[1]), body, url);
    send(res, 200, out);
  } catch (e) {
    if (!e.status) console.error('[api]', e);
    send(res, e.status || (e.noLLM ? 503 : 500), { error: e.message || 'Server error' });
  }
});

server.listen(cfg.PORT, () => {
  const ready = llm.status().filter(p => p.configured).map(p => p.name);
  console.log(`\n  MindSpark running →  http://localhost:${cfg.PORT}`);
  console.log(`  AI providers:  ${ready.length ? ready.join(' → ') : 'none (offline mode: library topics + heuristic memory)'}`);
  console.log(`  Raw data in:   ${cfg.DATA_DIR}\n`);
});
