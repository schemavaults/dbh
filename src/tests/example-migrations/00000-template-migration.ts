// 00000-template-migration.ts

import type { Kysely } from "@schemavaults/dbh";
// import { sql } from "@/sql";

export async function up(
  db: Kysely<any>, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {}

export async function down(
  db: Kysely<any>, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {}
