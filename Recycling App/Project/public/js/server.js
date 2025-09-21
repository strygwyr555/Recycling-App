require('dotenv').config({ path: './API.env' });
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/chatgpt', async (req, res) => {
    const { imageUrl } = req.body;
    const prompt = `Identify the recyclable item in this image: ${imageUrl}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100
        })
    });
    const data = await response.json();
    res.json(data);
});

app.listen(3001, () => console.log('Server running on port 3001'));