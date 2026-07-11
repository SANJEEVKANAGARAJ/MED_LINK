const { GoogleGenAI } = require('@google/genai');
const db = require('../../db');

class AIService {
  constructor() {
    this._geminiClient = null;
  }

  get geminiClient() {
    if (!this._geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : undefined;
      const options = apiKey ? { apiKey } : {};
      this._geminiClient = new GoogleGenAI(options);
    }
    return this._geminiClient;
  }

  async executeWithRetryAndFallback(promptText, schemaPrompt, retries = 3) {
    let lastError = null;

    // Try Gemini only
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: promptText + '\n\n' + schemaPrompt,
        });
        
        let responseText = response.text;
        if (!responseText) {
          throw new Error('Empty response received from Gemini');
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
        }
        return JSON.parse(responseText);
      } catch (error) {
        lastError = error;
        console.warn(`Gemini attempt ${i + 1} failed: ${error.message}`);
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000)); // Exponential backoff
        }
      }
    }

    console.error(`Gemini execution failed completely. Last error: ${lastError ? lastError.message : 'Unknown'}`);
    
    // Return null to signify failure to obtain AI response, allowing caller to use high-quality local fallback
    return null;
  }

  async generatePreVisitSummary(appointmentId, symptomsRaw) {
    const promptText = `Analyze the following raw patient symptoms: "${symptomsRaw}".`;
    const schemaPrompt = `Return a JSON object with the following schema:
    {
      "urgency": "Low" | "Medium" | "High",
      "chief_complaint": "string (short summary)",
      "suggested_questions_for_doctor": ["string", "string", "string"]
    }`;

    let summaryData = null;
    try {
      summaryData = await this.executeWithRetryAndFallback(promptText, schemaPrompt);
    } catch (err) {
      console.error('Error during AI pre-visit generation:', err);
    }

    // High quality local fallback if AI is unavailable or fails schema
    if (!summaryData || !summaryData.urgency || !summaryData.chief_complaint) {
      const symptomsLower = (symptomsRaw || '').toLowerCase();
      let urgency = 'Low';
      if (symptomsLower.includes('severe') || symptomsLower.includes('chest pain') || symptomsLower.includes('breathing') || symptomsLower.includes('bleeding') || symptomsLower.includes('heart')) {
        urgency = 'High';
      } else if (symptomsLower.includes('fever') || symptomsLower.includes('pain') || symptomsLower.includes('cough') || symptomsLower.includes('vomiting') || symptomsLower.includes('headache')) {
        urgency = 'Medium';
      }

      summaryData = {
        urgency,
        chief_complaint: symptomsRaw && symptomsRaw.trim() ? (symptomsRaw.length > 80 ? symptomsRaw.substring(0, 80) + '...' : symptomsRaw.trim()) : 'Symptom check-in completed',
        suggested_questions_for_doctor: [
          'How long have you been experiencing these symptoms?',
          'Have you taken any medication or treatments for this?',
          'Are there other associated symptoms you\'ve noticed?'
        ]
      };
    }

    await db.query(
      `INSERT INTO ai_summaries (appointment_id, summary_type, urgency_level, chief_complaint, suggested_questions) VALUES ($1, 'pre_visit', $2, $3, $4) RETURNING *`,
      [appointmentId, summaryData.urgency, summaryData.chief_complaint, JSON.stringify(summaryData.suggested_questions_for_doctor)]
    );

    return summaryData;
  }

  async generatePostVisitSummary(appointmentId, doctorId, patientId, clinicalNotes) {
    const promptText = `Analyze the following doctor's clinical notes: "${clinicalNotes}". Translate them into patient-friendly language.`;
    const schemaPrompt = `Return a JSON object with the following schema:
    {
      "patient_friendly_summary": "string",
      "medication_instructions": ["string"],
      "follow_up_advice": "string"
    }`;

    let summaryData = null;
    try {
      summaryData = await this.executeWithRetryAndFallback(promptText, schemaPrompt);
    } catch (err) {
      console.error('Error during AI post-visit generation:', err);
    }

    // High quality local fallback if AI is unavailable or fails schema
    if (!summaryData || !summaryData.patient_friendly_summary) {
      summaryData = {
        patient_friendly_summary: `Your consultation summary: ${clinicalNotes}`,
        medication_instructions: [
          'Take any prescribed medication as directed.',
          'Review instruction labels on medication packaging.'
        ],
        follow_up_advice: 'If your symptoms do not improve, please schedule a follow-up visit.'
      };
    }

    await db.query(
      `INSERT INTO ai_summaries (appointment_id, summary_type, patient_friendly_summary, medication_schedule, follow_up_instructions) VALUES ($1, 'post_visit', $2, $3, $4) RETURNING *`,
      [appointmentId, summaryData.patient_friendly_summary, JSON.stringify(summaryData.medication_instructions), summaryData.follow_up_advice]
    );

    await db.query(
      `UPDATE appointments SET status = 'completed' WHERE id = $1`,
      [appointmentId]
    );

    return summaryData;
  }
}

module.exports = new AIService();
