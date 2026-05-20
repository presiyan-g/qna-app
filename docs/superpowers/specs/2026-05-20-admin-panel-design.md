# Platform Admin Panel Phase 1 Design

## Goal

Add the first platform admin panel slice so trusted platform admins can handle basic operational moderation without touching the database directly.

The v1 panel focuses on two jobs:

- User management: search users, inspect account/community state, promote another user to platform admin, and suspend or unsuspend a problem user.
- Community oversight: list active and archived communities, archive rule-breaking communities, and restore communities when needed.

## Scope

Phase 1 covers:

- Protected `/admin` area for platform admins only.
- User search by email or username.
- User detail view with joined date, platform role, account status, and active community memberships.
- Promote platform members to platform admins.
- Suspend and unsuspend users.
- Community list with active and archived filters.
- Archive and restore communities through the existing `communities.status` field.
- Admin audit log entries for every role, suspension, archive, and restore action.
- Server-side authorization and suspension checks for affected mutation paths.

This slice does not cover reports, content review queues, analytics, bulk actions, admin management of questions/comments/broadcasts, password resets, hard deletes, email notifications, mobile admin UI, or a general settings console.

## Locked Decisions

- Admin panel route root is `/admin`.
- Platform admins are users where `users.role = 'admin'`.
- Suspended users can still log in and read allowed pages.
- Suspended users cannot perform product mutations, including answering, commenting, creating or joining communities, creator dashboard mutations, broadcast mutations, or admin actions.
- Archived communities are hidden from normal public, member, creator, profile, dashboard, and mobile surfaces.
- Archived communities are only discoverable in the admin panel.
- Direct public visits to archived community routes should behave like missing or unavailable content.
- Admin actions are audited in the database.
- Admin actions must not allow an admin to suspend themselves.
- Admin actions must not allow the platform to end up with zero active, unsuspended admins.
- Schema changes go through Drizzle migrations only.

## Data Model

Add `users.status`:

```ts
status: 'active' | 'suspended'
```

Default existing and new users to `active`.

Add `admin_audit_logs`:

```ts
{
  id: uuid;
  actorUserId: uuid;
  action:
    | 'user_promoted_to_admin'
    | 'user_suspended'
    | 'user_unsuspended'
    | 'community_archived'
    | 'community_restored';
  targetUserId: uuid | null;
  targetCommunityId: uuid | null;
  reason: string;
  createdAt: Date;
}
```

`reason` is required in the service layer for suspension and community archive actions. Promotion, unsuspension, and restore may use a short default reason when the UI does not ask for one.

The audit table records only operational metadata. It does not store snapshots of user emails, community names, or full before/after JSON in v1. Admin screens can join current names for display when needed.

## Permission Model

Create a small admin policy/service boundary:

- `requireAdminSession()` verifies a signed-in user is an active, unsuspended platform admin.
- `assertActorCanMutateTargetUser()` blocks self-suspension and last-active-admin removal.
- `assertUserCanMutate()` verifies the current user is not suspended for non-admin product mutations.

Admin checks happen on every admin page loader and Server Action. UI hiding is only a convenience.

Suspension checks should be applied to existing mutation paths that change product state:

- auth remains allowed so suspended users can log in and log out
- create or join community
- answer submission
- comment create/delete
- broadcast create/edit/delete
- question management actions
- future admin actions

Read-only public and signed-in pages continue to work unless they already require data that is hidden for other reasons, such as archived communities.

## Admin UX

`/admin` renders as an operational console, not a marketing page:

- Summary strip: total users, suspended users, active communities, archived communities.
- User search form for email or username.
- Recent admin audit log entries.
- Links to user and community oversight sections.

`/admin/users` supports search-first user management:

- Search input accepts email or username fragments.
- Results are server-paginated.
- Each row shows username, email, role, status, joined date, and high-level membership count.
- Row action links to `/admin/users/[id]`.

`/admin/users/[id]` shows:

