import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mymonth_db.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultSchema = {
  users: [],
  rooms: [],
  categories: [],
  expenses: [],
  expense_splits: [],
  settlements: [],
  budgets: [],
  budget_histories: [],
  notifications: [],
  recurring_expenses: []
};

class JSONDatabase {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.data = JSON.parse(JSON.stringify(defaultSchema));
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all collections exist
        for (const key of Object.keys(defaultSchema)) {
          if (!this.data[key]) {
            this.data[key] = [];
          }
        }
      } catch (err) {
        console.error('Error reading db file, resetting:', err);
        this.data = JSON.parse(JSON.stringify(defaultSchema));
        this.save();
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB:', err);
    }
  }

  // Generic helpers
  find(collection, filterFn = () => true) {
    return (this.data[collection] || []).filter(filterFn);
  }

  findOne(collection, filterFn) {
    return (this.data[collection] || []).find(filterFn) || null;
  }

  findById(collection, id) {
    return (this.data[collection] || []).find(item => item.id === id) || null;
  }

  insert(collection, item) {
    if (!this.data[collection]) this.data[collection] = [];
    const newItem = {
      id: item.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      ...item
    };
    this.data[collection].push(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    const list = this.data[collection] || [];
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return list[idx];
  }

  delete(collection, id) {
    const list = this.data[collection] || [];
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return false;

    list.splice(idx, 1);
    this.save();
    return true;
  }

  deleteMany(collection, filterFn) {
    const initialLen = (this.data[collection] || []).length;
    this.data[collection] = (this.data[collection] || []).filter(item => !filterFn(item));
    this.save();
    return initialLen - this.data[collection].length;
  }
}

export const db = new JSONDatabase();
export default db;
