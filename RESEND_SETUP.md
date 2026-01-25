# คู่มือการตั้งค่า Resend Email Service

## 📧 Resend คืออะไร?

Resend เป็น email service ที่ใช้สำหรับส่งอีเมลในแอปพลิเคชัน เช่น:
- Password reset emails
- Email verification
- Welcome emails
- และอื่นๆ

## 🚀 ขั้นตอนการตั้งค่า

### 1. สร้างบัญชี Resend

1. ไปที่ [https://resend.com](https://resend.com)
2. คลิก **Sign Up** เพื่อสร้างบัญชีใหม่ (หรือ Sign In ถ้ามีบัญชีแล้ว)
3. ใช้ email หรือ Google account เพื่อสมัคร

### 2. สร้าง API Key

1. หลังจาก login แล้ว ไปที่ [API Keys](https://resend.com/api-keys)
2. คลิก **Create API Key**
3. ตั้งชื่อ API Key (เช่น "Thai Chinese Tour - Development")
4. เลือก Permission: **Full Access** (หรือ **Sending Access** ถ้าต้องการแค่ส่งอีเมล)
5. คลิก **Create**
6. **สำคัญ**: คัดลอก API Key ทันที (จะแสดงแค่ครั้งเดียว!)
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. ตั้งค่า Domain (สำหรับ Production)

**สำหรับ Development:**
- สามารถใช้ default email `onboarding@resend.dev` ได้เลย (ไม่ต้องตั้งค่า domain)

**สำหรับ Production:**
1. ไปที่ [Domains](https://resend.com/domains)
2. คลิก **Add Domain**
3. ใส่ domain ของคุณ (เช่น `yourdomain.com`)
4. Resend จะแสดง DNS records ที่ต้องเพิ่ม:
   - **SPF Record**: `v=spf1 include:resend.com ~all`
   - **DKIM Records**: หลาย records ที่ Resend จะให้มา
   - **DMARC Record** (optional): `v=DMARC1; p=none;`
5. เพิ่ม DNS records เหล่านี้ใน DNS provider ของคุณ (เช่น Cloudflare, GoDaddy, Namecheap)
6. รอให้ Resend verify domain (อาจใช้เวลา 5-30 นาที)
7. เมื่อ verified แล้ว จะเห็น status เป็น "Verified" ✅

### 4. ตั้งค่า Environment Variables

เพิ่มตัวแปรต่อไปนี้ในไฟล์ `.env` หรือ `.env.local`:

```env
# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**สำหรับ Development:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**สำหรับ Production:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**หมายเหตุ:**
- `RESEND_FROM_EMAIL` ต้องเป็น email ที่ verify แล้ว
- สำหรับ development สามารถใช้ `onboarding@resend.dev` ได้
- สำหรับ production ต้องใช้ domain ที่ verify แล้ว

### 5. ทดสอบการส่งอีเมล

หลังจากตั้งค่าแล้ว:

1. **Restart development server:**
   ```bash
   npm run dev
   ```

2. **ทดสอบส่งอีเมล:**
   - ลอง reset password
   - หรือเปลี่ยน email address
   - ตรวจสอบ console log ใน development mode

3. **ตรวจสอบใน Resend Dashboard:**
   - ไปที่ [Emails](https://resend.com/emails)
   - จะเห็นอีเมลที่ส่งไปแล้ว
   - สามารถดู status, recipient, และ error (ถ้ามี)

## 🔍 ตรวจสอบการตั้งค่า

### Development Mode

ถ้า `RESEND_API_KEY` ไม่ได้ตั้งค่า ใน development mode จะเห็น log ใน console:

```
==================================================
EMAIL (Development Mode - Resend not configured)
To: user@example.com
Subject: Set Your Password - The Trip
HTML: ...
==================================================
```

### Production Mode

ถ้า `RESEND_API_KEY` ไม่ได้ตั้งค่า จะเห็น error:
```
RESEND_API_KEY is not configured. Email not sent.
```

## 📊 ตรวจสอบใน Resend Dashboard

1. **Emails**: ดูอีเมลที่ส่งไปแล้ว
   - Status (Delivered, Bounced, etc.)
   - Recipient
   - Subject
   - Timestamp

2. **Logs**: ดู logs และ errors

3. **API Keys**: จัดการ API keys

4. **Domains**: จัดการ domains

## ⚠️ ข้อควรระวัง

1. **อย่า commit API Key ลง Git!**
   - ตรวจสอบว่า `.env` และ `.env.local` อยู่ใน `.gitignore`

2. **Rate Limits:**
   - Free tier: 3,000 emails/month
   - ตรวจสอบ limits ใน [Dashboard](https://resend.com/dashboard)

3. **Domain Verification:**
   - ต้อง verify domain ก่อนใช้ใน production
   - ใช้ `onboarding@resend.dev` สำหรับ development เท่านั้น

4. **API Key Security:**
   - เก็บ API Key ไว้เป็นความลับ
   - ใช้ environment variables เท่านั้น
   - อย่า hardcode ในโค้ด

## 🆘 Troubleshooting

### อีเมลไม่ถูกส่ง

1. **ตรวจสอบ API Key:**
   ```bash
   echo $RESEND_API_KEY
   ```
   ต้องมีค่าและขึ้นต้นด้วย `re_`

2. **ตรวจสอบ From Email:**
   - ต้องเป็น email ที่ verify แล้ว
   - หรือใช้ `onboarding@resend.dev` สำหรับ development

3. **ตรวจสอบ Console Logs:**
   - ดู error messages ใน console
   - ตรวจสอบ Resend Dashboard สำหรับ detailed errors

### Domain Verification Failed

1. **ตรวจสอบ DNS Records:**
   - ใช้ tools เช่น [MXToolbox](https://mxtoolbox.com/) เพื่อตรวจสอบ DNS records

2. **รอให้ DNS Propagate:**
   - DNS changes อาจใช้เวลา 5-30 นาที
   - บางครั้งอาจใช้เวลาถึง 24 ชั่วโมง

3. **ตรวจสอบใน Resend Dashboard:**
   - ดู error messages ที่ Resend แสดง

## 📚 เอกสารเพิ่มเติม

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Node.js SDK](https://resend.com/docs/send-with-nodejs)

## 💡 Tips

1. **Development:**
   - ใช้ `onboarding@resend.dev` เพื่อทดสอบได้ทันที
   - ตรวจสอบ console logs เพื่อดู email content

2. **Production:**
   - ใช้ custom domain เพื่อความน่าเชื่อถือ
   - Monitor email delivery ใน Resend Dashboard
   - ตั้งค่า DMARC records เพื่อเพิ่ม security

3. **Testing:**
   - ใช้ [Resend Test Mode](https://resend.com/docs/test-mode) สำหรับ testing
   - ตรวจสอบ email templates ก่อนส่งจริง
