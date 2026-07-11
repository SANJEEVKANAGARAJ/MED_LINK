const doctorsService = require('./doctors.service');
const { successResponse } = require('../../common/utils/response');

class DoctorsController {
  async getAllDoctors(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await doctorsService.getAllDoctors(page, limit);
      return successResponse(res, 200, 'Doctors fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getDoctorById(req, res, next) {
    try {
      const doctor = await doctorsService.getDoctorById(req.params.id);
      return successResponse(res, 200, 'Doctor fetched successfully', doctor);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const doctor = await doctorsService.getDoctorByUserId(req.user.id);
      return successResponse(res, 200, 'Doctor profile fetched successfully', doctor);
    } catch (error) {
      next(error);
    }
  }

  async createDoctor(req, res, next) {
    try {
      const doctor = await doctorsService.createDoctor(req.body);
      return successResponse(res, 201, 'Doctor created successfully', doctor);
    } catch (error) {
      next(error);
    }
  }

  async updateDoctor(req, res, next) {
    try {
      const doctor = await doctorsService.updateDoctor(req.params.id, req.body);
      return successResponse(res, 200, 'Doctor updated successfully', doctor);
    } catch (error) {
      next(error);
    }
  }

  async deleteDoctor(req, res, next) {
    try {
      await doctorsService.deleteDoctor(req.params.id);
      return successResponse(res, 200, 'Doctor deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req, res, next) {
    try {
      const schedule = await doctorsService.getAvailability(req.params.id);
      return successResponse(res, 200, 'Availability fetched successfully', schedule);
    } catch (error) {
      next(error);
    }
  }

  async setAvailability(req, res, next) {
    try {
      await doctorsService.setAvailability(req.params.id, req.body);
      return successResponse(res, 200, 'Availability updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLeave(req, res, next) {
    try {
      const leaves = await doctorsService.getLeave(req.params.id);
      return successResponse(res, 200, 'Leaves fetched successfully', leaves);
    } catch (error) {
      next(error);
    }
  }

  async addLeave(req, res, next) {
    try {
      await doctorsService.addLeave(req.params.id, req.body.leave_date);
      return successResponse(res, 201, 'Leave added successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeLeave(req, res, next) {
    try {
      await doctorsService.removeLeave(req.params.id, req.params.date);
      return successResponse(res, 200, 'Leave removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DoctorsController();
