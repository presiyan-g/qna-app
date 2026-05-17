# qna-mobile 

React Native mobile app built with Expo. Root rules in `../AGENTS.md` apply here too; this file adds mobile-specific guidance.

- Role of this package: End-user mobile client only. No admin functionality, no creator-heavy workflows — those stay in the Web app. See PROJECT.md §6 for the mobile screen list.
- Backend contract. Mobile talks to the Next.js back-end only via the RESTful API. Source code at `..\qna-web\src\app\api`. 
- Auth. JWT stored securely (expo-secure-store), attached as Authorization: Bearer … on every request. Handle 401 by clearing the token and routing to login.
- Layout. Responsive for phones and tablets; one screen per file under app/ (Expo Router) or screens/. Don't cram unrelated screens together.
- Platform considerations. Code should run on both Android and iOS; avoid platform-only APIs unless guarded by Platform.OS. Web export must also build (it's the deployment target — Vercel Web export).
- Run commands. npm run start -w qna-mobile (or cd qna-mobile && npx expo start). Build for distribution via EAS only when needed.
- Mobile UI Alerts: ensure all native alerts, confirms and other system dialogs have a fallback for web (implemented as modal popups or similar). Don't use browser-specific APIs that won't work in the mobile app.

