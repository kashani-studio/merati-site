const counter = document.querySelector<HTMLElement>("[data-visit-counter]");
const value = counter?.querySelector<HTMLElement>("[data-visit-count]");
const KEY = "merati-visit";
const DAY = 24 * 60 * 60 * 1000;
type Visit = { id: string; started: number; recorded: boolean };

function sessionVisit(): Visit | null {
  try {
    const previous = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Visit | null;
    if (previous && typeof previous.id === "string" && Number.isFinite(previous.started)
      && Date.now() - previous.started >= 0 && Date.now() - previous.started < DAY) return previous;
    const visit: Visit = { id: crypto.randomUUID(), started: Date.now(), recorded: false };
    sessionStorage.setItem(KEY, JSON.stringify(visit));
    return visit;
  } catch {
    // When session storage is blocked, read the total without inflating it.
    return null;
  }
}

async function update(): Promise<void> {
  if (!counter || !value) return;
  const visit = sessionVisit();
  try {
    const response = await fetch("/api/visits", {
      method: visit && !visit.recorded ? "POST" : "GET",
      ...(visit && !visit.recorded ? { body: visit.id, headers: { "Content-Type": "text/plain" } } : {}),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    const data = await response.json() as { count?: number };
    if (!Number.isSafeInteger(data.count) || (data.count ?? -1) < 0) return;
    value.textContent = new Intl.NumberFormat("nl-BE").format(data.count!);
    counter.hidden = false;
    if (visit) {
      visit.recorded = true;
      try { sessionStorage.setItem(KEY, JSON.stringify(visit)); } catch { /* read-only storage */ }
    }
  } catch {
    // Keep the footer tidy when the real counter is unavailable.
  }
}

// One small request after initial loading; no polling or animation loop.
if (document.readyState === "complete") void update();
else window.addEventListener("load", () => { void update(); }, { once: true });
