# Smart Attendance — Complete Project Reference

> Last updated: April 4, 2026
> GitHub: https://github.com/LamaRoman/smart-attendance (public)

---

## Project Overview

Smart Attendance is a full-stack attendance management system built for Nepali businesses. It supports Nepali calendar (BS dates), GPS-based clock-in, QR code scanning, payroll with Nepal tax rules (SSF, TDS, Dashain bonus), and multi-org SaaS architecture.

### Architecture

```
smart_attendance/
├── backend/        Node.js + Express + TypeScript + Prisma + PostgreSQL
├── frontend/       Next.js 16 + Tailwind CSS (web dashboard)
├── mobile/         Expo React Native (Employee app — "Attend Xpress")
└── mobile-admin/   Expo React Native (Admin app — "Attend Xpress Admin")
```

### Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Backend API | Railway | https://api.zentaralabs.com |
| Web Frontend | Vercel | https://attendance.zentaralabs.com |
| Database | Railway PostgreSQL | switchback.proxy.rlwy.net:17927 |
| Employee App | EAS Build | com.zentaralabs.attendxpress |
| Admin App | EAS Build | com.zentaralabs.attendxpress.admin |

### EAS Projects

| App | EAS Project | Project ID |
|-----|-------------|------------|
| Employee | @romanlama/attendxpress | c10d5cfd-cc65-469b-a696-330e69b7e383 |
| Admin | @romanlama/attendxpress-admin | 3b9521d0-76fa-4eff-b0f9-08ab24873ccf |

---

## User Roles

| Role | Access | Description |
|------|--------|-------------|
| SUPER_ADMIN | Web only | Platform-level: manages orgs, plans, subscriptions, TDS slabs |
| ORG_ADMIN | Web + Admin app | Org-level: manages employees, attendance, leaves, payroll, settings |
| ACCOUNTANT | Web only | Org-level: attendance reports, payroll (read-heavy, limited write) |
| EMPLOYEE | Web + Employee app | Self-service: clock in/out, view leaves, salary, profile |

---

## Backend (Node.js + Express + TypeScript)

### Tech Stack
- Express 4.x with TypeScript
- Prisma ORM with PostgreSQL
- JWT auth with session validation in DB
- Zod schema validation
- Pino structured logging
- node-cron scheduled jobs

### Security
- Helmet (CSP, HSTS, XSS, MIME sniffing, Referrer-Policy)
- CSRF protection via X-Requested-With header check
- Rate limiting: auth (10/15min), scan (500/15min), general (300/15min)
- Input sanitization with prototype pollution protection
- Bcrypt password hashing (12 rounds)
- JWT tokens hashed before DB storage
- HTTP → HTTPS redirect in production
- Graceful shutdown (SIGTERM/SIGINT)

