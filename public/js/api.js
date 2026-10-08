/* MindSpark — client for the backend API.
   If the server isn't running, every call returns null and pages fall back to offline mode. */
const Backend = {
  base: location.protocol.startsWith('http') ? '' : 'http://localhost:8000',
  online: false, llmReady: false, queue: [], _ready: null, _t: null,
  get learnerId() { return Store.get('learnerId'); },
  get sessionId() { return Store.get('sessionId'); },

  async req(method, url, body, timeout = 8000) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeout);
    try {
      const r = await fetch(this.base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: c.signal });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
      return d;
    } finally { clearTimeout(t); }
  },

  check() {
    if (!this._ready) this._ready = this.req('GET', '/api/health', null, 2500)
      .then(d => { this.online = true; this.llmReady = !!d.llmReady; this.health = d; return true; })
      .catch(() => { this.online = false; return false; });
    return this._ready;
  },

  /* create or resume the learner; one session per Talk conversation */
  async startSession(name) {
    if (!(await this.check())) return null;
    try {
      const d = await this.req('POST', '/api/learners', { learnerId: this.learnerId, name });
      Store.set('learnerId', d.learnerId); Store.set('sessionId', d.sessionId); this.sessionStarted = true;
      return d;
    } catch (e) { return null; }
  },

  /* RAW event — batched, sent every 1.5 s and on page exit */
  track(type, data = {}) {
    if (!this.learnerId) return;
    this.queue.push({ type, data, agent: 'client', sessionId: this.sessionId, ts: Date.now() });
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 1500);
  },
  async flush(beacon) {
    if (!this.queue.length || !this.learnerId) return;
    if (!beacon && !(await this.check())) return;
    if (!this.online) return;
    const events = this.queue.splice(0);
    const payload = { learnerId: this.learnerId, sessionId: this.sessionId, events };
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(this.base + '/api/events', new Blob([JSON.stringify(payload)], { type: 'text/plain' })); return; }
    try { await this.req('POST', '/api/events', payload); } catch (e) { this.queue.unshift(...events); }
  },

  /* run an agent on the server; null means "use the offline fallback" */
  async agent(name, payload = {}, timeout = 20000) {
    if (!this.learnerId || !(await this.check())) return null;
    try {
      await this.flush();
      return await this.req('POST', '/api/agents/' + name, { learnerId: this.learnerId, sessionId: this.sessionId, ...payload }, timeout);
    } catch (e) { console.warn(`[${name} agent]`, e.message); return { error: e.message }; }
  },

  memory() { return this.learnerId ? this.req('GET', '/api/memory/' + this.learnerId) : Promise.reject(new Error('No learner yet')); },
  summarize() { return this.req('POST', `/api/memory/${this.learnerId}/summarize`, {}, 60000); },
  async forget() { await this.req('DELETE', '/api/memory/' + this.learnerId); Store.del('learnerId'); Store.del('sessionId'); }
};
addEventListener('pagehide', () => Backend.flush(true));
Backend.check();
