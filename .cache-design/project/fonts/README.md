# Fonts

Quorum uses three Google Fonts. The HTML previews here load them via CDN:

- **Geist** — primary sans (variable, weights 400/500/600/700/800)
- **Geist Mono** — monospace
- **Instrument Serif** — italic 400 only, used for the signature "payoff" phrases in headlines

For production builds, prefer `next/font/google` (as the upstream codebase does in `qna-web/src/app/layout.tsx`). Self-hosted woff2 files are not bundled here to keep the design system folder small — the Google Fonts CDN is sufficient for design previews and prototypes.

> Substitution flag: if you can't reach Google Fonts (offline, restricted network), Geist's fallbacks are `system-ui, -apple-system, "Segoe UI", sans-serif` and Instrument Serif's fallback is `Georgia, serif`. These are tolerable but lose the brand's editorial feel — request real woff2 files from the brand owner if going to production.
