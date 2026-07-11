const { z } = require('zod');

const registerPatientSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format (YYYY-MM-DD)' }),
  phone_number: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerPatientSchema,
  loginSchema,
};
