/* MindSpark — memory dashboard: raw data → summaries → long-term learner model */
renderNav(-1);
const root = $('#mem');
const when = ts => ts ? new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const topList = (o, n = 4) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n);

async function load() {
  if (!(await Backend.check())) {
    root.innerHTML = `<h1>What Nova remembers</h1><div class="panel" style="margin-top:20px">
      <h3>The server isn't running</h3>
      <p class="muted" style="margin-top:6px">Shared memory lives on the backend. Open a terminal in the project folder and run <code>npm start</code>, then open <code>http://localhost:8000</code>.</p></div>`;
    return;
  }
  if (!Backend.learnerId) {
    root.innerHTML = `<h1>What Nova remembers</h1><div class="panel" style="margin-top:20px"><h3>No memory yet</h3>
      <p class="muted" style="margin:6px 0 16px">Have a conversation with Nova first.</p><a class="btn btn-p" href="talk.html">Talk to Nova</a></div>`;
    return;
  }
  let d;
  try { d = await Backend.memory(); }
  catch (e) { root.innerHTML = `<h1>What Nova remembers</h1><p class="muted">${esc(e.message)}</p>`; return; }
  render(d);
}

function render(d) {
  const m = d.model;
  const sums = [...(d.summaries || [])].reverse();
  root.innerHTML = `
    <h1>What Nova remembers${d.learner && d.learner.name ? ` about ${esc(d.learner.name)}` : ''}</h1>
    <p class="muted">Every agent — profiler, tutor, mentor, quiz — reads and writes this same memory. Voice stays in your browser.</p>

    <div class="layers">
      <div class="panel layer"><div class="big">${d.eventCount}</div><h3>Raw events</h3><p>Everything that happened, saved as-is. ${d.pending} waiting to be summarised.</p></div>
      <div class="panel layer"><div class="big">${(d.summaries || []).length}</div><h3>Summaries</h3><p>The AI compresses raw events into short episodes. Older ones fold into the portrait.</p></div>
      <div class="panel layer"><div class="big">${m ? m.sessions : 0}</div><h3>Sessions in the long-term model</h3><p>Facts merged across every session: struggles, strengths, what helps.</p></div>
    </div>

    <div class="actions">
      <button class="btn btn-p" id="sumBtn">Summarise now</button>
      <button class="btn btn-g" id="refBtn">Refresh</button>
      <button class="btn btn-g" id="delBtn">Delete my data</button>
    </div>

    <div class="grid2">
      <div class="panel">
        <h3 style="margin-bottom:8px">Portrait</h3>
        <p>${m && m.narrative ? esc(m.narrative) : '<span class="muted">Not built yet — press "Summarise now" after a lesson.</span>'}</p>
        ${m ? `<div style="margin-top:14px">
          <div class="kv"><span>Topics</span><span>${Object.entries(m.topics).map(([t, v]) => `${esc(t)}${v.bestScore !== null ? ` (${Math.round(v.bestScore * 100)}%)` : ''}`).join(', ') || '—'}</span></div>
          <div class="kv"><span>Struggles with</span><span>${topList(m.struggles).map(([k, v]) => `${esc(k)} ×${v}`).join(', ') || '—'}</span></div>
          <div class="kv"><span>Styles that helped</span><span>${topList(m.styles.helped).map(([k, v]) => `${esc(k)} ×${v}`).join(', ') || '—'}</span></div>
          <div class="kv"><span>Moods</span><span>${topList(m.moods).map(([k, v]) => `${esc(k)} ×${v}`).join(', ') || '—'}</span></div>
          <div class="kv"><span>Engagement</span><span>${Object.entries(m.engagement).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</span></div>
          <div class="kv"><span>Quiz history</span><span>${m.quiz.slice(-4).map(q => `${esc(q.topic)} ${q.score}/${q.total}`).join(', ') || '—'}</span></div>
          ${m.interests.length ? `<div class="kv"><span>Interests</span><span>${m.interests.map(esc).join(', ')}</span></div>` : ''}
          ${m.effectiveStrategies.length ? `<div class="kv"><span>What works</span><span>${m.effectiveStrategies.map(esc).join('; ')}</span></div>` : ''}
          <div class="kv"><span>Last seen</span><span>${when(m.lastSeen)}</span></div>
        </div>` : ''}
      </div>
      <div class="panel">
        <h3 style="margin-bottom:4px">Summaries</h3>
        <div class="scroll">${sums.length ? sums.map(s => `<div class="sum"><small>${when(s.createdAt)} · ${s.eventCount} events · by ${esc(s.by)}</small><p style="margin-top:4px">${esc(s.text)}</p></div>`).join('') : '<p class="muted">None yet.</p>'}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <h3 style="margin-bottom:8px">Raw events (latest 50)</h3>
      <div class="scroll"><table>
        <thead><tr><th>Time</th><th>Agent</th><th>Event</th><th>Data</th></tr></thead>
        <tbody>${[...(d.recent || [])].reverse().map(e => `<tr><td>${new Date(e.ts).toLocaleTimeString()}</td><td><span class="tag">${esc(e.agent)}</span></td><td>${esc(e.type)}</td><td><code>${esc(JSON.stringify(e.data)).slice(0, 220)}</code></td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;

  $('#refBtn').onclick = load;
  $('#sumBtn').onclick = async () => {
    const b = $('#sumBtn'); b.disabled = true; b.textContent = 'Summarising…';
    try { const r = await Backend.summarize(); toast(r.skipped ? 'Nothing new to summarise' : 'Memory updated'); } catch (e) { toast(e.message); }
    load();
  };
  $('#delBtn').onclick = async () => {
    if (!confirm('Delete everything Nova remembers about you? This cannot be undone.')) return;
    try { await Backend.forget(); toast('Your data was deleted'); } catch (e) { toast(e.message); }
    load();
  };
}
load();
