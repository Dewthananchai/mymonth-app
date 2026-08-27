// LINE Integration Configuration
// ==================================
// วิธีตั้งค่า:
// 1. ไปที่ https://developers.line.biz/console/
// 2. สร้าง Provider (Messaging API) ใหม่
// 3. สร้าง Channel:
//    - LINE Login Channel → สำหรับ LINE Login
//    - Messaging API Channel → สำหรับ LINE Bot + LINE Notify
// 4. คัดลอกค่ามาใส่ในไฟล์ .env

const LINE_CONFIG = {
  // LINE Login (OAuth 2.0)
  channelLogin: {
    channelId: process.env.LINE_CHANNEL_LOGIN_ID || '',
    channelSecret: process.env.LINE_CHANNEL_LOGIN_SECRET || '',
  },

  // LINE Messaging API (สำหรับ Bot + Notify)
  messaging: {
    channelId: process.env.LINE_CHANNEL_MESSAGING_ID || '',
    channelSecret: process.env.LINE_CHANNEL_MESSAGING_SECRET || '',
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  },

  // LINE Notify (Webhook)
  notify: {
    channelAccessToken: process.env.LINE_NOTIFY_TOKEN || '',
  },

  // Callback URLs
  callbackUrl: process.env.LINE_CALLBACK_URL || 'http://localhost:5000/api/line/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

export default LINE_CONFIG;
