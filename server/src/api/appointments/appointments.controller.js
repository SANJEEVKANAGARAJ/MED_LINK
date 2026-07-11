const appointmentsService = require('./appointments.service');
const { successResponse } = require('../../common/utils/response');

class AppointmentsController {
  async getAvailableSlots(req, res, next) {
    try {
      const { doctor_id, date } = req.query;
      const slots = await appointmentsService.getAvailableSlots(doctor_id, date);
      return successResponse(res, 200, 'Available slots fetched successfully', slots);
    } catch (error) {
      next(error);
    }
  }

  async holdSlot(req, res, next) {
    try {
      const hold = await appointmentsService.holdSlot(req.user.id, req.body);
      return successResponse(res, 201, 'Slot held successfully for 5 minutes', hold);
    } catch (error) {
      next(error);
    }
  }

  async bookAppointment(req, res, next) {
    try {
      const appointment = await appointmentsService.bookAppointment(req.user.id, req.body);
      return successResponse(res, 201, 'Appointment booked successfully', appointment);
    } catch (error) {
      next(error);
    }
  }

  async getAppointments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await appointmentsService.getAppointments(req.user.id, req.user.role, page, limit);
      return successResponse(res, 200, 'Appointments fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async cancelAppointment(req, res, next) {
    try {
      const appointment = await appointmentsService.cancelAppointment(req.params.id, req.user.id, req.user.role);
      return successResponse(res, 200, 'Appointment cancelled successfully', appointment);
    } catch (error) {
      next(error);
    }
  }

  async rescheduleAppointment(req, res, next) {
    try {
      const appointment = await appointmentsService.rescheduleAppointment(req.params.id, req.user.id, req.user.role, req.body);
      return successResponse(res, 200, 'Appointment rescheduled successfully', appointment);
    } catch (error) {
      next(error);
    }
  }

  async completeAppointment(req, res, next) {
    try {
      const appointment = await appointmentsService.completeAppointment(req.params.id, req.user.id);
      return successResponse(res, 200, 'Appointment marked as complete', appointment);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentsController();
