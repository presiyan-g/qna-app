/* Quorum UI Kit · Question detail + answer flow
   Mirrors qna-web/src/app/communities/[slug]/questions/[id]/page.tsx
   Plus: post-answer vote distribution, reveal animation, share card. */

const { Btn, Card, Chip, Pill, Eyebrow, SerifI, Arrow,
        SAMPLE_QUESTION, SAMPLE_COMMENTS, COMMUNITIES, ShareCardModal } = window;

const QuestionScreen = ({ slug, viewerRole = 'member', go }) => {
  const c = COMMUNITIES.find(x => x.slug === slug) || COMMUNITIES[0];
  const q = SAMPLE_QUESTION;
  const isCreator = viewerRole === 'creator';
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [comments, setComments] = React.useState(SAMPLE_COMMENTS);

  const correct = q.choices.find(x => x.correct);
  const chosen = q.choices.find(x => x.id === selected);
  const isCorrect = chosen && chosen.correct;

  const submit = e => {
    e?.preventDefault?.();
    if (!selected) return;
    setSubmitted(true);
  };
  const postComment = e => {
    e.preventDefault();
    if (!draft.trim()) return;
    setComments(prev => [...prev, { id: 'cm' + (prev.length + 1), author: 'you', when: 'just now', body: draft.trim() }]);
    setDraft('');
  };

  return (
    <main style={{ flex: 1, background: 'var(--paper)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a onClick={() => go('community', { slug })} className="q-link-back">← Back to {c.name}</a>

        <article style={{ marginTop: 24 }} className="q-card">
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Pill variant={submitted ? 'primary' : 'soft'}>{submitted ? 'Answered' : 'Open'}</Pill>
              <span className="q-meta">{q.points} points</span>
              <span className="q-meta">·</span>
              <span className="q-meta">Closes {q.closesAt}</span>
            </div>
            {isCreator && (
              <span className="q-pill q-pill-soft" title="Visible to creators and admins only">
                {q.answeredCount} of {q.totalMembers.toLocaleString('en-US')} answered
              </span>
            )}
          </div>

          {/* Headline */}
          <h1 className="q-prompt-headline" style={{ margin: '18px 0 0' }}>
            {q.prompt}
          </h1>
        </article>

        <div style={{ marginTop: 20, display: 'grid', gap: 20 }}>
          {!submitted ? (
            <AnswerForm q={q} selected={selected} setSelected={setSelected} onSubmit={submit} isCreator={isCreator} />
          ) : (
            <React.Fragment>
              <div key="result" className="q-anim-in">
                <ResultPanel isCorrect={isCorrect} chosen={chosen} correct={correct} onShare={() => setShowShare(true)} />
              </div>
              <div key="votes" className="q-anim-in-d100">
                <VoteDistribution q={q} chosenId={chosen.id} />
              </div>
              <div key="solution" className="q-anim-in-d200">
                <SolutionPanel q={q} correct={correct} />
              </div>
            </React.Fragment>
          )}
          <div className={submitted ? 'q-anim-in-d300' : ''}>
            <CommentSection submitted={submitted} comments={comments} draft={draft} setDraft={setDraft} onPost={postComment} />
          </div>
        </div>

        {showShare && isCorrect && (
          <ShareCardModal q={q} community={c} choice={chosen} onClose={() => setShowShare(false)} />
        )}
      </div>
    </main>
  );
};

const AnswerForm = ({ q, selected, setSelected, onSubmit, isCreator }) => (
  <form className="q-card" onSubmit={onSubmit}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <Eyebrow>Your answer</Eyebrow>
        <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700 }}>Choose one option</h2>
      </div>
      {isCreator && (
        <span className="q-meta" title="Visible to creators and admins only">
          {q.answeredCount} of {q.totalMembers.toLocaleString('en-US')} answered
        </span>
      )}
    </div>
    <fieldset style={{ marginTop: 20, padding: 0, border: 0, display: 'grid', gap: 12 }}>
      {q.choices.map(c => {
        const isSelected = selected === c.id;
        return (
          <label key={c.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: 16, border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--line)'),
              background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
              borderRadius: 10, fontSize: 14, cursor: 'pointer',
              transition: 'border-color 200ms var(--ease-out), background-color 200ms var(--ease-out)',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}>
            <input
              type="radio" name="choice" value={c.id}
              checked={isSelected}
              onChange={() => setSelected(c.id)}
              style={{ marginTop: 4, accentColor: 'var(--primary)' }}
            />
            <span style={{ display: 'inline-flex', width: 24, height: 24, flexShrink: 0,
              alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
              background: 'var(--card)', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
              {c.position}
            </span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{c.label}</span>
          </label>
        );
      })}
    </fieldset>
    <div style={{ marginTop: 20 }}>
      <Btn variant="primary" type="submit" onClick={onSubmit}>Submit answer</Btn>
    </div>
  </form>
);

const ResultPanel = ({ isCorrect, chosen, correct, onShare }) => (
  <section className="q-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {isCorrect && (
          <span className="q-anim-pop" style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
        <div>
          <Eyebrow>Result</Eyebrow>
          <h2 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700 }}>
            {isCorrect ? <>You got it. <SerifI>Beautiful.</SerifI></> : 'Wrong answer'}
          </h2>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="q-pill q-pill-primary" style={{ fontSize: 14, padding: '8px 16px' }}>
          {isCorrect ? '+10 points' : '0 points'}
        </span>
        {isCorrect && (
          <Btn variant="lake" size="sm" onClick={onShare}>Share →</Btn>
        )}
      </div>
    </div>
    {!isCorrect && (
      <div style={{
        marginTop: 18, padding: 16, borderRadius: 10,
        background: 'var(--action-clay-soft)', border: '1px solid var(--action-clay-soft)',
      }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--action-clay-hover)' }}>
          You picked
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
          <b>{chosen.position}.</b> {chosen.label}
        </p>
      </div>
    )}
  </section>
);

