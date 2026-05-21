# Mobile Home Auth Shell Design

## Goal

Build the first Expo mobile slice for Quorum: a cleaned starter app with stack navigation, a Discovery First home screen, empty communities page, and static nonfunctional login/register form layouts.

## Scope

- Remove the default Expo starter tabs, modal, theme/color-scheme helpers, and example components.
- Keep Expo Router and use a simple stack with `/`, `/login`, `/register`, and `/communities`.
- Match the web app's Editorial Forest palette and Quorum branding.
- Keep mobile functionality lighter than web. No auth API calls, persistence, community fetching, admin, or creator flows in this slice.
- Make Communities reachable from the home page.

## Screens

- Home: app-like Discovery First direction, with Quorum header, auth actions, intro copy, static community previews, and a clear Browse Communities action.
- Login: static email/password form layout, a primary sign-in button with no submitted behavior yet, and link to Register.
- Register: static username/email/password form layout, a primary create-account button with no submitted behavior yet, and link to Login.
- Communities: branded empty placeholder screen for later discovery work.

## Architecture

- Use Expo Router file routes under `qna-mobile/app`.
- Use one screen per file.
- Add shared brand tokens and small reusable UI primitives under `qna-mobile/constants` and `qna-mobile/components`.
- Use React Native `StyleSheet` for this shell; do not add a styling framework.

## Verification

- Run `npm run lint -w qna-mobile`.
- Run `npm run build -w qna-mobile` to verify static web export.
