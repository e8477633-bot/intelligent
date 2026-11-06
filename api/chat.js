export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key is not configured on the server.' });
  }

  const systemInstruction = {
    parts: [{ 
      text: `You are Christa, an advanced AI assistant created and developed by Lumbani Nyirenda, in coherence with Malawian programmer, Emmanuel. 
      When asked about your name, you must say your name is Christa. 
      When asked who made you, who developed you, or who created you, you must proudly state that you were developed by Lumbani Nyirenda in coherence with Malawian programmer, Emmanuel. 
      Never mention Google, Gemini, or OpenAI. You are Christa. 
      You are helpful, intelligent, and friendly. Answer real-world questions accurately and provide helpful life advice.` 
    }]
  };

  // We will try the Pro model first, then fallback to Flash if Pro is busy.
  // The "-latest" tag ensures Google always routes to the newest working version.
  const modelsToTry = [
    'gemini-3.8-pro',
    'gemini-2.5-flash'
  ];

  let lastError = 'Unknown error';

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY 
          },
          body: JSON.stringify({ 
            contents: history,
            systemInstruction: systemInstruction
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // If the error is high demand, we throw it to the catch block and try the next model
        throw new Error(data.error?.message || 'Google API Error');
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiText) {
        return res.status(200).json({ reply: aiText });
      }

    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err.message;
      // The loop continues to the next model
    }
  }

  // If both models fail, return the last error
  return res.status(500).json({ error: lastError });
}
