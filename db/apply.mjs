// Apply schema.sql to Neon (idempotent) and backfill mr4_code for existing rows.
//   run: node --env-file=.env.local db/apply.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

const raw = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const stmts = raw
  .replace(/--[^\n]*/g, "") // strip line comments (a ';' inside one once broke the split)
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

let applied = 0;
for (const s of stmts) {
  await sql.query(s);
  applied++;
}
console.log(`applied ${applied} statements`);

// Backfill: give every code-less customer a unique 6-hex mr4_code.
const missing = await sql`select id from customers where mr4_code is null`;
for (const row of missing) {
  for (let i = 0; i < 6; i++) {
    try {
      await sql`update customers set mr4_code = ${randomBytes(3).toString("hex")}, updated_at = now()
                where id = ${row.id} and mr4_code is null`;
      break;
    } catch (e) {
      if (e?.code === "23505" && i < 5) continue;
      throw e;
    }
  }
}
console.log(`backfilled ${missing.length} customer(s)`);

const sample = await sql`select id, name, mr4_code, mr4_linked_at from customers order by created_at desc limit 5`;
console.table(sample.map((r) => ({ name: r.name, mr4_code: r.mr4_code, linked: !!r.mr4_linked_at })));
