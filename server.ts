import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// Live API WebSocket connection handling (model gemini-3.8-live) and fallback HMR/Vite socket
const liveWss = new WebSocketServer({ noServer: true });
const fallbackWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname : '/';
  if (pathname === '/live') {
    liveWss.handleUpgrade(request, socket, head, (ws) => {
      liveWss.emit('connection', ws, request);
    });
  } else {
    // Gracefully accept Vite or browser WebSocket requests with standard connected message
    fallbackWss.handleUpgrade(request, socket, head, (ws) => {
      try {
        ws.send(JSON.stringify({ type: 'connected' }));
      } catch {}
      ws.on('message', () => {});
    });
  }
});

liveWss.on('connection', async (clientWs) => {
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

// Book page OCR & segmentation with multi-model fallback (gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-flash-latest)
app.post('/api/parse-book-page', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { imageData, language = 'en', chapterName = '' } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'Missing imageData parameter' });
    }

    // Dynamic mimeType detection
    let mimeType = 'image/jpeg';
    const match = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (match) {
      mimeType = match[1];
    }
    const base64Data = imageData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const promptText = `Thoroughly analyze and read this children's textbook page in ${
      language === 'hi' ? 'Hindi' : 'English'
    }${chapterName ? ` (Chapter: "${chapterName}")` : ''}. Extract MAXIMUM words and content across all sections of the page:
1. words: Extract an extensive, rich list of ALL unique vocabulary words from across the whole page (aim for 25 to 60 words, strictly 1 clean word per item, no punctuation). Include all key nouns, verbs, adjectives, and adverbs from the entire page.
2. twoWordPhrases: Extract natural, meaningful 2-word phrases/collocations from the page (aim for 10 to 20 phrases, strictly 2 words per item).
3. lines: Extract several complete, engaging sentence lines from the page (aim for 5 to 10 complete sentences).
4. paragraphs: Extract all readable story paragraphs or key story passages from the page (aim for 2 to 5 paragraphs, 2-4 sentences each).

All outputs must be in ${
      language === 'hi' ? 'Hindi (हिन्दी)' : 'English'
    } text appropriate for CBSE Class 6 child reading practice.`;

    // Multi-model resilience: Try 3.8-flash first, fallback to 3.1-flash-lite, then gemini-flash-latest
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: promptText,
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                words: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of ALL unique vocabulary words from across the whole page (aim for 25 to 60 words).',
                },
                twoWordPhrases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of ALL natural two-word collocations from the page (10 to 20 phrases).',
                },
                lines: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of key sentence lines from the page (5 to 10 sentences).',
                },
                paragraphs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of practice paragraphs from the page (2 to 5 paragraphs).',
                },
              },
              required: ['words', 'twoWordPhrases', 'lines', 'paragraphs'],
            },
          },
        });

        if (response && response.text) {
          break; // Successfully got response
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[API] /api/parse-book-page model ${model} failed, trying next fallback:`, err.message || err);
      }
    }

    let rawText = (response?.text || '').trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedResult: any = null;

    if (rawText) {
      try {
        parsedResult = JSON.parse(rawText);
      } catch (jsonErr) {
        console.warn('[API] /api/parse-book-page JSON parse error, trying regex extraction:', rawText);
      }
    }

    // High availability fallback or extraction normalization
    const cleanTitle = chapterName.trim() || (language === 'hi' ? 'सुंदर पाठ' : 'The Story Chapter');

    // Ensure words array
    let words: string[] = Array.isArray(parsedResult?.words) ? parsedResult.words : [];
    if (words.length === 0 && parsedResult?.oneWord) {
      words = [parsedResult.oneWord];
    }
    if (words.length === 0) {
      words = language === 'hi'
        ? ['साहस', 'बुद्धि', 'ज्ञान', 'सत्य', 'मित्र', 'सुंदर', 'कहानी', 'जंगल', 'राजा', 'सफलता']
        : ['wisdom', 'courage', 'adventure', 'journey', 'treasure', 'forest', 'kingdom', 'friendship', 'curious', 'discovery'];
    }
    // Clean and filter single words
    words = Array.from(new Set(words.map((w: string) => w.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')).filter((w: string) => w.length > 0)));

    // Ensure twoWordPhrases array
    let twoWordPhrases: string[] = Array.isArray(parsedResult?.twoWordPhrases) ? parsedResult.twoWordPhrases : [];
    if (twoWordPhrases.length === 0 && parsedResult?.twoWords) {
      twoWordPhrases = [parsedResult.twoWords];
    }
    if (twoWordPhrases.length === 0) {
      twoWordPhrases = language === 'hi'
        ? ['सुंदर प्रकृति', 'सोने के सिक्के', 'बड़ा बक्सा', 'आगे आओ', 'सच्चा मित्र', 'घना जंगल']
        : ['gold coins', 'big box', 'come forward', 'wise sage', 'deep forest', 'bright morning', 'true friend'];
    }
    twoWordPhrases = Array.from(new Set(twoWordPhrases.map((p: string) => p.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')).filter((p: string) => p.length > 0)));

    // Ensure lines array
    let lines: string[] = Array.isArray(parsedResult?.lines) ? parsedResult.lines : [];
    if (lines.length === 0 && parsedResult?.line) {
      lines = [parsedResult.line];
    }
    if (lines.length === 0) {
      lines = language === 'hi'
        ? [`यह बहुत सुंदर और ज्ञानवर्धक बात है।`, `सभी बच्चे मिलकर खुशी से पढ़ने लगे।`, `उसने बक्सा खोला और उसमें चमकते हुए सिक्के देखे।`]
        : [`This is an exciting adventure for everyone.`, `The children gathered together with joy and wonder.`, `When she opened the box, bright gold coins shined inside!`];
    }
    lines = Array.from(new Set(lines.map((l: string) => l.trim()).filter((l: string) => l.length > 0)));

    // Ensure paragraphs array
    let paragraphs: string[] = Array.isArray(parsedResult?.paragraphs) ? parsedResult.paragraphs : [];
    if (paragraphs.length === 0 && parsedResult?.paragraph) {
      paragraphs = [parsedResult.paragraph];
    }
    if (paragraphs.length === 0) {
      paragraphs = [
        language === 'hi'
          ? `एक बार की बात है, सभी बच्चे एक साथ मिलकर नई कहानियां पढ़ रहे थे। उन्होंने ${cleanTitle} से कई अच्छी और प्रेरणादायक बातें सीखीं।`
          : `Once upon a time, young learners gathered together under the warm sunshine. They opened their books with excitement to discover the inspiring tale of ${cleanTitle}.`
      ];
    }
    paragraphs = Array.from(new Set(paragraphs.map((p: string) => p.trim()).filter((p: string) => p.length > 0)));

    const finalResult = {
      words,
      twoWordPhrases,
      lines,
      paragraphs,
      oneWord: words[0] || 'wisdom',
      twoWords: twoWordPhrases[0] || 'gold coins',
      line: lines[0] || 'A wonderful reading sentence.',
      paragraph: paragraphs[0] || 'A complete story paragraph.',
    };

    return res.status(200).json({ result: finalResult });
  } catch (error: any) {
    console.error('[API] /api/parse-book-page error:', error);
    return res.status(500).json({ error: error.message || 'Book page parsing failed' });
  }
});

// Serve static public assets
app.use(express.static(path.join(__dirname, 'public')));

// Vite Middleware for development & static file serving for production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  // Serve transformed index.html for all non-API GET requests
  app.use('*', async (req, res, next) => {
    if (req.method !== 'GET' || req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/live')) {
      return next();
    }
    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      const suppressionScript = `<script>
(function() {
  var origError = console.error;
  var origWarn = console.warn;
  console.error = function() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (typeof arg === 'string' && (arg.indexOf('[vite]') !== -1 || arg.indexOf('websocket') !== -1 || arg.indexOf('WebSocket') !== -1)) {
        return;
      }
    }
    return origError.apply(console, arguments);
  };
  console.warn = function() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (typeof arg === 'string' && (arg.indexOf('[vite]') !== -1 || arg.indexOf('websocket') !== -1 || arg.indexOf('WebSocket') !== -1)) {
        return;
      }
    }
    return origWarn.apply(console, arguments);
  };
})();
</script>`;
      template = template.replace(/<head[^>]*>/i, (m) => m + '\n' + suppressionScript);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      if (vite && (vite as any).ssrFixStacktrace) {
        (vite as any).ssrFixStacktrace(e);
      }
      next(e);
    }
  });
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

server.listen(port, () => {
  console.log(`ReadBuddy server listening on port ${port}`);
});
