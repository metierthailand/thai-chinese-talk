# Drag & Drop Upload Component

Component สำหรับลากไฟล์และอัปโหลดไปยัง Google Drive

## คุณสมบัติ

- ✅ Drag & Drop file upload
- ✅ กำหนดประเภทไฟล์ที่ยอมรับได้ (file types)
- ✅ กำหนดขนาดไฟล์สูงสุด (max file size)
- ✅ กำหนดชื่อโฟลเดอร์ใน Google Drive
- ✅ รองรับการอัปโหลดหลายไฟล์
- ✅ แสดง progress bar ขณะอัปโหลด
- ✅ Error handling และ validation

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install googleapis
```

2. ตั้งค่า Environment Variables ใน `.env.local`:
```env
GOOGLE_DRIVE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-shared-folder-id
```

**⚠️ สำคัญ:** `GOOGLE_DRIVE_ROOT_FOLDER_ID` เป็นโฟลเดอร์ที่แชร์กับ Service Account แล้ว (ดูขั้นตอนที่ 7)

## การใช้งาน

### Basic Usage

```tsx
import { DragDropUpload } from "@/components/upload-image";

<DragDropUpload
  folderName="uploads"
  onUploadSuccess={(url, fileName) => {
    console.log("Uploaded:", url, fileName);
  }}
/>
```

### Image Upload Only

```tsx
<DragDropUpload
  acceptedFileTypes={["image/jpeg", "image/png", ".jpg", ".jpeg", ".png"]}
  maxFileSize={5 * 1024 * 1024} // 5MB
  folderName="images"
  onUploadSuccess={(url, fileName) => {
    console.log("Image uploaded:", url);
  }}
/>
```

### PDF Upload Only

```tsx
<DragDropUpload
  acceptedFileTypes={["application/pdf", ".pdf"]}
  maxFileSize={10 * 1024 * 1024} // 10MB
  folderName="documents"
  onUploadSuccess={(url, fileName) => {
    console.log("PDF uploaded:", url);
  }}
