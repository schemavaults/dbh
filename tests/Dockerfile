ARG BUN_VERSION

FROM oven/bun:${BUN_VERSION} AS bunbase

FROM bunbase AS deps

WORKDIR /schemavaults/dbh

COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install

FROM deps AS source

WORKDIR /schemavaults/dbh
COPY tsconfig.json tsconfig.json
COPY src/ src/

CMD [ "bun", "run", "test:e2e" ]
