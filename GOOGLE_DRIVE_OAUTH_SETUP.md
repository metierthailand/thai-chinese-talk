# 🔐 ตั้งค่า Google Drive Upload ด้วย OAuth 2.0

## ⚠️ ปัญหาของ Service Account

Service Account **ไม่สามารถอัปโหลดไฟล์ไปยัง regular Google Drive folder ได้** แม้ว่าจะแชร์แล้วก็ตาม เพราะ Service Account ไม่มี storage quota เอง

**Error ที่เจอ:**
```
Service Accounts do not have storage quota. Leverage shared drives, or use OAuth delegation instead.
```

## ✅ วิธีแก้: ใช้ OAuth 2.0 แทน Service Account

OAuth 2.0 จะใช้ storage quota ของ user (15GB ฟรี) แทน storage quota ของ Service Account

---

## 📋 ขั้นตอนการตั้งค่า

### ขั้นตอนที่ 1: สร้าง OAuth 2.0 Credentials

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือก Project: `the-trip-484202` (หรือ project ของคุณ)
3. ไปที่ **APIs & Services** > **Credentials**
4. คลิก **+ CREATE CREDENTIALS** > **OAuth client ID**
5. ถ้ายังไม่ได้ตั้งค่า OAuth consent screen:
   - คลิก **CONFIGURE CONSENT SCREEN**
   - เลือก **External** (หรือ Internal ถ้ามี Google Workspace)
   - กรอกข้อมูล:
     - **App name**: The Trip
     - **User support email**: อีเมลของคุณ
     - **Developer contact information**: อีเมลของคุณ
   - คลิก **SAVE AND CONTINUE**
   - ใน **Scopes**: คลิก **ADD OR REMOVE SCOPES**
     - เลือก `.../auth/drive.file` และ `.../auth/drive`
   - คลิก **SAVE AND CONTINUE**
   - เพิ่ม test users (ถ้าเป็น External)
   - คลิก **SAVE AND CONTINUE** > **BACK TO DASHBOARD**
6. กลับไปที่ **Credentials** > **+ CREATE CREDENTIALS** > **OAuth client ID**
7. เลือก **Application type**: **Web application**
8. ตั้งชื่อ: `The Trip Web Client`
9. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```
10. **Authorized redirect URIs**:
    ```
    http://localhost:3000/api/auth/callback/google
    https://yourdomain.com/api/auth/callback/google
    ```
11. คลิก **CREATE**
12. **คัดลอก Client ID และ Client Secret** (จะใช้ในขั้นตอนถัดไป)

### ขั้นตอนที่ 2: เพิ่ม Google Provider ใน NextAuth

1. ติดตั้ง Google Provider:
   ```bash
   npm install next-auth@beta
   ```

2. แก้ไข `src/lib/auth.ts`:
   ```typescript
   import GoogleProvider from "next-auth/providers/google";
   
   export const authOptions: NextAuthOptions = {
     // ... existing code ...
     providers: [
       GoogleProvider({
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         authorization: {
           params: {
             scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
           },
         },
       }),
       CredentialsProvider({
         // ... existing code ...
       }),
     ],
     // ... rest of code ...
   };
   ```

3. เพิ่มใน `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### ขั้นตอนที่ 3: แก้ไข Google Drive Client

แก้ไข `src/lib/google-drive.ts` ให้ใช้ OAuth token:

```typescript
import { google } from "googleapis";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Initialize Google Drive API client with OAuth 2.0
 */
export async function getDriveClient() {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error("User not authenticated with Google. Please sign in with Google.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}
```

### ขั้นตอนที่ 4: อัปเดต NextAuth Session

แก้ไข `src/lib/auth.ts` เพื่อเก็บ access token และ refresh token:

```typescript
callbacks: {
  async jwt({ token, account, user }) {
    if (account) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
    }
    // ... existing code ...
    return token;
  },
  async session({ session, token }) {
    if (token) {
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
    }
    // ... existing code ...
    return session;
  },
},
```

### ขั้นตอนที่ 5: อัปเดต Type Definitions

แก้ไข `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    // ... existing types ...
  }
}
```

---

## 🚀 การใช้งาน

1. User ต้อง **Sign in with Google** ก่อน
2. ระบบจะขอ permission เพื่อเข้าถึง Google Drive
3. หลังจากนั้นสามารถอัปโหลดไฟล์ได้ปกติ

---

## ⚠️ หมายเหตุ

- **Storage Quota**: ใช้ storage quota ของ user (15GB ฟรี)
- **User Interaction**: ต้อง login ด้วย Google ก่อน
- **Permissions**: User ต้องอนุญาตให้แอปเข้าถึง Google Drive

---

## 🔄 เปรียบเทียบ Service Account vs OAuth 2.0

| Feature | Service Account | OAuth 2.0 |
|---------|----------------|-----------|
| Storage Quota | ❌ ไม่มี (ต้องใช้ Shared Drive) | ✅ ใช้ของ user (15GB ฟรี) |
| User Interaction | ✅ ไม่ต้อง | ❌ ต้อง login |
| Google Workspace | ❌ ต้องมี (สำหรับ Shared Drive) | ✅ ไม่ต้อง |
| Setup Complexity | ⭐⭐ | ⭐⭐⭐ |

---

## 📚 อ้างอิง

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
