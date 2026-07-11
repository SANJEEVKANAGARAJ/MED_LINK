const { z } = require('zod');

const updatePatientSchema = z.object({
  first_name: z.string().min(2).optional(),
  last_name: z.string().min(2).optional(),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format (YYYY-MM-DD)' }).optional(),
  phone_number: z.string().optional(),
});

const searchPatientSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').optional(),
});

module.exports = {
  updatePatientSchema,
  searchPatientSchema,
};
