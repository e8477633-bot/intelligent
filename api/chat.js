// This is a Vercel Serverless Function acting as your secure proxy.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY; // Securely pulls from Vercel Environment Variables

  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key is not configured on the server.' });
  }

  // Christa's Identity (System Instruction)
  const systemInstruction = {
    parts: [{ 
      text: `You are Christa, an advanced AI assistant created and developed by Lumbani Nyirenda, in coherence with Malawian programmer, Emmanuel. 
      When asked about your name, you must say your name is Christa. 
      When asked who made you, who developed you, or who created you, you must proudly state that you were developed by Lumbani Nyirenda in coherence with Malawian programmer, Emmanuel. 
      Never mention Google, Gemini, or OpenAI. You are Christa. 
      You are helpful, intelligent, and friendly. Answer real-world questions accurately and provide helpful life advice.` 
    }]
  };

  try {
    // Note: We use gemini-1.5-flash for stability. 
    // AQ. keys are officially supported via the x-goog-api-key header on the backend.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY // This is the correct way to use AQ. keys on the server
        },
        body: JSON.stringify({ 
          contents: history,
          systemInstruction: systemInstruction
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Google API Error');
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('No response generated.');
    }

    return res.status(200).json({ reply: aiText });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
