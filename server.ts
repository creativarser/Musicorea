import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Generate Music with Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
app.post('/api/music/generate', async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY no está configurada en las variables de entorno.',
        needsKey: true,
      });
    }

    const {
      prompt,
      modelType = 'clip', // 'clip' (30s) or 'pro' (full track)
      genre = 'Electronic',
      bpm = 120,
      mood = 'Energetic',
      referenceImage, // base64 optional
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt de música es requerido.' });
    }

    const targetModel = modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    const detailedPrompt = `Produce a pristine high-fidelity studio track in ${genre} style at ${bpm} BPM with a ${mood} mood. Prompt details: ${prompt}`;

    let streamResponse;
    if (referenceImage && referenceImage.startsWith('data:')) {
      const parts = referenceImage.split(';base64,');
      const mimeType = parts[0].replace('data:', '');
      const base64Data = parts[1];

      streamResponse = await ai.models.generateContentStream({
        model: targetModel,
        contents: {
          parts: [
            { text: detailedPrompt },
            { inlineData: { data: base64Data, mimeType } },
          ],
        },
      });
    } else {
      streamResponse = await ai.models.generateContentStream({
        model: targetModel,
        contents: detailedPrompt,
      });
    }

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of streamResponse) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      // If Lyria did not return inlineData audio bytes (e.g. text guidance), return error with message
      return res.status(422).json({
        error: 'El modelo no retornó datos de audio válidos para este prompt.',
        lyrics,
      });
    }

    return res.json({
      success: true,
      audioBase64,
      mimeType,
      lyrics,
      model: targetModel,
      prompt,
      bpm,
    });
  } catch (error: any) {
    console.error('Error generating music:', error);
    let rawMessage = error?.message || 'Error desconocido al generar música con Lyria.';

    // Often Google GenAI wraps API errors in a JSON string
    let parsedMessage = rawMessage;
    try {
      const parsed = typeof rawMessage === 'string' && rawMessage.startsWith('{') ? JSON.parse(rawMessage) : null;
      if (parsed?.error?.message) {
        parsedMessage = parsed.error.message;
      }
    } catch {}

    const isQuotaError =
      parsedMessage.includes('quota') ||
      parsedMessage.includes('RESOURCE_EXHAUSTED') ||
      parsedMessage.includes('limit: 0') ||
      parsedMessage.includes('free_tier');

    const cleanMessage = isQuotaError
      ? 'Los modelos de música Google Lyria (lyria-3-clip y lyria-3-pro) requieren un plan con facturación activa (Pay-As-You-Go) en Google AI Studio / Cloud. El nivel gratuito (Free Tier) tiene cuota 0 para generación de audio Lyria.'
      : parsedMessage;

    return res.status(isQuotaError ? 429 : 500).json({
      error: cleanMessage,
      isPaidModelRequired: isQuotaError,
      rawError: parsedMessage,
    });
  }
});

