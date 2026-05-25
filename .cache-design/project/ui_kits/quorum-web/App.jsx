/* Quorum UI Kit · App router
   Hash-based fake router so the prototype acts like a real app.
   States: home | browse | login | register | community | question |
           dashboard | create
   Each screen receives `go(name, params)` to navigate. */

const {
  Nav, Footer, LandingScreen, BrowseScreen, LoginScreen, RegisterScreen,
  CommunityScreen, QuestionScreen, ComposeQuestionScreen, DashboardScreen, ProfileScreen, ScreenPicker,
} = window;

const SCREEN_LABELS = {
  home: '01 Home',
  browse: '02 Browse',
  login: '03 Sign in',
  register: '04 Register',
  community: '05 Community',
  question: '06 Question',
  compose: '07 Draft question',
  dashboard: '08 Dashboard',
  profile: '09 Profile',
};

const SIGNED_IN_SCREENS = new Set(['dashboard', 'profile']);

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) return { screen: 'home', params: {} };
  const [screen, ...rest] = raw.split('/');
  if (!SCREEN_LABELS[screen]) return { screen: 'home', params: {} };
  const params = {};
  rest.forEach((seg, i) => {
    if (i === 0) params.slug = seg;
    if (i === 1) params.tab = seg;
  });
  return { screen, params };
}

function stringifyRoute(screen, params = {}) {
  let s = '#/' + screen;
  if (params.slug) s += '/' + params.slug;
  if (params.tab) s += '/' + params.tab;
  return s;
}

const App = () => {
  const [route, setRoute] = React.useState(parseHash);
  const [viewerRole, setViewerRole] = React.useState('member'); // 'member' | 'creator'
  React.useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (screen, params = {}) => {
    if (screen === 'create') screen = 'register';
    if (screen === 'my') screen = 'dashboard';
    if (screen === 'profile' && !SCREEN_LABELS.profile) screen = 'dashboard';
    // Auto-switch to creator view when landing on Dashboard
    if (screen === 'dashboard' && viewerRole !== 'creator') setViewerRole('creator');
    if (screen === 'creators') {
      // Anchor scroll on landing — emulate
      setRoute({ screen: 'home', params: {} });
      window.location.hash = stringifyRoute('home');
      setTimeout(() => {
        const el = document.getElementById('creators');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    window.location.hash = stringifyRoute(screen, params);
    setRoute({ screen, params });
  };

  const { screen, params } = route;
  const signedIn = SIGNED_IN_SCREENS.has(screen);

  const ScreenComp = (() => {
    switch (screen) {
      case 'home':       return <LandingScreen go={go} />;
      case 'browse':     return <BrowseScreen go={go} />;
      case 'login':      return <LoginScreen go={go} />;
      case 'register':   return <RegisterScreen go={go} />;
      case 'community':  return <CommunityScreen slug={params.slug || 'daily-ai-builders'} initialTab={params.tab || 'questions'} viewerRole={viewerRole} go={go} />;
      case 'question':   return <QuestionScreen slug={params.slug || 'daily-ai-builders'} viewerRole={viewerRole} go={go} />;
      case 'compose':    return <ComposeQuestionScreen slug={params.slug || 'daily-ai-builders'} viewerRole={viewerRole} go={go} />;
      case 'dashboard':  return <DashboardScreen go={go} />;
      case 'profile':    return <ProfileScreen go={go} />;
      default:           return <LandingScreen go={go} />;
    }
  })();

  // No Nav on auth screens (codebase doesn't render it there)
  const noChrome = screen === 'login' || screen === 'register';

  return (
    <div className="q-page" data-screen-label={SCREEN_LABELS[screen]}>
      {!noChrome && <Nav go={go} current={screen} signedIn={signedIn} username="you" />}
      {ScreenComp}
      {!noChrome && <Footer />}
      <ScreenPicker current={screen} go={go} viewerRole={viewerRole} setViewerRole={setViewerRole} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
