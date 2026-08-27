import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get categories for room + default system categories
router.get('/', authenticateToken, (req, res) => {
  try {
    const categories = db.find('categories', c => c.is_system || c.room_code === req.user.room_code);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดหมวดหมู่ได้' });
  }
});

// Create new category
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อหมวดหมู่' });
    }

    const newCat = db.insert('categories', {
      name,
      icon: icon || '🏷️',
      color: color || '#10b981',
      room_code: req.user.room_code,
      is_default: false,
      is_system: false
    });

    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถเพิ่มหมวดหมู่ได้' });
  }
});

// Update category
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.findById('categories', id);
    if (!cat) {
      return res.status(404).json({ error: 'ไม่พบหมวดหมู่นี้' });
    }

    if (cat.is_system) {
      return res.status(400).json({ error: 'ไม่สามารถแก้ไขหมวดหมู่ระบบได้' });
    }

    const { name, icon, color } = req.body;
    const updated = db.update('categories', id, {
      name: name || cat.name,
      icon: icon || cat.icon,
      color: color || cat.color
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'แก้ไขหมวดหมู่ไม่สำเร็จ' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.findById('categories', id);
    if (!cat) {
      return res.status(404).json({ error: 'ไม่พบหมวดหมู่' });
    }
    if (cat.is_system) {
      return res.status(400).json({ error: 'หมวดหมู่เริ่มต้นถูกล็อคไว้ ไม่สามารถลบได้' });
    }

    db.delete('categories', id);
    res.json({ message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: 'ลบหมวดหมู่ไม่สำเร็จ' });
  }
});

export default router;