// Endpoint: AI Mastering Engineering Analysis (gemini-3.8-flash)
app.post('/api/ai/mastering-analysis', async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY no está configurada.' });
    }

    const {
      genre = 'Indie Electronic',
      bpm = 120,
      targetPlatform = 'Spotify / Streaming (-14 LUFS)',
      stemsInfo = [],
      currentPeakDb = -1.2,
      rmsDb = -16.5,
      stereoWidth = 1.0,
    } = req.body;

    const promptText = `
You are a Grammy-winning Mastering Engineer and DSP Acoustic Specialist.
Analyze the multitrack session profile and calculate the optimal studio mastering chain parameters to deliver broadcast, lossless studio sound.

Project Context:
- Genre / Style: ${genre}
- BPM: ${bpm}
- Target Platform: ${targetPlatform}
- Current Estimated True Peak: ${currentPeakDb} dBTP
- Estimated RMS: ${rmsDb} dBFS
- Existing Stereo Width: ${stereoWidth}
- Active Stems: ${JSON.stringify(stemsInfo)}

Return a strict JSON response with this exact schema:
{
  "targetLUFS": number (e.g. -14, -9, -7),
  "ceilingDb": number (e.g. -0.1),
  "eq": {
    "lowCutFreq": number (e.g. 28 to 35),
    "bassGain": number (in dB, -6 to +6),
    "bassFreq": number (e.g. 80 to 120),
    "midGain": number (in dB, -4 to +4),
    "midFreq": number (e.g. 1000 to 3500),
    "airGain": number (in dB, -3 to +6),
    "airFreq": number (e.g. 10000 to 14000)
  },
  "compressor": {
    "threshold": number (in dB, -24 to -6),
    "ratio": number (e.g. 1.5 to 4.0),
    "attack": number (in ms, 10 to 50),
    "release": number (in ms, 80 to 250),
    "makeupGain": number (in dB, 0 to 6)
  },
  "stereoExpander": {
    "width": number (e.g. 1.0 to 1.4),
    "bassMonoficationFreq": number (e.g. 110 to 140)
  },
  "analogWarmth": {
    "drive": number (0.0 to 0.4),
    "tapeSat": number (0.0 to 0.5),
    "evenHarmonics": number (0.0 to 0.3)
  },
  "limiter": {
    "release": number (in ms, 40 to 120),
    "lookaheadMs": number (1 to 5),
    "oversampling": string ("4x" or "8x")
  },
  "acousticCritique": string (2-3 sentences of audio engineering notes in Spanish for the indie creator),
  "actionableTips": [string, string, string] (3 concise mastering tips in Spanish)
}
Only output pure JSON, nothing else.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    res.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error('Error in mastering analysis:', error);
    res.status(500).json({ error: error?.message || 'Error al analizar masterización.' });
  }
});

// Endpoint: AI Musical Composition & Stem Generator
app.post('/api/ai/compose-arrangement', async (req, res) => {
  try {
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY no está configurada.' });
    }

    const { genre, mood, bpm, keySignature, tracks } = req.body;

    const promptText = `
You are a cutting-edge electronic and indie music producer.
Generate a structured musical composition plan, pattern notes, lyrics/chords progression, and VST chain presets for a new track.

Parameters:
- Genre: ${genre || 'Cyberpunk Synthwave'}
- Mood: ${mood || 'Futuristic & Melancholic'}
- BPM: ${bpm || 124}
- Key: ${keySignature || 'D Minor'}
- Available DAW tracks: ${JSON.stringify(tracks || ['Drums', '808 Bass', 'Chords', 'Lead Synth', 'Atmosphere FX'])}

Return a strict JSON object with:
{
  "title": string,
  "concept": string,
  "genre": string,
  "bpm": number,
  "chordProgression": string (e.g. "Dm - Bb - C - Am"),
  "structure": [
    { "section": "Intro", "bars": "1-4", "description": string },
    { "section": "Build", "bars": "5-8", "description": string },
    { "section": "Drop/Hook", "bars": "9-16", "description": string }
  ],
  "drumPattern": [
    { "noteNumber": number (36 for kick, 38 for snare, 42 for closed hat, 46 for open hat, 39 for clap), "startBeat": number (0 to 16), "durationBeats": number, "velocity": number }
  ],
  "bassPattern": [
    { "noteNumber": number (33 to 48), "startBeat": number (0 to 16), "durationBeats": number, "velocity": number }
  ],
  "leadPattern": [
    { "noteNumber": number (60 to 84), "startBeat": number (0 to 16), "durationBeats": number, "velocity": number }
  ],
  "chordPattern": [
    { "noteNumber": number (55 to 76), "startBeat": number (0 to 16), "durationBeats": number, "velocity": number }
  ],
  "stemPresets": {
    "drums": { "kickPitch": number, "reverbWet": number, "compressionRatio": number },
    "bass": { "cutoffFreq": number, "resonance": number, "drive": number, "subBoost": number },
    "synth": { "waveform": "sawtooth"|"square"|"triangle"|"sine", "attack": number, "release": number, "filterCutoff": number }
  }
}
Only output pure JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    res.json({ success: true, composition: result });
  } catch (error: any) {
    console.error('Error composing arrangement:', error);
    res.status(500).json({ error: error?.message || 'Error al generar composición.' });
  }
});

// Setup Vite middleware in dev or static server in prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 AuraStudio Pro DAW running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
