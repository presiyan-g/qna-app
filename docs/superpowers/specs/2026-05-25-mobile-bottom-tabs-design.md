# Mobile Bottom Tabs Design

## Goal

Add a native-feeling bottom tab bar to the Expo mobile app with four destinations — **Home**, **Discover**, **Live**, **Profile** — using Expo Router's `(tabs)` group pattern. Detail screens (community detail, question detail, public profiles, login, register) continue to push **over** the tab bar as full-screen views, the standard mobile pattern. Move sign-out into the Profile tab and remove the `HeaderProfileChip`.

This is a navigation-shell refactor, not a new feature. No screen content is redesigned in this slice; every existing screen is rehomed under the tab navigator or kept outside it according to whether it's a root destination or a pushed detail view.

## Non-goals

- No new screen content. The tabs reuse existing screens (`index.tsx`, `communities.tsx`, `live-questions.tsx`). The Profile tab is a thin composition over `/users/[username]` plus a sign-out button.
- No "Home" dashboard redesign — the existing Discovery-First home screen stays as-is.
- No mobile notifications bell. Out of scope; would be its own slice.
- No web-specific tab restyling. The Expo web export renders tabs with Expo Router's default web styling; the production web experience is `qna-web`.
- No tablet-specific layout (e.g. side rail vs bottom bar). Phones first; tablets get whatever Expo Router gives by default.
- No deep-link route renames. The URLs (`/`, `/communities`, `/live-questions`) stay where they are.
- No haptics, animations, or custom tab bar artistry. Default Expo Router tab bar with palette colors.

## Locked decisions

- **Tab inventory:** four tabs — Home, Discover, Live, Profile — left to right.
- **Signed-out behavior:** tab bar is always visible. Each tab handles its own signed-out state. The Profile tab specifically renders a "Sign in / Join Quorum" CTA card when the viewer is logged out. The header `HeaderProfileChip` is removed entirely — Profile tab takes over its job.
- **Profile tab content:** when signed in, redirects to `/users/[username]` for the current user (which renders the same content visitors see, plus a Sign-out button gated on `viewer.username === profileUsername`). When signed out, renders the CTA card.
- **Sign-out flow:** native confirm dialog (web-safe fallback per AGENTS.md), then `signOut()` from `AuthContext`, then `router.replace('/')`. Lands the user on the Home tab in its signed-out state, with the Profile tab right there to re-auth from.
- **Icons:** `@expo/vector-icons` Ionicons set. Solid (focused) / outline (unfocused) pairs: `home` / `compass` / `radio` / `person-circle`.
- **Active color:** `palette.primary` (brand green). Inactive: `palette.muted`. Tab bar background: `palette.paper`.
- **Header behavior:** the inner `<Tabs>` navigator owns the per-tab header (title only — no chip). The outer Stack hides its header for the `(tabs)` route via `headerShown: false` to avoid a double header.
- **Architecture:** Expo Router's `(tabs)` group folder pattern. Outer Stack stays. One of its routes is the tabs group. Detail screens push over the tab bar.

## File layout

### Before

```
app/
  _layout.tsx
  index.tsx
  communities.tsx
  live-questions.tsx
  login.tsx
  register.tsx
  communities/[slug].tsx
  communities/[slug]/questions/[id].tsx
  users/[username].tsx
```

### After

```
app/
  _layout.tsx                          ← slimmer (fewer Stack.Screen entries, no HeaderProfileChip)
  (tabs)/
    _layout.tsx                        ← NEW — the <Tabs> navigator
    index.tsx                          ← MOVED from app/index.tsx
    communities.tsx                    ← MOVED from app/communities.tsx (label "Discover")
    live-questions.tsx                 ← MOVED from app/live-questions.tsx (label "Live")
    profile.tsx                        ← NEW — Profile tab
  login.tsx                            ← stays outside (full-screen push)
  register.tsx                         ← stays outside
  communities/[slug].tsx               ← stays outside (pushes over tabs)
  communities/[slug]/questions/[id].tsx ← stays outside
  users/[username].tsx                 ← stays outside (extended with sign-out for self-view)
```

### URL invariants

Group folders (`(tabs)`) are stripped from URLs by Expo Router. The resulting URL mapping is unchanged:

| File | URL | Comment |
|---|---|---|
| `app/(tabs)/index.tsx` | `/` | unchanged |
| `app/(tabs)/communities.tsx` | `/communities` | unchanged (file moved, route the same) |
| `app/(tabs)/live-questions.tsx` | `/live-questions` | unchanged |
| `app/(tabs)/profile.tsx` | `/profile` | **new** route |
| `app/communities/[slug].tsx` | `/communities/[slug]` | unchanged |
| `app/users/[username].tsx` | `/users/[username]` | unchanged |
| `app/login.tsx` | `/login` | unchanged |
| `app/register.tsx` | `/register` | unchanged |

No `router.push()` calls in the codebase need updating — every existing route reference continues to resolve to the same screen.