/>
```

### Multiple Files

```tsx
<DragDropUpload
  multiple={true}
  acceptedFileTypes={["image/*"]}
  maxFileSize={5 * 1024 * 1024} // 5MB
  folderName="multiple-uploads"
  onUploadSuccess={(url, fileName) => {
    console.log("File uploaded:", url);
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `acceptedFileTypes` | `string[]` | `[]` | ประเภทไฟล์ที่ยอมรับ (MIME types หรือ extensions เช่น `["image/jpeg", ".pdf"]`) |
| `maxFileSize` | `number` | `undefined` | ขนาดไฟล์สูงสุดใน bytes |
| `folderName` | `string` | `"uploads"` | ชื่อโฟลเดอร์ใน Google Drive |
| `onUploadSuccess` | `(url: string, fileName: string) => void` | `undefined` | Callback เมื่ออัปโหลดสำเร็จ |
| `onUploadError` | `(error: string) => void` | `undefined` | Callback เมื่ออัปโหลดล้มเหลว |
| `multiple` | `boolean` | `false` | อนุญาตให้อัปโหลดหลายไฟล์ |
| `className` | `string` | `undefined` | Custom CSS class |
| `disabled` | `boolean` | `false` | ปิดการใช้งาน component |

## การตั้งค่า Google Drive API

### ขั้นตอนที่ 1: สร้างโปรเจกต์ใน Google Cloud Console

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. ลงชื่อเข้าใช้ด้วยบัญชี Google
3. คลิกที่ dropdown ด้านบน (แสดงชื่อโปรเจกต์ปัจจุบัน)
4. คลิก **"New Project"** หรือเลือกโปรเจกต์ที่มีอยู่
5. ตั้งชื่อโปรเจกต์ (เช่น "thai-chinese-tour-uploads") และคลิก **"Create"**

### ขั้นตอนที่ 2: เปิดใช้งาน Google Drive API

1. ใน Google Cloud Console ไปที่เมนูด้านซ้าย
2. เลือก **"APIs & Services"** > **"Library"**
3. ค้นหา **"Google Drive API"**
4. คลิกที่ **"Google Drive API"** และคลิก **"Enable"**

### ขั้นตอนที่ 3: สร้าง Service Account

1. ไปที่เมนู **"IAM & Admin"** > **"Service Accounts"**
2. คลิก **"+ CREATE SERVICE ACCOUNT"** (ปุ่มด้านบน)
3. ตั้งค่า:
   - **Service account name**: ตั้งชื่อ (เช่น "drive-uploader")
   - **Service account ID**: จะสร้างอัตโนมัติ
   - คลิก **"CREATE AND CONTINUE"**
4. ขั้นตอนที่ 2 (Grant this service account access to project):
   - ข้ามขั้นตอนนี้ (ไม่ต้องตั้งค่า role)
   - คลิก **"CONTINUE"**
5. ขั้นตอนที่ 3 (Grant users access to this service account):
   - ข้ามขั้นตอนนี้
   - คลิก **"DONE"**

### ขั้นตอนที่ 4: สร้าง Key (JSON) สำหรับ Service Account

1. คลิกที่ Service Account ที่เพิ่งสร้าง (ชื่อที่ตั้งไว้)
2. ไปที่แท็บ **"KEYS"** (ด้านบน)
3. คลิก **"ADD KEY"** > **"Create new key"**
4. เลือก **"JSON"** และคลิก **"CREATE"**
5. ไฟล์ JSON จะถูกดาวน์โหลดอัตโนมัติ (เก็บไฟล์นี้ไว้อย่างปลอดภัย!)

### ขั้นตอนที่ 5: ดึงข้อมูลจากไฟล์ JSON

เปิดไฟล์ JSON ที่ดาวน์โหลดมา จะมีข้อมูลแบบนี้:

```json
{
  "type": "service_account",
  "project_id": "your-project-id-123456",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "drive-uploader@your-project-id-123456.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**คัดลอกค่าต่อไปนี้:**

1. **`project_id`** → ใช้เป็น `GOOGLE_DRIVE_PROJECT_ID`
   - ตัวอย่าง: `your-project-id-123456`

2. **`client_email`** → ใช้เป็น `GOOGLE_DRIVE_CLIENT_EMAIL`
   - ตัวอย่าง: `drive-uploader@your-project-id-123456.iam.gserviceaccount.com`

3. **`private_key`** → ใช้เป็น `GOOGLE_DRIVE_PRIVATE_KEY`
   - **สำคัญ**: ต้องคัดลอกทั้งบรรทัด รวมถึง `-----BEGIN PRIVATE KEY-----` และ `-----END PRIVATE KEY-----`
   - ต้องเก็บ `\n` ไว้ด้วย (หรือใช้ double quotes ใน .env)

### ขั้นตอนที่ 6: ตั้งค่าในไฟล์ .env.local

สร้างไฟล์ `.env.local` ใน root ของโปรเจกต์ (ถ้ายังไม่มี) และเพิ่ม:

```env
GOOGLE_DRIVE_CLIENT_EMAIL=drive-uploader@your-project-id-123456.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROJECT_ID=your-project-id-123456
```

**หมายเหตุสำคัญ:**
- `GOOGLE_DRIVE_PRIVATE_KEY` ต้องอยู่ใน double quotes (`"`) เพราะมี newline characters (`\n`)
- คัดลอก `private_key` ทั้งหมดจากไฟล์ JSON มาใส่ (รวมถึง BEGIN และ END lines)

### ขั้นตอนที่ 7: แชร์ Google Drive Folder กับ Service Account (สำคัญ!)

Service Account ต้องมีสิทธิ์เข้าถึง Google Drive:

1. ไปที่ [Google Drive](https://drive.google.com/)
2. สร้างโฟลเดอร์ใหม่ (หรือใช้โฟลเดอร์ที่มีอยู่)
3. คลิกขวาที่โฟลเดอร์ > **"Share"**
4. ใส่ email ของ Service Account (ค่า `client_email` จาก JSON)
   - ตัวอย่าง: `drive-uploader@your-project-id-123456.iam.gserviceaccount.com`
5. ตั้งสิทธิ์เป็น **"Editor"** หรือ **"Viewer"** (ขึ้นอยู่กับต้องการให้แก้ไขไฟล์หรือไม่)
6. คลิก **"Send"**

**หรือ** ถ้าต้องการให้ Service Account สร้างโฟลเดอร์เองได้:
- ไม่ต้องแชร์โฟลเดอร์ล่วงหน้า
- Component จะสร้างโฟลเดอร์อัตโนมัติเมื่ออัปโหลดไฟล์ครั้งแรก

## หมายเหตุ

- ไฟล์ที่อัปโหลดจะถูกตั้งค่าเป็น "Anyone with the link can view" โดยอัตโนมัติ
- ถ้าต้องการให้ไฟล์เป็น private ให้แก้ไขใน `src/lib/google-drive.ts` ฟังก์ชัน `uploadFileToDrive`
