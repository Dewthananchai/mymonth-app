import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mymonth-jwt-secret-key-2026-v2';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    const foundUser = db.findById('users', user.id);
    if (!foundUser) {
      return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้ในระบบ' });
    }
    req.user = foundUser;
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      room_code: user.room_code
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
