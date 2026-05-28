import * as SQLite from 'expo-sqlite'

export const db = SQLite.openDatabaseSync('fifawc.db')

db.execSync(`
  CREATE TABLE IF NOT EXISTS bracket_snapshots (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rooms_cache (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)
