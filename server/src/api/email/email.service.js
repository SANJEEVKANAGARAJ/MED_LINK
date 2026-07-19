const nodemailer = require('nodemailer');

/**
 * Detect whether SMTP credentials are missing or still using placeholder values.
 * We only fall back to mock if the critical env vars are absent.
 */
const isPlaceholder =
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS ||
  process.env.SMTP_USER === 'your_smtp_username' ||
  process.env.SMTP_PASS === 'your_smtp_password';

let transporter;

if (isPlaceholder) {
  console.warn(
    '⚠️  SMTP credentials not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing or still using placeholders). ' +
    'Falling back to mock console email transporter. Emails will NOT be delivered.'
  );
  transporter = {
    sendMail: async (options) => {
      console.log('✉️  [Mock Email – NOT delivered]');
      console.log(`  To      : ${options.to}`);
      console.log(`  Subject : ${options.subject}`);
      console.log('  (Set SMTP_HOST, SMTP_USER, SMTP_PASS in server/.env to enable real delivery)');
      return { messageId: 'mock-' + Date.now() };
    },
  };
} else {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  // Port 465 uses implicit TLS (secure: true).
  // Port 587 / 25 use STARTTLS (secure: false with starttls upgrade).
  const useSecure = port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: useSecure,           // false for 587, true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Needed on many cloud hosts that present self-signed certs on loopback / relay servers.
      // For Gmail this is safe to keep false.
      rejectUnauthorized: false,
    },
  });

  // Verify connection at startup so mis-configs surface early in logs
  transporter.verify((err) => {
    if (err) {
      console.error('❌  SMTP connection failed:', err.message);
    } else {
      console.log(`✅  SMTP transporter ready (${process.env.SMTP_HOST}:${port})`);
    }
  });
}

/**
 * Send a single email.
 * @param {{ to: string, subject: string, html: string }} options
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"MedLink" <no-reply@medlink.app>',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message || error);
    throw error;
  }
};

module.exports = { sendEmail };
