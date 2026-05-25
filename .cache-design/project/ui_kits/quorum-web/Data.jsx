/* Quorum UI Kit · Data
   Seed data for the recreation. Mirrors what the upstream codebase
   builds at runtime from Postgres. */

const COMMUNITIES = [
  {
    slug: 'daily-ai-builders',
    name: 'Daily AI Builders',
    emoji: '🤖',
    memberCount: 1284,
    cadence: 'Daily',
    category: 'AI & ML',
    description: 'Claude Code, Codex, MCP, vibe coding, AI agents — one question every weekday.',
    todayQuestion: 'When designing an MCP server, what should you expose first?',
    closesIn: '6h 22m',
  },
  {
    slug: 'chess-tactics-daily',
    name: 'Chess Tactics Daily',
    emoji: '♟',
    memberCount: 812,
    cadence: 'Daily',
    category: 'Games',
    description: 'A tactical puzzle every morning. Strong players welcome.',
    todayQuestion: 'White to move. Find the forced mate in 3.',
    closesIn: '12h',
  },
  {
    slug: 'modern-css-daily',
    name: 'Modern CSS Daily',
    emoji: '🎨',
    memberCount: 496,
    cadence: 'Daily',
    category: 'Frontend',
    description: 'Container queries, anchor positioning, view transitions, scroll-driven anims.',
    todayQuestion: "Which container query unit scales with the parent's inline-size?",
    closesIn: '4h',
  },
  {
    slug: 'distributed-systems-weekly',
    name: 'Distributed Systems Weekly',
    emoji: '🗺️',
    memberCount: 612,
    cadence: 'Weekly',
    category: 'Backend',
    description: 'One harder question every Monday. Consensus, replication, failure modes.',
    todayQuestion: 'What does FLP impossibility actually rule out?',
    closesIn: '3d 11h',
  },
  {
    slug: 'german-vocab-30',
    name: 'German Vocab · 30',
    emoji: '🇩🇪',
    memberCount: 274,
    cadence: 'Daily',
    category: 'Languages',
    description: '30 hand-picked words a month. Translation + usage check.',
    todayQuestion: '"Vorfreude" most closely means…',
    closesIn: '14h',
  },
  {
    slug: 'product-strategy-fridays',
    name: 'Product Strategy Fridays',
    emoji: '📐',
    memberCount: 1041,
    cadence: 'Weekly',
    category: 'Product',
    description: 'A real-world product scenario every Friday. Argue your call in the thread.',
    todayQuestion: 'Your AOV dropped 12%. New feature ships Monday. What do you cut?',
    closesIn: '2d',
  },
];

const SAMPLE_QUESTION = {
  id: 'q_8f2c',
  prompt: 'When designing an MCP server, what should you expose first?',
  scheduledFor: 'Mar 14, 2026, 4:00 PM UTC',
  closesAt: 'Mar 15, 2026, 4:00 PM UTC',
  points: 10,
  state: 'Open',
  answeredCount: 187,
  totalMembers: 1284,
  closesInLabel: '6h 22m',
  explanation:
    'MCP servers should lead with tools — the model-callable verbs — because tools are how the agent acts on the world. Resources (read-only context) and prompts come second; they shape the conversation but don\'t move the loop forward.',
  choices: [
    { id: 'c1', position: 1, label: 'Resources — read-only context the model can fetch.',  votePct: 22 },
    { id: 'c2', position: 2, label: 'Tools — verbs the model can invoke.', correct: true,    votePct: 58 },
    { id: 'c3', position: 3, label: 'Prompts — pre-templated user messages.',                votePct: 12 },
    { id: 'c4', position: 4, label: 'Sampling — letting the server ask the model to think.', votePct: 8 },
  ],
};

const SAMPLE_COMMENTS = [
  { id: 'cm1', author: 'martina_l', when: '2h ago', body: 'Tools-first feels right to me — but I keep seeing servers that ship resources first because they\'re "easier to spec". Anyone shipped one that started with resources and survived?' },
  { id: 'cm2', author: 'kenji', when: '1h ago', body: 'Started with resources on our internal one. Ended up rewriting around tools when the agent kept fetching context it didn\'t act on. Lesson: if the agent doesn\'t need to *do* something, you don\'t need an MCP server.' },
];

const SAMPLE_BROADCASTS = [
  {
    id: 'b1',
    author: 'presiyan',
    when: 'Mar 14, 9:00 AM UTC',
    body: 'Heads up — next week we\'re running a 5-question MCP mini-series. Daily questions Mon–Fri, each scoped to one server design decision. Bring your hot takes.',
  },
  {
    id: 'b2',
    author: 'presiyan',
    when: 'Mar 12, 10:30 AM UTC',
    body: 'Welcome to the 47 of you who joined this week. Quick reminder: comments unlock only after you submit an answer — that\'s on purpose. Lurkers welcome but please answer first.',
  },
];

