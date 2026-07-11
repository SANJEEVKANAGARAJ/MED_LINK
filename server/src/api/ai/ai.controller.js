const aiService = require('./ai.service');
const { successResponse } = require('../../common/utils/response');

class AIController {
  async submitSymptoms(req, res, next) {
    try {
      const summary = await aiService.generatePreVisitSummary(req.params.appointmentId, req.body.symptoms);
      return successResponse(res, 201, 'Symptoms submitted and pre-visit summary generated', summary);
    } catch (error) {
      next(error);
    }
  }

  async submitClinicalNotes(req, res, next) {
    try {
      const { doctor_id, patient_id, clinical_notes } = req.body;
      const result = await aiService.generatePostVisitSummary(req.params.appointmentId, doctor_id, patient_id, clinical_notes);
      return successResponse(res, 201, 'Clinical notes submitted and post-visit summary generated', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
