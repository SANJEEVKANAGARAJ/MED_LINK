const cron = require('node-cron');
const emailQueueService = require('../api/email/emailQueue.service');
const remindersService = require('../api/prescriptions/reminders.service');
const appointmentsService = require('../api/appointments/appointments.service');

const initCronJobs = () => {
  console.log('Initializing background cron jobs...');

  // 1. Process Email Queue (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      await emailQueueService.processEmailQueue();
    } catch (error) {
      console.error('Cron Job Error: Email Queue Processor', error);
    }
  });

  // 2. Process Medication Reminders (Every 10 minutes)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const count = await remindersService.processDueReminders();
      if (count > 0) {
        console.log(`Processed ${count} due medication reminders.`);
      }
    } catch (error) {
      console.error('Cron Job Error: Medication Reminder Processor', error);
    }
  });

  // 3. Clean up expired appointment holds (Every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await appointmentsService.cleanupExpiredHolds();
    } catch (error) {
      console.error('Cron Job Error: Appointment Hold Cleanup', error);
    }
  });

  // 4. Send upcoming appointment reminders (Daily at 8:00 AM)
  cron.schedule('0 8 * * *', async () => {
    try {
      const count = await appointmentsService.sendUpcomingAppointmentReminders();
      if (count > 0) {
        console.log(`Queued ${count} appointment reminders for tomorrow.`);
      }
    } catch (error) {
      console.error('Cron Job Error: Upcoming Appointment Reminders', error);
    }
  });

  console.log('Cron jobs successfully scheduled.');
};

module.exports = initCronJobs;
