/* Quorum UI Kit · Auth (Login / Register)
   Mirrors qna-web/src/app/(auth)/_components/{AuthShell,LoginForm,RegisterForm}.tsx */

const { Btn, Eyebrow, SerifI } = window;

const Field = ({ label, name, type = 'text', value, onChange, error, autoFocus }) => {
  const id = 'f-' + name;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600 }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="q-input"
        style={error ? { borderColor: 'var(--status-danger-border)' } : null}
      />
      {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--status-danger-fg)' }}>{error}</p>}
    </div>
  );
};

const AuthShell = ({ eyebrow, titlePlain, titleAccent, children, go, switchTo, switchLabel }) => (
  <main style={{ flex: 1, background: 'var(--paper)', padding: '32px 24px 80px', display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: '100%', maxWidth: 440 }}>
      <a onClick={() => go('home')} className="q-link q-link-brand" style={{
        marginBottom: 14, display: 'block', textAlign: 'center',
        fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em',
      }}>Quorum</a>
      <a onClick={() => go('home')} className="q-link-back" style={{ marginBottom: 22 }}>← Back to home</a>
      <div className="q-card" style={{ padding: '34px 36px' }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 style={{ margin: '8px 0 28px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {titlePlain} <SerifI>{titleAccent}</SerifI>
        </h1>
        {children}
        {switchTo && (
          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            {switchLabel} <a onClick={() => go(switchTo)} className="q-link-primary" style={{ color: 'var(--ink)', cursor: 'pointer' }}>
              {switchTo === 'register' ? 'Create an account' : 'Sign in'}
            </a>.
          </p>
        )}
      </div>
    </div>
  </main>
);

const LoginScreen = ({ go }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const submit = e => { e.preventDefault(); go('browse'); };
  return (
    <AuthShell go={go} eyebrow="Welcome back" titlePlain="Sign in to" titleAccent="answer today's question."
      switchTo="register" switchLabel="New here?">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email" name="email" type="email" value={email} onChange={setEmail} autoFocus />
        <Field label="Password" name="password" type="password" value={password} onChange={setPassword} />
        <Btn variant="primary" type="submit" onClick={submit} style={{ marginTop: 8 }}>Sign in</Btn>
      </form>
    </AuthShell>
  );
};

const RegisterScreen = ({ go }) => {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const submit = e => { e.preventDefault(); go('browse'); };
  return (
    <AuthShell go={go} eyebrow="Get started" titlePlain="Find your people." titleAccent="One question at a time."
      switchTo="login" switchLabel="Have an account?">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Email" name="email" type="email" value={email} onChange={setEmail} autoFocus />
        <Field label="Username" name="username" type="text" value={username} onChange={setUsername} />
        <Field label="Password" name="password" type="password" value={password} onChange={setPassword} />
        <Btn variant="primary" type="submit" onClick={submit} style={{ marginTop: 8 }}>Create account</Btn>
      </form>
    </AuthShell>
  );
};

Object.assign(window, { LoginScreen, RegisterScreen });