### Environment Variables (Railway)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 64+ char hex string
- `QR_SECRET` — 64+ char hex string
- `NODE_ENV` — production
- `TZ` — Asia/Kathmandu (required for midnight cron)
- `CORS_ORIGINS` — comma-separated allowed origins
- `FRONTEND_URL` — https://attendance.zentaralabs.com
- `RESEND_API_KEY` — for email notifications (optional)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` — document storage (optional)

### Database Models (22 tables)
- **Organization** — multi-tenant org with attendance settings, geofence, leave config
- **User** — email, password, role, profile info
- **OrgMembership** — links users to orgs with role, shift times, pay settings
- **UserSession** — JWT session tracking with token hash
- **AttendanceRecord** — clock in/out with GPS, method, BS date, duration, status
- **AttendanceAuditLog** — audit trail for attendance modifications
- **EmployeePaySettings** — basic salary, allowances per employee
- **PayrollRecord** — monthly payroll with Nepal tax calculations
- **PayrollAuditLog** — payroll change tracking
- **Holiday** — national + org-specific holidays (BS dates)
- **Leave** — leave requests with type, status, approval flow
- **LeaveBalance** — per-employee leave balances by BS year
- **QRCode** — rotating QR codes for office check-in
- **SystemConfig** — per-org configuration key-value pairs
- **Notification** — in-app notifications
- **DocumentType** — org-specific document categories
- **EmployeeDocument** — uploaded employee documents
- **PricingPlan** — SaaS tier definitions (STARTER, OPERATIONS)
- **OrgSubscription** — org subscription status and billing
- **SubscriptionBillingLog** — billing history
- **SubscriptionAdminNote** — admin notes on subscriptions
- **PlatformConfig** — platform-wide settings
- **PasswordResetToken** — password reset flow

### Key Enums
- **Role**: SUPER_ADMIN, ORG_ADMIN, ACCOUNTANT, EMPLOYEE
- **AttendanceRecordStatus**: CHECKED_IN, CHECKED_OUT, AUTO_CLOSED
- **AttendanceMode**: GPS_ONLY, QR_ONLY, BOTH
- **CheckInMethod**: QR_SCAN, GPS, MANUAL
- **PayrollStatus**: DRAFT, APPROVED, PAID
- **LeaveType**: ANNUAL, SICK, CASUAL, UNPAID, MATERNITY, PATERNITY, MOURNING, OTHER
- **LeaveStatus**: PENDING, APPROVED, REJECTED, CANCELLED
- **SubscriptionStatus**: TRIALING, ACTIVE, SUSPENDED, EXPIRED, CANCELLED

### API Routes

#### Auth (`/api/auth`)
- POST `/login` — login with rate limiting
- POST `/refresh` — token refresh
- POST `/logout` — invalidate session
- GET `/me` — current user profile
- PATCH `/attendance-pin` — update attendance PIN
- POST `/forgot-password` — initiate password reset
- POST `/reset-password` — complete password reset

#### Users (`/api/users`)
- GET `/` — list org users (admin)
- GET `/upcoming-birthdays` — birthdays list
- POST `/` — create user
- POST `/add-existing` — add existing user to org
- PUT `/:id` — update user
- DELETE `/:id` — soft delete user
- PATCH `/:id/attendance-pin` — reset PIN (admin)
- PATCH `/:id/status` — toggle active/inactive

#### Attendance (`/api/attendance`)
- POST `/scan-public` — public QR scan check-in (unauthenticated, rate limited)
- POST `/mobile-checkin` — public GPS check-in with PIN (kiosk mode)
- POST `/mobile-checkin-auth` — authenticated GPS check-in (mobile app)
- GET `/status` — current clock-in status
- GET `/my` — employee's own attendance records
- GET `/` — org attendance records (admin)
- GET `/org/:orgSlug` — public org attendance summary
- GET `/:id` — single attendance record
- POST `/manual` — manual attendance entry (admin)
- PUT `/:id` — update attendance record
- PUT `/:id/review` — review/approve attendance
- POST `/auto-close` — trigger auto-close job

#### Leaves (`/api/leaves`)
- GET `/balance` — employee leave balance
- GET `/my` — employee's own leave requests
- POST `/` — submit leave request
- DELETE `/:id` — cancel leave request
- GET `/` — all org leave requests (admin)
- PUT `/:id/status` — approve/reject leave (admin)

#### Leave Balance (`/api/leave-balance`)
- GET `/` — all employees' leave balances (admin)
- GET `/:membershipId` — specific employee balance
- POST `/` — create/update leave balance
- PUT `/:id` — update leave balance

#### Payroll (`/api/payroll`)
- GET `/my-payslips` — employee's own payslips
- GET `/settings` — pay settings
- PUT `/settings` — update pay settings
- POST `/generate` — generate monthly payroll
- POST `/regenerate/:userId` — regenerate for specific user
- GET `/records` — payroll records list
- PUT `/records/:id/status` — update payroll status
- PUT `/records/bulk-status` — bulk status update
- GET `/records/:id/audit` — audit log for payroll record
- GET `/multi-month` — multi-month comparison
- GET `/payslip/:recordId/pdf` — download payslip PDF
- GET `/export/detailed` — detailed payroll export
- GET `/export/bank-sheet` — bank transfer sheet
- GET `/annual-report` — annual payroll report
- GET `/annual-report/csv` — annual report CSV export
- GET `/tds-slabs` — TDS tax slabs

#### QR Codes (`/api/qr`)
- POST `/generate` — generate rotating QR
- POST `/validate` — validate QR code
- POST `/scan` — process QR scan
- GET `/current` — current active QR
- POST `/regenerate` — force regenerate

#### Holidays (`/api/holidays`)
- GET `/` — list holidays
- GET `/master` — master holiday list
- POST `/` — create holiday
- PUT `/:id` — update holiday
- DELETE `/:id` — delete holiday
- POST `/import` — import holidays
- POST `/sync` — sync from external source

#### Reports (`/api/reports`)
- GET `/daily` — daily attendance report
- GET `/weekly` — weekly report
- GET `/monthly` — monthly report

#### Org Settings (`/api/org-settings`)
- GET `/` — org settings
- PUT `/` — update settings
- GET `/subscription` — subscription info

#### Notifications (`/api/notifications`)
- GET `/` — list notifications
- GET `/unread` — unread notifications
- GET `/count` — unread count
- PUT `/read-all` — mark all read
- PUT `/:id/read` — mark single read
- DELETE `/:id` — delete notification
- DELETE `/clear-read` — clear read notifications

#### Documents
- POST `/documents` — upload document
- GET `/documents/user/:id` — user documents
- GET `/documents/:id/download` — download document
- DELETE `/documents/:id` — delete document
- GET `/org/document-types` — document types
- POST `/org/document-types` — create type
- PATCH `/org/document-types/:id` — update type
- DELETE `/org/document-types/:id` — delete type
- GET `/org/document-compliance` — compliance overview

#### Super Admin (`/api/super-admin`)
- GET `/stats` — platform statistics
- CRUD `/organizations` — manage organizations
- GET/PUT `/tds-slabs` — TDS tax configuration

#### Super Admin Subscriptions (`/api/super-admin/subscriptions`)
- GET `/` — list all subscriptions
- POST `/:orgId/assign-tier` — assign plan
- PATCH `/:orgId/override-pricing` — custom pricing
- PATCH `/:orgId/waive-setup-fee` — waive fees
- PATCH `/:orgId/suspend` — suspend org
- PATCH `/:orgId/extend-trial` — extend trial
- PATCH `/:orgId/reactivate` — reactivate
- POST `/:orgId/notes` — admin notes
- GET `/:orgId/billing-log` — billing history
- PATCH `/:orgId/feature-overrides` — feature toggles

#### Super Admin Plans (`/api/super-admin/plans`)
- GET `/` — list plans
- PATCH `/:tier/features` — update features
- PATCH `/:tier/price` — update pricing
- PATCH `/:tier/setup-fee` — setup fee config
- PATCH `/:tier/trial-days` — trial duration
- PATCH `/:tier/grace-period` — grace period
- PATCH `/:tier/annual-discount` — discount config

### Scheduled Jobs
- **midnight-autoclose** — closes forgotten clock-ins at shift end time (00:00 NPT)
- **trial-expiry** — expires trial subscriptions
- **billing** — processes subscription billing
- **price-expiry** — handles custom price expiration
- **grace-period** — manages grace period transitions
- **abandoned** — cleans up abandoned signups

### Middleware Stack (in order)
1. Helmet (security headers)
2. General rate limiter
3. Request ID generation
4. CSRF check (X-Requested-With)
5. CORS
6. Cookie parser
7. JSON body parser (100kb limit)
8. Input sanitization
9. Request logging
10. Route handlers
11. Error handler (last)

---

## Web Frontend (Next.js 16)

### Tech Stack
- Next.js 16 with App Router
- Tailwind CSS 3
- Leaflet for maps (geofence)
- html5-qrcode for QR scanning
- jsPDF for payslip generation
- nepali-date-converter for BS dates
- lucide-react icons

### Security Headers (next.config.ts)
- HSTS (2 years, preload)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera self, geolocation self)
- Full CSP with backend + S3 connect-src

### Pages by Role

#### Public
- `/login` — login page
- `/reset-password` — password reset
- `/scan` — QR code scanner (employee check-in)
- `/checkin` — GPS check-in page
- `/c/[slug]` — public org attendance page

#### Employee
- `/employee` — employee dashboard
- `/employee/attendance` — attendance history
- `/employee/my-salary` — payslips
- `/leaves` — leave requests
- `/holidays` — holiday calendar
- `/my-info` — profile + documents
- `/settings` — account settings

#### Org Admin
- `/admin` — admin dashboard
- `/admin/attendance` — attendance management
- `/admin/attendance/late-arrivals` — late arrival tracking
- `/admin/pay` — payroll management
- `/admin/qr` — QR code management
- `/admin/reports` — reports
- `/admin/billing` — subscription/billing
- `/users` — employee management
- `/users/[id]` — employee detail
- `/payroll` — payroll processing
- `/settings` — org settings

#### Accountant
- `/accountant` — accountant dashboard
- `/accountant/attendance` — attendance view
- `/accountant/reports` — reports

#### Super Admin
- `/super-admin` — platform dashboard
- `/super-admin/holidays` — master holiday management
- `/super-admin/plans` — pricing plan management
- `/super-admin/subscriptions` — org subscription management
- `/super-admin/tds-slabs` — TDS tax slab configuration

### Key Components
- **AdminLayout / EmployeeLayout / AccountantLayout** — role-based sidebar layouts
- **RoleGuard** — route protection by role
- **BSDatePicker** — Nepali calendar date picker
- **GeoFenceMap** — Leaflet map for geofence configuration
- **QRScanner** — html5-qrcode wrapper for check-in
- **NotificationBell** — real-time notification dropdown
- **DocumentManager / DocumentCompliance** — document upload and tracking
- **ProBlurOverlay / UpgradePrompt** — feature gating for paid tiers

---

## Employee Mobile App (Expo — "Attend Xpress")

### Config
- Package: `com.zentaralabs.attendxpress`
- Slug: `attendxpress`
- Scheme: `attendxpress`
- Brand color: Blue `#2563EB`

