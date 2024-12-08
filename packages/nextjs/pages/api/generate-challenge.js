export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { instructions } = req.body;

    const prompt = instructions || `Generate a unique and engaging challenge that:
1. Has clear winning conditions
2. Can be evaluated objectively
3. Is creative and interesting
4. Has a specific correct answer or solution
5. Is suitable for a tournament setting`;

    const response = await fetch("https://api.red-pill.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REDPILL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-4o",
        "messages": [
          {
            "role": "system",
            "content": "You are a challenge creator for an AI tournament platform. Create engaging, clear, and objectively evaluable challenges."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate challenge from Red Pill API');
    }

    const data = await response.json();
    const generatedChallenge = data.choices[0].message.content;

    res.status(200).json({ challenge: generatedChallenge });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
} 