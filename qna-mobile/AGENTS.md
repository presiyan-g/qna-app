# qna-mobile 

React Native mobile app built with Expo. Root rules in `../AGENTS.md` apply here too; this file adds mobile-specific guidance.

- Role of this package: End-user mobile client only. No admin functionality, no creator-heavy workflows — those stay in the Web app. See PROJECT.md §6 for the mobile screen list.
- Backend contract. Mobile talks to the Next.js back-end only via the RESTful API. Source code at `..\qna-web\src\app\api`. 
- Auth. JWT stored securely (expo-secure-store), attached as Authorization: Bearer … on every request. Handle 401 by clearing the token and routing to login.
- Layout. Responsive for phones and tablets; one screen per file under app/ (Expo Router) or screens/. Don't cram unrelated screens together.
- Platform considerations. Code should run on both Android and iOS; avoid platform-only APIs unless guarded by Platform.OS. Web export must also build (it's the deployment target — Vercel Web export).
- Run commands. npm run start -w qna-mobile (or cd qna-mobile && npx expo start). Build for distribution via EAS only when needed.
- Mobile UI Alerts: ensure all native alerts, confirms and other system dialogs have a fallback for web (implemented as modal popups or similar). Don't use browser-specific APIs that won't work in the mobile app.

## Auth REST contract

Implemented in `qna-web/src/app/api/auth/`. The endpoints return a Bearer token in the JSON body — store it in `expo-secure-store` and send `Authorization: Bearer <token>` on every subsequent request.

- `POST /api/auth/register` — body `{ email, username, password }`. Returns `201 { token, user }`. Errors: `400` bad JSON, `409` email/username taken (response includes `fieldErrors`), `422` validation (response includes `fieldErrors`).
- `POST /api/auth/login` — body `{ email, password }`. Returns `200 { token, user }`. Errors: `400` bad JSON, `401` wrong credentials (generic message — do not surface which field was wrong), `422` validation.
- `GET /api/auth/me` — header `Authorization: Bearer <token>`. Returns `200 { user }`. Errors: `401` missing/invalid token or user deleted.

The `user` resource shape: `{ id, email, username, role: "member" | "admin", status: "active" | "suspended", createdAt: ISO8601 }`. Never contains `passwordHash`.

Logout is client-side only: delete the token from `expo-secure-store`. There is no `/api/auth/logout` endpoint — stateless JWT, no revocation list.

Validation rules (mirror these in mobile form validation to short-circuit obvious bad input):
- Email: standard email regex, lowercased.
- Username: `^[a-z0-9_]{3,24}$`.
- Password: 8–128 characters.

On a `401` from any endpoint, clear the stored token and route to login.

