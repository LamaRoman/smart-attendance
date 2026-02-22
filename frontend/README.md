# Smart Attendance System

Staff attendance tracking with QR code scanning.

## Day 1: Foundation

What's included:
- Next.js 14 with App Router
- Prisma with PostgreSQL (Users + UserSession tables)
- JWT authentication
- Login endpoint

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

3. **Set up database:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. **Seed test data:**
```bash
npm run db:seed
```

5. **Start development server:**
```bash
npm run dev
```

## Test the login endpoint

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "admin123"}'

# Login as employee
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@company.com", "password": "employee123"}'
```

## What's next (Day 2+)

- [ ] Logout endpoint
- [ ] Auth middleware
- [ ] User CRUD (admin only)
- [ ] QR code generation
- [ ] Attendance clock-in/out
- [ ] Web UI