import type { Metadata } from "next";

type Endpoint = {
  method: string;
  path: string;
  auth: "Public" | "Optional bearer" | "Bearer required";
  summary: string;
  query?: string[];
  body?: string;
  returns: string;
  errors: string[];
};

type Resource = {
  name: string;
  shape: string;
};

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/auth/register",
    auth: "Public",
    summary: "Create a member account and receive a JWT for mobile storage.",
    body: "{ email, username, password }",
    returns: "201 { token, user }",
    errors: ["400 invalid JSON", "409 email or username taken", "422 validation"],
  },
  {
    method: "POST",
    path: "/api/auth/login",
    auth: "Public",
    summary: "Authenticate by email and password.",
    body: "{ email, password }",
    returns: "200 { token, user }",
    errors: ["400 invalid JSON", "401 invalid credentials", "422 validation"],
  },
  {
    method: "GET",
    path: "/api/auth/me",
    auth: "Bearer required",
    summary: "Resolve the current JWT into the signed-in user.",
    returns: "200 { user }",
    errors: ["401 missing, invalid, or stale token"],
  },
  {
    method: "GET",
    path: "/api/communities",
    auth: "Optional bearer",
    summary: "List discoverable communities with viewer membership flags when signed in.",
    query: ["limit default 24", "offset default 0"],
    returns: "200 { items: Community[], pagination: { limit, offset } }",
    errors: [],
  },
  {
    method: "POST",
    path: "/api/communities",
    auth: "Bearer required",
    summary: "Create a community. This is exposed in REST, though creator-heavy flows live on web.",
    body: "{ name, description, emoji, cadence }",
    returns: "201 Community",
    errors: ["400 invalid JSON", "401 unauthenticated", "403 suspended", "409 duplicate name", "422 validation"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]",
    auth: "Optional bearer",
    summary: "Fetch one community by slug.",
    returns: "200 Community",
    errors: ["404 community not found"],
  },
  {
    method: "POST",
    path: "/api/communities/[slug]/join",
    auth: "Bearer required",
    summary: "Join a community as a member.",
    returns: "200 Community",
    errors: ["401 unauthenticated", "403 suspended", "404 community not found"],
  },
  {
    method: "DELETE",
    path: "/api/communities/[slug]/join",
    auth: "Bearer required",
    summary: "Leave a joined community.",
    returns: "200 Community",
    errors: ["401 unauthenticated", "403 suspended", "404 community not found", "409 membership rule conflict"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/questions",
    auth: "Optional bearer",
    summary: "List scheduled and published questions for a community with viewer answer summaries.",
    query: ["limit default 20", "offset default 0"],
    returns: "200 { items: QuestionSummary[], pagination: { limit, offset } }",
    errors: [],
  },
  {
    method: "POST",
    path: "/api/communities/[slug]/questions",
    auth: "Bearer required",
    summary: "Create a question as a community creator.",
    body: "{ prompt, explanation, imageUrl?, scheduledFor, choices }",
    returns: "201 QuestionSummary",
    errors: ["400 invalid JSON", "401 unauthenticated", "403 not creator or suspended", "422 validation"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/questions/[id]",
    auth: "Bearer required",
    summary: "Fetch answer-state-aware question detail for the signed-in member.",
    returns: "200 QuestionDetail",
    errors: ["401 unauthenticated", "403 not allowed", "404 question not found"],
  },
  {
    method: "POST",
    path: "/api/communities/[slug]/questions/[id]/answers",
    auth: "Bearer required",
    summary: "Submit one multiple-choice answer and receive grading plus explanation.",
    body: "{ choiceId }",
    returns: "201 { questionId, canAnswer, isClosed, isScheduled, result, explanation, choices }",
    errors: ["400 invalid JSON", "401 unauthenticated", "403 not allowed or suspended", "404 question not found", "409 already answered or unavailable", "422 validation"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/questions/[id]/comments",
    auth: "Bearer required",
    summary: "List unlocked question comments with one reply level.",
    query: ["limit normalized by server", "cursor optional"],
    returns: "200 { items: Comment[], pagination: { limit, nextCursor } }",
    errors: ["400 invalid cursor", "401 unauthenticated", "403 locked or not allowed", "404 question not found"],
  },
  {
    method: "POST",
    path: "/api/communities/[slug]/questions/[id]/comments",
    auth: "Bearer required",
    summary: "Post a top-level comment or one-level reply after answering.",
    body: "{ body, parentCommentId? }",
    returns: "201 { comment }",
    errors: ["401 unauthenticated", "403 locked, not allowed, or suspended", "404 question/comment not found", "422 invalid JSON or validation"],
  },
  {
    method: "DELETE",
    path: "/api/communities/[slug]/questions/[id]/comments/[commentId]",
    auth: "Bearer required",
    summary: "Soft-delete a comment. Authors and same-community creators can delete.",
    returns: "204 empty response",
    errors: ["401 unauthenticated", "403 not allowed or suspended", "404 question/comment not found"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/broadcasts",
    auth: "Optional bearer",
    summary: "List community broadcast posts. Some communities may require membership.",
    query: ["limit default 20 after normalization", "cursor optional"],
    returns: "200 { items: Broadcast[], pagination: { limit, nextCursor } }",
    errors: ["400 invalid cursor", "401 auth required by policy", "403 membership required", "404 community not found"],
  },
  {
    method: "POST",
    path: "/api/communities/[slug]/broadcasts",
    auth: "Bearer required",
    summary: "Create a creator broadcast post.",
    body: "{ body, imageUrl? }",
    returns: "201 { post }",
    errors: ["400 invalid JSON", "401 unauthenticated", "403 not creator or suspended", "404 community not found", "422 validation"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/broadcasts/[postId]",
    auth: "Optional bearer",
    summary: "Fetch one broadcast post.",
    returns: "200 { post }",
    errors: ["401 auth required by policy", "403 membership required", "404 broadcast not found"],
  },
  {
    method: "PATCH",
    path: "/api/communities/[slug]/broadcasts/[postId]",
    auth: "Bearer required",
    summary: "Edit an existing broadcast post as its author or an allowed creator.",
    body: "{ body, imageUrl? }",
    returns: "200 { post }",
    errors: ["400 invalid JSON", "401 unauthenticated", "403 not allowed or suspended", "404 broadcast not found", "422 validation"],
  },
  {
    method: "DELETE",
    path: "/api/communities/[slug]/broadcasts/[postId]",
    auth: "Bearer required",
    summary: "Soft-delete a broadcast post.",
    returns: "204 empty response",
    errors: ["401 unauthenticated", "403 not allowed or suspended", "404 broadcast not found"],
  },
  {
    method: "GET",
    path: "/api/communities/[slug]/leaderboard",
    auth: "Optional bearer",
    summary: "Fetch the community leaderboard and signed-in viewer rank when available.",
    query: ["window one of 7d, 30d, all; defaults by server normalization"],
    returns: "200 { community, window, entries, viewerEntry }",
    errors: ["404 community not found"],
  },
  {
    method: "GET",
    path: "/api/users/[username]",
    auth: "Public",
    summary: "Fetch a public user profile for mobile profile screens.",
    returns: "200 { user, stats, communities, streak }",
    errors: ["404 user not found"],
  },
  {
    method: "POST",
    path: "/api/uploads/presign",
    auth: "Bearer required",
    summary: "Create a signed R2 upload target for images and attachments.",
    body: "{ scope, communityId?, contentType, sizeBytes }",
    returns: "200 { uploadUrl, method, headers, publicUrl, key }",
    errors: ["400 invalid JSON", "401 unauthenticated", "422 validation"],
  },
];

const resources: Resource[] = [
  {
    name: "User",
    shape:
      "{ id, email, username, role: 'member' | 'admin', status: 'active' | 'suspended', createdAt }",
  },
  {
    name: "Community",
    shape:
      "{ id, slug, name, description, emoji, coverImageUrl, cadence, status, creatorUserId, category, isFeatured, featuredRank, directoryRank, memberCount, liveQuestionCount, unansweredQuestionCount, newBroadcastCount, currentUserRole, createdAt, updatedAt }",
  },
  {
    name: "QuestionChoice",
    shape:
      "{ id, label, imageUrl, position, isCorrect }. isCorrect may be hidden as null until the solution is visible.",
  },
  {
    name: "QuestionSummary",
    shape:
      "{ id, communityId, creatorUserId, prompt, explanation, imageUrl, scheduledFor, publishedAt, closesAt, timeZone, points, choiceCount, choices, viewerAnswer, createdAt, updatedAt }",
  },
  {
    name: "QuestionDetail",
    shape:
      "QuestionSummary plus { currentUserRole, canAnswer, canSeeSolution, isClosed, isScheduled, result }.",
  },
  {
    name: "QuestionResult",
    shape:
      "{ id, questionId, selectedChoiceId, correctChoiceId, isCorrect, isLate, pointsAwarded, answeredAt, selectedChoice, correctChoice }",
  },
  {
    name: "Comment",
    shape:
      "{ id, questionId, parentCommentId, author, body, deletedAt, createdAt, updatedAt, canDelete, replies }",
  },
  {
    name: "Broadcast",
    shape:
      "{ id, communityId, author, body, imageUrl, publishedAt, createdAt, updatedAt, canEdit, canDelete }",
  },
  {
    name: "LeaderboardEntry",
    shape: "{ rank, userId, username, points, lastScoringAnswerAt }",
  },
  {
    name: "PublicUserProfile",
    shape:
      "{ user: { id, username, joinedAt }, stats: { totalPoints, communityCount }, communities: [{ id, slug, name, role, joinedAt }] }",
  },
];

const mobileFlows = [
  "Register or login, then store token from { token, user } in Expo SecureStore.",
  "Send Authorization: Bearer <token> on authenticated calls. On any 401, clear the token and route to login.",
  "Load communities with GET /api/communities, then GET /api/communities/[slug] for detail tabs.",
  "Use GET /api/communities/[slug]/questions for archives and GET /api/communities/[slug]/questions/[id] before answering.",
  "Submit answers with POST /api/communities/[slug]/questions/[id]/answers, then show result, explanation, and unlocked comments.",
  "Use cursor pagination for comments and broadcasts; use offset pagination for communities and questions.",
];

export const metadata: Metadata = {
  title: "REST API Docs | Quorum",
  description: "REST API reference for the Quorum Expo mobile app.",
};

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-line bg-primary text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/70">
              Quorum REST API
            </p>
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Expo mobile API reference
              </h1>
              <p className="mt-4 text-base leading-7 text-white/78 sm:text-lg">
                These endpoints are the stable REST contract exposed by the
                Next.js backend for the Expo app. The web client should keep
                using Server Actions for in-app workflows.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile label="Base URL" value="/api" />
            <SummaryTile label="Auth" value="JWT bearer" />
            <SummaryTile label="Response format" value="JSON" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[240px_1fr] lg:px-10">
        <aside className="h-fit rounded-lg border border-line bg-card p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold text-primary">Contents</p>
          <nav className="mt-4 flex flex-col gap-2 text-sm text-muted">
            <a className="hover:text-primary" href="#rules">
              Mobile rules
            </a>
            <a className="hover:text-primary" href="#endpoints">
              Endpoints
            </a>
            <a className="hover:text-primary" href="#resources">
              Resource shapes
            </a>
            <a className="hover:text-primary" href="#errors">
              Errors and CORS
            </a>
          </nav>
        </aside>

        <div className="flex flex-col gap-10">
          <section id="rules" className="rounded-lg border border-line bg-card p-6">
            <h2 className="text-2xl font-semibold">Mobile Integration Rules</h2>
            <div className="mt-5 grid gap-3">
              {mobileFlows.map((flow) => (
                <div key={flow} className="flex gap-3 rounded-md bg-primary-soft p-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <p className="text-sm leading-6 text-ink">{flow}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-line bg-white p-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                Headers
              </p>
              <pre className="mt-3 overflow-x-auto text-sm leading-6 text-ink">
                <code>{`Content-Type: application/json
Authorization: Bearer <token>`}</code>
              </pre>
            </div>
          </section>

          <section id="endpoints" className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Endpoints</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Dynamic path segments use square brackets to match the Next.js
                route names. All timestamps are ISO 8601 strings.
              </p>
            </div>
            <div className="grid gap-4">
              {endpoints.map((endpoint) => (
                <EndpointCard key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
              ))}
            </div>
          </section>

          <section id="resources" className="rounded-lg border border-line bg-card p-6">
            <h2 className="text-2xl font-semibold">Resource Shapes</h2>
            <div className="mt-5 grid gap-4">
              {resources.map((resource) => (
                <div key={resource.name} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-primary">{resource.name}</h3>
                  <p className="mt-2 font-mono text-sm leading-6 text-muted">{resource.shape}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="errors" className="rounded-lg border border-line bg-card p-6">
            <h2 className="text-2xl font-semibold">Errors and CORS</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-muted">
              <p>
                Error responses use JSON with an <code className="font-mono">error</code>
                string. Validation responses may also include{" "}
                <code className="font-mono">fieldErrors</code> keyed by field name.
              </p>
              <p>
                REST routes support <code className="font-mono">OPTIONS</code> and return
                CORS headers through the shared API utility, so Expo web export and native
                clients can call the backend from configured origins.
              </p>
              <pre className="overflow-x-auto rounded-md bg-primary-soft p-4 text-ink">
                <code>{`{
  "error": "Validation failed.",
  "fieldErrors": {
    "email": "Enter a valid email address."
  }
}`}</code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/8 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/58">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary px-2 py-1 font-mono text-xs font-semibold text-white">
              {endpoint.method}
            </span>
            <code className="break-all font-mono text-sm text-primary">{endpoint.path}</code>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{endpoint.summary}</p>
        </div>
        <span className="w-fit rounded border border-line px-2.5 py-1 font-mono text-xs text-muted">
          {endpoint.auth}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        {endpoint.query ? <EndpointField label="Query" value={endpoint.query.join("; ")} /> : null}
        {endpoint.body ? <EndpointField label="Body" value={endpoint.body} /> : null}
        <EndpointField label="Returns" value={endpoint.returns} />
        <EndpointField
          label="Errors"
          value={endpoint.errors.length > 0 ? endpoint.errors.join("; ") : "Standard 5xx for unexpected server errors"}
        />
      </dl>
    </article>
  );
}

function EndpointField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 font-mono leading-6 text-ink">{value}</dd>
    </div>
  );
}
