/* LLM gateway — the ONE place that talks to AI providers.
   Every agent calls llm.chat()/llm.json(); providers are tried in order with automatic fallback. */
const cfg = require('./config');

const COMPAT = {
  groq: () => ({ url: 'https://api.groq.com/openai/v1/chat/completions', key: cfg.groq.key, model: cfg.groq.model }),
  openrouter: () => ({ url: 'https://openrouter.ai/api/v1/chat/completions', key: cfg.openrouter.key, model: cfg.openrouter.model }),
  ollama: () => ({ url: String(cfg.ollama.url || '').replace(/\/$/, '') + '/v1/chat/completions', key: 'ollama', model: cfg.ollama.model })
};
const cooldown = {}; // provider -> timestamp until which it is skipped after a failure

function configured(name) {
  if (name === 'gemini') return !!cfg.gemini.key;
  if (name === 'ollama') return !!cfg.ollama.url;
  return !!(cfg[name] && cfg[name].key);
}
const active = () => cfg.providers.filter(n => (COMPAT[n] || n === 'gemini') && configured(n));

async function post(url, headers, body, ms = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || `HTTP ${r.status}`);
    return d;
  } finally { clearTimeout(t); }
}

async function callCompat(name, { system, prompt, json, maxTokens, timeout }) {
  const c = COMPAT[name]();
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const body = { model: c.model, messages, temperature: 0.6, max_tokens: maxTokens || 1500 };
  if (json && name === 'groq') body.response_format = { type: 'json_object' };
  const headers = { Authorization: `Bearer ${c.key}` };
  if (name === 'openrouter') { headers['HTTP-Referer'] = 'http://localhost'; headers['X-Title'] = 'MindSpark'; }
  const d = await post(c.url, headers, body, timeout);
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '').trim();
}

async function callGemini({ system, prompt, json, maxTokens, timeout }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.gemini.model)}:generateContent?key=${encodeURIComponent(cfg.gemini.key)}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens || 2048 } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.responseMimeType = 'application/json';
  const d = await post(url, {}, body, timeout);
  return ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
}

async function chat(opts) {
  const errors = [];
  for (const name of active()) {
    if (cooldown[name] > Date.now()) continue;
    try {
      const text = name === 'gemini' ? await callGemini(opts) : await callCompat(name, opts);
      if (!text) throw new Error('empty response');
      return { text, provider: name };
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
      cooldown[name] = Date.now() + 20000;
    }
  }
  const err = new Error('No AI provider available' + (errors.length ? ` (${errors.join('; ')})` : ' — add a free key in .env'));
  err.noLLM = true;
  throw err;
}

function parseJSON(t) {
  t = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (_) {
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error('AI returned invalid JSON');
  }
}

async function json(opts) {
  const r = await chat({ ...opts, json: true, prompt: opts.prompt + '\n\nRespond with JSON only.' });
  return { data: parseJSON(r.text), provider: r.provider };
}

module.exports = {
  chat, json,
  available: () => active().some(n => !(cooldown[n] > Date.now())) || active().length > 0,
  status: () => cfg.providers.map(n => ({
    name: n, configured: configured(n),
    model: n === 'ollama' ? cfg.ollama.model : (cfg[n] && cfg[n].model),
    coolingDown: cooldown[n] > Date.now()
  }))
};
