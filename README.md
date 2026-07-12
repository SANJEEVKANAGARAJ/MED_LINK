# Healthcare Appointment and Follow-up Manager

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

🚀 **Live Deployment:** [http://3.109.46.106](http://3.109.46.106) (Deployed on AWS EC2)

A full-stack healthcare appointment and checkout platform with four portal interfaces (Patient, Doctor, Admin, Pharmacy). Patients can search doctors, book slots via a secure hold-and-checkout lock, pay with Stripe, submit symptoms for AI pre-visit summaries, and buy prescribed medicines directly from pharmacies. Doctors manage schedules, conduct secure Jitsi WebRTC video consultations, write notes, and issue prescriptions with automated medication reminders. Pharmacies manage medicine inventories and ship patient orders. The system handles dual Google Calendar syncs and background email notifications.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [LLM Prompts & Fallbacks](#llm-prompts--fallbacks)
- [Google Calendar Setup](#google-calendar-setup)
- [Background Jobs](#background-jobs)
- [Testing](#testing)
- [Deployment](#deployment)
- [Assumptions](#assumptions)

---

## Architecture Overview

The application follows a three-tier client-server architecture:

```
           React (Vite) Client SPA (Admin, Patient, Doctor, Pharmacy Portals)
                                         |
                                         | (HTTPS REST Requests & WebRTC)
                                         v
                                Express.js REST API
                                         |
                       +-----------------+-----------------+-----------------+
                       |                 |                 |                 |
                  PostgreSQL          Stripe          Gemini AI         Google Calendar
               (Relational DB)     (Payments)      (Clinical Logs)     (Two-way Sync)
```

* **Frontend**: React Single-Page Application (SPA) compiled with Vite, styled with Tailwind CSS, using React Query for server states, React Hook Form, and `react-router-dom` client-side routes.
* **Backend**: Express.js with a modular, domain-driven API structure. All routes are secured with JWT access/refresh tokens, Zod validation schemas, rate limiting, and global error middleware.
* **Database**: PostgreSQL connection pooled via `pg`, managing persistent states, unique constraints for slot concurrency, and self-healing tables initialization on boot.
* **Integrations**:
  * **Stripe Checkout**: Handles patient session redirects and async webhook fulfillment.
  * **Google Calendar API**: Synchronizes events for both doctors and patients using OAuth refresh tokens.
  * **Jitsi Meet API**: Facilitates WebRTC audio-video telehealth communication rooms.
  * **Google Gemini AI**: Parses symptoms and summarizes clinical doctor notes into patient-friendly formats.

---

## Folder Structure

```
healthcare-appointment-manager/
├── client/                          # React frontend
│   └── src/
│       ├── api/                     # Axios API client callers
│       │   ├── axios.js             # Axios instance & JWT interceptors
│       │   ├── auth.js              # Identity API
│       │   ├── admin.js             # Doctor & Pharmacy controls
│       │   ├── doctor.js            # Consultations & Prescription endpoints
│       │   ├── patient.js           # Bookings, payments & reviews
│       │   └── calendar.js          # Calendar sync actions
│       ├── components/              # Shared UI components
│       │   ├── DashboardLayout.jsx  # Frame wrapper for sidebar & navbar
│       │   ├── ProtectedRoute.jsx   # Role-based path authorization guard
│       │   ├── GuestRoute.jsx       # Auth redirect for anonymous users
│       │   ├── PublicLayout.jsx     # Marketing page layout
│       │   └── CalendarConnect.jsx  # OAuth sync trigger
│       ├── context/
│       │   └── AuthContext.jsx      # Global React auth state context
│       ├── pages/
│       │   ├── admin/               # AdminDashboard, DoctorForms, LeaveManagement, Pharmacies
│       │   ├── doctor/              # DoctorDashboard, AppointmentVisit (clinical notes)
│       │   ├── patient/             # PatientDashboard, DoctorSearch, BookingFlow, Marketplace
│       │   ├── pharmacy/            # PharmacyDashboard, PharmacyLogin
│       │   ├── shared/              # TelehealthRoom (Jitsi video conferencing)
│       │   ├── public/              # Product, Features, Security, Privacy, Terms
│       │   ├── Home.jsx             # Main marketing index
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Unauthorized.jsx
│       ├── App.jsx                  # Main client routing declarations
│       └── main.jsx                 # Client bootstrapping script
│
├── server/                          # Express backend
│   ├── scripts/
│   │   ├── seed-admin.js            # Initial administrator seeder
│   │   ├── check-models.js          # AI keys health test
│   │   └── test-concurrency.js      # Booking concurrency stress tester
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth/                # Identity creation, login & sessions
│   │   │   ├── appointments/        # Bookings engine, holds, slots calculations
│   │   │   ├── doctors/             # Doctor metadata, leaves & availability
│   │   │   ├── patients/            # Patient profile files
│   │   │   ├── ai/                  # Gemini summaries & clinical parsing
│   │   │   ├── calendar/            # OAuth redirects & calendar mappings
│   │   │   ├── email/               # Queuing systems & HTML templates
│   │   │   ├── prescriptions/       # Doctor prescriptions & medication reminders
│   │   │   ├── payments/            # Stripe sessions & webhook fulfillment
│   │   │   ├── reviews/             # Feedback stars & comments
│   │   │   └── pharmacy/            # Medicine stock, catalog & order status
│   │   ├── common/
│   │   │   ├── middleware/          # Security filters & body verification
│   │   │   └── utils/               # Token signing & formatting helpers
│   │   ├── db/
│   │   │   ├── index.js             # Pg-pool driver, migrations runner & seeds
│   │   │   ├── schema.sql           # Master DDL tables schema
│   │   │   └── setup.js             # Standalone migrations executor
│   │   ├── jobs/
│   │   │   └── cron.js              # Background scheduler script
│   │   └── index.js                 # App runner and core middlewares
│   └── tests/
│       ├── unit/                    # Core modules testing
│       └── integration/             # End-to-end API logic verification
│
├── .env.example                     # Environment schema example
├── SYSTEM_DESIGN.md                 # Technical workflow specification
└── README.md
```

---

## Tech Stack

### Frontend Dependencies
* **React 19 & React-DOM**: Framework rendering engine.
* **Vite 8**: Frontend bundling and hot-reloading dev server.
* **Tailwind CSS 4**: Utility styling engine.
* **React Query 5**: Cache synchronizer for backend API states.
* **React Hook Form**: Form inputs handler.
* **React Router DOM**: Client navigation controller.
* **Recharts**: Patient appointment/prescriptions analytics metrics.
* **React-PDF Resolver**: Patient prescription PDF generation engine.
* **Axios**: Promised API fetch caller.

### Backend Dependencies
* **Express 5**: Node framework.
* **pg**: PostgreSQL client pool manager.
* **stripe**: Merchant payment integration tool.
* **@google/genai**: Gemini 2.5 generative intelligence client.
* **googleapis**: Calendar events synchronization agent.
* **nodemailer**: Outbox email handler.
* **bcrypt & jsonwebtoken**: User authentication security.
* **node-cron**: Scheduled background runners.
* **zod**: Request payload checker.
* **helmet, cors & express-rate-limit**: Server protection tools.

---

## Setup and Installation

### Prerequisites
* **Node.js (v18+)** & **npm**
* **PostgreSQL (v14+)** running locally or in a cloud instance
* **Stripe Developer Account** (API credentials)
* **Google Cloud Account** (OAuth Consent screen, Calendar API enabled)
* **Gemini API Key** (or fallback keys)
* **SMTP Credentials** (Gmail App password, Mailtrap, or Sendgrid)

### Installation Steps

1. **Clone the project workspace**
   ```bash
   git clone https://github.com/rishi-tiwari023/healthcare-appointment-manager
   cd healthcare-appointment-manager
   ```

2. **Set up configurations**
   ```bash
   # Create server configuration
   cp server/.env.example server/.env
   # Modify values in server/.env with your Stripe, Google, and Database configs.
   ```

3. **Initialize the database**
   ```bash
   # Log into psql and create the database
   createdb healthcare_db
   
   # Setup structure via standard schema script
   psql -d healthcare_db -f server/src/db/schema.sql
   ```

4. **Install & boot servers**
   ```bash
   # Boot Backend
   cd server
   npm install
   node scripts/seed-admin.js   # Seed initial administrator profile
   npm run dev                  # Starts server (defaults to port 5000)
   
   # Boot Frontend (In a separate terminal tab)
   cd client
   npm install
   npm run dev                  # Launches Vite client (defaults to port 5173)
   ```

---

## Environment Variables

Modify `/server/.env` using the fields listed below:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=healthcare_db

# Stripe Gateway
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CONSULTATION_FEE_USD=50

# Authentication Keys
JWT_SECRET=your_jwt_signing_key
JWT_REFRESH_SECRET=your_refresh_signing_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth Setup
GOOGLE_CLIENT_ID=google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=google_secret_key
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

# Email Outbox Settings
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=smtp_username
SMTP_PASS=smtp_password
EMAIL_FROM=appointments@yourclinic.com

# AI API
GEMINI_API_KEY=gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Initial Admin profile
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

---

## Database Schema

```
              ┌───────────┐         ┌───────────┐         ┌──────────────┐
              │   users   │───1:1───│ patients  │───1:N───│ appointments │
              │           │         └───────────┘         │              │
              │ (admin,   │───1:1───┌───────────┐───1:N───│ (doctor,     │
              │  doctor,  │         │  doctors  │         │  date, slot) │
              │  patient) │         └───────────┘         └──────────────┘
              └───────────┘               │                      │
                                          │1:N                   │1:1
                                          ▼                      ▼
                                 ┌─────────────────┐    ┌──────────────┐
                                 │ doctor_leaves   │    │   symptoms   │
                                 └─────────────────┘    └──────────────┘
                                                                 │
                                                                 │1:1
                                                                 ▼
┌───────────────────┐    ┌─────────────────┐            ┌──────────────┐
│ appointment_holds │    │  prescriptions  │───1:N─────▶│ ai_summaries │
│ (temp locks)      │    │ (medications    │            └──────────────┘
└───────────────────┘    │  JSONB)         │
                         └─────────────────┘
                                  │
                                  │1:N
                                  ▼
                         ┌─────────────────┐
                         │   medication_   │
                         │   reminders     │
                         └─────────────────┘

┌───────────────┐  ┌──────────────────┐  ┌───────────────┐  ┌──────────────┐
│  email_queue  │  │ payment_sessions │  │ doctor_reviews│  │ calendar_sync│
└───────────────┘  └──────────────────┘  └───────────────┘  └──────────────┘

┌───────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│  pharmacies   │  │ pharmacy_medicines  │  │ pharmacy_orders │
└───────────────┘  └─────────────────────┘  └─────────────────┘
```

### Table Relations and Concurrency Constraints
* **`idx_unique_active_appointment`**: A PostgreSQL partial unique index on `appointments (doctor_id, appointment_date, slot_time) WHERE status != 'cancelled'`. This prevents race-condition booking confirmations.
* **`idx_unique_slot_hold`**: Unique index on `appointment_holds (doctor_id, appointment_date, slot_time)` to block concurrent holds for the same slot.
* **`doctor_reviews`**: Collects rating levels (1 to 5 stars) and reviews mapped to completed appointments.
* **`payment_sessions`**: Connects appointment intents to Stripe Checkout sessions.
* **`pharmacies` & `pharmacy_medicines`**: Houses drugstore user accounts, inventories, pricing indices, and medication sales.
* **`pharmacy_orders`**: Prescriptions mapped to orders containing JSONB delivery history logs.

---

## API Documentation

Base Endpoint: `http://localhost:5000/api` (secured via JWT Headers: `Authorization: Bearer <access_token>`)

### Auth & User Portals
* `POST /auth/register` - Create patient user profile.
* `POST /auth/login` - Returns Access and Refresh tokens. Sets cookies.
* `POST /auth/logout` - Disposes token cookies.
* `GET /users/me` - Profile card data.

### Doctor Schedules & Leaves
* `GET /doctors` - Directory search.
* `POST /doctors` - Create doctor profile (Admin only).
* `GET /doctors/:id/availability` - Weekly hours check.
* `POST /doctors/:id/availability` - Modify working intervals.
* `POST /doctors/:id/leave` - Cancel all active slots on a specific date, trigger notification mails, and remove Google Calendar events.

### Bookings & Concurrency
* `GET /appointments/slots?doctor_id=X&date=Y` - Free slot list calculations.
* `POST /appointments/hold` - Claims a 5-minute hold on a slot.
* `POST /appointments` - Checks active hold status and commits appointment creation.
* `PUT /appointments/:id/cancel` - Cancel appointment and free slots.
* `PUT /appointments/:id/reschedule` - Swaps active bookings with slot validation.

### Payments
* `POST /payments/create-session` - Creates Stripe Checkout Session for patient consultation fees.
* `GET /payments/verify` - Processes card transaction states and confirms slot holds.
* `POST /payments/webhook` - Standard Stripe signature webhook validating checkout status.

### Clinical AI & Telehealth
* `POST /appointments/:appointmentId/symptoms` - Submit symptoms to trigger a pre-visit summary.
* `POST /appointments/:appointmentId/notes` - Add notes to trigger a post-visit patient summary and prescription.
* `GET /telehealth/:appointmentId` - Video consultation access check (WebRTC).
* `POST /reviews` - Consultation review form submission.

### Pharmacy & Marketplace
* `POST /pharmacy/login` - Login to pharmacy dashboard.
* `GET /marketplace/medicines` - Global directory of available medicines.
* `GET /marketplace/medicines/:name` - Search pharmacies stocking a medicine, sorted cheapest first.
* `GET /pharmacy/orders` - Pharmacy review queue of patient orders.
* `PUT /pharmacy/orders/:orderId` - Update delivery status (pending, confirmed, dispatched, out_for_delivery, delivered) and write JSONB tracking updates.

---

## LLM Prompts & Fallbacks

Clinical summaries are generated automatically via **Google Gemini AI** (using `gemini-2.5-flash` primary model).

### Pre-Visit Prompt
```json
// Prompt: Analyze the raw patient symptoms: "<symptoms>"
{
  "urgency": "Low" | "Medium" | "High",
  "chief_complaint": "concise symptoms overview",
  "suggested_questions_for_doctor": ["question 1", "question 2"]
}
```

### Post-Visit Prompt
```json
// Prompt: Translate the clinical doctor notes: "<notes>"
{
  "patient_friendly_summary": "plain English explanation",
  "medication_instructions": ["medication instruction line 1"],
  "follow_up_advice": "follow up checklist text"
}
```

### Fallback Infrastructure
* If the Gemini client encounters API limits or connection errors, the backend applies an **exponential backoff** retry up to 3 times.
* If it fails completely, a **local fallback parser** is triggered. It uses regex key terms (e.g. *chest pain*, *bleeding*, *fever*) to determine urgency levels, and populates baseline diagnostic guidelines so that no patient records are lost.

---

## Background Jobs

Four background processes are run via `node-cron`:

1. **Email Queue Processor (`* * * * *`)**: Processes the outbox mail database every minute, sending SMTP notifications and backing off failed attempts.
2. **Medication Reminder Dispatcher (`*/10 * * * *`)**: Processes medication alarms due for delivery using `FOR UPDATE SKIP LOCKED` database locks to prevent duplication.
3. **Expired Hold Cleanup (`*/5 * * * *`)**: Runs every 5 minutes to clean up expired temporary slot locks (`expires_at < NOW()`).
4. **Appointment Reminder (`0 8 * * *`)**: Runs daily at 8:00 AM to notify patients of appointments booked for the next day.

---

## Testing

Ensure PostgreSQL test configurations are loaded. Execute tests using Jest:

```bash
cd server
npm run test
```

Test coverage includes:
* **Unit Tests**: Hold locks, scheduler calculations, database uniqueness indices, and local fallback parsing validation.
* **Integration Tests**: Concurrent booking checks, login paths, and token auth logic.

---

## Deployment

### EC2 / Production Deployment Notes
1. **Assets & Dist**: Build React production bundles via `npm run build` in the `/client` workspace and serve with Nginx.
2. **Nginx Reverse Proxy**: Route `/api` calls to port `5000` (Node server instance).
3. **PM2 Setup**: Start server using PM2 process manager:
   ```bash
   pm2 start src/index.js --name "healthcare-api"
   ```

---

## Assumptions

* **Weekly Availability**: Doctor weekly hours follow recurring configurations mapped out inside `doctor_availability` table.
* **Single slot duration**: A slot duration defaults to 30 minutes.
* **Google OAuth Credentials**: Disconnect status defaults gracefully without error if keys are missing.
* **Email sending**: Backed by a retry attempt ceiling limit of 3.
* **Stripe Webhook**: Secure checkout requires a configured `STRIPE_WEBHOOK_SECRET` variable in server environment settings.
