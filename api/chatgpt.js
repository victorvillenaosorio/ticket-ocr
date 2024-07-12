//import fetch from 'node-fetch';
//import dotenv from 'dotenv';
/* import express from 'express';
import bodyParser from 'body-parser'; */

//dotenv.config();

export default async function handler(req, res) {
//const handler = async (req, res) => {
    try {
        const openaiApiKey = process.env.OPENAI_API_KEY;

        console.log('Received request:', req.body);

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

        if (!response.ok) {
            throw new Error(`OpenAI API returned status code ${response.status}`);
        }

        const data = await response.json();

        console.log('OpenAI API response:', data);

        res.status(200).json(data);
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ error: error.message });
    }
};

//export default handler;

// If running locally, start an Express server
/* if (process.argv.includes('local')) {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(bodyParser.json());
    app.use(express.static('public'));

    app.post('/api/chatgpt', handler);

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
} */
