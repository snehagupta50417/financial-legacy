# contracts/ — superseded

`openapi.json`, `schema.sql` and `fixtures.json` describe an **earlier design** (a separate Python/FastAPI backend with PostgreSQL row-level security and Keycloak). That design is no longer the target.

The current sources of truth are:

- **Data:** `frontend/prisma/schema.prisma`
- **API:** the route handlers and Zod schemas in `frontend/src/app/api` and `frontend/src/server` — see [LLD §15](../LLD.md#15-api-design)

These files are kept for reference only (LLD §23). Replace them with an OpenAPI spec generated from the Zod schemas once the MVP API stabilises.
