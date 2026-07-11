const { z } = require('zod');

const submitSymptomsSchema = z.object({
  symptoms: z.string().min(10, 'Please provide more detail about your symptoms'),
});

const submitNotesSchema = z.object({
  doctor_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  clinical_notes: z.string().min(5, 'Clinical notes are required'),
});

module.exports = {
  submitSymptomsSchema,
  submitNotesSchema,
};
