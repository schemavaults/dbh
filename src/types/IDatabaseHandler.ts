import type { Kysely } from "kysely";

export interface IDatabaseHandler<
  KyselyTablesType extends object,
> extends AsyncDisposable {
  destroy(): Promise<void>;
  db: Kysely<KyselyTablesType>;
}
