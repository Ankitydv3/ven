# Complaint Management System

Full-stack complaint management platform with a Next.js frontend and Express/MongoDB backend.

## Structure

- `frontend/` - Next.js 16 App Router UI
- `backend/` - Express + Mongoose API

## Demo Accounts

- Admin: `admin@gmail.com` / `admin123`
- Team: `teamalpha@gmail.com`, `teambeta@gmail.com`, `teamgamma@gmail.com`, `teamdelta@gmail.com` / `123456`

## Environment Variables

Backend: see [backend/.env.example](backend/.env.example)

Frontend: create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Run Locally

1. Start MongoDB Atlas or a local MongoDB instance.
2. In `backend/`, copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
3. In `backend/`, install dependencies and run:

```bash
npm install
npm run dev
```

4. In `frontend/`, create `.env.local` and run:

```bash
npm install
npm run dev
```

## Build

- Backend: `npm run build` from `backend/`
- Frontend: `npm run build` from `frontend/`

## API

- `POST /api/auth/login`
- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/:complaintId/track`
- `PATCH /api/complaints/:id/assign`
- `PATCH /api/complaints/:id/start`
- `PATCH /api/complaints/:id/update`
- `PATCH /api/complaints/:id/complete`
- `GET /api/dashboard`