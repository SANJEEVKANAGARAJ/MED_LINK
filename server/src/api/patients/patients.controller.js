const patientsService = require('./patients.service');
const { successResponse } = require('../../common/utils/response');

class PatientsController {
  async searchPatients(req, res, next) {
    try {
      const patients = await patientsService.searchPatients(req.query.q);
      return successResponse(res, 200, 'Patients fetched successfully', patients);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const patient = await patientsService.getPatientByUserId(req.user.id);
      return successResponse(res, 200, 'Current patient fetched successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  async getPatientById(req, res, next) {
    try {
      const patient = await patientsService.getPatientById(req.params.id);
      return successResponse(res, 200, 'Patient fetched successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  async updatePatient(req, res, next) {
    try {
      const patient = await patientsService.updatePatient(req.params.id, req.body);
      return successResponse(res, 200, 'Patient updated successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  async getPatientHistory(req, res, next) {
    try {
      const history = await patientsService.getPatientHistory(req.params.id);
      return successResponse(res, 200, 'Patient medical history fetched successfully', history);
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentSymptoms(req, res, next) {
    try {
      const data = await patientsService.getAppointmentSymptomsForDoctor(req.params.appointmentId);
      return successResponse(res, 200, 'Appointment symptoms fetched successfully', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientsController();
