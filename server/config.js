/* Config — reads .env (no dotenv dependency needed) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

(function loadEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const e = process.env;
module.exports = {
  ROOT,
  PORT: +e.PORT || 8000,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR: path.resolve(ROOT, e.DATA_DIR || 'data'),

  // Smart memory
  SUMMARIZE_EVERY: +e.SUMMARIZE_EVERY || 12, // summarise after this many new raw events
  KEEP_SUMMARIES: +e.KEEP_SUMMARIES || 6,    // older summaries are folded into the long-term narrative

  // LLM providers, tried in this order; any that has no key is skipped
  providers: (e.LLM_PROVIDERS || 'groq,gemini,openrouter,ollama').split(',').map(s => s.trim()).filter(Boolean),
  groq: { key: e.GROQ_API_KEY, model: e.GROQ_MODEL || 'llama-3.3-70b-versatile' },
  gemini: { key: e.GEMINI_API_KEY, model: e.GEMINI_MODEL || 'gemini-2.5-flash' },
  openrouter: { key: e.OPENROUTER_API_KEY, model: e.OPENROUTER_MODEL || 'openrouter/free' },
  ollama: { url: e.OLLAMA_URL, model: e.OLLAMA_MODEL || 'llama3.2' }
};
