const API_BASE = '/api';

async function request(method, path, body = null) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let res;
  try {
    res = await fetch(url, opts);
  } catch (fetchErr) {
    throw new Error('ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่ที่ port 5000');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Server ไม่ตอบสนอง API (${res.status}) — กรุณาตรวจสอบว่า server กำลังรันอยู่ที่ port 5000`);
    }
    throw new Error(`Unexpected response (${res.status})`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
  return data;
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

export default api;