### Discover tab — filename vs label

The tab is labelled **Discover** but the file remains `communities.tsx` so the URL stays `/communities` and we don't rewrite every push call. Decoupling the tab label from the route name is normal and supported via `Tabs.Screen` options.

## `(tabs)/_layout.tsx`

The new file. Configures the tab bar.

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';

import { fonts, palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sans,
          fontSize: 11,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: palette.paper,
          borderBottomColor: palette.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTintColor: palette.primary,
        headerTitleStyle: {
          color: palette.primary,
          fontFamily: fonts.sans,
          fontSize: 17,
          fontWeight: '800',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="live-questions"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'radio' : 'radio-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Notes:**
- iOS bottom padding (28pt) accommodates the iPhone home indicator.
- Android (8pt) is enough for gesture navigation clearance.
- Each icon swaps between solid (focused) and outline (unfocused), matching iOS conventions.

## Profile tab (`app/(tabs)/profile.tsx`)

Thin wrapper. Reads auth from `useAuth()`. Behavior matrix:

| Auth state | Renders |
|---|---|
| **Loading** | The same loading state pattern the other screens use (centered spinner / `Screen` placeholder). Avoids a flash of CTA before auth resolves. |
| **Signed in** | `<Redirect href={\`/users/\${user.username}\`} />` — sends the user to their own public profile. The Sign-out button is rendered there, gated on self-view. |
| **Signed out** | A CTA card: "Sign in to track your communities" + two buttons: **Sign in** → `router.push('/login')`, **Join Quorum** → `router.push('/register')`. |

**Why redirect instead of duplicating profile content:** there's only one place that renders profile data (`/users/[username]`), so design changes apply uniformly. The Sign-out affordance lives where it makes contextual sense (you viewing yourself), and the Profile tab itself is genuinely a ~30-line file.

### Sign-out button (inside `app/users/[username].tsx`)

Rendered at the bottom of the profile content, separated from community memberships by spacing, **only when `viewer.username === profileUsername`**.

- Style: outlined danger button (red border, red text), full-width on phone widths.
- On tap: invokes a new web-safe confirm helper — `confirmAction({ title: 'Sign out of Quorum?', confirmLabel: 'Sign out', cancelLabel: 'Cancel', destructive: true })`. Returns a `Promise<boolean>`.
- On confirm: `signOut()` from `AuthContext` → `router.replace('/')`.

### `services/util/confirmAction.ts` (new helper)

The mobile codebase currently has no shared confirm-dialog helper. Per AGENTS.md, native `Alert` doesn't render on web exports, so this slice introduces a small reusable wrapper. Lives in `qna-mobile/services/util/confirmAction.ts` alongside `keyboard.ts` and `time.ts`.

```ts
import { Alert, Platform } from 'react-native';

export type ConfirmActionInput = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

export function confirmAction(input: ConfirmActionInput): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = input.message ? `${input.title}\n\n${input.message}` : input.title;
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(text));
  }
  return new Promise((resolve) => {
    Alert.alert(input.title, input.message, [
      { text: input.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: input.confirmLabel,
        style: input.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
```

Tested via `qna-mobile/services/util/confirmAction.test.ts` with the existing `tsx --test` runner. Tests cover the web branch (since `Platform.OS` and `window.confirm` can both be stubbed); the native branch's interaction with `Alert.alert` is verified by manual smoke test rather than unit test (testing React Native's Alert without a runtime adds more harness than the test is worth).
- After sign-out the user lands on the Home tab in its signed-out state.

## Root layout changes (`app/_layout.tsx`)

Three changes:

1. **Remove `HeaderProfileChip` from `screenOptions`.** Drop `headerRight: () => <HeaderProfileChip />` and `headerRightContainerStyle`. Drop the now-unused `HeaderProfileChip` import.
2. **Add `Stack.Screen name="(tabs)"` with `headerShown: false`.** The tabs group renders its own per-tab header.
3. **Remove stale `Stack.Screen` entries** for `index`, `communities`, `live-questions`. Those screens live inside `(tabs)/` now.

Final shape (abbreviated):

```tsx
<Stack
  screenOptions={{
    contentStyle: { backgroundColor: palette.paper },
    headerBackTitle: 'Back',
    ...(Platform.OS === 'web' ? { headerLeft: () => <HeaderBackButton /> } : null),
    headerShadowVisible: false,
    headerStyle: { ... },
    headerTintColor: palette.primary,
    headerTitleStyle: { ... },
  }}
>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="communities/[slug]" options={{ title: 'Community' }} />
  <Stack.Screen
    name="communities/[slug]/questions/[id]"
    options={{ title: 'Question' }}
  />
  <Stack.Screen name="users/[username]" options={{ title: 'Profile' }} />
  <Stack.Screen name="login" options={{ title: 'Sign in' }} />
  <Stack.Screen name="register" options={{ title: 'Join Quorum' }} />
</Stack>
```

### `HeaderProfileChip.tsx` deletion

`components/HeaderProfileChip.tsx` is no longer used anywhere → delete the file. Removes ~100 lines of dead code.

`HeaderBackButton` stays — it's still used on web for back navigation on detail screens.

## Edge cases & invariants

- **Cold start with no token.** `AuthProvider` initializes, `useAuth().loading === true` briefly, tabs show their loading states. Once auth resolves to `user: null`, each tab shows its signed-out state. Tab bar is always visible.
- **401 from any API call** (per AGENTS.md). Existing behavior: token cleared, route to login. Login is outside `(tabs)/`, so it pushes over the tab bar. After login, `router.replace('/')` lands the user back on Home.
- **Detail screen push.** Tapping a community card → `router.push('/communities/[slug]')` pushes a screen **over** the tab bar. Tab bar disappears under the pushed view. Back swipe returns to the previously-active tab.
- **Tab state persistence.** Each tab keeps scroll position and internal state when switched. Expo Router default. `useFocusEffect` callbacks re-fire on focus regain — existing screens already use this for data refresh.
- **Sign-out from Profile tab.** `signOut()` → `router.replace('/')`. Home re-renders with signed-out state. Tab bar persists; Profile tab CTA is available.
- **Sign-out edge: confirm dialog cancelled.** No-op. Stay on profile.
- **Signed-in user navigates to their own `/users/[username]` directly** (e.g. tapping a community-member row that links to their own username). Same screen renders, Sign-out button still shows (self-view detection). One screen, two entry points, consistent affordance.
- **Signed-out user taps Profile tab.** Lands on `app/(tabs)/profile.tsx` → CTA card renders. No redirect — the user expects to be on the Profile tab after tapping it.
- **`/profile` route is internal-only.** No external links to it. The redirect-when-signed-in pattern means even a direct visit to `/profile` ends up on `/users/[username]`.
- **Deep linking.** `/`, `/communities`, `/live-questions` all still work and land on the right tab. The active tab is set based on the URL.
- **Web export.** Expo Router renders `<Tabs>` on web as a horizontal top tab bar. Functional. The production web experience is `qna-web`, not the Expo web export.
- **Sign-out web fallback.** Native `Alert` doesn't render on web. Use the existing project pattern for web-safe confirms (or add a small local helper if one doesn't exist).

