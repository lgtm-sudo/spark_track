# MindSpark — independent AI agents, one shared smart memory

Hackathon prototype for the **Personalized Engagement & Learning Innovation Challenge**.

Learners talk with Nova → get a lesson built for them → Nova checks in one-to-one while they study → an adaptive quiz → and everything that happened is saved as raw data and summarised into a memory that every agent uses next time.

## Run it (2 minutes)

Needs **Node.js 18+**. No `npm install` — there are zero dependencies.

```bash
cd mindspark
cp .env.example .env        # optional: add one free AI key (see below)
npm start                   # or: node server/server.js
```

Open **http://localhost:8000**.

Without any key it still works: the 4 library topics run offline and memory is summarised by a built-in rule-based summariser. Add a key to unlock any topic and AI-written memory summaries.

## Free AI APIs (pick at least one)

| Provider | Why | Get a key | `.env` |
|---|---|---|---|
| **Groq** | Free plan, no card, extremely fast. Best default. | console.groq.com/keys | `GROQ_API_KEY=` |
| **Google Gemini** | Generous free tier in AI Studio, great JSON output. | aistudio.google.com/apikey | `GEMINI_API_KEY=` |
| **OpenRouter** | One key, many free models (ids ending in `:free`). | openrouter.ai/keys | `OPENROUTER_API_KEY=` |
| **Ollama** | 100% free and offline on your own laptop. | ollama.com, then `ollama pull llama3.2` | `OLLAMA_URL=http://localhost:11434` |

Add two of them and you get automatic fallback: if Groq hits its rate limit, the next provider in `LLM_PROVIDERS` answers instead. Free-tier limits and model names change often — check the provider's console if a model stops working and update `*_MODEL` in `.env`.

## Architecture

```
                         ┌──────────── Browser (public/) ────────────┐
                         │  Home → Talk → Learn (+ Nova popup) → Quiz │
                         │  Voice in/out (Web Speech) — stays local   │
                         └───────────────┬────────────────────────────┘
                                         │  ONE API  (/api/*)
┌────────────────────────────────────────▼─────────────────────────────────────┐
│ server/server.js                                                             │
│                                                                              │
│   ┌──────────┐  ┌────────┐  ┌────────┐  ┌──────┐      agents never call      │
│   │ profiler │  │ tutor  │  │ mentor │  │ quiz │      each other directly    │
│   └────┬─────┘  └───┬────┘  └───┬────┘  └──┬───┘                             │
│        └────────────┴─── read / write ─────┘                                 │
│                          ▼                                                   │
│   ┌────────────── SHARED MEMORY (memory/) ──────────────┐   ┌──────────────┐ │
│   │ 1 RAW events     events.jsonl  (append-only)        │   │  llm.js      │ │
│   │ 2 Summaries      every 12 events, AI-compressed  ◄──┼───┤  Groq →      │ │
│   │ 3 Learner model  long-term facts + portrait         │   │  Gemini →    │ │
│   │   Shared state   current profile + current lesson   │   │  OpenRouter →│ │
│   └─────────────────────────────────────────────────────┘   │  Ollama      │ │
│                                                             └──────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Independent agents, shared memory (blackboard pattern).** Each agent is its own file in `server/agents/`. They don't import each other. They cooperate only through memory: the profiler writes the profile, the tutor reads it and publishes the lesson, the mentor reads the lesson plus memory to answer doubts, the quiz agent reads everything and writes the result. You can replace or add an agent without touching the others.

**Smart memory, three layers.**
1. **Raw** — every click, answer, check-in, mood signal, question, quiz answer and agent call, saved untouched in `data/learners/<id>/events.jsonl`.
2. **Summaries** — after every 12 new events (and at the end of each quiz), the memory agent compresses the batch into a short episode. With an AI key the LLM writes it; without one, a rule-based summariser does.
3. **Learner model** — facts merged across all sessions: topics and best scores, what they struggle with, which explanation styles helped, mood pattern, engagement, interests, a written portrait, and next steps. Old summaries are folded into the portrait so memory never grows forever.

Every agent gets the same compact `context()` — long-term model + latest summary + recent raw events — before it acts.

**What memory changes for the learner:**
- Returning learners are greeted by name with what they did and what was tricky last time.
- The lesson automatically adds the explanation style that helped before.
- Nova's check-ins reference what happened this session ("Is the Calvin cycle making more sense now?").
- The quiz starts harder if they aced it before, and the report compares with last time.

**Voice** (speech-to-text and text-to-speech) runs in the browser, so it works without the server; what is said is still saved to memory as text.

## The `/memory.html` page

Shows raw event count, summaries (and which AI wrote them), the long-term portrait, and the latest raw events. Buttons: *Summarise now* and *Delete my data*. Great for showing judges how the memory works.

## API

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Providers, agents, status |
| POST | `/api/learners` | Create or resume learner, start session → `{learnerId, sessionId}` |
| POST | `/api/events` | Save raw events `{learnerId, sessionId, events:[{type,data}]}` |
| GET | `/api/memory/:id` | Model + summaries + recent raw events |
| GET | `/api/memory/:id/raw?limit=200` | Raw events |
| POST | `/api/memory/:id/summarize` | Run the smart-memory summariser now |
| DELETE | `/api/memory/:id` | Delete everything about the learner |
| GET | `/api/agents` | List agents |
| POST | `/api/agents/:name` | Run `profiler`, `tutor`, `mentor` or `quiz` |

Agent actions: `profiler {action: greet|set}`, `tutor {topic, topicId, profile}`, `mentor {action: greet|checkin|answer|challenge}`, `quiz {action: start|report}`.

## Offline / browser-only mode

If the server isn't running (e.g. someone double-clicks `public/index.html`), the site still works on its own: library topics, scripted mentor, local quiz, and an optional Gemini key in ⚙ Settings.

## Files

```
mindspark/
├── package.json · .env.example
├── server/
│   ├── server.js            one HTTP API + static frontend
│   ├── config.js            .env loader
│   ├── llm.js               single AI gateway with provider fallback
│   ├── memory/store.js      raw data store (files)
│   ├── memory/memoryAgent.js  smart memory: summaries + learner model
│   ├── lib/lesson.js        lesson prompt, validation, offline answers
│   └── agents/              profiler.js · tutor.js · mentor.js · quiz.js · registry.js
├── public/                  frontend (index, talk, learn, quiz, memory pages)
└── data/                    created at runtime — learner raw data and memory
```

## Adding a topic

Add an object to `public/js/knowledge.js`. It appears on the home page and works offline for both the browser and the server.