const VoteDistribution = ({ q, chosenId }) => (
  <section className="q-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Eyebrow>Community vote</Eyebrow>
      <span className="q-meta">{q.answeredCount} answers</span>
    </div>
    <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
      {q.choices.map(c => {
        const isCorrect = c.correct;
        const isMine = c.id === chosenId;
        return (
          <div key={c.id} className={`q-vote-row ${isCorrect ? 'is-correct' : ''} ${isMine ? 'is-mine' : ''}`}>
            <div className="q-vote-bar" style={{ width: c.votePct + '%' }} />
            <span className="q-vote-pos">{c.position}.</span>
            <span className="q-vote-label">
              {c.label}
              {isMine && <span className="q-vote-mine-tag">You</span>}
            </span>
            <span className="q-vote-pct">{c.votePct}%</span>
          </div>
        );
      })}
    </div>
  </section>
);

const SolutionPanel = ({ q, correct }) => (
  <section className="q-card">
    <Eyebrow>Explanation</Eyebrow>
    <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 600 }}>Correct answer: {correct.label}</p>
    <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{q.explanation}</p>
  </section>
);

const CommentSection = ({ submitted, comments, draft, setDraft, onPost }) => (
  <section className="q-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <Eyebrow>Discussion</Eyebrow>
        <h2 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700 }}>
          {submitted ? `${comments.length} comments` : 'Locked until you answer'}
        </h2>
      </div>
      {submitted && <span className="q-meta">Unlocked</span>}
    </div>

    {!submitted ? (
      <div style={{ marginTop: 18, padding: 20, border: '1px dashed var(--line)', borderRadius: 10, background: 'var(--paper)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          Comments open the moment you submit your answer. <SerifI>No spoilers, no lurkers.</SerifI>
        </p>
      </div>
    ) : (
      <React.Fragment>
        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a className="q-link-primary" style={{ fontSize: 13, fontWeight: 700 }}>@{c.author}</a>
                <span className="q-meta">{c.when}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--ink)' }}>{c.body}</p>
            </div>
          ))}
        </div>
        <form onSubmit={onPost} style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input className="q-input q-input-solid" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add to the discussion…" />
          <Btn variant="lake" size="md" type="submit" onClick={onPost}>Post</Btn>
        </form>
      </React.Fragment>
    )}
  </section>
);

Object.assign(window, { QuestionScreen });
