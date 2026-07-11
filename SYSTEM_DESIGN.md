# System Design Document - Healthcare Appointment Manager

## 1. Architecture Overview

The Healthcare Appointment Manager is a full-stack web application built on a **three-tier client-server architecture**. The **frontend** is a React (Vite) single-page application that communicates with an **Express.js REST API backend** over HTTP. All persistent state resides in a **PostgreSQL** relational database. The backend is further augmented by external integrations with Google Calendar (OAuth 2.0), Nodemailer SMTP for email delivery, and dual-LLM providers (Gemini as primary, GPT as fallback) for clinical AI features.

The project enforces a **role-based access control (RBAC)** model with three roles (`admin`, `doctor`, and `patient`) implemented via JWT access/refresh tokens. Every API endpoint is guarded by an `authenticate` middleware that verifies the Bearer token, followed by an `authorize` middleware that checks the user's role before granting access.

### Frontend (React + Vite)

The React SPA uses `react-router-dom` for client-side routing, `AuthContext` for global auth state, and `axios` with interceptor-based token management. It is organized into role-specific page directories (`/pages/admin`, `/pages/doctor`, `/pages/patient`) and shared UI components (`DashboardLayout`, `ProtectedRoute`, `GuestRoute`, `CalendarConnect`). Public marketing pages (`Home`, `Product`, `Features`, `Security`, `Privacy`, `Terms`) are served under a `PublicLayout`.

### Backend (Express.js)

The backend follows a **modular, layered architecture** with each domain (`auth`, `appointments`, `doctors`, `patients`, `ai`, `calendar`, `email`, `prescriptions`) encapsulated in its own directory containing four files: `*.routes.js` > `*.controller.js` > `*.service.js` > `*.schema.js` (Zod validation). Cross-cutting concerns live in `common/middleware/` (auth, validation, error handling) and `common/utils/` (JWT helpers, response formatters). Background processing is managed by `node-cron` jobs defined in `jobs/cron.js`.

Security is enforced at the Express level with `helmet` (HTTP headers), `cors` (origin-restricted to `FRONTEND_URL`), `cookie-parser` (secure cookie handling), and `express-rate-limit` (100 requests per 15-minute window per IP on all `/api` routes).

---

## 2. Booking Workflow

The booking process uses a **two-phase hold-then-confirm** pattern:

1. **Slot Discovery**: Patient calls `GET /api/appointments/slots?doctor_id=&date=`. The service checks `doctor_leave` for that date, fetches `doctor_availability` for the day-of-week, generates time slots based on `slot_duration_minutes`, then subtracts already-booked slots (`appointments` where `status != 'cancelled'`) and active holds (`appointment_holds` where `expires_at > NOW()`).

2. **Hold Acquisition**: Patient calls `POST /api/appointments/hold`. Inside a PostgreSQL transaction, the system acquires a `FOR UPDATE` lock on any existing hold for that slot. If a non-expired hold exists, a `409 Conflict` is returned. If no conflict, an `appointment_holds` row is inserted with a **5-minute TTL** (`expires_at`).

3. **Booking Confirmation**: Patient calls `POST /api/appointments` with the same slot data. The service verifies the patient's active hold exists and hasn't expired, deletes the hold, performs a final double-booking check with `FOR UPDATE`, and inserts the appointment. On success, confirmation emails are enqueued for both patient and doctor, and Google Calendar events are created for both users via `calendarService.syncAppointmentForUsers()`.

4. **Reschedule**: `PUT /api/appointments/:id/reschedule` follows the same hold-based pattern. It requires the patient to first hold the new slot, then cancels the old appointment and creates a new one within a single transaction. Calendar events are updated via `calendarService.updateEvent()` and reschedule notification emails are sent.

5. **Cancellation**: `PUT /api/appointments/:id/cancel` verifies RBAC ownership, sets `status = 'cancelled'`, enqueues cancellation emails, and deletes Google Calendar events for both parties.

---

## 3. Concurrency Control & Transactions

The system uses **PostgreSQL transactions with pessimistic locking** to prevent race conditions:

- **Unique Partial Index**: `idx_unique_active_appointment` on `(doctor_id, appointment_date, slot_time) WHERE status != 'cancelled'` acts as a database-level constraint. Even if application-level checks fail, PostgreSQL will reject a duplicate booking with error code `23505`, which the service catches and translates to a `409` response.

- **`SELECT ... FOR UPDATE`**: Both the hold acquisition and booking confirmation flows use `FOR UPDATE` locks. When two concurrent patients attempt to hold the same slot, the first transaction acquires the row lock, and the second blocks until the first commits or rolls back.

- **`FOR UPDATE SKIP LOCKED`**: The medication reminder processor (`reminders.service.js`) uses `SKIP LOCKED` to allow parallel cron runs without processing the same reminder twice.

- **Transaction Isolation**: All multi-step mutations (`holdSlot`, `bookAppointment`, `rescheduleAppointment`, `addLeave`, `createPrescription`) use explicit `BEGIN`/`COMMIT`/`ROLLBACK` blocks with dedicated client connections from the `pg` Pool.

---

## 4. Slot Hold Mechanism

