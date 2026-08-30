-- Migration: Update category name from "ค่าไฟ" to "ค่าไฟฟ้า"
-- Run this SQL on Neon.tech Dashboard → SQL Editor

-- 1. Update category name in categories collection
UPDATE documents
SET data = jsonb_set(data, '{name}', '"ค่าไฟฟ้า"')
WHERE collection = 'categories'
  AND data->>'name' = 'ค่าไฟ'
  AND data->>'id' = 'cat_electric';

-- 2. Update category_name in expenses collection
UPDATE documents
SET data = jsonb_set(data, '{category_name}', '"ค่าไฟฟ้า"')
WHERE collection = 'expenses'
  AND data->>'category_name' = 'ค่าไฟ';

-- Verify
SELECT id, data->>'name' as name
FROM documents
WHERE collection = 'categories'
  AND data->>'id' = 'cat_electric';
