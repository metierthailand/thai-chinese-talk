# 🔧 แก้ปัญหา Google Drive Upload Error

## ❌ Error: "Service Accounts do not have storage quota"

### สาเหตุ
Service Account **ไม่มี storage quota เอง** และ **ไม่สามารถ** ใช้ "Anyone with the link" ได้

### ✅ วิธีแก้ไข

#### ขั้นตอนที่ 1: แก้ Folder ID ใน .env

**ปัญหาที่พบบ่อย:** Folder ID มี query string ติดมา

❌ **ผิด:**
```env
GOOGLE_DRIVE_ROOT_FOLDER_ID=1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30?usp=drive_link
```

✅ **ถูก:**
```env
GOOGLE_DRIVE_ROOT_FOLDER_ID=1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30
```

**วิธีหา Folder ID ที่ถูกต้อง:**
1. เปิดโฟลเดอร์ใน Google Drive
2. ดู URL: `https://drive.google.com/drive/folders/1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30?usp=drive_link`
3. คัดลอกเฉพาะส่วนหลัง `/folders/` **จนถึงก่อน `?`**
4. ใช้เฉพาะ: `1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30`

#### ขั้นตอนที่ 2: แชร์โฟลเดอร์กับ Service Account (สำคัญมาก!)

**⚠️ Service Account ไม่สามารถใช้ "Anyone with the link" ได้!**

**แม้ว่าคุณจะเป็น owner ของโฟลเดอร์ แต่ Service Account ยังต้องถูกเพิ่มใน "People with access" โดยตรง:**

1. เปิดโฟลเดอร์ "thai-chinese-talk" ใน Google Drive
2. คลิก **"Share"** (หรือคลิกขวา > Share)
3. **ในส่วน "People with access"** (ไม่ใช่ "General access"):
   - คลิกที่ช่อง **"Add people and groups"** หรือ **"Grant access"**
   - ใส่ email ของ Service Account: `drive-uploader@thai-chinese-talk-484202.iam.gserviceaccount.com`
   - ตั้งสิทธิ์เป็น **"Editor"** (ต้องเป็น Editor เพื่อให้อัปโหลดและสร้างโฟลเดอร์ย่อยได้)
   - คลิก **"Send"** หรือ **"Grant access"**
4. **ตรวจสอบ:**
   - Service Account email ควรปรากฏในตาราง "People with access"
   - ต้องเห็น `drive-uploader@thai-chinese-talk-484202.iam.gserviceaccount.com` ในรายการ
   - Type ควรเป็น "Service account" หรือ "User"
   - Role ควรเป็น "Editor"
   - ถ้าไม่เห็น แสดงว่าแชร์ไม่สำเร็จ

#### ขั้นตอนที่ 3: ตรวจสอบ .env.local

```env
GOOGLE_DRIVE_CLIENT_EMAIL=drive-uploader@thai-chinese-talk-484202.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROJECT_ID=thai-chinese-talk-484202
GOOGLE_DRIVE_ROOT_FOLDER_ID=1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30
```

**ตรวจสอบ:**
- ✅ Folder ID ไม่มี query string (`?usp=drive_link`)
- ✅ Private Key อยู่ใน double quotes
- ✅ Service Account email ตรงกับที่แชร์ใน Google Drive

#### ขั้นตอนที่ 4: Restart Server

