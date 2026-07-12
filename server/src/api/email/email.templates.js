const getBookingConfirmationTemplate = (patientName, doctorName, date, time) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4CAF50;">Appointment Confirmed!</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment with <strong>${doctorName}</strong> has been successfully booked.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p>Please arrive 10 minutes early. If you need to cancel or reschedule, you can do so from your patient portal.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getReminderTemplate = (patientName, doctorName, date, time) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #2196F3;">Appointment Reminder</h2>
      <p>Dear ${patientName},</p>
      <p>This is a reminder for your upcoming appointment with <strong>${doctorName}</strong>.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p>We look forward to seeing you soon!</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getCancellationTemplate = (patientName, doctorName, date, time) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #F44336;">Appointment Cancelled</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment with <strong>${doctorName}</strong> scheduled for <strong>${date}</strong> at <strong>${time}</strong> has been cancelled.</p>
      <p>If you wish to book another appointment, please visit the portal.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getLeaveNotificationTemplate = (patientName, doctorName, date) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #FF9800;">Important: Appointment Rescheduling Required</h2>
      <p>Dear ${patientName},</p>
      <p>Unfortunately, <strong>${doctorName}</strong> has marked a leave on <strong>${date}</strong>.</p>
      <p>Your appointment on this date has been cancelled. We apologize for the inconvenience.</p>
      <p>Please visit the portal to reschedule your appointment at your earliest convenience.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getRescheduleTemplate = (patientName, doctorName, oldDate, oldTime, newDate, newTime) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #9C27B0;">Appointment Rescheduled</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment with <strong>${doctorName}</strong> has been successfully rescheduled.</p>
      <p><strong>Previous Appointment:</strong> ${oldDate} at ${oldTime}</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #333;">New Appointment Details</h3>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${newDate}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${newTime}</p>
      </div>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getMedicationReminderTemplate = (patientName, medicationName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #00BCD4;">Medication Reminder</h2>
      <p>Dear ${patientName},</p>
      <p>This is a gentle reminder to take your prescribed medication: <strong>${medicationName}</strong>.</p>
      <p>Please remember to take it as prescribed by your doctor to ensure a speedy recovery!</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getPasswordResetTemplate = (resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #FF5722;">Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Please click the link below to reset your password. This link is valid for 1 hour.</p>
      <div style="margin: 20px 0;">
        <a href="${resetLink}" style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </div>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getPrescriptionTemplate = (patientName, doctorName, clinicalNotes, medications) => {
  const medList = (medications || [])
    .map(m => `<li style="margin:4px 0;"><strong>${m.name}</strong> — ${m.dosage || ''} ${m.frequency || ''} for ${m.durationDays || ''} day(s)</li>`)
    .join('');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #16a34a;">📋 New Prescription from Your Doctor</h2>
      <p>Dear ${patientName},</p>
      <p>Dr. <strong>${doctorName}</strong> has written a prescription and clinical notes for your recent consultation.</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16a34a;">
        <h3 style="margin-top: 0; color: #15803d;">Clinical Notes</h3>
        <p style="white-space: pre-wrap;">${clinicalNotes}</p>
      </div>
      ${medList ? `
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #333;">Medications Prescribed</h3>
        <ul style="margin:0; padding-left: 20px;">${medList}</ul>
      </div>` : ''}
      <p>Please follow your doctor's instructions carefully. You can view and purchase medicines from your Patient Portal.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

const getVideoCallApprovedTemplate = (patientName, doctorName, date, time) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #16a34a;">🎥 Your Video Consultation Has Been Approved!</h2>
      <p>Dear ${patientName},</p>
      <p>Great news! Dr. <strong>${doctorName}</strong> has approved your upcoming video consultation.</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16a34a;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p>Please log in to your Patient Portal and join the video room at the scheduled time. You may join up to 10 minutes early.</p>
      <p>Best Regards,<br>Healthcare Clinic</p>
    </div>
  `;
};

module.exports = {
  getBookingConfirmationTemplate,
  getReminderTemplate,
  getCancellationTemplate,
  getLeaveNotificationTemplate,
  getRescheduleTemplate,
  getMedicationReminderTemplate,
  getPasswordResetTemplate,
  getPrescriptionTemplate,
  getVideoCallApprovedTemplate,
};

