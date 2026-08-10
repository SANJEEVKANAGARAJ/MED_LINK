const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      const models = data.models.map(m => m.name.replace('models/', ''));
      console.log('Available Gemini Models:', models.join(', '));
    } else {
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Gemini fetch error:', error.message);
  }
}

checkGemini();
