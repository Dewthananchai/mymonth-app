// Migration: Update category name from "ค่าไฟ" to "ค่าไฟฟ้า"
// Run: node server/migrate-category.js

import pg from 'pg';

const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌ Set DATABASE_URL environment variable first');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: PG_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: ค่าไฟ → ค่าไฟฟ้า...\n');

    // 1. Find categories with name "ค่าไฟ"
    const result = await client.query(
      "SELECT id, data FROM documents WHERE collection = 'categories'"
    );

    let updated = 0;
    for (const row of result.rows) {
      const data = row.data;
      if (data.name === 'ค่าไฟ') {
        // Update category name
        data.name = 'ค่าไฟฟ้า';
        
        await client.query(
          "UPDATE documents SET data = $1, updated_at = NOW() WHERE id = $2 AND collection = 'categories'",
          [JSON.stringify(data), row.id]
        );
        
        console.log(`✅ Updated: ${row.id} → "ค่าไฟฟ้า"`);
        updated++;
      }
    }

    // 2. Update expenses that have category_name "ค่าไฟ"
    const expResult = await client.query(
      "SELECT id, data FROM documents WHERE collection = 'expenses'"
    );

    let expUpdated = 0;
    for (const row of expResult.rows) {
      const data = row.data;
      if (data.category_name === 'ค่าไฟ') {
        data.category_name = 'ค่าไฟฟ้า';
        
        await client.query(
          "UPDATE documents SET data = $1, updated_at = NOW() WHERE id = $2 AND collection = 'expenses'",
          [JSON.stringify(data), row.id]
        );
        
        expUpdated++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Categories updated: ${updated}`);
    console.log(`   Expenses updated: ${expUpdated}`);
    console.log(`\n✅ Migration complete!`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
