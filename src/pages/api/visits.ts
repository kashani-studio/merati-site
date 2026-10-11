import type { APIRoute } from "astro";

export const prerender = false;
const DAY = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT = /bot|crawler|spider|headless|lighthouse|monitor|preview/i;

function json(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Do not trust Content-Length; stop reading oversized/chunked submissions too.
async function readId(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const id = new TextDecoder().decode(bytes);
  return UUID.test(id) ? id : null;
}

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env.VISITS;
  if (!db) return json({ available: false }, 503);
  try {
    const count = await db.prepare("SELECT COUNT(*) AS count FROM visits WHERE visited_at > ?")
      .bind(Date.now() - DAY).first<number>("count");
    return json({ count: count ?? 0 });
  } catch {
    console.error("[visits] Count unavailable");
    return json({ available: false }, 503);
  }
};

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ error: "Forbidden" }, 403);
  }
  const db = locals.runtime?.env.VISITS;
  if (!db) return json({ available: false }, 503);
  if (BOT.test(request.headers.get("User-Agent") ?? "")) return GET(context);
  const id = await readId(request);
  if (!id) return json({ error: "Invalid visit" }, 400);

  try {
    const now = Date.now();
    const cutoff = now - DAY;
    const results = await db.batch<{ count: number }>([
      db.prepare("DELETE FROM visits WHERE visited_at <= ?").bind(cutoff),
      db.prepare("INSERT OR IGNORE INTO visits (visit_id, visited_at) VALUES (?, ?)").bind(id, now),
      db.prepare("SELECT COUNT(*) AS count FROM visits WHERE visited_at > ?").bind(cutoff),
    ]);
    const row = results[2].results[0];
    return json({ count: row?.count ?? 0 });
  } catch {
    console.error("[visits] Recording unavailable");
    return json({ available: false }, 503);
  }
};
