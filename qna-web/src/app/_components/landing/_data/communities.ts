export type CommunitySample = {
  slug: string;
  name: string;
  emoji: string;
  memberCount: number;
  todayQuestion: string;
  closesIn: string;
};

export const HERO_STACK: CommunitySample[] = [
  {
    slug: "chess-tactics-daily",
    name: "Chess Tactics Daily",
    emoji: "♟",
    memberCount: 812,
    todayQuestion: "White to move. Find the forced mate in 3.",
    closesIn: "12h",
  },
  {
    slug: "daily-ai-builders",
    name: "Daily AI Builders",
    emoji: "🤖",
    memberCount: 1284,
    todayQuestion:
      "When designing an MCP server, what should you expose first?",
    closesIn: "6h 22m",
  },
  {
    slug: "modern-css-daily",
    name: "Modern CSS Daily",
    emoji: "🎨",
    memberCount: 496,
    todayQuestion:
      "Which container query unit scales with the parent's inline-size?",
    closesIn: "4h",
  },
];

export const FEATURED_COMMUNITIES: CommunitySample[] = [
  {
    slug: "daily-ai-builders",
    name: "Daily AI Builders",
    emoji: "🤖",
    memberCount: 1284,
    todayQuestion:
      "When designing an MCP server, what should you expose first?",
    closesIn: "6h 22m",
  },
  {
    slug: "chess-tactics-daily",
    name: "Chess Tactics Daily",
    emoji: "♟",
    memberCount: 812,
    todayQuestion: "White to move. Find the forced mate in 3.",
    closesIn: "12h",
  },
  {
    slug: "modern-css-daily",
    name: "Modern CSS Daily",
    emoji: "🎨",
    memberCount: 496,
    todayQuestion:
      "Which container query unit scales with the parent's inline-size?",
    closesIn: "4h",
  },
  {
    slug: "macro-and-markets",
    name: "Macro & Markets",
    emoji: "📈",
    memberCount: 2103,
    todayQuestion:
      "Which yield curve inversion preceded a recession the fastest?",
    closesIn: "9h",
  },
  {
    slug: "biotech-reading-club",
    name: "Biotech Reading Club",
    emoji: "🧬",
    memberCount: 340,
    todayQuestion: "What does the trial's HR of 0.62 mean for survival?",
    closesIn: "16h",
  },
  {
    slug: "contracts-and-clauses",
    name: "Contracts & Clauses",
    emoji: "⚖️",
    memberCount: 1022,
    todayQuestion:
      "Which boilerplate clause survives termination by default?",
    closesIn: "8h",
  },
];

export function formatMemberCount(n: number): string {
  return n.toLocaleString("en-US");
}