- username and email
- joined date
- platform role
- account status
- community memberships with community name, slug, role, joined date, and community status
- actions: promote to admin, suspend, unsuspend

`/admin/communities` supports oversight:

- Filter by `active` or `archived`.
- Search by name or slug.
- Server-paginated rows.
- Each row shows name, slug, status, creator username, member count, created date, and archive/restore action.

Action forms should use explicit confirmation copy and require a reason for suspension and archive. Keep the visual design consistent with the existing dashboard style: simple full-width content, compact summary boxes, tables or dense rows, and restrained action buttons.

## Service Layer

Add a `services/admin` module with focused functions:

- `getAdminOverview()`
- `searchAdminUsers({ q, limit, offset })`
- `getAdminUserDetail(userId)`
- `promoteUserToAdmin({ actorUserId, targetUserId })`
- `suspendUser({ actorUserId, targetUserId, reason })`
- `unsuspendUser({ actorUserId, targetUserId, reason })`
- `searchAdminCommunities({ q, status, limit, offset })`
- `archiveCommunity({ actorUserId, communityId, reason })`
- `restoreCommunity({ actorUserId, communityId, reason })`
- `listAdminAuditLogs({ limit, offset })`

Server Actions in `app/admin/actions.ts` call this service layer. The service layer owns authorization, invariants, writes, and audit logging so pages and actions stay thin.

## Archived Community Behavior

Existing public community read services already filter to active communities in important paths. This slice should review and tighten any route or API that can expose community data so archived communities do not appear through:

- browse and search
- community home and detail pages
- creator dashboard lists
- public profiles
- leaderboard reads
- question detail reads
- broadcast feeds
- mobile REST endpoints

Admin community queries are the exception and can include both active and archived rows.

## Error Handling

Admin pages:

- Anonymous users redirect to `/login?next=/admin...`.
- Signed-in non-admins see a 403-style unavailable page or `notFound()`, matching the app's existing protected-route posture.
- Suspended admins are treated as non-admin for admin mutations.

Admin actions:

- Return field-level errors for missing or too-short reasons.
- Return safe form errors for forbidden actions such as self-suspension or last-active-admin removal.
- Return not-found errors when target users or communities no longer exist.
- Treat already-applied state changes as successful no-ops when safe, such as restoring an already active community.

## Testing

Unit tests:

- Admin policy helpers: active admin allowed, member denied, suspended admin denied.
- Last-active-admin guard.
- Self-suspension guard.
- Suspended user mutation guard.
- Admin audit log action builders or service calls where practical.

Service tests:

- Promote user to admin updates role and writes audit log.
- Suspend and unsuspend update status and write audit logs.
- Archive and restore update community status and write audit logs.
- Admin user detail returns memberships and roles.
- Admin community search filters active and archived communities.

Route/action tests can stay focused on the highest-risk entry points if the app's current test setup does not already cover Next.js page rendering deeply.

Manual verification:

- Active admin can access `/admin`.
- Member cannot access `/admin`.
- Suspended user can log in but cannot answer, comment, join, create a community, or use creator/admin mutations.
- Archived community disappears from public browse/search/profile/dashboard surfaces and can be restored from admin.

## Out Of Scope

- Report queues or user-submitted abuse reports.
- Content-level moderation for questions, comments, broadcasts, or answers.
- Admin analytics.
- Bulk suspend/archive actions.
- Hard deletion of users or communities.
- Admin-created communities on behalf of users.
- Changing community creators.
- Demoting admins.
- Emailing users about moderation decisions.

## Implementation Notes

Prefer a narrow migration and service-first implementation:

1. Add schema fields and audit table through Drizzle.
2. Add admin service and policy helpers.
3. Apply suspension checks to existing mutation services.
4. Add server actions and pages.
5. Add tests around guards, state changes, and archived visibility.

The main risk is missing a mutation path for suspended users or an archived community read path. Verification should explicitly exercise the existing services rather than relying only on UI behavior.
