const db = require('../../db');
const { sendEmail } = require('./email.service');

const MAX_ATTEMPTS = 3;

/**
 * Enqueue an email to be sent asynchronously
 */
const enqueueEmail = async (toEmail, subject, body) => {
  const query = `
    INSERT INTO email_queue (to_email, subject, body, status, attempts)
    VALUES ($1, $2, $3, 'pending', 0)
    RETURNING id
  `;
  const values = [toEmail, subject, body];
  
  try {
    const result = await db.query(query, values);
    console.log(`Email enqueued with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error enqueueing email:', error);
    throw error;
  }
};

/**
 * Process the email queue, retrying failed emails up to MAX_ATTEMPTS
 */
const processEmailQueue = async () => {
  console.log('Starting email queue processing...');
  
  const selectQuery = `
    SELECT id, to_email, subject, body, attempts
    FROM email_queue
    WHERE status IN ('pending', 'failed') AND attempts < $1
    ORDER BY created_at ASC
    LIMIT 50
  `;
  
  try {
    const result = await db.query(selectQuery, [MAX_ATTEMPTS]);
    const emails = result.rows;
    
    if (emails.length === 0) {
      console.log('No emails to process in the queue.');
      return;
    }

    console.log(`Processing ${emails.length} emails...`);

    for (const email of emails) {
      const newAttemptCount = email.attempts + 1;
      
      try {
        await sendEmail({
          to: email.to_email,
          subject: email.subject,
          html: email.body,
        });
        
        const successQuery = `
          UPDATE email_queue
          SET status = 'sent', attempts = $1, last_attempt_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `;
        await db.query(successQuery, [newAttemptCount, email.id]);
        console.log(`Email ID ${email.id} sent successfully.`);

      } catch (sendError) {
        const newStatus = newAttemptCount >= MAX_ATTEMPTS ? 'dead' : 'failed';
        const errorLog = sendError.message || JSON.stringify(sendError);
        
        const failureQuery = `
          UPDATE email_queue
          SET status = $1, attempts = $2, last_attempt_at = NOW(), error_log = $3, updated_at = NOW()
          WHERE id = $4
        `;
        await db.query(failureQuery, [newStatus, newAttemptCount, errorLog, email.id]);
        
        console.error(`Email ID ${email.id} failed to send. Status set to '${newStatus}'. Error: ${errorLog}`);
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
};

module.exports = {
  enqueueEmail,
  processEmailQueue,
};
