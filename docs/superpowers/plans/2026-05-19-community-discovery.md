# Community Discovery Implementation Plan

## Steps

1. Add schema support for `community_categories`, `communities.category_id`, `is_featured`, and `featured_rank`.
2. Generate and apply a Drizzle migration.
3. Extend the community service with category-aware rows, `searchCommunities`, and `listFeaturedCommunities`.
4. Repoint Browse/Discover CTAs and remove stale static featured fixtures.
5. Render 9 featured database communities on the landing page and category labels on cards/detail pages.
6. Add an idempotent seed script with a production guard.
7. Seed demo data locally.
8. Verify with lint, build, seed re-run, and browser checks for the landing grid and search.

## Verification

- `npm run db:migrate -w qna-web`
- `npm run db:seed -w qna-web`
- `npm run lint -w qna-web`
- `npm run build -w qna-web`
- Browser smoke test for `/` and `/communities?q=macro`.