### Screens
| Tab | Screen | Description |
|-----|--------|-------------|
| Home | `(tabs)/home/index.tsx` | Clock status, today's times, quick stats, clock in/out button |
| Leaves | `(tabs)/leaves/index.tsx` | Leave request list |
| Leaves | `(tabs)/leaves/request.tsx` | Submit new leave request |
| Salary | `(tabs)/salary/index.tsx` | Payslip list |
| Salary | `(tabs)/salary/[id].tsx` | Payslip detail |
| Profile | `(tabs)/profile/index.tsx` | User profile, biometric toggle, logout |
| — | `attendance/gps-checkin.tsx` | GPS-based clock in/out |
| — | `attendance/scan.tsx` | QR code scanner for check-in |
| — | `attendance/index.tsx` | Attendance mode selector |

### Key Libraries
- expo-router 6 (file-based routing)
- expo-secure-store (encrypted token storage)
- expo-local-authentication (biometric lock)
- expo-location (GPS check-in)
- expo-camera (QR scanning)
- zustand 5 (state management)
- axios (API client with refresh interceptor)

### Stores
- **auth.store.ts** — login, logout, initialize, user state
- **attendance.store.ts** — clock-in status from `/api/attendance/status`
- **biometricStore.ts** — biometric lock settings, background time tracking

