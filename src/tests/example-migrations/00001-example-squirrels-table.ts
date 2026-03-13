// 00001-example-squirrels-table.ts

import type { Kysely } from "@schemavaults/dbh";
import { sql } from "@/sql";

export async function up(db: Kysely<any>): Promise<void> {
  const queryTableQuery = sql`
    CREATE TABLE IF NOT EXISTS EXAMPLE_SQUIRRELS (
      squirrel_id UUID PRIMARY KEY,
      squirrel_name TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `;
  await queryTableQuery.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("example_squirrels").execute();
}
