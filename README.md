# @schemavaults/dbh

## About

This package makes it easy to connect to a Postgres instance from a "serverless" environment.

## Highlighted Dependencies

- [kysely](https://www.kysely.dev/) - TypeScript SQL query builder ([GitHub Repo](https://github.com/kysely-org/kysely))
- [neon](https://neon.com/) - Serverless Postgres ([@neondatabase/serverless driver GitHub Repo](https://github.com/neondatabase/serverless))
- [kysely-neon](https://github.com/seveibar/kysely-neon) - Kysely Dialect for using @neondatabase/serverless

## Required Environment Variables

Ensure that the following environment variables are defined:
```bash
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_URL=""
POSTGRES_URL_NON_POOLING=""
POSTGRES_HOST=""
POSTGRES_PORT="5432"
POSTGRES_DATABASE=""
```
