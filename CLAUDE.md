# NRW Tracker — เอกสารโปรเจกต์ฉบับสมบูรณ์

> ระบบติดตาม Non-Revenue Water (NRW) ของ กปภ.เขต 10
> สร้างด้วย Next.js 16 + Supabase + Vercel

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [Tech Stack](#2-tech-stack)
3. [โครงสร้างไฟล์](#3-โครงสร้างไฟล์)
4. [การ Authentication](#4-การ-authentication)
5. [โมดูลหลัก](#5-โมดูลหลัก)
6. [Database Schema](#6-database-schema)
7. [API Routes](#7-api-routes)
8. [External Integrations](#8-external-integrations)
9. [MNF EMA Alert System](#9-mnf-ema-alert-system)
10. [State Management](#10-state-management)
11. [Deployment](#11-deployment)
12. [Debug Issues ที่พบ](#12-debug-issues-ที่พบ)

---

## 1. ภาพรวมระบบ

**NRW Tracker** เป็น web application สำหรับ **กปภ.เขต 10** ใช้ติดตามและบริหารจัดการ Non-Revenue Water (น้ำสูญเสีย) ของ 26 สาขาในเขต

### วัตถุประสงค์หลัก

| # | เป้าหมาย |
|---|---------|
| 1 | สาขากรอกรายงานประจำเดือน (NRW%, MNF Factor, ข้อมูลท่อรั่ว) |
| 2 | ส่วนกลาง (เขต) มองเห็นสถานะ 26 สาขาผ่าน Dashboard |
| 3 | ติดตาม Action Items, อุปสรรค, แผนการลด NRW |
| 4 | จัดการประชุม — วาระ, มติ, การรับทราบ |
| 5 | แจ้งเตือน MNF ผิดปกติ ผ่าน EMA Algorithm อัตโนมัติ |
| 6 | Export รายงาน PDF / Excel |

### ผู้ใช้งาน

| Role | สิทธิ์ |
|------|--------|
| `region_admin` | เขต — เห็นข้อมูลทุกสาขา, สร้าง/แก้ไขทุกอย่าง |
| `region_viewer` | เขต — ดูได้อย่างเดียว |
| `branch_manager` | สาขา — จัดการข้อมูลสาขาตัวเอง |
| `branch_staff` | สาขา — กรอกข้อมูลสาขาตัวเอง |

---

## 2. Tech Stack

| Layer | เทคโนโลยี | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.4 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Database | Supabase (PostgreSQL) | ^2 |
| Auth | PWA Session Cookie (custom) | — |
| Forms | React Hook Form + Zod | ^7 / ^4 |
| State | Zustand | ^5 |
| Charts | Recharts | ^3 |
| UI Components | Radix UI + shadcn/ui | — |
| PDF Export | jsPDF + jspdf-autotable | ^4 / ^5 |
| Excel Export | xlsx | ^0.18 |
| Date | date-fns | ^4 |
| Toast | Sonner | ^2 |
| Deploy | Vercel (sin1 region) | — |

---

## 3. โครงสร้างไฟล์

```
report-monthy/
├── app/
│   ├── (auth)/                  # กลุ่ม route ไม่ต้อง login
│   │   └── login/               # หน้า login
│   ├── (dashboard)/             # กลุ่ม route ต้อง login — มี Sidebar/Topbar
│   │   ├── layout.tsx           # layout หลัก: auth check + sidebar stats
│   │   ├── page.tsx             # redirect ไป /dashboard
│   │   ├── dashboard/           # หน้าสรุป KPI และ traffic light
│   │   ├── monthly/             # รายงานประจำเดือน (กรอก/ดู)
│   │   ├── plans/               # แผนลด NRW
│   │   ├── obstacle/            # อุปสรรค
│   │   ├── action/              # Action Items (Kanban/Table)
│   │   ├── meeting/             # ระบบประชุม
│   │   │   ├── [id]/agenda/     # วาระประชุม
│   │   │   ├── [id]/preview/    # Preview รายงานประชุม
│   │   │   ├── [id]/report/     # สรุปผลประชุม
│   │   │   ├── report-new/      # สร้างรายงานประชุมใหม่
│   │   │   ├── schedule/        # กำหนดประชุม
│   │   │   └── setup/           # ตั้งค่าประชุม
│   │   ├── five-topics/         # รายงาน 5 หัวข้อ (DMA/ท่อรั่ว/PM/Flush/มาตร)
│   │   ├── directive/           # ติดตามมติประชุม (Directive Tracking)
│   │   ├── km/                  # Knowledge Management
│   │   ├── mnf-monitor/         # ตรวจสอบ MNF EMA Alert
│   │   ├── report-nrw/          # รายงาน NRW รายสาขา (YoY)
│   │   ├── ranking/             # อันดับสาขา
│   │   ├── summary/             # สรุปภาพรวม
│   │   ├── export/              # Export PDF/Excel
│   │   └── notify/              # การแจ้งเตือน
│   ├── actions/                 # Server Actions (Next.js)
│   │   ├── actions.ts           # Action Items
│   │   ├── area-reports.ts      # รายงานพื้นที่
│   │   ├── directive.ts         # Directive Tracking
│   │   ├── five-topics.ts       # Five Topics
│   │   ├── km.ts                # KM Cases
│   │   ├── meeting-agenda.ts    # วาระประชุม
│   │   ├── meeting-pre-agenda.ts# Pre-agenda
│   │   ├── meeting-resolution.ts# มติประชุม
│   │   ├── meetings.ts          # Meetings CRUD
│   │   ├── nrw-area-stats.ts    # NRW Area Statistics
│   │   ├── nrw-report.ts        # NRW Branch Monthly
│   │   ├── obstacles.ts         # Obstacles CRUD
│   │   ├── plans.ts             # Plans CRUD
│   │   ├── reports.ts           # Monthly Reports
│   │   └── water-nodes.ts       # Water Node Select
│   ├── api/
│   │   ├── auth/
│   │   │   ├── pwa-login/       # POST: login ผ่าน Supabase Auth → set pwa_session cookie
│   │   │   ├── pwa-logout/      # POST: logout → clear cookie
│   │   │   └── register/        # POST: สร้าง Supabase Auth user + users_profile (ลงทะเบียนครั้งแรก)
│   │   ├── dmama/
│   │   │   ├── sync/            # POST: sync NRW จาก DMAMA API (Cron วันที่ 16)
│   │   │   ├── mnf-sync/        # POST: sync MNF daily จาก DMAMA API
│   │   │   └── mnf-ema/         # POST: คำนวณ EMA สำหรับช่วงวันที่กำหนด
│   │   ├── export/              # GET: export PDF/Excel
│   │   ├── nrw/calc/            # GET: คำนวณ NRW% และ MNF Factor
│   │   └── rats/
│   │       ├── sync/            # sync ข้อมูลจาก RATS system
│   │       ├── refresh/         # refresh RATS data
│   │       └── stats/           # stats จาก RATS
│   └── layout.tsx               # root layout
│
├── components/
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── AlertPanel.tsx       # แจ้งเตือน MNF Red nodes
│   │   ├── BranchSummaryGrid.tsx# Grid 26 สาขา
│   │   ├── DirectiveCommandCenter.tsx # Directive KPI + Matrix
│   │   ├── MnfMonitorTable.tsx  # ตาราง MNF EMA
│   │   ├── NrwTrendChart.tsx    # กราฟ NRW trend
│   │   ├── NrwYoyChart.tsx      # กราฟเปรียบเทียบ YoY
│   │   └── ...
│   ├── forms/                   # Form components (React Hook Form)
│   │   ├── MonthlyInputForm.tsx # ฟอร์มกรอกรายงานเดือน
│   │   ├── MeetingAgendaForm.tsx# ฟอร์มวาระประชุม
│   │   └── ...
│   ├── layout/
│   │   ├── Sidebar.tsx          # Sidebar navigation
│   │   ├── Topbar.tsx           # Top navigation bar
│   │   └── MobileNav.tsx        # Mobile bottom navigation
│   ├── shared/                  # Reusable shared components
│   └── ui/                      # shadcn/ui base components
│
├── lib/
│   ├── pwa-auth.ts              # Session cookie helper
│   ├── rats-api.ts              # RATS API client
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server Supabase client (service role)
│   │   └── middleware.ts        # Session refresh middleware
│   ├── types/index.ts           # TypeScript types ทั้งหมด
│   └── utils/
│       ├── code-gen.ts          # Running code generator (ORD-XXX-001)
│       ├── date-th.ts           # Thai date utilities
│       ├── ema-calc.ts          # EMA algorithm (MNF alert)
│       ├── nrw-calc.ts          # NRW / MNF Factor calculations
│       └── pwa-branches.ts      # Branch mapping (PWA ↔ DMAMA)
│
├── store/
│   └── useAppStore.ts           # Zustand global store
│
├── hooks/
│   ├── useAuth.ts               # Auth hook
│   ├── useBranch.ts             # Branch context hook
│   ├── useRealtimeData.ts       # Supabase realtime hook
│   └── useRole.ts               # Role check hook
│
├── supabase/migrations/         # Database migrations (50+ files)
├── scripts/                     # Node.js scripts สำหรับ sync/backfill
├── docs/
│   └── mnf-ema-logic.md         # อธิบาย EMA algorithm อย่างละเอียด
│
├── vercel.json                  # Vercel config + Cron jobs
├── next.config.ts               # Next.js config
└── .github/workflows/deploy.yml # CI/CD: type-check → lint → deploy
```

---

## 4. การ Authentication

ระบบใช้ **2 ชั้น** ที่ทำงานร่วมกัน:

### ชั้น 1: Supabase Auth — ตรวจสอบ credentials (หลัก)

> **ทำไมใช้ Supabase Auth แทน PWA กปภ. โดยตรง:**
> ระบบเดิม (Initial commit) เชื่อมต่อ `intranet.pwa.co.th` ของ กปภ. โดยตรง แต่ server
> อยู่ที่ Vercel Singapore ซึ่งเข้า intranet กปภ. ไม่ได้ ลอง Cloudflare Worker proxy
> แล้วยังมีปัญหา จึงเปลี่ยนมาใช้ Supabase Auth ตั้งแต่ 13 พ.ค. 2568 เป็นต้นมา

```
POST /api/auth/pwa-login
  1. signInWithPassword({ email: "${username}@pwa.local", password })
     ← Supabase Auth ตรวจ username+password
  2. query users_profile โดย user.id (admin client, bypass RLS)
     ← ดึงข้อมูลสาขา / costcenter / ชื่อ
  3. สร้าง pwa_session cookie (httpOnly, 8 ชั่วโมง)

POST /api/auth/register  ← ต้องทำก่อน login ครั้งแรก
  1. createUser({ email: "${employee_id}@pwa.local", password })
  2. upsert users_profile (employee_id, name, costcenter, branch_id ...)
  3. สร้าง pwa_session cookie

⚠ Profile Recovery: ถ้า users_profile หาย (DB reset) แต่ auth user ยังอยู่
  → login จะ return error_code: "profile_missing"
  → หน้า login auto-switch ไปแท็บ Register
  → กรอกข้อมูลด้วย employee_id + password เดิม → profile ถูกสร้างใหม่
```

**ข้อมูลใน session:**
```typescript
interface PwaSession {
  username: string       // รหัสพนักงาน (employee_id)
  name, surname: string  // ชื่อ-นามสกุล (จาก users_profile)
  costcenter: string     // รหัส cost center สาขา (จาก users_profile)
  branch_name: string    // ชื่อสาขา (จาก users_profile)
  ba, wwcode, ...        // metadata อื่นๆ
}
```

**การตรวจสอบ session:**
- ทุก Server Component/Action เรียก `getPwaSession()` จาก `lib/pwa-auth.ts`
- ถ้าไม่มี session → `redirect('/login')` หรือ return error
- `costcenter` ว่าง = ผู้ใช้เขต (region), มีค่า = ผู้ใช้สาขา

### ชั้น 2: Supabase Database (service role)

- Server actions/routes ใช้ **service role key** → bypass RLS ทั้งหมด
- Auth ที่แท้จริงอยู่ที่ PWA session cookie ชั้นบน ไม่ใช่ Supabase JWT
- `lib/supabase/middleware.ts` — **dead code** (export ฟังก์ชัน `updateSession` แต่ไม่มี root `middleware.ts` เรียกใช้) เก็บไว้เผื่อต้องการเปิดใช้ในอนาคต

> **ข้อควรระวัง:** `users_profile` เป็น PostgreSQL table ที่ reset ได้ ส่วน Supabase Auth
> users เป็นคนละ system ที่ไม่ถูก reset ตาม DB — ถ้า `supabase db push` ทำให้ตาราง
> recreate → profile data หาย แต่ auth user ยังอยู่ → login ล้มเหลว
> แก้โดยรัน migration `20260528_auth_profile_robustness.sql` ใน Supabase SQL Editor

---

## 5. โมดูลหลัก

### 5.1 Monthly Reports (`/monthly`)

**วัตถุประสงค์:** สาขากรอกรายงานข้อมูล NRW ประจำเดือน

**ข้อมูลที่กรอก:**
| Field | คำอธิบาย |
|-------|---------|
| volume_distributed | ปริมาณจ่ายน้ำ (m³) |
| volume_sold | ปริมาณน้ำจำหน่าย (m³) |
| mnf_latest | ค่า MNF ล่าสุด (m³/hr) |
| leaks_found/repaired/pending | จำนวนจุดรั่ว |
| meters_abnormal | มาตรผิดปกติ |
| pdca_do / pdca_act | แผน PDCA |

**การคำนวณ (server-side):**
```
NRW% = (distributed - sold) / distributed × 100
MNF Factor = mnf / (daily_supply / 24)
```

**Status flow:** `draft` → `submitted` → `reviewed`

---

### 5.2 Plans (`/plans`)

แผนลด NRW แบ่งตาม:
- **owner_level:** `region` (เขตสั่ง) หรือ `branch` (สาขาทำเอง)
- **plan_type:** ประเภทแผน
- **approach_group:** กลุ่มแนวทาง (DMA/MM/P3/ฯลฯ)

Status: `รออนุมัติ` → `ระหว่างดำเนินการ` → `สำเร็จ` | `ล่าช้า` | `ยกเลิก`

---

### 5.3 Obstacles (`/obstacle`)

อุปสรรคที่กีดขวางการลด NRW แบ่ง category: `MM | DMA | P3 | อื่นๆ`

**Flags สำคัญ:**
- `auto_create_action` — สร้าง action item อัตโนมัติเมื่อสร้าง obstacle
- `send_to_meeting` — นำเข้าวาระประชุม
- `show_in_monthly_alert` — แสดงในแจ้งเตือนรายเดือน

---

### 5.4 Action Items (`/action`)

Tasks รายละเอียดที่ต้องทำ เชื่อมกับ:
- obstacle (มาจากปัญหา)
- meeting resolution (มาจากมติประชุม)
- plan (มาจากแผน)

View modes: **Kanban** หรือ **Table**

---

### 5.5 Meetings (`/meeting`)

ระบบจัดการประชุมครบวงจร:

```
meeting (ตารางนัดหมาย)
    ↓
meeting_pre_agenda (เตรียมวาระก่อนประชุม)
    ↓
meeting_agenda_headers + meeting_agenda_subitems (วาระจริง)
    ↓
meeting_resolutions (มติที่ประชุม)
    ↓
resolution_notifications (แจ้งเตือนสาขา)
    ↓
meeting_acknowledgments (สาขากด "รับทราบ")
```

**Preview Page** (`/meeting/[id]/preview`):
- ดึงข้อมูล NRW ปีปัจจุบัน/ปีก่อน จาก `nrw_branch_monthly`
- สร้างตาราง YoY comparison
- รวม PDCA จากทุกสาขา

---

### 5.6 Five Topics (`/five-topics`)

รายงานรายเดือน 5 หัวข้อตามแนวทาง กปภ.:

| หัวข้อ | เนื้อหา |
|--------|---------|
| T1 | DMA Walkthrough — จำนวน DMA ที่ตรวจ, วันที่ตรวจ |
| T2 | ค้นหาและซ่อมท่อรั่ว — ความถี่, จำนวน, ปริมาณน้ำที่ลด |
| T3 | Preventive Maintenance — DMA/PRV/P3 PM |
| T4 | Flushing — จำนวนจุด, ปริมาณ m³ |
| T5 | เปลี่ยนมาตร — จำนวนมาตรที่เปลี่ยน |

---

### 5.7 Directive Tracking (`/directive`)

ติดตามมติประชุม ระดับ "สั่งการ":

```
MeetingResolution (มติ)
    ├── ResolutionStep[] (ขั้นตอน)
    ├── DirectiveBranchStatus[] (สถานะแต่ละสาขา)
    └── ResolutionProgressLog[] (log การอัปเดต)
```

**Traffic Light Logic:**
- 🟢 Green — progress ≥ target หรือ แล้วเสร็จ
- 🟡 Yellow — ดำเนินการอยู่ ยังไม่เกินกำหนด
- 🔴 Red — เกินกำหนด หรือ ล่าช้า
- ⬜ Grey — ยังไม่มีข้อมูล

---

### 5.8 NRW Report (`/report-nrw`)

ข้อมูล NRW รายสาขารายเดือน ที่ sync มาจาก DMAMA + ป้อนเอง:
- เปรียบเทียบ Year-over-Year
- กราฟ trend
- ตั้งเป้าหมาย NRW ต่อปีงบประมาณ

---

### 5.9 KM Cases (`/km`)

Knowledge Management — บันทึก best practice การแก้ปัญหา NRW:
- บันทึก NRW/MNF ก่อน-หลัง
- ปริมาณน้ำที่ประหยัด
- บทเรียน
- Status การยืนยัน: `รอยืนยันรอบ 1` → `รอยืนยันรอบ 2` → `ยืนยันแล้ว`

---

## 6. Database Schema

### ตารางหลัก

```
branches                — 26 สาขา กปภ.เขต 10
users_profile           — User profiles (linked to Supabase Auth)
monthly_reports         — รายงาน NRW ประจำเดือน
plans                   — แผนลด NRW
obstacles               — อุปสรรค
action_items            — Action tasks
meetings                — ประชุม
meeting_pre_agenda      — เตรียมวาระ
meeting_agenda_headers  — Header วาระ
meeting_agenda_subitems — รายละเอียดวาระย่อย
meeting_resolutions     — มติประชุม
meeting_acknowledgments — การรับทราบการประชุม
resolution_notifications — แจ้งเตือนมติ
km_cases                — KM cases
five_topics_reports     — รายงาน 5 หัวข้อ
area_reports            — รายงานพื้นที่
water_nodes             — Node น้ำ (MM/DMA/SUB/VD)
mnf_daily               — MNF raw data รายวัน (จาก DMAMA)
mnf_ema_daily           — EMA computed ต่อ node ต่อวัน
nrw_area_stats          — NRW รายพื้นที่ (จาก DMAMA sync)
nrw_branch_monthly      — NRW รายสาขารายเดือน
nrw_branch_target       — เป้าหมาย NRW รายสาขา
directive_progress_log  — Log การอัปเดต directive
resolution_steps        — ขั้นตอน resolution
```

### Views สำคัญ

```
mnf_ema_latest          — row ล่าสุดของแต่ละ node (ใช้ AlertPanel + MNF Monitor)
```

### Code Generation Pattern

รหัส running number ทุกตาราง:
```
ORD-SKT-001  (Action Items)
OBS-PCT-001  (Obstacles)
PLN-NRT-001  (Plans)
```

ผ่าน `lib/utils/code-gen.ts` → query `MAX(code)` แล้วเพิ่ม 1

---

## 7. API Routes

### Auth

| Method | Path | หน้าที่ |
|--------|------|--------|
| POST | `/api/auth/pwa-login` | Login ผ่าน PWA Gateway, set session cookie |
| POST | `/api/auth/pwa-logout` | Clear session cookie |
| POST | `/api/auth/register` | สร้าง user ใหม่ ใน Supabase Auth + users_profile |

### DMAMA Sync (Protected by `DMAMA_SYNC_SECRET` หรือ `CRON_SECRET`)

| Method | Path | หน้าที่ |
|--------|------|--------|
| POST | `/api/dmama/sync` | Sync NRW area stats จาก DMAMA API → `nrw_area_stats` |
| POST | `/api/dmama/mnf-sync` | Sync MNF daily จาก DMAMA API → `mnf_daily` |
| POST | `/api/dmama/mnf-ema` | Compute EMA สำหรับช่วงวันที่ → `mnf_ema_daily` |

**Auth headers:**
```
Authorization: Bearer <CRON_SECRET>    (Vercel Cron)
x-sync-secret: <DMAMA_SYNC_SECRET>     (manual trigger)
```

### Utility

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/nrw/calc` | คำนวณ NRW%, MNF Factor, NRW status |
| GET/POST | `/api/export` | Export PDF/Excel |

---

## 8. External Integrations

### DMAMA API (`https://dmama.pwa.co.th/api`)

ระบบ NRW ของ กปภ. ส่วนกลาง:
- Login ด้วย `DMAMA_USERNAME` / `DMAMA_PASSWORD`
- ดึงข้อมูล NRW รายพื้นที่ (`/report/non_revenue_water`)
- ดึง MNF รายวัน (mnf-sync route)
- Cron: ทุกวันที่ 16 เวลา 09:00 น. (Bangkok)

**Environment:**
```
DMAMA_USERNAME=
DMAMA_PASSWORD=
DMAMA_SECTOR_ID=1
DMAMA_DISTRICT_ID=10
DMAMA_SYNC_SECRET=
```

### Supabase

- Hosted PostgreSQL + Auth + Realtime
- Project ref เก็บใน `supabase/.temp/linked-project.json`

**Environment:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 9. MNF EMA Alert System

ระบบแจ้งเตือน MNF (Minimum Night Flow) อัตโนมัติ ใช้ Exponential Moving Average

### หลักการ

```
EMA_today = MNF_today × 0.1333 + EMA_yesterday × 0.8667
Diff%     = (MNF_today - EMA_yesterday) / EMA_yesterday × 100
```

### ระดับ Alert

| Status | เงื่อนไข | ความหมาย |
|--------|---------|---------|
| 🟢 green | Diff% < 50% | ปกติ |
| 🟡 yellow | Diff% ≥ 50%, ติดกัน < 3 วัน | เริ่มสูง เฝ้าดู |
| 🔴 red_accumulated | ติดกัน ≥ 3 วัน | รั่วซึมเรื้อรัง |
| 🔴 red_spike | Diff% ≥ 200% (ทันที) | ท่อแตกเร่งด่วน |

### Node Classification

| ประเภท | เงื่อนไข | การจัดการ |
|--------|---------|---------|
| `tiny` | median < 1 m³/hr | skip ไม่แจ้งเตือน |
| `bimodal` | q1 < median × 10% | skip (EMA ไม่น่าเชื่อถือ) |
| `normal` | อื่นๆ | คำนวณ EMA ปกติ |

### Workflow อัตโนมัติ

```
1. mnf-sync (ทุกวัน) → ดึงจาก DMAMA → upsert mnf_daily
2. computeEmaForDateRange() — warm-up 60 วันย้อนหลัง
3. classify แต่ละ node, skip tiny/bimodal
4. computeEmaSeries() สำหรับ normal nodes
5. upsert → mnf_ema_daily (chunks ละ 500 rows)
6. Dashboard AlertPanel อ่านจาก mnf_ema_latest view
```

ดูรายละเอียดเพิ่มเติมใน [`docs/mnf-ema-logic.md`](docs/mnf-ema-logic.md)

---

## 10. State Management

### Zustand Store (`store/useAppStore.ts`)

State ที่ persist ใน localStorage:

| Key | ประเภท | หน้าที่ |
|-----|--------|--------|
| `selectedYear` | number | ปีที่เลือกดูข้อมูล |
| `selectedMonth` | number | เดือนที่เลือกดูข้อมูล |
| `selectedBranchId` | string\|null | filter สาขา (region users) |
| `sidebarCollapsed` | boolean | สถานะ sidebar ย่อ/ขยาย |
| `actionViewMode` | 'kanban'\|'table' | โหมดดู action items |
| `kmFilterStatus` | string | filter status ของ KM |

---

## 11. Deployment

### CI/CD Flow

```
git push → main
    ↓
GitHub Actions:
    1. npm ci
    2. tsc --noEmit  (type check)
    3. eslint        (lint)
    ↓ (ถ้าผ่าน)
Vercel Deploy (--prod)
    region: sin1 (Singapore)
```

### Vercel Cron

```json
{
  "path": "/api/dmama/sync",
  "schedule": "0 2 16 * *"    ← ทุกวันที่ 16 เวลา 02:00 UTC (09:00 Bangkok)
}
```

### Security Headers

ตั้งใน `vercel.json`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Scripts

```bash
npm run sync:dmama      # sync NRW area stats ด้วยมือ
npm run sync:rats       # sync RATS data ด้วยมือ
npm run backfill:dmama  # backfill ข้อมูลย้อนหลัง
```

---

## 12. Debug Issues ที่พบ

### 🔴 Critical — ต้องแก้ก่อน deploy

#### 1. `console.log` หลงอยู่ใน production page

**ไฟล์:** [`app/(dashboard)/meeting/[id]/preview/page.tsx:82`](app/(dashboard)/meeting/[id]/preview/page.tsx)

```typescript
// บรรทัด 82
console.log('[preview] monthlyRes rows:', monthlyRes.data?.length, 'error:', monthlyRes.error?.message)
```

**ปัญหา:** เป็น debug log ที่หลงลืมลบ จะแสดงใน server log ทุกครั้งที่ preview หน้าประชุม  
**แก้ไข:** ลบบรรทัดนี้ออก

---

### 🟡 Medium — ควรแก้ระยะกลาง

#### 2. `(supabase as any)` cast หลายจุด — ขาด TypeScript coverage

**ไฟล์ที่พบ:**
- `app/(dashboard)/meeting/[id]/preview/page.tsx:60, 64` — query `nrw_branch_monthly`
- `app/(dashboard)/mnf-monitor/page.tsx:13` — query `mnf_ema_latest` view
- `app/(dashboard)/report-nrw/page.tsx:35, 42` — query `nrw_branch_monthly`
- `app/actions/nrw-report.ts:37, 90, 119, 135` — CRUD `nrw_branch_monthly`
- `app/(dashboard)/summary/page.tsx:72` — cast `as any[]`

**สาเหตุ:** ตาราง `nrw_branch_monthly` และ view `mnf_ema_latest` ถูกสร้างทีหลัง Supabase type generation ครั้งล่าสุด → TypeScript ไม่รู้จักตารางเหล่านี้

**แก้ไข:** Re-generate Supabase types:
```bash
npx supabase gen types typescript --linked > lib/supabase/types.gen.ts
```
แล้วอัปเดต client ให้ใช้ generated types

---

#### 3. `any` type ใน `MeetingPreviewClient.tsx`

**ไฟล์:** [`app/(dashboard)/meeting/[id]/preview/_components/MeetingPreviewClient.tsx:190, 207, 527, 528`](app/(dashboard)/meeting/[id]/preview/_components/MeetingPreviewClient.tsx)

```typescript
function aggregateNrw(rows: any[], ...)
function computeYoyRows(currRaw: any[], prevRaw: any[], ...)
nrwCurrRaw: any[]
nrwPrevRaw: any[]
```

**ปัญหา:** ข้อมูล NRW ที่ส่งเข้า component ไม่มี type ชัดเจน ทำให้ error checking ไม่ครอบคลุม  
**แก้ไข:** สร้าง interface สำหรับ NRW raw row หรือใช้ `NrwBranchMonthly` type ที่มีอยู่แล้วใน `lib/types/index.ts`

---

### 🟢 Low — ปรับปรุงในอนาคต

#### 4. `console.error` ใน register route ที่ไม่ return error

**ไฟล์:** [`app/api/auth/register/route.ts:66`](app/api/auth/register/route.ts)

```typescript
if (profileError) {
  console.error('Profile upsert error:', profileError.message)
  // ⚠️ ไม่ return error → user ยังได้รับ cookie ปกติ ถึงแม้ profile จะไม่บันทึก
}
```

**ปัญหา:** ถ้า profile upsert ล้มเหลว user จะ login ได้แต่ไม่มี profile record ซึ่งอาจทำให้ role-based logic ผิดพลาดในภายหลัง  
**พิจารณา:** Return error 500 หรือบันทึกไว้ใน error monitoring (เช่น Sentry)

---

#### 5. Supabase client ใน `middleware.ts` ใช้ `ANON_KEY` แต่ `server.ts` ใช้ `SERVICE_ROLE_KEY`

**ไฟล์:** `lib/supabase/middleware.ts` vs `lib/supabase/server.ts`

ปัจจุบัน middleware ใช้ anon key สำหรับ refresh session แต่ server actions ใช้ service role key bypass RLS ทั้งหมด ซึ่งออกแบบมาตั้งใจ (auth อยู่ที่ PWA cookie ไม่ใช่ Supabase JWT) แต่ควร document ไว้ให้ชัดเจนว่าการออกแบบนี้ตั้งใจ

---

### สรุปจำนวน issues

| ระดับ | จำนวน | ไฟล์ |
|-------|-------|------|
| 🔴 Critical | 1 | preview/page.tsx |
| 🟡 Medium | 2 | หลายไฟล์ |
| 🟢 Low | 2 | register/route.ts, middleware.ts |

---

## คำสั่งพัฒนา

```bash
# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env.local
cp .env.local.example .env.local
# แล้วกรอก credentials

# รัน dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Sync DMAMA data ด้วยมือ
npm run sync:dmama

# Sync RATS data ด้วยมือ
npm run sync:rats

# Backfill DMAMA ย้อนหลัง
npm run backfill:dmama







