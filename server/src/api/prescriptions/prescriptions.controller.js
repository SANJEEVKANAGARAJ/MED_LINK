const prescriptionsService = require('./prescriptions.service');

class PrescriptionsController {
  async createPrescription(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const { doctorId, patientId, clinicalNotes, medications } = req.body;

      if (!doctorId || !patientId || !clinicalNotes || !medications) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const prescription = await prescriptionsService.createPrescription(
        appointmentId,
        doctorId,
        patientId,
        clinicalNotes,
        medications
      );

      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PrescriptionsController();
