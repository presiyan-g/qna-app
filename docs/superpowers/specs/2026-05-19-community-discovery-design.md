# Community Discovery And Featured Data Design

## Context

The landing page originally showed static featured communities, while the `/communities` route listed database-backed communities with no public navigation path or search. The next slice turns community discovery into database-backed product surface area: searchable community listings, featured communities sourced from the database, seed data that resembles the original landing examples, and category metadata for future filtering.

## Scope

- Route Browse/Discover CTAs to `/communities`.
- Keep `/communities` as a Server Component and drive text search from `?q=`.
- Add `community_categories` as a one-to-many lookup table and attach each community through nullable `communities.category_id`.
- Add `communities.is_featured` and nullable `communities.featured_rank`.
- Render 9 featured communities on the landing page so wide screens form a 3 by 3 grid.
- Keep the hero stack mocked, but seed those same community examples into the database.
- Seed local/demo data idempotently and refuse to run in production.

## Data Model

`community_categories` stores `slug`, `name`, and `description`. `communities.category_id` is nullable so the existing create-community form can continue to work before category selection UI exists.

Featured display uses `is_featured = true`, ordered by `featured_rank` ascending and then `created_at` descending as a stable fallback. `featured_rank` stays nullable so non-featured communities do not need ordering data.

## UI And Data Flow

Landing `FeaturedCommunities` calls `listFeaturedCommunities({ limit: 9 })` and renders the existing card grid with category badges. `/communities` calls `searchCommunities({ q, userId })`; empty `q` returns the existing default list, and non-empty `q` filters community names with case-insensitive `ilike`.

Community cards and detail pages surface the category name as secondary metadata without introducing category filters yet.

## Operations

`npm run db:seed -w qna-web` seeds 9 categories, 20 communities, and 9 featured communities. It creates deterministic demo users and memberships to make member counts credible. The script exits before mutation when `NODE_ENV === 'production'`.

## Out Of Scope

- Category management UI.
- Category filtering.
- Pagination and ranking beyond the existing default order and featured rank.
- Auth middleware changes.
