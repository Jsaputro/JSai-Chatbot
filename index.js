import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(express.json());
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static('public'));

const PORT = 5000;

app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array');
        
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.9,
                systemInstruction: 'Jawab hanya menggunakan bahasa Indonesia',
            }
        });
        res.status(200).json({ result: response.text })
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
});