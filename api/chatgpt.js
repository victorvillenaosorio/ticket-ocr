export default async function handler(req, res) {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'user',
                    content: req.body.content
                }
            ],
            max_tokens: 1000
        })
    });

    const data = await response.json();
    res.status(200).json(data);
}