```bash
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

### 🔍 ตรวจสอบว่าแชร์ถูกต้องหรือไม่

1. ไปที่ Google Drive
2. เปิดโฟลเดอร์ "thai-chinese-talk"
3. คลิก "Share"
4. ตรวจสอบว่าเห็น `drive-uploader@thai-chinese-talk-484202.iam.gserviceaccount.com` ใน "People with access"
5. ตรวจสอบว่าสิทธิ์เป็น "Editor"

### ❌ สิ่งที่ทำผิดบ่อย

1. **ใช้ "Anyone with the link" แทนการเพิ่ม Service Account โดยตรง**
   - ❌ Service Account ไม่สามารถใช้ได้
   - ✅ ต้องเพิ่มใน "People with access"

2. **Folder ID มี query string**
   - ❌ `1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30?usp=drive_link`
   - ✅ `1_5hVHb0PfPCcbvzPJ5l__v4W3ig-Ws30`

3. **ไม่ได้ restart server หลังจากแก้ .env**
   - ✅ ต้อง restart server ทุกครั้งที่แก้ .env

### 📝 Checklist

- [ ] Folder ID ใน .env ไม่มี query string
- [ ] Service Account email ถูกเพิ่มใน "People with access" (ไม่ใช่แค่ "Anyone with the link")
- [ ] Service Account มีสิทธิ์ "Editor"
- [ ] Private Key อยู่ใน double quotes
- [ ] Restart server แล้ว

### 🆘 ถ้ายังไม่ได้

**⚠️ ปัญหาหลัก:** Service Account **ไม่สามารถอัปโหลดไฟล์ไปยัง regular Google Drive folder ได้** แม้ว่าจะแชร์แล้วก็ตาม เพราะ Service Account ไม่มี storage quota เอง

#### วิธีแก้ไขที่ 1: ใช้ Shared Drive (Team Drive) - ต้องมี Google Workspace

1. สร้าง Shared Drive ใน Google Workspace
2. แชร์ Shared Drive กับ Service Account email
3. ตั้งสิทธิ์เป็น **"Content Manager"** หรือ **"Contributor"**
4. ใช้ Shared Drive ID เป็น `GOOGLE_DRIVE_ROOT_FOLDER_ID`

**ข้อดี:**
- ✅ Service Account สามารถอัปโหลดได้โดยตรง
- ✅ ไม่ต้องใช้ storage quota ของ user
- ✅ เหมาะสำหรับทีมงาน

**ข้อเสีย:**
- ❌ ต้องมี Google Workspace (เสียเงิน)

#### วิธีแก้ไขที่ 2: ใช้ Domain-wide Delegation - ต้องมี Google Workspace

1. เปิดใช้งาน Domain-wide Delegation ใน Google Cloud Console
2. ตั้งค่าใน Google Workspace Admin Console
3. Service Account จะสามารถ impersonate user ได้

**ข้อดี:**
- ✅ ใช้ storage quota ของ user
- ✅ ไม่ต้องมี user interaction

**ข้อเสีย:**
- ❌ ต้องมี Google Workspace (เสียเงิน)
- ❌ ตั้งค่าซับซ้อน

#### วิธีแก้ไขที่ 3: ใช้ OAuth 2.0 แทน Service Account (แนะนำถ้าไม่มี Google Workspace)

เปลี่ยนจากการใช้ Service Account เป็น OAuth 2.0 เพื่อใช้ storage quota ของ user

**ข้อดี:**
- ✅ ใช้ storage quota ของ user (15GB ฟรี)
- ✅ ไม่ต้องมี Google Workspace
- ✅ ทำงานได้ทันที

**ข้อเสีย:**
- ❌ ต้องมี user interaction (login ด้วย Google)
- ❌ ต้องแก้โค้ดเพิ่มเติม

**ขั้นตอน:**
1. สร้าง OAuth 2.0 Credentials ใน Google Cloud Console
2. เพิ่ม Google Provider ใน NextAuth
3. แก้ไข `src/lib/google-drive.ts` ให้ใช้ OAuth token แทน Service Account

### 📝 Checklist สำหรับ Service Account

- [ ] Folder ID ใน .env ไม่มี query string
- [ ] Service Account email ถูกเพิ่มใน "People with access" (ไม่ใช่แค่ "Anyone with the link")
- [ ] Service Account มีสิทธิ์ "Editor"
- [ ] Private Key อยู่ใน double quotes
- [ ] Restart server แล้ว
- [ ] **ถ้ายังไม่ได้:** ใช้ Shared Drive หรือ OAuth 2.0 แทน
