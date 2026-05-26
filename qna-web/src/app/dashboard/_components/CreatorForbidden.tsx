import Link from 'next/link';

export function CreatorForbidden() {
  return (
    <section className="px-6 py-16 md:px-12">
      <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Creator access
        </p>
        <h1 className="mt-3 text-3xl font-bold">No creator communities yet</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The dashboard is available once you create a community or become a
          creator in one.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/communities/new" className="q-btn q-btn-primary q-btn-md">
            Create community
          </Link>
          <Link href="/communities" className="q-btn q-btn-ghost q-btn-md">
            Browse communities
          </Link>
        </div>
      </div>
    </section>
  );
}
