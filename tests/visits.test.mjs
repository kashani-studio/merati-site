import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Always test the local D1 simulation, never a production URL.
const origin = "http://127.0.0.1:8787";
const endpoint = `${origin}/api/visits`;
const total = async () => {
  const response = await fetch(endpoint);
  assert.equal(response.status, 200);
  const { count } = await response.json();
  assert.ok(Number.isSafeInteger(count) && count >= 0);
  return count;
};
const visit = (id, extra = {}) => fetch(endpoint, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "text/plain", ...extra },
  body: id,
});

test("excludes visits older than the rolling 24-hour window", async () => {
  const before = await total();
  const expired = Date.now() - 25 * 60 * 60 * 1000;
  await promisify(execFile)(process.execPath, [
    "node_modules/wrangler/bin/wrangler.js", "d1", "execute", "merati-visits-local",
    "--local", "--config", "wrangler.visits.local.jsonc", "--command",
    `INSERT INTO visits (visit_id, visited_at) VALUES ('${randomUUID()}', ${expired})`,
  ]);
  assert.equal(await total(), before);
});

test("records a visit once, including simultaneous refreshes", async () => {
  const before = await total();
  const id = randomUUID();
  const responses = await Promise.all(Array.from({ length: 5 }, () => visit(id)));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).count, before + 1);
  }
  assert.equal(await total(), before + 1);
});

test("rejects invalid, oversized and cross-origin submissions without counting", async () => {
  const before = await total();
  assert.equal((await visit("invalid")).status, 400);
  assert.equal((await visit("x".repeat(1000))).status, 400);
  assert.equal((await visit(randomUUID(), { Origin: "https://example.com" })).status, 403);
  assert.equal(await total(), before);
});

test("excludes recognizable bots", async () => {
  const before = await total();
  assert.equal((await visit(randomUUID(), { "User-Agent": "Googlebot" })).status, 200);
  assert.equal(await total(), before);
});