### API Config
- Dev (`__DEV__=true`): `http://192.168.1.65:5001`
- Production: `https://api.zentaralabs.com`
- All requests include `Authorization: Bearer <token>` and `X-Requested-With: XMLHttpRequest`

---

## Admin Mobile App (Expo — "Attend Xpress Admin")

### Config
- Package: `com.zentaralabs.attendxpress.admin`
- Slug: `attendxpress-admin`
- Scheme: `attendxpress-admin`
- Brand color: Purple `#7C3AED`

### Screens
| Tab | Screen | Description |
|-----|--------|-------------|
| Dashboard | `(admin-tabs)/dashboard/index.tsx` | Today's summary: clocked in, late, on leave, absent (today only) |
| Attendance | `(admin-tabs)/attendance/index.tsx` | Today's attendance records with in/out times, hours, status |
| Leaves | `(admin-tabs)/leaves/index.tsx` | Leave requests with Pending/All filter, approve/reject buttons |
| Employees | `(admin-tabs)/employees/index.tsx` | Employee list with role, status, employee ID |
| Profile | `(admin-tabs)/profile/index.tsx` | Admin profile, biometric toggle, sign out |

### Shared code with Employee App
Both apps share identical implementations for: `lib/api.ts`, `lib/auth.ts`, `lib/nepali-date.ts`, `lib/i18n.ts`, `store/auth.store.ts`, `store/biometricStore.ts`, `hooks/useBiometric.ts`, `components/BiometricLockScreen.tsx`, `components/StatusBadge.tsx`

