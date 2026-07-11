const { z } = require('zod');

const createDoctorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  specialisation: z.string().min(2, 'Specialisation is required'),
  slot_duration_minutes: z.number().int().positive().default(30),
});

const updateDoctorSchema = z.object({
  first_name: z.string().min(2).optional(),
  last_name: z.string().min(2).optional(),
  specialisation: z.string().min(2).optional(),
  slot_duration_minutes: z.number().int().positive().optional(),
});

const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/; // HH:MM:SS format
const availabilitySchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(timeRegex, 'Invalid time format. Use HH:MM:SS'),
    end_time: z.string().regex(timeRegex, 'Invalid time format. Use HH:MM:SS'),
  })
).min(1, 'At least one availability slot is required');

const leaveSchema = z.object({
  leave_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format (YYYY-MM-DD)' }),
});

module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
  availabilitySchema,
  leaveSchema,
};
