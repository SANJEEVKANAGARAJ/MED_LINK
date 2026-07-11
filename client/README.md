# Healthcare Appointment Manager - Client

The frontend client for the Healthcare Appointment Manager, built as a Single Page Application (SPA) using React and Vite.

## Tech Stack
- **Core:** React 18, Vite, React Router v6
- **Styling:** Tailwind CSS, Lucide React
- **Forms & Validation:** React Hook Form, Zod
- **Networking:** Axios (with interceptors for JWT auth)
- **Data Visualization:** Recharts
- **Utils:** date-fns, react-hot-toast

## Key Features
- **Role-Based Portals:** Three distinct dashboard layouts for Patients, Doctors, and Admins with protected routing and role checks.
- **Admin Analytics:** Interactive charts built with `recharts` to visualize real-time platform statistics (patients, doctors, appointments).
- **Secure Authentication:** Client-side JWT management. An Axios interceptor automatically attaches tokens to requests and handles 401 unauthorized redirects.
- **Smart Forms:** Strict client-side form validation for authentication, booking flows, leave management, and clinical notes using Zod schemas.
- **Calendar Integration:** Dedicated UI component (`CalendarConnect.jsx`) for managing Google Calendar OAuth 2.0 connections.
- **Production Ready:** Includes `vercel.json` for proper SPA route rewrites. Fully linted via `oxlint`.

## Local Development

```bash
# Install dependencies
npm install

# Start the Vite dev server
npm run dev

# Run the linter
npm run lint
```