---

## Nepali Calendar (BS) Support

The system uses Bikram Sambat dates throughout:
- Attendance records store `bsYear`, `bsMonth`, `bsDay`
- Leave balances are per BS year
- Payroll is per BS month
- Holidays use BS dates
- Date conversions in `lib/nepali-date.ts` (AD ↔ BS)
- Supported BS range: 2070–2090

---

## Key Commands

```bash
# Backend
cd backend && npm run dev                    # local dev server (port 5001)
cd backend && npm run build                  # compile TypeScript
cd backend && npx prisma db seed             # production seed
cd backend && npx ts-node prisma/seed-dev.ts # dev seed (full demo data)
cd backend && npx prisma migrate deploy      # apply migrations
cd backend && npx prisma studio              # visual DB browser

# Frontend
cd frontend && npm run dev                   # Next.js dev (port 3000)
cd frontend && npm run build                 # production build

# Employee App
cd mobile && npx expo start                  # Expo dev server
cd mobile && eas build --platform android --profile preview    # test APK
cd mobile && eas build --platform android --profile production # Play Store AAB

# Admin App
cd mobile-admin && npx expo start            # Expo dev server
cd mobile-admin && eas build --platform android --profile preview
cd mobile-admin && eas build --platform android --profile production

# Always use this flag for mobile deps
npm install --legacy-peer-deps
```

---

## Golden Rules

1. Always verify files exist before editing — never assume
2. Always check API response shape before updating store interfaces
3. Never change backend when a mobile-only fix works
4. `npm install --legacy-peer-deps` required in both mobile apps
5. `__DEV__` = true in Expo Go (local), false in APK (production)
6. Always commit before EAS build — it builds from the repo
7. Verify `app.json` slug matches EAS project before every build
8. Test in Expo Go locally before triggering EAS builds
9. BS dates for queries, AD dates (ISO) for client-side time comparisons
10. Both mobile apps filter attendance to today-only using AD date check

---

## Current Status (April 4, 2026)

### Done ✅
- Backend fully deployed on Railway (all routes, jobs, security)
- Frontend deployed on Vercel (all role dashboards working)
- Employee app — production AAB built (login, clock in/out, leaves, salary, profile)
- Admin app — production AAB built (dashboard, attendance, leaves, employees, profile)
- Database production-seeded (clean, super admin only)
- Production audit passed (no secrets, no vulnerabilities, all imports resolve)
- Package names set for Play Store (com.zentaralabs.*)

### Pending
- Play Store submission (waiting for D-U-N-S number)
- iOS builds (needs Apple Developer account)
- Push notifications (needs Firebase FCM setup)
- Email notifications (Resend API key configured but templates minimal)
- Employee app: attendance history screen, leave balance display
- Admin app: employee search/filter, attendance reports
- UI polish: loading skeletons, animations, empty states
- Super admin mobile experience (currently web-only, which is fine)

---

## Test Credentials (Dev Seed Only)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@smartattendance.com | SuperAdmin@123 |
| Org Admin | orgadmin@democompany.com | OrgAdmin@123 |
| Employee | sita@democompany.com | Employee@123 |
| Employee | hari@democompany.com | Employee@123 |
| Employee | gita@democompany.com | Employee@123 |
| Employee | bikash@democompany.com | Employee@123 |
| Employee | anita@democompany.com | Employee@123 |

Attendance PIN (all employees): `1234`

> These credentials only exist when running the dev seed (`seed-dev.ts`).
> Production uses env-var-based super admin password with no demo data.
