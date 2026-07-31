/**
 * Reading something that might not be there yet.
 *
 * WHY THIS EXISTS. The cemetery page read a beis hachaim and its pictures in
 * one query. On a database where the migration had not been run the Photo
 * table did not exist, so that query threw, the catch around it fell back to
 * the built-in record, and every kever the owner had added disappeared from
 * the page. He had saved them. The admin had said "Saved." They were in the
 * database. The page simply refused to read them, and said nothing.
 *
 * The town pages were worse: `getPublishedDestinationContent` returned null,
 * so every listing and every contact the owner had entered vanished at once
 * and the page fell back to the built-in content — which looks exactly like a
 * site where nobody has entered anything.
 *
 * The mistake was not the missing migration. It was joining something new and
 * optional onto something old and essential, so a failure in the new part cost
 * the old part everything. A newly added table is a hazard on every deployment
 * between the code shipping and the migration running, and that gap is however
 * long it takes somebody to get to a terminal.
 *
 * So: read the essential thing on its own, read the new thing separately, and
 * when the new one fails carry on without it. A page missing its pictures is a
 * page. A page missing everything the owner typed is a bug report.
 */

/**
 * Run a read that is allowed to fail, and say so when it does.
 *
 * Loud enough to find in the logs, quiet enough not to take the page down.
 * `what` should name the thing in the words somebody debugging would use —
 * "pictures for the beis hachaim", not "photo query".
 */
export async function optionalRead<T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The specific shape of "you have not run the migration", called out
    // because it is by far the likeliest cause and the fix is one command.
    const missing = /does not exist|Unknown column|no such table|column .* of relation/i.test(message);
    console.error(
      `[db] could not read ${what} — carrying on without it.` +
        (missing ? " This looks like a migration that has not been run: npm run db:migrate, or the setup button in Admin → Towns." : ""),
      error,
    );
    return fallback;
  }
}
