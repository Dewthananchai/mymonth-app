// MyMonth — Migrate JSON data to PostgreSQL
// Usage: node server/migrate.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PG_URL = process.env.DATABASE_URL;
const JSON_PATH = path.join(__dirname, 'data', 'mymonth_db.json');

if (!PG_URL) {
  console.error('❌ Set DATABASE_URL environment variable first');
  process.exit(1);
}

if (!fs.existsSync(JSON_PATH)) {
  console.error('❌ JSON file not found:', JSON_PATH);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: PG_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function migrate() {
  console.log('📦 Connecting to PostgreSQL...');
  const client = await pool.connect();

  try {
    // Create table
    console.log('🔧 Creating documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, collection)
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection)');

    // Read JSON
    console.log('📄 Reading JSON file...');
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    let totalRows = 0;

    for (const [collection, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue;
      console.log(`  📂 ${collection}: ${items.length} items`);

      for (const item of items) {
        try {
          await client.query(
            `INSERT INTO documents (id, collection, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id, collection) DO UPDATE SET data = $3, updated_at = $5`,
            [
              item.id,
              collection,
              JSON.stringify(item),
              item.createdAt || new Date().toISOString(),
              item.updatedAt || item.createdAt || new Date().toISOString(),
            ]
          );
          totalRows++;
        } catch (err) {
          console.error(`  ❌ Error inserting ${collection}/${item.id}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Migration complete! ${totalRows} rows migrated to PostgreSQL`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
