import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function seedDatabase(force = false) {
  // Always ensure Super Admin exists
  const superAdmin = db.findOne('users', u => u.role === 'SuperAdmin');
  if (!superAdmin) {
    console.log('🔑 Creating Super Admin account...');
    const password_hash = await bcrypt.hash('Admin@MyMonth2026', 10);
    db.insert('rooms', {
      room_code: 'SYSADMIN',
      room_name: 'System Admin Room',
      created_by: 'superadmin@mymonth.app'
    });
    db.insert('users', {
      email: 'superadmin@mymonth.app',
      password_hash,
      full_name: 'Super Admin',
      role: 'SuperAdmin',
      room_code: 'SYSADMIN',
      avatar_url: '',
      promptpay_id: ''
    });
    console.log('✅ Super Admin created: superadmin@mymonth.app / Admin@MyMonth2026');
  }

  if (!force && db.find('categories').length > 0) {
    console.log('Database already has categories. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding MyMonth Default Categories...');

  // Only seed default categories — users register themselves in production
  const defaultCategories = [
    { id: 'cat_electric', name: 'ค่าไฟฟ้า', icon: '⚡', color: '#f59e0b', is_default: true, is_system: true },
    { id: 'cat_water', name: 'ค่าน้ำประปา', icon: '💧', color: '#06b6d4', is_default: true, is_system: true },
    { id: 'cat_internet', name: 'อินเทอร์เน็ต', icon: '🌐', color: '#3b82f6', is_default: true, is_system: true },
    { id: 'cat_drink_water', name: 'ค่าน้ำดื่ม', icon: '🍶', color: '#60a5fa', is_default: true, is_system: true },
    { id: 'cat_credit_card', name: 'บัตรเครดิต', icon: '💳', color: '#8b5cf6', is_default: true, is_system: true },
    { id: 'cat_food', name: 'ค่าอาหาร/ของใช้', icon: '🛒', color: '#10b981', is_default: true, is_system: true },
    { id: 'cat_baby_items', name: 'ของใช้ลูก', icon: '👶', color: '#f43f5e', is_default: true, is_system: true },
    { id: 'cat_medical', name: 'ค่ารักษาพยาบาล', icon: '🏥', color: '#ef4444', is_default: true, is_system: true },
    { id: 'cat_entertainment', name: 'ค่าบันเทิง', icon: '🎮', color: '#a855f7', is_default: true, is_system: true },
    { id: 'cat_education', name: 'ค่าการศึกษาลูก', icon: '📚', color: '#6366f1', is_default: true, is_system: true },
    { id: 'cat_clothing', name: 'ค่าเสื้อผ้า', icon: '👕', color: '#ec4899', is_default: true, is_system: true },
    { id: 'cat_beauty', name: 'ค่าความสวยงาม', icon: '💄', color: '#d946ef', is_default: true, is_system: true },
    { id: 'cat_baby_milk', name: 'ค่านมลูก', icon: '🍼', color: '#fb923c', is_default: true, is_system: true },
    { id: 'cat_housing', name: 'ค่าผ่อนบ้าน', icon: '🏡', color: '#14b8a6', is_default: true, is_system: true },
    { id: 'cat_other', name: 'อื่นๆ', icon: '➕', color: '#64748b', is_default: true, is_system: true }
  ];

  defaultCategories.forEach(cat => {
    db.insert('categories', {
      ...cat,
      room_code: '_global'
    });
  });

  console.log(`✅ Seeded ${defaultCategories.length} default categories.`);
}

// Execute if run directly
if (process.argv[1]?.includes('seed.js')) {
  seedDatabase(true).then(() => process.exit(0));
}
