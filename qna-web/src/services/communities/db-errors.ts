/**
 * Cross-driver detection for Postgres unique-constraint violations.
 *
 * Drizzle wraps the underlying pg error in a `DrizzleQueryError` whose
 * `message` reads "Failed query: insert into …" — none of the words
 * "duplicate" or "unique" appear there, so a naive message-based
 * regex misses it and the failure escapes the service layer as a 500.
 *
 * The reliable signal is the SQLSTATE code (`23505` for
 * `unique_violation`) on the underlying error. We walk the `cause`
 * chain because the path is:
 *
 *   DrizzleQueryError → PostgresError (postgres-js) | DatabaseError (pg)
 *
 * with the code sitting on the inner error. Cap the depth so a
 * malformed/self-referential chain can't loop forever.
 */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i += 1) {
    if (typeof current === 'object' && current !== null) {
      const code = (current as { code?: unknown }).code;
      if (code === '23505') return true;
    }
    const msg = current instanceof Error ? current.message : String(current);
    if (/duplicate key|unique constraint|unique violation/i.test(msg)) {
      return true;
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}
