# 🚀 Deploy MyMonth to Koyeb

## Stack
- **Web App + LINE Bot** → Koyeb
- **Database** → Neon.tech (PostgreSQL) — ไม่ต้องเปลี่ยน

---

## Step 1: Push code to GitHub
```bash
git add .
git commit -m "prepare for koyeb deployment"
git push origin main
```

## Step 2: Create Koyeb Account
1. ไปที่ https://app.koyeb.com
2. สมัครด้วย GitHub account

## Step 3: Create Service
1. Koyeb Dashboard → Services → **Create Service**
2. เลือก **Deploy from GitHub**
3. เลือก repository: `Dewthananchai/mymonth-app`
4. Koyeb จะ detect Dockerfile อัตโนมัติ
5. ตั้ง Service Name: `mymonth`

## Step 4: Environment Variables
ตั้งค่าใน Koyeb Dashboard → Service → Settings → Environment Variables:

```env
NODE_ENV=production
PORT=8080

# Database (Neon.tech)
DATABASE_URL=postgresql://neondb_owner:npg_xyO0coWt2hMn@ep-red-heart-azv9y1wv-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# LINE Channel Access Token
LINE_CHANNEL_ACCESS_TOKEN=RD1mlfAf7HI6XCZRM4fJLmCpHpBWl8zjsZdXN0m4xMxbrT/Fc4L7NkB+vUnRHevpqb+8ANXvXj+oQiib4zEl/ew8X2YRGBOGY1NNEjlEllf3gUS52QVJgi3COUZe9QpgR1hxWJ47hjEjlMFzo1vTvAdB04t89/1O/w1cDnyilFU=

# LINE Frontend URL
LINE_FRONTEND_URL=https://mymonth-app.koyeb.app
```

> ⚠️ ต้องใส่ LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, LINE_MESSAGING_CHANNEL_ID, LINE_MESSAGING_CHANNEL_SECRET จาก LINE Developers Console

## Step 5: Deploy
1. Koyeb จะ build และ deploy อัตโนมัติ
2. รอ build เสร็จ (2-5 นาที)
3. URL: `https://mymonth-app.koyeb.app`

## Step 6: อัปเดต LINE Webhook URL
1. ไปที่ LINE Developers Console → Messaging API
2. เปลี่ยน Webhook URL:
   ```
   https://mymonth-app.koyeb.app/api/line/webhook
   ```

## Step 7: อัปเดต LINE Login Callback
1. LINE Developers Console → LINE Login
2. เปลี่ยน Callback URL:
   ```
   https://mymonth-app.koyeb.app/api/line/callback
   ```

## Step 8: อัปเดต LIFF Endpoint URL
1. LINE Developers Console → LIFF
2. เปลี่ยน Endpoint URL:
   ```
   https://mymonth-app.koyeb.app/liff
   ```

## Step 9: ทดสอบ
1. ✅ เปิด `https://mymonth-app.koyeb.app`
2. ✅ ทดสอบ LINE Login
3. ✅ ทดสอบ LINE Bot (พิมพ์ "hi")
4. ✅ ทดสอบ LIFF (เปิดจาก LINE app)

---

## 📋 Credentials
- **Admin URL**: `https://mymonth-app.koyeb.app/admin/`
- **Email**: superadmin@mymonth.app
- **Password**: Admin@MyMonth2026
