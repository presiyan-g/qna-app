# Mobile Home Auth Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial Quorum Expo mobile shell with branded stack navigation, home, communities, login, and register screens.

**Architecture:** Replace the default Expo starter with focused Expo Router routes. Keep shared brand values in one theme file and shared visual building blocks in one UI file so auth behavior can be added later without redesigning screens.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native `StyleSheet`.

---

### Task 1: Clean Starter Scaffold

**Files:**
- Delete: `qna-mobile/app/(tabs)/_layout.tsx`
- Delete: `qna-mobile/app/(tabs)/index.tsx`
- Delete: `qna-mobile/app/(tabs)/explore.tsx`
- Delete: `qna-mobile/app/modal.tsx`
- Delete: `qna-mobile/components/external-link.tsx`
- Delete: `qna-mobile/components/haptic-tab.tsx`
- Delete: `qna-mobile/components/hello-wave.tsx`
- Delete: `qna-mobile/components/parallax-scroll-view.tsx`
- Delete: `qna-mobile/components/themed-text.tsx`
- Delete: `qna-mobile/components/themed-view.tsx`
- Delete: `qna-mobile/components/ui/collapsible.tsx`
- Delete: `qna-mobile/components/ui/icon-symbol.tsx`
- Delete: `qna-mobile/components/ui/icon-symbol.ios.tsx`
- Delete: `qna-mobile/hooks/use-color-scheme.ts`
- Delete: `qna-mobile/hooks/use-color-scheme.web.ts`
- Delete: `qna-mobile/hooks/use-theme-color.ts`

- [x] Delete the Expo starter routes, components, and hooks.
- [x] Keep Expo Router dependency and app entry.

### Task 2: Add Brand Primitives

**Files:**
- Modify: `qna-mobile/constants/theme.ts`
- Create: `qna-mobile/components/Brand.tsx`

- [x] Replace starter color schemes with static Editorial Forest tokens.
- [x] Add reusable `Screen`, `BrandButton`, `BrandTextInput`, `CommunityPreviewCard`, and `AuthLink` components.

### Task 3: Add Stack Layout

**Files:**
- Modify: `qna-mobile/app/_layout.tsx`

- [x] Remove default theme provider and tab anchor.
- [x] Configure stack screens for `index`, `communities`, `login`, and `register`.
- [x] Style headers with paper background, forest title/tint, and line border.

### Task 4: Add Screens

**Files:**
- Create: `qna-mobile/app/index.tsx`
- Create: `qna-mobile/app/communities.tsx`
- Create: `qna-mobile/app/login.tsx`
- Create: `qna-mobile/app/register.tsx`

- [x] Implement Discovery First home screen with static community previews and navigation links.
- [x] Implement empty branded communities placeholder.
- [x] Implement static login form layout.
- [x] Implement static register form layout.

### Task 5: Verify

**Commands:**
- `npm run lint -w qna-mobile`
- `npm run build -w qna-mobile`

- [x] Fix any TypeScript, lint, or export errors caused by the shell.
