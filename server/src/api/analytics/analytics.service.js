const db = require('../../db');

class AnalyticsService {
  async getDashboardMetrics() {
    const [doctorsCount, patientsCount, appointmentsStatus] = await Promise.all([
      db.query('SELECT COUNT(*) FROM doctors'),
      db.query('SELECT COUNT(*) FROM patients'),
      db.query(`
        SELECT status, COUNT(*) as count 
        FROM appointments 
        GROUP BY status
      `)
    ]);

    const totalDoctors = parseInt(doctorsCount.rows[0].count, 10);
    const totalPatients = parseInt(patientsCount.rows[0].count, 10);
    
    let totalAppointments = 0;
    const appointmentsByStatus = {};
    
    appointmentsStatus.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      appointmentsByStatus[row.status] = count;
      totalAppointments += count;
    });

    return {
      totalDoctors,
      totalPatients,
      totalAppointments,
      appointmentsByStatus
    };
  }
}

module.exports = new AnalyticsService();
