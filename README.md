# Thai Word Chinese Word - Tour Management System

ระบบจัดการทัวร์ครบวงจรสำหรับบริษัทท่องเที่ยว ครอบคลุมการจัดการลูกค้า, การจอง, การติดตาม leads, การคำนวณ commission และอื่นๆ

## 📖 Requirements

สำหรับรายละเอียด requirements และ specification ของระบบ กรุณาดูที่:

**[CRM Requirement Document](https://docs.google.com/document/d/1mJdb-AcCFOqGPiYeAfjXbdriurfON3YkuV2vHc3aXu4/edit?tab=t.0#heading=h.13i932ugf6iw)**

เอกสารนี้ประกอบด้วย:
- Functional Requirements
- System Specifications
- User Stories
- และรายละเอียดอื่นๆ ที่เกี่ยวข้อง

## 📋 สารบัญ

- [Requirements](#-requirements)
- [คุณสมบัติหลัก](#-คุณสมบัติหลัก)
- [เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)
- [การติดตั้ง](#-การติดตั้ง)
- [การตั้งค่า](#-การตั้งค่า)
- [การใช้งาน](#-การใช้งาน)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [API Documentation](#-api-documentation)
- [การ Deploy](#-การ-deploy)
- [Workflow](#-workflow)
- [Troubleshooting](#-troubleshooting)

## ✨ คุณสมบัติหลัก

### 👥 User Management
- ระบบ Authentication และ Authorization แบบ Role-based
- รองรับ 4 roles: `SUPER_ADMIN`, `ADMIN`, `SALES`, `STAFF`
- จัดการผู้ใช้งาน, เปลี่ยนรหัสผ่าน, อัปเดตโปรไฟล์
- Email verification และ password reset

### 🧑‍🤝‍🧑 Customer Management
- จัดการข้อมูลลูกค้า (ชื่อไทย/อังกฤษ, วันเกิด, ติดต่อ)
- จัดการ Passport (หลายเล่มต่อลูกค้า)
- จัดการที่อยู่ (Address)
- จัดการ Food Allergies
- จัดการครอบครัว (Families)
- Tag system สำหรับจัดกลุ่มลูกค้า

### 🎯 Lead Management
- ติดตาม Leads จากหลายช่องทาง (Facebook, Website, LINE, etc.)
- Lead status pipeline (INTERESTED, QUOTED, BOOKED, COMPLETED, CANCELLED)
- Auto-sync lead status จาก booking status
- จัดการข้อมูลลูกค้าใหม่และลูกค้าเดิม

### ✈️ Trip Management
- จัดการข้อมูลทริป (ชื่อ, วันที่, ราคา, จำนวนคน)
- จัดการ Airline และ Airport (IATA codes)
- กำหนดราคา standard และ extra prices

### 📅 Booking Management
- จัดการการจองทริป
- ระบบ Payment แบบ 3 งวด (First, Second, Third Payment)
- Payment status tracking (DEPOSIT_PENDING, DEPOSIT_PAID, FULLY_PAID, CANCELLED)
- จัดการ Companion Customers
- Extra prices (Single Traveller, Bed, Seat, Bag)
- Discount management
- Room type และ Seat class selection

### 💰 Commission Management
- คำนวณ commission อัตโนมัติเมื่อ booking เป็น FULLY_PAID
- ติดตาม commission ตาม sales user
- Filter และรายงาน commission
- รองรับเฉพาะ ADMIN และ SUPER_ADMIN

### ✅ Task Management
- จัดการ Tasks สำหรับติดตามงาน
- Task status (TODO, IN_PROGRESS, COMPLETED, CANCELLED)
- Contact method tracking (CALL, LINE, MESSENGER)
- เชื่อมโยงกับ Customer

### 🔔 Notifications
- ระบบแจ้งเตือน
- Passport expiry alerts
- Upcoming trip alerts
- Cron job สำหรับ generate alerts

### 🏷️ Master Data
- Tag management
- Airline & Airport (IATA codes) management

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI component library
- **TanStack Query** - Data fetching และ caching
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **date-fns** - Date manipulation
- **Decimal.js** - Precise decimal calculations

### Backend
- **Next.js API Routes** - Server-side API
- **Prisma** - ORM
- **PostgreSQL** - Database
- **NextAuth.js** - Authentication
- **bcryptjs** - Password hashing

### Other Tools
- **Google Drive API** - File upload
- **Resend** - Email service
- **Sonner** - Toast notifications

## 📦 การติดตั้ง

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm, yarn, pnpm หรือ bun

### Steps

1. **Clone repository**
```bash
git clone <repository-url>
cd the-trip
```

2. **Install dependencies**
```bash
npm install
# หรือ
pnpm install
# หรือ
yarn install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
```

แก้ไข `.env.local` ตามที่ต้องการ (ดูรายละเอียดใน [การตั้งค่า](#การตั้งค่า))

4. **Setup database**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

5. **Run development server**
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

## ⚙️ การตั้งค่า

### Environment Variables

สร้างไฟล์ `.env.local` และตั้งค่าตัวแปรต่อไปนี้:

#### Database
```env
DATABASE_URL="postgresql://user:password@localhost:5432/the_trip?schema=public"
```

#### NextAuth
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

#### Email (Resend)
```env
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

#### Google Drive (Optional - สำหรับ file upload)
```env
GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account-email@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROJECT_ID="your-project-id"
GOOGLE_DRIVE_ROOT_FOLDER_ID="your-shared-folder-id"
```

### Database Setup

1. **Create PostgreSQL database**
```sql
CREATE DATABASE the_trip;
```

2. **Run migrations**
```bash
npm run prisma:migrate
```

3. **Seed initial data (optional)**
```bash
npm run prisma:seed
```

## 🚀 การใช้งาน

### Development

```bash
# Start development server
npm run dev

# Run Prisma Studio (Database GUI)
npm run prisma:studio

# Run linting
npm run lint
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Database Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Reset database (⚠️ จะลบข้อมูลทั้งหมด)
npm run prisma:reset

# Seed database
npm run prisma:seed
```

## 📁 โครงสร้างโปรเจค

```
the-trip/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── bookings/      # Booking endpoints
│   │   │   ├── customers/     # Customer endpoints
│   │   │   ├── leads/         # Lead endpoints
│   │   │   ├── trips/         # Trip endpoints
│   │   │   ├── tasks/         # Task endpoints
│   │   │   ├── commissions/   # Commission endpoints
│   │   │   └── cron/          # Cron jobs
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── bookings/      # Booking management
│   │   │   ├── customers/     # Customer management
│   │   │   ├── leads/         # Lead management
│   │   │   ├── trips/         # Trip management
│   │   │   ├── tasks/         # Task management
│   │   │   ├── commissions/   # Commission reports
│   │   │   └── admin/         # Admin panel
│   │   ├── login/             # Login page
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   │   ├── ui/                # Shadcn/ui components
│   │   └── upload-image/      # File upload component
│   ├── lib/                   # Utilities
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # Auth configuration
│   │   └── services/          # Business logic
│   │       ├── commission-calculator.ts
│   │       └── lead-sync.ts
│   └── navigation/            # Navigation config
├── public/                     # Static files
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/change-password` - Change password

### Customers
- `GET /api/customers` - List customers (with pagination & filters)
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Bookings
- `GET /api/bookings` - List bookings (with pagination & filters)
- `POST /api/bookings` - Create booking
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `POST /api/payments` - Create payment

### Leads
- `GET /api/leads` - List leads (with pagination & filters)
- `POST /api/leads` - Create lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead

### Trips
- `GET /api/trips` - List trips (with filters)
- `POST /api/trips` - Create trip
- `GET /api/trips/[id]` - Get trip details
- `PUT /api/trips/[id]` - Update trip

### Tasks
- `GET /api/tasks` - List tasks (with pagination & filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Commissions
- `GET /api/commissions` - Get commission summary (ADMIN only)
- `GET /api/commissions/[agentId]` - Get commission details for agent

### Cron Jobs
- `GET /api/cron/alerts` - Generate alerts (passport expiry, upcoming trips)

## 🚢 การ Deploy

### Vercel (Recommended)

1. Push code ไปยัง GitHub
2. Import project ใน Vercel
3. ตั้งค่า Environment Variables
4. Deploy

### Docker

โปรเจคนี้มี `docker-compose.yml` สำหรับรัน PostgreSQL:

```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down
```

สำหรับ production deployment:

```bash
# Build image
docker build -t the-trip .

# Run container
docker run -p 3000:3000 --env-file .env.local the-trip
```

### Environment Variables สำหรับ Production

ตั้งค่าตัวแปรต่อไปนี้ใน production environment:

- `DATABASE_URL` - Production database URL
- `NEXTAUTH_URL` - Production URL
- `NEXTAUTH_SECRET` - Strong secret key
- `RESEND_API_KEY` - Email service API key
- และตัวแปรอื่นๆ ตามที่ใช้

## 🔐 Security

- Password hashing ด้วย bcryptjs
- Role-based access control (RBAC)
- Session management ด้วย NextAuth
- SQL injection protection ด้วย Prisma
- Environment variables สำหรับ sensitive data

## 🧪 Testing

```bash
# Run tests (ถ้ามี)
npm test

# Run linting
npm run lint
```

## 📊 Database Schema

โปรเจคใช้ Prisma ORM สำหรับจัดการ database schema

ดู schema ได้ที่: `prisma/schema.prisma`

### Main Models
- **User** - ผู้ใช้งานระบบ
- **Customer** - ข้อมูลลูกค้า
- **Lead** - Leads จากช่องทางต่างๆ
- **Trip** - ข้อมูลทริป
- **Booking** - การจอง
- **Payment** - การชำระเงิน
- **Commission** - Commission
- **Task** - งานที่ต้องทำ
- **Notification** - การแจ้งเตือน

## 🔄 Workflow

### Booking Flow
1. สร้าง Lead จากช่องทางต่างๆ
2. Convert Lead เป็น Booking
3. สร้าง Payment (First Payment)
4. อัปเดต Payment Status
5. Commission ถูกคำนวณอัตโนมัติเมื่อ FULLY_PAID

### Lead Status Sync
- Lead status จะ sync อัตโนมัติจาก Booking status
- BOOKED: เมื่อมี booking ที่ DEPOSIT_PAID หรือ FULLY_PAID
- COMPLETED: เมื่อ booking ทั้งหมดเป็น FULLY_PAID
- CANCELLED: เมื่อ booking ทั้งหมดเป็น CANCELLED

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# ตรวจสอบว่า PostgreSQL ทำงานอยู่
docker-compose ps

# ตรวจสอบ connection string ใน .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Prisma Issues
```bash
# Reset Prisma Client
npm run prisma:generate

# Reset database (⚠️ ลบข้อมูลทั้งหมด)
npm run prisma:reset
```

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📝 License

[ระบุ license ของโปรเจค]

## 👥 Contributors

[รายชื่อ contributors]

## 📞 Support

สำหรับคำถามหรือปัญหา กรุณาเปิด issue ใน repository

---

**Note:** โปรเจคนี้ยังอยู่ในระหว่างการพัฒนา อาจมีการเปลี่ยนแปลง API และ schema ได้
