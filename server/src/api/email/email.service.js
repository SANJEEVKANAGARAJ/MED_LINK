const nodemailer = require('nodemailer');

const isPlaceholder = 
  !process.env.SMTP_HOST || 
  process.env.SMTP_HOST.includes('example.com') || 
  process.env.SMTP_USER === 'your_smtp_username';

let transporter;

if (isPlaceholder) {
  console.log('⚠️ SMTP credentials not configured. Falling back to mock console email transporter.');
  transporter = {
    sendMail: async (options) => {
      console.log('✉️ [Mock Email Sent]');
      console.log(`From: ${options.from}`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body (HTML):\n${options.html}\n----------------------------------`);
      return { messageId: 'mock-message-id-' + Date.now() };
    }
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Reusable sendEmail service
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email body in HTML format
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Healthcare Clinic" <no-reply@healthcareclinic.com>',
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
