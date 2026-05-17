# qna-web

 Next.js back-end + Web client. Root rules in `../AGENTS.md` apply here too; this file adds web-specific guidance.

- Role of this package: Both the back-end (API routes / server actions / DB access) and the Web client live here. Server code in app/api/** and server components; client code marked with "use client" only where needed.
- Server Actions vs RESTful API: Web client → use Server Actions. The RESTful endpoints under app/api/** exist for the mobile app — keep them stable, and not tailored to web-only needs.
- Data access. Drizzle queries live in a services/ layer (or similar), never inline in components. Server components and server actions call services; client components never touch the DB.

# UI guidelines
- Modern, responsive UI. Tailwind-driven design that works on desktop and mobile browsers. Use icons, hover/focus states, and loading indicators to make UI intuitive.
- Server-first rendering. Default to server components. Only mark a component "use client" when it genuinely needs browser-only behavior (event handlers, refs, browser APIs, state-driven interaction, controlled forms).
- Forms and interactivity. Client components are appropriate for forms and interactive widgets; everything else (layouts, lists, detail views, data fetching) should stay on the server.
