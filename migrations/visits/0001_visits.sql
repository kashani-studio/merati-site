CREATE TABLE IF NOT EXISTS visits (
  visit_id TEXT PRIMARY KEY NOT NULL,
  visited_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_time ON visits (visited_at);