const SAMPLE_LEADERBOARD = [
  { rank: 1, username: 'martina_l', points: 1420, when: 'Mar 14, 9:02 AM' },
  { rank: 2, username: 'kenji', points: 1310, when: 'Mar 14, 9:14 AM' },
  { rank: 3, username: 'ada_b', points: 1290, when: 'Mar 13, 8:55 PM' },
  { rank: 4, username: 'tomas', points: 1180, when: 'Mar 14, 8:01 AM' },
  { rank: 5, username: 'priya_v', points: 1100, when: 'Mar 13, 7:33 PM' },
  { rank: 6, username: 'soren', points: 980, when: 'Mar 14, 6:40 AM' },
  { rank: 7, username: 'noor_t', points: 940, when: 'Mar 13, 11:20 PM' },
  { rank: 8, username: 'cass_h', points: 870, when: 'Mar 13, 4:14 PM' },
];

const PAST_QUESTIONS = [
  { id: 'p1', date: 'Mar 13', prompt: 'Which container query unit scales with the parent\'s inline-size?', state: 'closed' },
  { id: 'p2', date: 'Mar 12', prompt: 'In an agentic loop, where should you place the system prompt?', state: 'closed' },
  { id: 'p3', date: 'Mar 11', prompt: 'Default token budget for Sonnet 4.5 streaming with caching enabled?', state: 'closed' },
  { id: 'p4', date: 'Mar 15', prompt: '[Working draft] Effective context windows in agentic loops', state: 'draft' },
];

const ME = {
  username: 'you',
  joinedAt: 'Joined Mar 2026',
  totalPoints: 740,
  currentStreak: 12,
  longestStreak: 23,
  memberships: [
    { slug: 'daily-ai-builders', name: 'Daily AI Builders', emoji: '🤖', role: 'member', points: 320 },
    { slug: 'modern-css-daily', name: 'Modern CSS Daily', emoji: '🎨', role: 'member', points: 210 },
    { slug: 'product-strategy-fridays', name: 'Product Strategy Fridays', emoji: '📐', role: 'creator', points: 0 },
    { slug: 'chess-tactics-daily', name: 'Chess Tactics Daily', emoji: '♟', role: 'member', points: 210 },
  ],
};

/** 30-day activity grid for the SIGNED-IN user across ALL their
    communities. Each entry: { day: 'Feb 14', level: 0|1|2|3 }
    level 0 = answered no community that day
    level 1 = answered 1 community
    level 2 = answered 2 communities
    level 3 = answered 3+ communities
    Intensity only makes sense across communities. Inside a single
    community use MY_COMMUNITY_STREAK instead. */
const MY_STREAK = (() => {
  const labels = ['Feb 14','Feb 15','Feb 16','Feb 17','Feb 18','Feb 19','Feb 20','Feb 21','Feb 22','Feb 23','Feb 24','Feb 25','Feb 26','Feb 27','Feb 28','Mar 1','Mar 2','Mar 3','Mar 4','Mar 5','Mar 6','Mar 7','Mar 8','Mar 9','Mar 10','Mar 11','Mar 12','Mar 13','Mar 14','Mar 15'];
  const pattern = [2,3,2,0,2,3,2,1,0,2,2,3,2,2,3,3,2,2,3,0,2,2,3,3,2,2,3,3,2,0];
  return labels.map((day, i) => ({ day, level: pattern[i] }));
})();

/** Per-community streak. Binary by nature: a daily community has one
    question per day, so each day you either answered or missed. We
    keep a third state for "answered late or wrong" since that affects
    points but still counts as showing up. Each entry:
    { day: 'Mar 1', state: 'missed'|'late'|'answered' } */
const MY_COMMUNITY_STREAK = (() => {
  const labels = ['Feb 22','Feb 23','Feb 24','Feb 25','Feb 26','Feb 27','Feb 28','Mar 1','Mar 2','Mar 3','Mar 4','Mar 5','Mar 6','Mar 7','Mar 8','Mar 9','Mar 10','Mar 11','Mar 12','Mar 13','Mar 14'];
  const pattern = ['answered','answered','late','answered','missed','answered','answered','answered','answered','answered','late','answered','answered','answered','answered','answered','missed','answered','answered','answered','answered'];
  return labels.map((day, i) => ({ day, state: pattern[i] }));
})();

const MY_COMMUNITY_STATS = {
  currentStreak: 4,                // consecutive days answered, ending today
  longestStreak: 11,               // best run ever in this community
  answeredCount: 18,               // last 21 days
  windowDays: 21,
};

Object.assign(window, { COMMUNITIES, SAMPLE_QUESTION, SAMPLE_COMMENTS, SAMPLE_BROADCASTS, SAMPLE_LEADERBOARD, PAST_QUESTIONS, ME, MY_STREAK, MY_COMMUNITY_STREAK, MY_COMMUNITY_STATS });
