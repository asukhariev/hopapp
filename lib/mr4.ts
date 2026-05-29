// Subject-ID convention for linking our customers to Noraxon MR4 "Subjects".
//
// MR4's quick "New Subject" dialog only exposes a single "first name" field
// (confirmed from the lab intake), so we cram our whole label into it:
//
//     "<full name> <code>"   e.g.  "André Silva 3f9c1a"
//
// `code` is a short, unique 6-hex id we generate per customer. It is the anchor
// we match on: typing it into MR4's subject type-ahead resolves to exactly one
// subject (or none → create). The display name is cosmetic; the code is law.

// checking  — runner is reading MR4's subject store for our code (fast, no UI)
// not_found — checked, the subject isn't in MR4 yet → offer "Create & link"
// linking   — runner is driving MR4 to create the subject
// failed    — the find or create attempt errored
export type Mr4LinkStatus = "checking" | "not_found" | "linking" | "failed";

/** Customer is confirmed present in MR4 (our record is the source of truth). */
export function isWired(c: { mr4_linked_at: string | null }): boolean {
  return !!c.mr4_linked_at;
}

/** The exact string we type into MR4's subject field for this customer. */
export function intendedMr4SubjectName(name: string, code: string | null): string {
  const n = name.trim();
  return code ? `${n} ${code}` : n;
}
