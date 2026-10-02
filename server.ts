import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Audio Transcription route using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Missing audioData parameter' });
    }

    // Call gemini-3.5-transcribe model
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioData,
              mimeType: mimeType,
            },
          },
          {
            text: 'Transcribe the spoken audio verbatim. Preserve spoken words, false starts, and repetitions without adding conversational commentary.',
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    res.json({ transcript });
  } catch (error: any) {
    console.error('[API] /api/transcribe error:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

// Deep AI Speech & Voice Coach 31-step report generation
app.post('/api/speech-coach-report', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { audioData, mimeType = 'audio/webm', transcript, targetText, childName, grade } = req.body;

    const parts: any[] = [];
    if (audioData) {
      parts.push({
        inlineData: {
          data: audioData,
          mimeType: mimeType,
        },
      });
    }

    const promptText = `
You are ReadBuddy's advanced AI Speech & Voice Coach.
Your task is to deeply analyze the user's speech audio recording and provide an evidence-based, highly specific speech-performance report.

Recording Context:
Target Reading Passage: "${targetText || 'General Oral Reading Practice'}"
Speaker / Child: "${childName || 'Student'}" (Grade: ${grade || 'CBSE Class 6'})
${transcript ? `Transcribed Spoken Text: "${transcript}"` : ''}

You are simultaneously acting as:
1. Speech Coach
2. Public Speaking Coach
3. Voice Coach
4. Linguistic Analyst
5. Pronunciation Coach
6. Communication Coach
7. Rhetorical/Speech Structure Analyst
8. Audio Performance Analyst

Return the final report in this exact 31-step order:
1. EXECUTIVE SUMMARY
2. AUDIO METRICS
3. TRANSCRIPT (A. RAW TRANSCRIPT, B. CLEAN TRANSCRIPT)
4. CLEAN TRANSCRIPT
5. SPEECH STRUCTURE
6. PACING & WPM
7. PAUSE ANALYSIS
8. FILLER ANALYSIS
9. VOICE ANALYSIS
10. ARTICULATION
11. PRONUNCIATION
12. STRESS & EMPHASIS
13. RHYTHM & PROSODY
14. BREATHING & VOCAL CONTROL
15. LANGUAGE & WORD CHOICE
16. RHETORICAL TECHNIQUES
17. PERSUASION
18. STORYTELLING
19. AUDIENCE ENGAGEMENT
20. EMOTIONAL DELIVERY
21. AUDIBLE CONFIDENCE INDICATORS
22. TIMESTAMP BREAKDOWN
23. HIGH-IMPACT IMPROVEMENTS
24. STRENGTHS
25. SENTENCE-LEVEL COACHING
26. PERSONALIZED EXERCISES
27. 5-MINUTE PRACTICE PLAN
28. 15-MINUTE PRACTICE PLAN
29. 30-MINUTE PRACTICE PLAN
30. NEXT RECORDING CHECKLIST
31. AUDIO-ONLY LIMITATIONS

Adhere strictly to all Core Rules:
1. Analyze the actual recording, not generic speaking advice.
2. Be specific, measurable, and actionable.
3. Do not invent information that cannot be determined from the audio.
4. If something cannot be assessed from audio alone, explicitly write: "Not assessable from audio."
5. Never infer psychological or medical conditions from someone's voice.
6. Do not say that a speaker "is nervous", "is insecure", etc. Instead describe observable audio characteristics.
7. Distinguish clearly between: Observable fact, Interpretation, Recommendation.
8. For visual attributes (eye contact, facial expressions, hand gestures, posture), explicitly write: "Not assessable from audio."
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
    });

    const report = response.text || '';
    res.json({ report });
  } catch (error: any) {
    console.error('[API] /api/speech-coach-report error:', error);
    res.status(500).json({ error: error.message || 'Speech coach report generation failed' });
  }
});

// Live API WebSocket connection handling (model gemini-3.8-live)
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs) => {
  console.log('[Live API] Client connected to /live');

  if (!ai) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }));
    clientWs.close();
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        systemInstruction:
          'You are Buddy, the friendly and supportive AI robot reading coach in ReadBuddy for CBSE Class 6 children. Speak warmly, clearly, and concisely. Keep answers encouraging, bite-sized (1-3 sentences), and fun. Help children with pronunciation, reading confidence, vocabulary, and storytelling.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (audio) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (text) {
            clientWs.send(JSON.stringify({ text }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ turnComplete: true }));
          }
        },
        onerror: (err) => {
          console.error('[Live API] Session error:', err);
          clientWs.send(JSON.stringify({ error: err.message }));
        },
        onclose: () => {
          console.log('[Live API] Session closed');
          clientWs.send(JSON.stringify({ closed: true }));
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
        if (msg.text) {
          session.sendRealtimeInput({
            text: msg.text,
          });
        }
      } catch (err) {
        console.error('[Live API] Error forwarding message from client:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      try {
        session.close();
      } catch {}
    });
  } catch (err: any) {
    console.error('[Live API] Connection error:', err);
    clientWs.send(JSON.stringify({ error: err.message || 'Failed to connect to Live API' }));
    clientWs.close();
  }
});

// Vite Middleware for development & static file serving for production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

server.listen(port, () => {
  console.log(`ReadBuddy server listening on port ${port}`);
});