## Testing

The mobile codebase's test convention (`tsx --test "services/**/*.test.ts"`) is pure-logic unit tests in `services/` only. No component tests, no E2E. This slice is overwhelmingly wiring; the only new unit tests are for `confirmAction` (web branch only).

Verification:

1. **`npx tsc --noEmit`** — typecheck passes.
2. **`npm run lint -w qna-mobile`** — 0 new errors from `expo lint`.
3. **`npm test -w qna-mobile`** — existing service tests still pass.
4. **Manual smoke test** (post-implementation, owner responsibility): launch the Expo dev server, verify each tab is reachable, tab bar visible on all 4 tab screens, tab bar hides on detail screens, sign-out flow works (confirm → home tab → signed-out state), signed-out CTA card renders on Profile.

## Files touched (planning-level)

**New files:**
- `qna-mobile/app/(tabs)/_layout.tsx` — Tabs navigator config.
- `qna-mobile/app/(tabs)/profile.tsx` — Profile tab wrapper.
- `qna-mobile/services/util/confirmAction.ts` — web-safe confirm-dialog helper.
- `qna-mobile/services/util/confirmAction.test.ts` — unit test for the web branch.

**Moved files (file path changes, no content changes except possibly minor imports):**
- `qna-mobile/app/index.tsx` → `qna-mobile/app/(tabs)/index.tsx`
- `qna-mobile/app/communities.tsx` → `qna-mobile/app/(tabs)/communities.tsx`
- `qna-mobile/app/live-questions.tsx` → `qna-mobile/app/(tabs)/live-questions.tsx`

**Modified files:**
- `qna-mobile/app/_layout.tsx` — drop `HeaderProfileChip` from header, drop stale `Stack.Screen` entries for moved screens, add `Stack.Screen name="(tabs)"` with `headerShown: false`.
- `qna-mobile/app/users/[username].tsx` — add Sign-out button rendered only when viewing own profile, including the web-safe confirm dialog and the post-sign-out redirect.

**Deleted files:**
- `qna-mobile/components/HeaderProfileChip.tsx` — no longer referenced anywhere.

## Out of scope (deferred)

- Mobile notifications bell (separate slice; could become a 5th tab or a header bell when it ships).
- Custom-styled tab bar with brand-specific artistry (animations, custom icons, haptic feedback).
- "Home" dashboard redesign (the existing Discovery-First screen stays).
- Tablet-specific layouts (side rail vs bottom bar).
- Tab badges for unread counts (would need a data source first; ties into mobile notifications).
- Tab reordering / user customization.
- A dedicated mobile "Me" screen distinct from `/users/[username]` (would only happen if we add settings or preferences that don't fit on a public profile).
