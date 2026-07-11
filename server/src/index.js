const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const authRoutes = require('./api/auth/auth.routes');
const doctorsRoutes = require('./api/doctors/doctors.routes');
const patientsRoutes = require('./api/patients/patients.routes');
const appointmentsRoutes = require('./api/appointments/appointments.routes');
const aiRoutes = require('./api/ai/ai.routes');
const calendarRoutes = require('./api/calendar/calendar.routes');
const prescriptionsRoutes = require('./api/prescriptions/prescriptions.routes');
const usersRoutes = require('./api/users/users.routes');
const analyticsRoutes = require('./api/analytics/analytics.routes');
const globalErrorHandler = require('./common/middleware/error.middleware');
const initCronJobs = require('./jobs/cron');

const app = express();
const PORT = process.env.PORT;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/appointments/:appointmentId', aiRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', prescriptionsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initCronJobs();
});
