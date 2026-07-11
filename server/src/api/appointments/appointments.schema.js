const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

const getSlotsSchema = z.object({
  doctor_id: z.string().uuid('Invalid doctor ID format'),
  date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
});

const bookAppointmentSchema = z.object({
  doctor_id: z.string().uuid('Invalid doctor ID format'),
  appointment_date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
  slot_time: z.string().regex(timeRegex, 'Invalid time format (HH:MM:SS)'),
});

module.exports = {
  getSlotsSchema,
  bookAppointmentSchema,
};
