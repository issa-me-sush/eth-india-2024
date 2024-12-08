export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  
    const { attempt } = req.body;
  
    try {
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
              "content": `You are a mysterious AI gatekeeper. You present and evaluate riddles. 
              The user gets 3 attempts to solve your riddle. 
              If they're completely wrong, be mysterious and give a cryptic hint.
              If they're close, encourage them.
              If they're correct, congratulate them.
              Keep responses under 50 words.
              Current riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?"`
            },
            {
              "role": "user",
              "content": attempt
            }
          ]
        })
      });
  
      const data = await response.json();
      
      // Simple answer checking (you might want to make this more sophisticated)
      const isCorrect = attempt.toLowerCase().includes('echo');
      
      return res.status(200).json({
        success: isCorrect,
        message: data.choices[0].message.content
      });
  
    } catch (error) {
      console.error('Challenge API Error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }