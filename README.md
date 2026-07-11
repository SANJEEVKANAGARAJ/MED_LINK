# Healthcare Appointment and Follow-up Manager

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

🚀 **Live Deployment:** [http://3.109.46.106](http://3.109.46.106) (Deployed on AWS EC2)

A full-stack healthcare appointment platform with three role-based portals (Patient, Doctor, Admin). Patients can search doctors by specialisation, book time slots, and submit symptoms for AI-generated pre-visit summaries. Doctors manage appointments, write clinical notes, and issue prescriptions that trigger AI-generated post-visit summaries. Admins manage doctor profiles, working hours, and leave schedules. The system sends email notifications and syncs with Google Calendar for both parties.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [LLM Prompts](#llm-prompts)
- [Google Calendar Setup](#google-calendar-setup)
- [Background Jobs](#background-jobs)
- [Testing](#testing)
- [Deployment](#deployment)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)

---

## Architecture Overview

The application follows a three-tier client-server architecture:

```
React (Vite) SPA  -->  Express.js REST API  -->  PostgreSQL
                             |
                    +--------+--------+--------+
                    |        |        |        |
                 Gemini   OpenAI  Nodemailer  Google
                 (AI)     (AI)    (Email)     Calendar
```

- **Frontend**: React SPA with Vite, Tailwind CSS, React Query, React Hook Form, and react-router-dom. Organized into role-specific pages (`/pages/admin`, `/pages/doctor`, `/pages/patient`) with shared components.
- **Backend**: Express.js with a modular, layered architecture. Each domain (`auth`, `appointments`, `doctors`, `patients`, `ai`, `calendar`, `email`, `prescriptions`) has its own directory with `routes > controller > service > schema` files.
- **Database**: PostgreSQL with UUID primary keys, foreign key constraints, unique indexes for double-booking prevention, and transactions with pessimistic locking.
- **Auth**: JWT access tokens + refresh tokens, role-based access control (admin, doctor, patient).
- **Security**: Helmet, CORS (origin-restricted), rate limiting (100 req/15 min per IP), Zod input validation, parameterized SQL queries.

---

## Folder Structure

```
healthcare-appointment-manager/
├── client/                          # React frontend
│   └── src/
│       ├── api/                     # Axios API clients
│       │   ├── axios.js             # Axios instance with interceptors
│       │   ├── auth.js              # Auth API calls
│       │   ├── admin.js             # Admin API calls
│       │   ├── doctor.js            # Doctor API calls
│       │   ├── patient.js           # Patient API calls
│       │   └── calendar.js          # Calendar API calls
│       ├── components/              # Shared UI components
│       │   ├── DashboardLayout.jsx  # Dashboard wrapper
│       │   ├── ProtectedRoute.jsx   # Auth guard by role
│       │   ├── GuestRoute.jsx       # Redirect if logged in
│       │   ├── PublicLayout.jsx     # Public pages wrapper
│       │   ├── CalendarConnect.jsx  # Google Calendar connect UI
│       │   └── ui/                  # Reusable UI primitives
│       ├── context/
│       │   └── AuthContext.jsx      # Global auth state
│       ├── pages/
│       │   ├── admin/               # AdminDashboard, DoctorList, DoctorForm, LeaveManagement
│       │   ├── doctor/              # DoctorDashboard, AppointmentVisit
│       │   ├── patient/             # PatientDashboard, SearchDoctors, BookingFlow, AppointmentHistory
│       │   ├── public/              # Product, Features, Security, Privacy, Terms
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Unauthorized.jsx
│       ├── App.jsx                  # Root component with routes
│       └── main.jsx                 # Entry point
│
├── server/                          # Express backend
│   ├── scripts/
│   │   ├── seed-admin.js            # Seed initial admin account
│   │   ├── check-models.js          # Verify LLM API keys
│   │   └── test-concurrency.js      # Manual concurrency test
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth/                # Register, login, logout
│   │   │   ├── appointments/        # Slots, hold, book, cancel, reschedule
│   │   │   ├── doctors/             # CRUD, availability, leave
│   │   │   ├── patients/            # Patient profile
│   │   │   ├── ai/                  # Pre-visit and post-visit summaries
│   │   │   ├── calendar/            # Google Calendar OAuth and sync
│   │   │   ├── email/               # Email service, queue, templates
│   │   │   └── prescriptions/       # Prescriptions and medication reminders
│   │   ├── common/
│   │   │   ├── middleware/           # auth, validation, error handling
│   │   │   ├── utils/               # JWT helpers, response formatters
│   │   │   ├── config/              # App configuration
│   │   │   └── constants/           # Shared constants
│   │   ├── db/
│   │   │   ├── index.js             # PostgreSQL pool connection
│   │   │   ├── schema.sql           # Full database schema
│   │   │   └── setup.js             # DB initialization script
│   │   ├── jobs/
│   │   │   └── cron.js              # Scheduled background jobs
│   │   └── index.js                 # Express app entry point
│   └── tests/
│       ├── unit/                    # Unit tests (Jest)
│       └── integration/             # API integration tests (Supertest)
│
├── .env.example                     # Environment variable template
├── SYSTEM_DESIGN.md                 # System design document
└── README.md
```

---

## Tech Stack

### Frontend

| Package          | Purpose                   |
| ---------------- | ------------------------- |
| React 19         | UI framework              |
| Vite 8           | Build tool and dev server |
| Tailwind CSS 4   | Utility-first styling     |
| React Query      | Server state and caching  |
| React Hook Form  | Form handling             |
| Zod              | Client-side validation    |
| react-router-dom | Client-side routing       |
| axios            | HTTP client               |
| lucide-react     | Icons                     |
| date-fns         | Date formatting           |
| react-hot-toast  | Toast notifications       |

### Backend

| Package            | Purpose                   |
| ------------------ | ------------------------- |
| Express 5          | HTTP framework            |
| pg                 | PostgreSQL driver         |
| bcrypt             | Password hashing          |
| jsonwebtoken       | JWT auth                  |
| zod                | Input validation          |
| @google/genai      | Gemini LLM integration    |
| openai             | OpenAI fallback           |
| googleapis         | Google Calendar API       |
| nodemailer         | Email delivery (SMTP)     |
| node-cron          | Background job scheduling |
| helmet             | HTTP security headers     |
| cors               | Cross-origin config       |
| express-rate-limit | API rate limiting         |
| cookie-parser      | Cookie handling           |

---

## Setup and Installation

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- A Google Cloud project with Calendar API enabled (for calendar sync)
- SMTP credentials (for email delivery)
- API keys for Gemini and/or OpenAI (for AI summaries)

### Steps

1. **Clone the repository**

```bash
git clone https://github.com/rishi-tiwari023/healthcare-appointment-manager
cd healthcare-appointment-manager
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Set up the database**

```bash
# Create a PostgreSQL database
createdb healthcare_db

# Run the schema
psql -d healthcare_db -f server/src/db/schema.sql
```

4. **Install dependencies and start**

```bash
# Backend
cd server
npm install
node scripts/seed-admin.js   # Seed the initial admin account
npm run dev

# Frontend (in a new terminal)
cd client
npm install
npm run dev
```

5. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Backend
PORT=5000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=healthcare_db

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Google Calendar API (OAuth 2.0)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@yourclinic.com

# LLM API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary (Profile Image Uploads)
CLOUDINARY_FOLDER=your_folder_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend
VITE_API_URL=http://localhost:5000/api

# Initial Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=this_is_password

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## Database Schema

The database uses 15 tables organized into six groups:

### ER Diagram

```
┌──────────┐      ┌──────────┐      ┌───────────────────┐
│  users   │──1:1─│ patients │──1:N─│   appointments    │
│          │      └──────────┘      │                   │
│          │──1:1─┌──────────┐──1:N─│ (doctor_id, date, │
│          │      │ doctors  │      │  slot_time)       │
└──────────┘      └──────────┘      └───────────────────┘
                       │                     │
                       │1:N                  │1:1
                       ▼                     ▼
              ┌─────────────────┐   ┌──────────────┐
              │ doctor_         │   │  symptoms    │
              │ availability    │   └──────────────┘
              └─────────────────┘          │
                       │                   │1:1
                       │                   ▼
              ┌─────────────────┐   ┌──────────────┐
              │ doctor_leave    │   │ ai_summaries │
              └─────────────────┘   └──────────────┘

┌───────────────────┐     ┌───────────────────┐
│ appointment_holds │     │  prescriptions    │──1:N─┌─────────────────────┐
│ (temp slot locks) │     │                   │      │ medication_reminders│
└───────────────────┘     └───────────────────┘      └─────────────────────┘

┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│ email_queue  │  │ notifications │  │ calendar_sync│  │ audit_logs   │
└──────────────┘  └───────────────┘  └──────────────┘  └──────────────┘

┌────────────────────┐
│ user_oauth_tokens  │
└────────────────────┘
```

### Key Tables

| Table                | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| users                | Shared auth data (email, password hash, role)           |
| patients             | Patient profile (name, DOB, phone)                      |
| doctors              | Doctor profile (specialisation, slot duration)          |
| doctor_availability  | Working hours per day-of-week (start/end time)          |
| doctor_leave         | Leave dates per doctor                                  |
| appointments         | Booking records (patient, doctor, date, slot, status)   |
| appointment_holds    | Temporary slot locks with expiry timestamp              |
| symptoms             | Raw patient symptoms submitted per appointment          |
| ai_summaries         | Pre-visit and post-visit LLM outputs                    |
| prescriptions        | Doctor-issued prescriptions with medications (JSONB)    |
| medication_reminders | Scheduled reminders derived from prescription frequency |
| notifications        | In-app notification log                                 |
| email_queue          | Outbound emails with status and retry tracking          |
| calendar_sync        | Google Calendar event IDs mapped to appointments        |
| user_oauth_tokens    | Google OAuth refresh tokens per user                    |
| audit_logs           | System-wide change tracking                             |

### Key Constraints

- `idx_unique_active_appointment`: Unique partial index on `(doctor_id, appointment_date, slot_time) WHERE status != 'cancelled'` prevents double booking at the database level.
- `idx_unique_slot_hold`: Unique index on `(doctor_id, appointment_date, slot_time)` ensures only one active hold per slot.

---

## API Documentation

Base URL: `http://localhost:5000/api`

All protected endpoints require: `Authorization: Bearer <access_token>`

### Auth

| Method | Endpoint       | Access | Description         |
| ------ | -------------- | ------ | ------------------- |
| POST   | /auth/register | Public | Register a patient  |
| POST   | /auth/login    | Public | Login (returns JWT) |
| POST   | /auth/logout   | Public | Logout              |

### Doctors

| Method | Endpoint                  | Access        | Description                  |
| ------ | ------------------------- | ------------- | ---------------------------- |
| GET    | /doctors                  | Authenticated | List all doctors             |
| GET    | /doctors/me               | Doctor        | Get own profile              |
| GET    | /doctors/:id              | Authenticated | Get doctor by ID             |
| GET    | /doctors/:id/availability | Authenticated | Get doctor's weekly schedule |
| POST   | /doctors                  | Admin         | Create a doctor profile      |
| PUT    | /doctors/:id              | Admin         | Update doctor profile        |
| DELETE | /doctors/:id              | Admin         | Delete a doctor              |
| POST   | /doctors/:id/availability | Admin/Doctor  | Set weekly availability      |
| GET    | /doctors/:id/leave        | Authenticated | Get doctor's leave dates     |
| POST   | /doctors/:id/leave        | Admin/Doctor  | Add a leave date             |
| DELETE | /doctors/:id/leave/:date  | Admin/Doctor  | Remove a leave date          |

### Appointments

| Method | Endpoint                     | Access  | Description                            |
| ------ | ---------------------------- | ------- | -------------------------------------- |
| GET    | /appointments/slots          | Auth    | Get available slots (doctor_id, date)  |
| GET    | /appointments                | Auth    | Get user's appointments (by role)      |
| POST   | /appointments/hold           | Patient | Hold a slot (5-min TTL)                |
| POST   | /appointments                | Patient | Confirm booking (requires active hold) |
| PUT    | /appointments/:id/cancel     | Auth    | Cancel an appointment                  |
| PUT    | /appointments/:id/reschedule | Auth    | Reschedule (requires new hold)         |

### AI Summaries

| Method | Endpoint                              | Access  | Description                           |
| ------ | ------------------------------------- | ------- | ------------------------------------- |
| POST   | /appointments/:appointmentId/symptoms | Patient | Submit symptoms (pre-visit AI)        |
| POST   | /appointments/:appointmentId/notes    | Doctor  | Submit clinical notes (post-visit AI) |

### Prescriptions

| Method | Endpoint                                   | Access | Description           |
| ------ | ------------------------------------------ | ------ | --------------------- |
| POST   | /appointments/:appointmentId/prescriptions | Doctor | Create a prescription |

### Calendar

| Method | Endpoint             | Access | Description                |
| ------ | -------------------- | ------ | -------------------------- |
| GET    | /calendar/auth       | Auth   | Get Google OAuth URL       |
| GET    | /calendar/callback   | Public | OAuth callback handler     |
| GET    | /calendar/status     | Auth   | Check calendar connection  |
| POST   | /calendar/disconnect | Auth   | Disconnect Google Calendar |

### Health Check

| Method | Endpoint | Access | Description   |
| ------ | -------- | ------ | ------------- |
| GET    | /health  | Public | Server health |

---

## LLM Prompts

The system uses two AI prompts, powered by Gemini (primary) with OpenAI as fallback.

### Pre-Visit Summary Prompt

Triggered when a patient submits symptoms for an appointment:

```
Analyze the following raw patient symptoms: "<symptoms>".

Return a JSON object with the following schema:
{
  "urgency": "Low" | "Medium" | "High",
  "chief_complaint": "string (short summary)",
  "suggested_questions_for_doctor": ["string", "string", "string"]
}
```

### Post-Visit Summary Prompt

Triggered when a doctor submits clinical notes:

```
Analyze the following doctor's clinical notes: "<notes>".
Translate them into patient-friendly language.

Return a JSON object with the following schema:
{
  "patient_friendly_summary": "string",
  "medication_instructions": ["string"],
  "follow_up_advice": "string"
}
```

### Failure Handling

1. Gemini is tried up to 3 times with exponential backoff (1s, 2s, 4s).
2. If Gemini fails, OpenAI is tried up to 3 times with the same backoff.
3. If both fail, a static `AI_SERVICE_UNAVAILABLE` response is returned. Raw data is still saved in the database.

---

## Google Calendar Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Enable the **Google Calendar API** under "APIs & Services".
4. Go to "Credentials" and create an **OAuth 2.0 Client ID** (Web application type).
5. Add `http://localhost:5000/api/calendar/callback` as an authorized redirect URI.
6. Copy the Client ID and Client Secret into your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
   ```
7. In the app, patients and doctors can connect their Google Calendar from their dashboard. Once connected, booking, reschedule, and cancellation actions automatically create, update, or delete calendar events for both parties.

---

## Background Jobs

Four `node-cron` jobs run in the server process:

| Schedule       | Job                           | Description                                                           |
| -------------- | ----------------------------- | --------------------------------------------------------------------- |
| `* * * * *`    | Email Queue Processor         | Processes pending/failed emails from `email_queue` (up to 50 per run) |
| `*/10 * * * *` | Medication Reminder Processor | Sends due medication reminders using `FOR UPDATE SKIP LOCKED`         |
| `*/5 * * * *`  | Expired Hold Cleanup          | Deletes expired rows from `appointment_holds`                         |
| `0 8 * * *`    | Appointment Reminder          | Enqueues reminder emails for appointments scheduled for the next day  |

---

## Testing

The project uses **Jest** for unit tests and **Supertest** for integration tests.

### Run Tests

```bash
cd server
npm run test
```

### Test Coverage

**Unit Tests** (`tests/unit/`):

- `appointments.test.js`: Booking conflict detection, slot hold expiry, leave conflict detection
- `authMiddleware.test.js`: Token validation, missing token, role-based access
- `aiFallback.test.js`: LLM failure with regex fallback

**Integration Tests** (`tests/integration/`):

- `bookingFlow.test.js`: Booking endpoint, concurrent booking conflict
- `authFlow.test.js`: Login success and failure scenarios

---

## Deployment

### Frontend (AWS EC2)

1. Clone the repository on your EC2 instance.
2. Navigate to the `client` directory and install dependencies.
3. Add the environment variable: `VITE_API_URL=/api`
4. Build the project using `npm run build`.
5. Configure Nginx to serve the `client/dist` static files.

### Backend (AWS EC2)

1. Navigate to the `server` directory and install dependencies.
2. Ensure PostgreSQL is installed, and run `node src/db/setup.js` to create the database schema.
3. Configure the `.env` file with your database credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
4. Set the backend port to `PORT=5000` (proxied by Nginx).
5. Update `FRONTEND_URL=http://3.109.46.106`.
6. Update `GOOGLE_REDIRECT_URI=http://3.109.46.106/api/calendar/callback`.
7. Run `node scripts/seed-admin.js` to seed the admin account.
8. Start the backend using PM2: `pm2 start src/index.js --name "healthcare-api"`.

---

## Assumptions

- Each doctor has a single slot duration (e.g., 30 minutes) applied across all their working hours.
- A slot hold expires after 5 minutes if not confirmed.
- The admin account is seeded via `scripts/seed-admin.js` and is not created through the registration flow.
- Only patients can register through the frontend. Doctors are created by the admin.
- Google Calendar sync is optional. If a user has not connected their calendar, booking still works normally.
- Emails are sent via SMTP. The email queue retries up to 3 times before marking an email as dead.
- AI summaries are best-effort. If both LLM providers fail, a fallback message is returned and the raw data is preserved.

---
