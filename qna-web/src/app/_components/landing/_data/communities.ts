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

export function formatMemberCount(n: number): string {
  return n.toLocaleString("en-US");
}
