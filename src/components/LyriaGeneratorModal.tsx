import React, { useState } from 'react';
import { X, Music2, Sparkles, Wand2, Play, Pause, Download, Plus, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { StudioProject, Track, AudioClip } from '../audio/types';
import { createDefaultTrackVst } from '../audio/defaultVst';
import { audioEngine } from '../audio/AudioEngine';

interface LyriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StudioProject;
  onAddGeneratedTrack: (newTrack: Track) => void;
}

export const LyriaGeneratorModal: React.FC<LyriaModalProps> = ({
  isOpen,
  onClose,
  project,
  onAddGeneratedTrack,
}) => {
  const [prompt, setPrompt] = useState('Atmospheric cyberpunk synthwave track with punchy 808 beats, analog bassline and lush retro arpeggios.');
  const [modelType, setModelType] = useState<'clip' | 'pro'>('clip');
  const [genre, setGenre] = useState('Synthwave');
  const [mood, setMood] = useState('Futuristic');
  const [bpm, setBpm] = useState(project.bpm || 120);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  if (!isOpen) return null;

  const quickGenres = [
    'Synthwave 80s',
    'Lo-Fi Hip Hop',
    'Cyberpunk EDM',
    'Cinematic Orchestral',
    'Indie Pop / Rock',
    'Heavy 808 Trap',
    'Ambient Drone',
    'Neo-Soul / RnB',
  ];

  const quickMoods = ['Futuristic', 'Melancholic', 'Energetic', 'Dreamy', 'Dark & Heavy', 'Euphoric'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    if (previewAudio) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    }

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelType, // 'clip' (lyria-3-clip-preview) or 'pro' (lyria-3-pro-preview)
          genre,
          mood,
          bpm,
          referenceImage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.audioBase64) {
        setGeneratedAudioBase64(data.audioBase64);
        setGeneratedLyrics(data.lyrics || null);

        // Create HTMLAudioElement for instant preview
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.onended = () => setIsPreviewPlaying(false);
        setPreviewAudio(audio);
      } else {
        const errorText = data.error || 'No se pudo generar el audio con Lyria.';
        setErrorMessage(errorText);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        'No se pudo comunicar con el servidor /api/music/generate. Si estás en Netlify (hosting estático), recuerda que el backend Express requiere un servidor como Render, Railway o Google Cloud Run, o configurar Netlify Functions con la variable GEMINI_API_KEY. El motor de audio, sintetizador y exportador lossless funcionan al 100% de manera local.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewAudio) return;
    if (isPreviewPlaying) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudio.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleImportToProject = async () => {
    if (!generatedAudioBase64) return;

    try {
      // Decode base64 into AudioBuffer
      const binary = atob(generatedAudioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ctx = audioEngine.getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      const trackId = `tr_ai_${Date.now()}`;
      const clipDurationBeats = (audioBuffer.duration / (60.0 / project.bpm));

      const newClip: AudioClip = {
        id: `clip_${Date.now()}`,
        name: `Lyria ${genre} (${modelType === 'pro' ? 'Track Pro' : 'Clip 30s'})`,
        trackId,
        startBeat: 0,
        durationBeats: Math.max(4, Math.round(clipDurationBeats)),
        color: '#6366f1',
        audioBuffer,
        audioDataUri: `data:audio/wav;base64,${generatedAudioBase64}`,
      };

      const newTrack: Track = {
        id: trackId,
        name: `AI Music (${genre})`,
        type: 'lead',
        color: '#6366f1',
        volume: 0.9,
        pan: 0,
        muted: false,
        solo: false,
        recordArmed: false,
        vstChain: createDefaultTrackVst(),
        clips: [newClip],
      };

      onAddGeneratedTrack(newTrack);
      if (previewAudio) previewAudio.pause();
      onClose();
    } catch (err) {
      console.error('Failed to decode audio to track:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#10141e] border border-[#263148] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#141926] border-b border-[#242f46]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30">
              <Music2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Generador de Música IA — Google Lyria
              </h2>
              <p className="text-xs text-slate-400">
                Produce pistas de estudio completas y clips de hasta 30s con lyria-3-clip-preview y lyria-3-pro-preview.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Model Selection */}
          <div className="flex items-center gap-3 p-1 bg-[#0b0e15] rounded-xl border border-[#1f283b]">
            <button
              onClick={() => setModelType('clip')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                modelType === 'clip'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>lyria-3-clip-preview</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">Hasta 30 segundos</span>
            </button>
            <button
              onClick={() => setModelType('pro')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                modelType === 'pro'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>lyria-3-pro-preview</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">Pista Completa Pro</span>
            </button>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Descripción Musical (Prompt Creativo):
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full bg-[#151a26] border border-[#2b364e] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
              placeholder="Ej: Batería 808 potente con sintetizador analógico de estilo Synthwave 80s, tempo 124 BPM, melancólico..."
            />
          </div>

          {/* Quick Genre Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Género de Estudio:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickGenres.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGenre(g);
                    setPrompt((prev) => `${g} style track with punchy beats and studio fidelity. ${prev}`);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    genre === g
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 font-semibold'
                      : 'bg-[#151b29] text-slate-400 border-[#242f44] hover:border-slate-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mood & BPM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Estado de Ánimo:
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-[#151a26] border border-[#2b364e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {quickMoods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tempo (BPM): {bpm}
              </label>
              <input
                type="range"
                min={60}
                max={180}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Image-to-Music (Optional Lyria input) */}
          <div className="bg-[#141926] border border-[#242f44] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                <ImageIcon size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Inspiración Visual (Imagen a Música)
                </div>
                <div className="text-[11px] text-slate-400">
                  Opcional: Sube una foto de portada o arte conceptual para inspirar la atmósfera sonora.
                </div>
              </div>
            </div>

            <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition">
              {referenceImage ? 'Cambiar Arte' : 'Subir Arte'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">Aviso de Servicio de Música:</p>
                <p className="mt-0.5">{errorMessage}</p>
                <p className="mt-1 text-[11px] text-rose-400/80">
                  Los modelos Lyria de música requieren clave de API configurada en Secrets &gt; GEMINI_API_KEY. Puedes utilizar mientras tanto las herramientas de síntesis acústica, samples y drum machine nativos de AuraStudio Pro.
                </p>
              </div>
            </div>
          )}

          {/* Generated Audio Preview */}
          {generatedAudioBase64 && (
            <div className="p-4 bg-[#141d2e] border border-indigo-500/30 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Pista Generada con Éxito
                  </span>
                </div>
                <span className="text-xs text-indigo-300 font-mono">WAV Lossless 24-bit</span>
              </div>

              {generatedLyrics && (
                <div className="p-2.5 bg-[#0e1320] rounded-lg text-xs text-slate-300 italic">
                  "{generatedLyrics}"
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={togglePreviewPlay}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
                >
                  {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPreviewPlaying ? 'Pausar Reproducción' : 'Escuchar Previa'}
                </button>

                <button
                  onClick={handleImportToProject}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Plus size={16} />
                  Añadir como Pista al Mezclador DAW
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#141926] border-t border-[#242f46] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Modelo actual: <span className="text-indigo-400 font-mono">{modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}</span>
          </span>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Generando con Lyria...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generar Música de Estudio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