The `appointment_holds` table stores temporary slot reservations with an `expires_at` timestamp set to **5 minutes** from creation. Active holds are treated as unavailable slots during availability queries (they are filtered out alongside booked appointments). Expired holds are cleaned up by a **cron job running every 5 minutes** (`appointmentsService.cleanupExpiredHolds()`), which executes `DELETE FROM appointment_holds WHERE expires_at < NOW()`. A unique index `idx_unique_slot_hold` on `(doctor_id, appointment_date, slot_time)` ensures only one hold per slot at the database level.

---

## 5. Doctor Leave Workflow

When a doctor (or admin) adds a leave via `POST /api/doctors/:id/leave`, the system performs a cascading operation within a single transaction:

1. Inserts a `doctor_leave` record (unique on `doctor_id, leave_date`).
2. Queries all active (non-cancelled) appointments for that doctor on the leave date using `FOR UPDATE` to lock the rows.
3. Bulk-cancels all found appointments by updating their `status` to `'cancelled'`.
4. For each affected appointment, enqueues a leave-notification email to the patient and deletes Google Calendar events for both patient and doctor.

Leave dates are checked at slot-discovery time. If any `doctor_leave` row exists for the requested date, an empty slot array is returned immediately.

---

## 6. Notification System & Email Queue

Rather than sending emails synchronously (which would slow down API responses and risk partial failures), the system uses a **persistent email queue** backed by the `email_queue` table:

- **Enqueue**: `enqueueEmail(to, subject, body)` inserts a row with `status = 'pending'` and `attempts = 0`.
- **Process**: A cron job runs **every minute**, selecting up to 50 emails with `status IN ('pending', 'failed') AND attempts < 3` ordered by `created_at ASC`. For each email, it calls `sendEmail()` via Nodemailer SMTP. On success, status is updated to `'sent'`. On failure, `attempts` is incremented and status is set to `'failed'` (or `'dead'` if `attempts >= 3`), with the error logged in `error_log`.
- **Retry Strategy**: Up to **3 attempts** with the `MAX_ATTEMPTS` constant. Dead-lettered emails (`status = 'dead'`) remain in the table for manual review.
- **Templates**: HTML email templates are generated by `email.templates.js` for booking confirmations, cancellations, reschedules, leave notifications, appointment reminders, and medication reminders.

---

## 7. Calendar Sync (Google Calendar)

The system integrates with Google Calendar via OAuth 2.0 using the `googleapis` library:

- **OAuth Flow**: `GET /api/calendar/auth` generates an authorization URL with `calendar` and `calendar.events` scopes. After user consent, Google redirects to `/api/calendar/callback`, where the refresh token is saved in `user_oauth_tokens`.
- **Event Lifecycle**: On booking, `calendarService.createEvent()` inserts an event into the user's primary calendar and stores the `event_id` in `calendar_sync`. On reschedule, `updateEvent()` modifies the existing event. On cancellation, `deleteEvent()` removes it and cleans up the `calendar_sync` row.
- **Dual-User Sync**: Every booking action syncs events for **both** the patient and the doctor via `syncAppointmentForUsers()`.
- **Graceful Degradation**: All calendar operations are wrapped in try-catch blocks. If a user hasn't connected their Google Calendar (no refresh token exists), the operation is silently skipped without affecting the core booking flow.

---

## 8. AI-Powered Clinical Summaries & Failure Recovery

The `AIService` provides two summarization features:

- **Pre-Visit Summary** (`generatePreVisitSummary`): Accepts raw patient symptoms text and produces an urgency level (`Low`/`Medium`/`High`), chief complaint, and suggested questions for the doctor.
- **Post-Visit Summary** (`generatePostVisitSummary`): Takes the doctor's clinical notes and generates a patient-friendly summary, medication instructions, and follow-up advice. Also marks the appointment as `'completed'`.

### Retry & Fallback Strategy (`executeWithRetryAndFallback`):

1. **Primary**: Gemini with `responseMimeType: 'application/json'` - up to 3 attempts with **exponential backoff** (1s, 2s, 4s).
2. **Fallback**: GPT with `response_format: { type: 'json_object' }` - up to 3 additional attempts with the same backoff.
3. **Absolute Fallback**: If both providers exhaust all retries, a static `AI_SERVICE_UNAVAILABLE` JSON response is returned. The raw symptoms/notes are still saved in the database, so no patient data is lost.

All AI summaries are persisted in the `ai_summaries` table with metadata including `model_used` and `failure_reason` for auditability.

---

## 9. Background Jobs (Cron)

Four `node-cron` scheduled tasks run in the server process:

| Schedule       | Job                           | Description                                                           |
| -------------- | ----------------------------- | --------------------------------------------------------------------- |
| `* * * * *`    | Email Queue Processor         | Processes pending/failed emails from `email_queue` (up to 50 per run) |
| `*/10 * * * *` | Medication Reminder Processor | Sends due medication reminders via `FOR UPDATE SKIP LOCKED`           |
| `*/5 * * * *`  | Expired Hold Cleanup          | Deletes expired rows from `appointment_holds`                         |
| `0 8 * * *`    | Appointment Reminder          | Enqueues reminder emails for appointments booked for the next day     |
