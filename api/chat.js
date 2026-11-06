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

  // ONLY use gemini-3.8-flash (the model new projects are required to use)
  const modelName = 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  // Retry up to 3 times to handle "high demand" spikes
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY 
        },
        body: JSON.stringify({ 
          contents: history,
          systemInstruction: systemInstruction
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error?.message || 'Google API Error';
        // If it's a 404 (model not found), don't retry; return immediately
        if (response.status === 404) {
          return res.status(404).json({ error: msg });
        }
        // If it's a 503 (high demand) or 429, wait and retry
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw new Error(msg);
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error('No text returned.');
      
      return res.status(200).json({ reply: aiText });

    } catch (err) {
      if (attempt === 3) {
        return res.status(500).json({ error: err.message });
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}
