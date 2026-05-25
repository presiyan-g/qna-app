/* Quorum UI Kit · Compose (Create Question) screen
   Mirrors qna-web/src/app/communities/[slug]/questions/new/page.tsx
   and the QuestionForm + AIDraftPanel components.

   Creator-only. Includes:
   - question prompt + optional image
   - 4 multiple-choice rows (radio for correct, optional image)
   - explanation
   - schedule + points
   - live preview sidebar
   - AI Draft side-panel (simulated) */

const { Btn, Card, Chip, Pill, Eyebrow, Meta, SerifI, Avatar, Arrow, COMMUNITIES } = window;

const ComposeQuestionScreen = ({ slug, viewerRole = 'member', go }) => {
  const c = COMMUNITIES.find(x => x.slug === slug) || COMMUNITIES[0];
  const isCreator = viewerRole === 'creator';

  const [prompt, setPrompt] = React.useState('');
  const [choices, setChoices] = React.useState([
    { id: 'c1', label: '', correct: true  },
    { id: 'c2', label: '', correct: false },
    { id: 'c3', label: '', correct: false },
    { id: 'c4', label: '', correct: false },
  ]);
  const [explanation, setExplanation] = React.useState('');
  const [points, setPoints] = React.useState(10);
  const [scheduleDate, setScheduleDate] = React.useState('2026-03-17');
  const [scheduleTime, setScheduleTime] = React.useState('16:00');
  const [saveState, setSaveState] = React.useState(null); // null | 'saved' | 'scheduled'
  const [aiOpen, setAiOpen] = React.useState(false);

  if (!isCreator) return <NotACreator c={c} go={go} />;

  const setChoice = (id, patch) => setChoices(prev =>
    prev.map(c => c.id === id ? { ...c, ...patch } : c)
  );
  const setCorrect = id => setChoices(prev => prev.map(c => ({ ...c, correct: c.id === id })));
  const addChoice  = () => setChoices(prev => [...prev, { id: 'c' + (prev.length + 1), label: '', correct: false }]);
  const removeChoice = id => setChoices(prev => prev.length <= 2 ? prev : prev.filter(c => c.id !== id));

  const checklist = [
    { done: prompt.trim().length > 0, label: 'Question text' },
    { done: choices.filter(c => c.label.trim()).length >= 2, label: 'At least 2 choices' },
    { done: choices.find(c => c.correct && c.label.trim()), label: 'Correct choice marked' },
    { done: explanation.trim().length > 0, label: 'Explanation' },
    { done: !!scheduleDate && !!scheduleTime, label: 'Schedule set' },
  ];
  const ready = checklist.every(i => i.done);

  const applyDraft = draft => {
    setPrompt(draft.prompt);
    setChoices(draft.choices);
    setExplanation(draft.explanation);
    setAiOpen(false);
  };

  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <a onClick={() => go('community', { slug })} className="q-link-back">← Back to {c.name}</a>

        {/* Header */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Eyebrow>New question · {c.name}</Eyebrow>
            <h1 style={{ margin: '8px 0 0', fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Draft a question.
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant={saveState === 'saved' ? 'soft' : 'ghost'} size="md" onClick={() => { setSaveState('saved'); }}>
              {saveState === 'saved' ? (
                <React.Fragment>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved
                </React.Fragment>
              ) : 'Save draft'}
            </Btn>
            <Btn variant="lake" size="md" onClick={() => setAiOpen(true)}>✦ Draft with AI</Btn>
            <Btn variant="primary" size="md" disabled={!ready} onClick={() => setSaveState('scheduled')}
              style={!ready ? { opacity: .55, cursor: 'not-allowed' } : null}>
              {saveState === 'scheduled' ? 'Scheduled ✓' : 'Schedule →'}
            </Btn>
          </div>
        </div>

        <div style={{ marginTop: 28 }} className="q-layout-2col-r">
          {/* LEFT — the form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card>
              <Eyebrow>Question</Eyebrow>
              <p style={{ margin: '6px 0 12px', fontSize: 12, color: 'var(--muted)' }}>
                Keep it tight. A good question is answerable in one read.
              </p>
              <textarea
                className="q-textarea q-input-solid"
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. When designing an MCP server, what should you expose first?"
                style={{ resize: 'vertical', fontSize: 15 }}
              />
              <ImageDrop label="Optional image" />
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Eyebrow>Choices</Eyebrow>
                <span className="q-meta">{choices.length} of 6 · pick the correct one</span>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {choices.map((ch, i) => {
                  const correct = ch.correct;
                  return (
                    <div key={ch.id} style={{
                      display: 'grid', gridTemplateColumns: 'auto 28px 1fr auto', gap: 12, alignItems: 'center',
                      padding: 12, borderRadius: 10,
                      border: '1px solid ' + (correct ? 'var(--primary)' : 'var(--line)'),
                      background: correct ? 'var(--primary-soft)' : 'var(--paper)',
                      transition: 'border-color 200ms var(--ease-out), background-color 200ms var(--ease-out)',
                    }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: correct ? 'var(--primary)' : 'var(--muted)' }}>
                        <input type="radio" name="correct" checked={correct} onChange={() => setCorrect(ch.id)} style={{ accentColor: 'var(--primary)' }} />
                        Correct
                      </label>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--card)', fontSize: 12, fontWeight: 700,
                        color: correct ? 'var(--primary)' : 'var(--muted)',
                      }}>{i + 1}</span>
                      <input
                        className="q-input q-input-solid"
                        type="text"
                        value={ch.label}
                        onChange={e => setChoice(ch.id, { label: e.target.value })}
                        placeholder={`Choice ${i + 1}`}
                        style={{ border: 0, background: 'transparent', padding: '8px 0', fontSize: 14 }}
                      />
                      <button
                        onClick={() => removeChoice(ch.id)}
                        title="Remove choice"
                        disabled={choices.length <= 2}
                        style={{
                          width: 28, height: 28, borderRadius: 8, border: 0,
                          background: 'transparent', color: 'var(--muted)',
                          cursor: choices.length <= 2 ? 'not-allowed' : 'pointer',
                          opacity: choices.length <= 2 ? .35 : 1,
                          transition: 'background-color 150ms var(--ease-out), color 150ms var(--ease-out)',
                        }}
                        onMouseEnter={e => { if (choices.length > 2) { e.currentTarget.style.background = 'var(--action-clay-soft)'; e.currentTarget.style.color = 'var(--action-clay-hover)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>×</button>
                    </div>
                  );
                })}
              </div>
              {choices.length < 6 && (
                <div style={{ marginTop: 12 }}>
                  <Btn variant="ghost" size="sm" onClick={addChoice}>+ Add choice</Btn>
                </div>
              )}
            </Card>

            <Card>
              <Eyebrow>Explanation</Eyebrow>
              <p style={{ margin: '6px 0 12px', fontSize: 12, color: 'var(--muted)' }}>
                Shown after the member submits. Two sentences max usually lands best.
              </p>
              <textarea
                className="q-textarea q-input-solid"
                rows={3}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="Why is the correct answer correct? What's the trap in the wrong ones?"
                style={{ resize: 'vertical', fontSize: 14 }}
              />
            </Card>

            <Card>
              <Eyebrow>Schedule & points</Eyebrow>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <FormField label="Date">
                  <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="q-input q-input-solid" />
                </FormField>
                <FormField label="Time (UTC)">
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="q-input q-input-solid" />
                </FormField>
                <FormField label="Points">
                  <input type="number" min={1} max={100} value={points} onChange={e => setPoints(+e.target.value)} className="q-input q-input-solid" />
                </FormField>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Members see this question at the scheduled time. <SerifI>You can always edit until it goes live.</SerifI>
              </p>
            </Card>
          </div>

          {/* RIGHT — preview + checklist */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Eyebrow>Live preview</Eyebrow>
                <span className="q-meta">As members will see it</span>
              </div>
              <div style={{ marginTop: 14, padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)' }}>
                <Pill variant="soft">Open</Pill>
                <h3 style={{ margin: '10px 0 12px', fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: prompt ? 'var(--ink)' : 'var(--muted)' }}>
                  {prompt || 'Your question will appear here…'}
                </h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {choices.map((ch, i) => ch.label && (
                    <div key={ch.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      border: '1px solid var(--line)', background: 'var(--card)', fontSize: 13,
                    }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--muted)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{i + 1}.</span>
                      <span>{ch.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <Eyebrow>Ready to ship?</Eyebrow>
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklist.map(item => (
                  <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: item.done ? 'var(--ink)' : 'var(--muted)' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: item.done ? 'var(--primary)' : 'transparent',
                      border: '1.5px solid ' + (item.done ? 'var(--primary)' : 'var(--line)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>

        {aiOpen && <AIDraftPanel onClose={() => setAiOpen(false)} onApply={applyDraft} />}
      </div>
    </main>
  );
};

const FormField = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--muted)' }}>{label}</label>
    {children}
  </div>
);

const ImageDrop = ({ label }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        marginTop: 12, width: '100%', padding: '18px 14px',
        border: '1px dashed ' + (hover ? 'var(--primary)' : 'var(--line)'),
        background: hover ? 'var(--primary-soft)' : 'var(--paper)',
        borderRadius: 10, color: 'var(--muted)', fontSize: 12,
        cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all 150ms var(--ease-out)',
      }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {label} <span style={{ color: hover ? 'var(--primary)' : 'var(--muted)' }}>· drop or click to upload</span>
    </button>
  );
};

/* ---------- AI Draft side panel ---------- */
const SAMPLE_AI_DRAFTS = [
  {
    prompt: 'In a Claude agentic loop, what does a "stop" message in the response signal?',
    choices: [
      { id: 'c1', label: 'The agent has run out of tokens — restart with a fresh context.', correct: false },
      { id: 'c2', label: "Claude has decided the task is complete and won't request more tool calls.", correct: true },
      { id: 'c3', label: 'The harness should immediately abort and ignore any final message.', correct: false },
      { id: 'c4', label: 'The conversation has been auto-saved to the cache.', correct: false },
    ],
    explanation: '"stop" is Claude\'s way of saying "I\'m done thinking — no more tool calls coming". Your harness should treat it as a clean terminal state, surface the final message, and end the loop. If you keep looping past stop, you\'re asking Claude to invent work.',
  },
  {
    prompt: 'Which of these is the strongest signal that you should split a single MCP server into two?',
    choices: [
      { id: 'c1', label: 'Its source file has grown past 500 lines of code.', correct: false },
      { id: 'c2', label: 'Two unrelated audiences depend on different subsets of its tools.', correct: true },
      { id: 'c3', label: 'It takes longer than 50ms to spin up.', correct: false },
      { id: 'c4', label: 'It exposes more than 10 tools.', correct: false },
    ],
    explanation: 'MCP servers are an audience-coupling boundary, not a code-size one. When two groups of agents need different overlapping subsets, the surface area for getting "tool" namespacing right is what costs you — splitting is cheap, mixed audiences are expensive.',
  },
];

const AIDraftPanel = ({ onClose, onApply }) => {
  const [topic, setTopic] = React.useState('');
  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setDrafting(true);
    setDraft(null);
    // Simulated — real implementation would call window.claude.complete
    await new Promise(r => setTimeout(r, 1100));
    const pick = SAMPLE_AI_DRAFTS[Math.floor(Math.random() * SAMPLE_AI_DRAFTS.length)];
    setDraft(pick);
    setDrafting(false);
  };

  return (
    <div className="q-modal-backdrop" onClick={onClose}>
      <div className="q-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <Eyebrow>Draft with AI</Eyebrow>
            <h3 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Give it a topic. <SerifI>Edit before you ship.</SerifI>
            </h3>
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--muted)', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: '12px 0 16px', fontSize: 13, color: 'var(--muted)' }}>
          AI never auto-publishes. You always review, edit, and approve.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="q-input q-input-solid"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            placeholder="e.g. MCP server design tradeoffs"
            autoFocus
            disabled={drafting}
          />
          <Btn variant="lake" size="md" onClick={generate} disabled={drafting || !topic.trim()}>
            {drafting ? 'Drafting…' : 'Generate'}
          </Btn>
        </div>

        {drafting && (
          <div style={{ marginTop: 18, padding: 18, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', textAlign: 'center' }}>
            <span className="q-meta">Composing…</span>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              <SerifI>One moment.</SerifI>
            </p>
          </div>
        )}

        {draft && (
          <div className="q-anim-in" style={{ marginTop: 18, padding: 18, border: '1px solid var(--primary)', borderRadius: 12, background: 'var(--primary-soft)' }}>
            <Eyebrow>Draft</Eyebrow>
            <p style={{ margin: '10px 0 14px', fontSize: 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {draft.prompt}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {draft.choices.map((c, i) => (
                <li key={c.id} style={{ fontSize: 13, lineHeight: 1.5, color: c.correct ? 'var(--primary)' : 'var(--ink)', fontWeight: c.correct ? 700 : 400 }}>
                  {c.correct ? '✓' : '·'} <b>{i + 1}.</b> {c.label}
                </li>
              ))}
            </ul>
            <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.7, color: 'var(--muted)' }}>
              <b>Explanation · </b> {draft.explanation}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" size="sm" onClick={generate}>Regenerate</Btn>
              <Btn variant="primary" size="sm" onClick={() => onApply(draft)}>Use this draft</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Member-view fallback ---------- */
const NotACreator = ({ c, go }) => (
  <main style={{ flex: 1, background: 'var(--paper)', padding: '64px 24px' }}>
    <div style={{ maxWidth: 560, margin: '0 auto' }} className="q-empty">
      <Eyebrow>Creator only</Eyebrow>
      <h3 style={{ marginTop: 8 }}>Drafting is for <SerifI>creators.</SerifI></h3>
      <p>Only the creator of <b>{c.name}</b> can schedule new questions. Use the picker in the bottom-right to view this screen as a creator.</p>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10 }}>
        <Btn variant="ghost" size="md" onClick={() => go('community', { slug: c.slug })}>Back to community</Btn>
      </div>
    </div>
  </main>
);

Object.assign(window, { ComposeQuestionScreen });
