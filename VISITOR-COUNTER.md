# Public 24-hour visit counter

The footer displays real visits from the rolling previous 24 hours. This is a
count of browser sessions, not a claim about distinct people. Refreshing or
navigating to another page in the same tab does not add another visit. A new
session or a new 24-hour period can add one. Recognizable bots are excluded;
automated traffic cannot be eliminated perfectly.

Only a random session ID and the server timestamp are stored. The application
does not store IP addresses, user agents, page histories or contact information
in this database. Expired rows are removed when the next visit is recorded.
The frontend makes one small request after the page loads. If storage or the
endpoint is unavailable, it reads the count without recording, or keeps the
counter hidden; it never displays an invented number.

## Cloudflare setup

The production D1 database `merati-visits` was created in Western Europe on
2026-10-11, in the same Cloudflare account as the `merati-site` Worker.
Its real database ID is configured as `VISITS` in `wrangler.jsonc`.
Migration `0001_visits.sql` has been applied remotely, and generated types
match the production configuration. A read-only query confirmed the live
database is accessible and initially contains zero visits.

The website changes still need to be published through the existing Worker
build/deployment workflow. The count starts when that version is deployed;
it cannot reconstruct earlier visits. Local test visits are stored separately
and do not appear in the production database.

For future schema changes, use
`wrangler d1 migrations apply merati-visits --remote`, then regenerate types
with `wrangler types src/worker-env.d.ts` and build/deploy the website.

## Local verification

`wrangler.visits.local.jsonc` is exclusively for the local preview; never deploy
it. Its all-zero database ID refers to the local simulation, not a live database.

```powershell
& .\node_modules\.bin\wrangler.cmd d1 migrations apply merati-visits-local --local --config wrangler.visits.local.jsonc
& .\node_modules\.bin\astro.cmd check
& .\node_modules\.bin\astro.cmd build
& .\node_modules\.bin\wrangler.cmd dev --local --port 8787 --config wrangler.visits.local.jsonc
```

While that preview is running, `node --test tests/visits.test.mjs` checks real
local D1 writes, duplicate/concurrent visits, rejected submissions and bots.
The static preview on port 4322 cannot run this API and hides the counter.
