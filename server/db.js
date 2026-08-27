// MyMonth Database Layer
// ======================
// PostgreSQL (production) with JSON file fallback (development)
// Same API: find, findOne, findById, insert, update, delete, deleteMany

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== PostgreSQL Setup =====
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pgPool = null;

if (PG_URL) {
  pgPool = new pg.Pool({
    connectionString: PG_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  pgPool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });
}

// ===== Default collections =====
const COLLECTIONS = [
  'users', 'rooms', 'categories', 'expenses', 'expense_splits',
  'settlements', 'budgets', 'budget_histories', 'notifications', 'recurring_expenses'
];

// ===== In-memory cache (for filter functions) =====
// We cache the entire dataset in memory for fast filtering,
// and sync changes back to PostgreSQL.
let cache = {};
let cacheLoaded = false;

async function loadCacheFromPG() {
  if (!pgPool || cacheLoaded) return;

  console.log('📦 Loading data from PostgreSQL...');
  try {
    for (const collection of COLLECTIONS) {
      const result = await pgPool.query(
        'SELECT data FROM documents WHERE collection = $1',
        [collection]
      );
      cache[collection] = result.rows.map(r => r.data);
    }
    cacheLoaded = true;
    console.log('✅ PostgreSQL data loaded into cache');
  } catch (err) {
    console.error('❌ Failed to load from PostgreSQL:', err.message);
    // Initialize empty cache
    for (const collection of COLLECTIONS) {
      cache[collection] = [];
    }
    cacheLoaded = true;
  }
}

async function ensurePGTables() {
  if (!pgPool) return;

  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, collection)
      );
      CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
    `);
    console.log('✅ PostgreSQL tables ready');
  } catch (err) {
    console.error('❌ Failed to create tables:', err.message);
  }
}

// ===== JSON file fallback =====
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mymonth_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSONFallback() {
  if (cacheLoaded) return;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cache = JSON.parse(raw);
    } catch {
      cache = {};
    }
  }

  for (const key of COLLECTIONS) {
    if (!cache[key]) cache[key] = [];
  }
  cacheLoaded = true;
}

function saveJSONFallback() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save JSON DB:', err);
  }
}

// ===== Database API (same as before) =====

class MyMonthDB {
  constructor() {
    this.ready = this._init();
  }

  async _init() {
    if (pgPool) {
      await ensurePGTables();
      await loadCacheFromPG();
      console.log('💾 Using PostgreSQL database');
    } else {
      loadJSONFallback();
      console.log('📄 Using JSON file database (set DATABASE_URL for PostgreSQL)');
    }
  }

  find(collection, filterFn = () => true) {
    return (cache[collection] || []).filter(filterFn);
  }

  findOne(collection, filterFn) {
    return (cache[collection] || []).find(filterFn) || null;
  }

  findById(collection, id) {
    return (cache[collection] || []).find(item => item.id === id) || null;
  }

  insert(collection, item) {
    if (!cache[collection]) cache[collection] = [];

    const newItem = {
      id: item.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      ...item
    };

    cache[collection].push(newItem);

    // Sync to PostgreSQL
    this._syncInsert(collection, newItem);
    // Sync to JSON fallback
    if (!pgPool) saveJSONFallback();

    return newItem;
  }

  update(collection, id, updates) {
    const list = cache[collection] || [];
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Sync to PostgreSQL
    this._syncUpsert(collection, list[idx]);
    // Sync to JSON fallback
    if (!pgPool) saveJSONFallback();

    return list[idx];
  }

  delete(collection, id) {
    const list = cache[collection] || [];
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return false;

    list.splice(idx, 1);

    // Sync to PostgreSQL
    this._syncDelete(collection, id);
    // Sync to JSON fallback
    if (!pgPool) saveJSONFallback();

    return true;
  }

  deleteMany(collection, filterFn) {
    const initialLen = (cache[collection] || []).length;
    const toDelete = (cache[collection] || []).filter(filterFn);

    cache[collection] = (cache[collection] || []).filter(item => !filterFn(item));

    // Sync deletions to PostgreSQL
    for (const item of toDelete) {
      this._syncDelete(collection, item.id);
    }
    // Sync to JSON fallback
    if (!pgPool) saveJSONFallback();

    return initialLen - (cache[collection] || []).length;
  }

  // ===== PostgreSQL sync helpers (fire-and-forget) =====

  async _syncInsert(collection, item) {
    if (!pgPool) return;
    try {
      await pgPool.query(
        `INSERT INTO documents (id, collection, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id, collection) DO UPDATE SET data = $3, updated_at = $5`,
        [item.id, collection, JSON.stringify(item), item.createdAt, item.updatedAt || item.createdAt]
      );
    } catch (err) {
      console.error(`PG sync insert error (${collection}):`, err.message);
    }
  }

  async _syncUpsert(collection, item) {
    if (!pgPool) return;
    try {
      await pgPool.query(
        `INSERT INTO documents (id, collection, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id, collection) DO UPDATE SET data = $3, updated_at = $5`,
        [item.id, collection, JSON.stringify(item), item.createdAt, item.updatedAt || new Date().toISOString()]
      );
    } catch (err) {
      console.error(`PG sync upsert error (${collection}):`, err.message);
    }
  }

  async _syncDelete(collection, id) {
    if (!pgPool) return;
    try {
      await pgPool.query(
        'DELETE FROM documents WHERE id = $1 AND collection = $2',
        [id, collection]
      );
    } catch (err) {
      console.error(`PG sync delete error (${collection}):`, err.message);
    }
  }

  // ===== Migration helper =====
  async migrateFromJSON(jsonPath) {
    if (!pgPool) {
      console.log('No PostgreSQL configured — skipping migration');
      return;
    }

    if (!fs.existsSync(jsonPath)) {
      console.log('JSON file not found — skipping migration');
      return;
    }

    console.log(`📦 Migrating data from ${jsonPath} to PostgreSQL...`);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    let totalRows = 0;

    for (const collection of Object.keys(data)) {
      const items = data[collection] || [];
      for (const item of items) {
        try {
          await pgPool.query(
            `INSERT INTO documents (id, collection, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id, collection) DO NOTHING`,
            [item.id, collection, JSON.stringify(item), item.createdAt, item.updatedAt || item.createdAt]
          );
          totalRows++;
        } catch (err) {
          console.error(`Migration error (${collection}/${item.id}):`, err.message);
        }
      }
    }

    console.log(`✅ Migrated ${totalRows} rows to PostgreSQL`);

    // Reload cache from PG
    cacheLoaded = false;
    await loadCacheFromPG();
  }
}

const dbInstance = new MyMonthDB();

export const db = dbInstance;
export default dbInstance;
