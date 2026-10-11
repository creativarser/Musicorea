import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Volume2, ShieldCheck, ArrowRight, CheckCircle2, RefreshCw, Radio } from 'lucide-react';
import { StudioProject, MasterVstChain } from '../audio/types';
import { audioEngine } from '../audio/AudioEngine';

interface MasteringSuiteProps {
  project: StudioProject;
  onUpdateProject: (updated: StudioProject) => void;
}

export const MasteringSuite: React.FC<MasteringSuiteProps> = ({ project, onUpdateProject }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('Spotify / Apple Music (-14 LUFS)');
  const [lufsData, setLufsData] = useState({ integrated: -14.2, momentary: -13.8, truePeakDb: -0.4 });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Poll real-time LUFS data during playback
  useEffect(() => {
    const interval = setInterval(() => {
      const data = audioEngine.getMasterLUFS();
      setLufsData(data);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const platforms = [
    { name: 'Spotify / Apple Music (-14 LUFS)', lufs: -14, peak: -1.0, desc: 'Estándar de streaming global con preservación de rango dinámico.' },
    { name: 'Club & EDM (-9 LUFS)', lufs: -9, peak: -0.1, desc: 'Impacto agresivo y subgraves pesados para sistemas de sonido potentes.' },
    { name: 'CD Audio Comercial (-7 LUFS)', lufs: -7, peak: -0.1, desc: 'Máxima sonoridad comercial sin distorsión audible.' },
    { name: 'Cine & Acústica (-18 LUFS)', lufs: -18, peak: -2.0, desc: 'Rango dinámico natural para bandas sonoras y orquestación indie.' },
  ];

  const handleRunAiMastering = async () => {
    setIsAnalyzing(true);
    setStatusMessage('Analizando distribución espectral de frecuencias y balance dinámico...');

    try {
      const stemsInfo = project.tracks.map((t) => ({
        name: t.name,
        type: t.type,
        volume: t.volume,
        pan: t.pan,
      }));

      const res = await fetch('/api/ai/mastering-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: project.name,
          bpm: project.bpm,
          targetPlatform: selectedPlatform,
          stemsInfo,
          currentPeakDb: lufsData.truePeakDb,
          rmsDb: lufsData.momentary,
          stereoWidth: project.masterVst.spatial.width,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        const a = data.analysis;
        const targetPlatObj = platforms.find((p) => p.name === selectedPlatform);

        const updatedMasterVst: MasterVstChain = {
          ...project.masterVst,
          aiMasterBypass: false,
          eq: {
            ...project.masterVst.eq,
            lowCutFreq: a.eq?.lowCutFreq || 30,
            lowGain: a.eq?.bassGain || 1.8,
            lowFreq: a.eq?.bassFreq || 85,
            midGain: a.eq?.midGain || -0.4,
            midFreq: a.eq?.midFreq || 1200,
            highGain: a.eq?.airGain || 2.2,
            highFreq: a.eq?.airFreq || 11500,
            enabled: true,
          },
          compressor: {
            ...project.masterVst.compressor,
            threshold: a.compressor?.threshold || -14,
            ratio: a.compressor?.ratio || 2.2,
            attack: a.compressor?.attack || 25,
            release: a.compressor?.release || 130,
            makeupGain: a.compressor?.makeupGain || 2.0,
            enabled: true,
          },
          spatial: {
            width: a.stereoExpander?.width || 1.2,
            enabled: true,
          },
          distortion: {
            ...project.masterVst.distortion,
            warmth: a.analogWarmth?.tapeSat || 0.25,
            drive: a.analogWarmth?.drive || 0.12,
            enabled: true,
          },
          limiter: {
            ceilingDb: a.ceilingDb || targetPlatObj?.peak || -0.1,
            release: a.limiter?.release || 60,
            enabled: true,
          },
        };

        const updatedProject: StudioProject = {
          ...project,
          masterVst: updatedMasterVst,
          aiMastering: {
            targetLUFS: a.targetLUFS || targetPlatObj?.lufs || -14,
            platform: selectedPlatform,
            ceilingDb: a.ceilingDb || -0.1,
            acousticCritique: a.acousticCritique || 'Masterización completada con éxito. Balance tonal optimizado para lossless playback.',
            actionableTips: a.actionableTips || [
              'Graves comprimidos con precisión para evitar saturación de subgraves.',
              'Realce de aire en frecuencias altas para brillo profesional.',
              'True-Peak limiter ajustado a -0.1 dBTP para prevenir recorte inter-muestra.',
            ],
            applied: true,
          },
        };

        onUpdateProject(updatedProject);
        audioEngine.updateMasterVst(updatedMasterVst);
        setStatusMessage('¡Masterización inteligente completada y aplicada con éxito!');
      } else {
        setStatusMessage('Error en el análisis de masterización. Usando ajustes optimizados por defecto.');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Fallo al conectar con el motor de IA. Por favor verifica la conexión.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAbBypass = () => {
    const updatedMaster: MasterVstChain = {
      ...project.masterVst,
      aiMasterBypass: !project.masterVst.aiMasterBypass,
    };
    const updated = { ...project, masterVst: updatedMaster };
    onUpdateProject(updated);
    audioEngine.updateMasterVst(updatedMaster);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & A/B Realtime Switch */}
      <div className="bg-gradient-to-r from-[#141b2e] via-[#161a29] to-[#121622] border border-[#27324a] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Suite de Masterización Automática IA
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Estudio Lossless
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Calibración acústica de nivel comercial con análisis espectral multicanal, compensación LUFS y ecualización dinámica.
              </p>
            </div>
          </div>

          {/* Real-time A/B Switch */}
          <div className="flex items-center gap-3 bg-[#0d1017] p-1.5 rounded-xl border border-[#222a3d]">
            <span className="text-xs font-semibold text-slate-400 pl-2">Comparación A/B:</span>
            <button
              onClick={toggleAbBypass}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                project.masterVst.aiMasterBypass
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Radio size={14} />
              Mezcla Original (Bypass)
            </button>
            <button
              onClick={toggleAbBypass}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                !project.masterVst.aiMasterBypass
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              Master IA (Activo)
            </button>
          </div>
        </div>

        {/* Meters Bar: LUFS & True Peak */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#0b0e15] border border-[#1e2638] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Integrated LUFS</div>
              <div className="text-xl font-bold font-mono-numbers text-indigo-400">
                {lufsData.integrated.toFixed(1)} <span className="text-xs text-slate-400">LUFS</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Objetivo: {project.aiMastering.targetLUFS} LUFS
            </div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2638] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Momentary Loudness</div>
              <div className="text-xl font-bold font-mono-numbers text-cyan-400">
                {lufsData.momentary.toFixed(1)} <span className="text-xs text-slate-400">LUFS</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Respuesta en vivo
            </div>
          </div>

          <div className="bg-[#0b0e15] border border-[#1e2638] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">True Peak (dBTP)</div>
              <div className={`text-xl font-bold font-mono-numbers ${lufsData.truePeakDb > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {lufsData.truePeakDb.toFixed(2)} <span className="text-xs text-slate-400">dBTP</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Límite: {project.masterVst.limiter.ceilingDb} dB
            </div>
          </div>
        </div>
      </div>

      {/* Platform Profile Selector & One-Click AI Master */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Perfil de Distribución Objetivo
          </h3>
          <div className="space-y-2">
            {platforms.map((p) => {
              const isSelected = selectedPlatform === p.name;
              return (
                <div
                  key={p.name}
                  onClick={() => setSelectedPlatform(p.name)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-left ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                      : 'bg-[#121622] border-[#222c3f] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-xs">
                    <span>{p.name}</span>
                    <span className="font-mono text-indigo-400">{p.lufs} LUFS</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{p.desc}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleRunAiMastering}
            disabled={isAnalyzing}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Analizando con IA Gemini...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Masterizar Proyecto con IA
              </>
            )}
          </button>

          {statusMessage && (
            <p className="text-xs text-center text-cyan-400 font-medium">{statusMessage}</p>
          )}
        </div>

        {/* AI Acoustic Report & Engineering Feedback */}
        <div className="lg:col-span-2 bg-[#121622] border border-[#222c3f] rounded-2xl p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between border-b border-[#20293b] pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-400" />
                Informe de Ingeniería Acústica IA
              </h3>
              <span className="text-xs text-slate-400">Gemini 3.8 Flash DSP Analyzer</span>
            </div>

            <div className="p-3.5 bg-[#0e121a] rounded-xl border border-[#1b2333] text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-white mb-1">Diagnóstico Espectral:</p>
              {project.aiMastering.acousticCritique}
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ajustes Automáticos Aplicados a la Cadena Master:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {project.aiMastering.actionableTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#151b29] border border-[#242f46] flex items-start gap-2 text-slate-300"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1e273a] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Cadena Master: EQ 4-Band ({project.masterVst.eq.lowGain > 0 ? `+${project.masterVst.eq.lowGain}dB Low` : 'Flat'}), Comp Glue ({project.masterVst.compressor.ratio}:1), Sat ({Math.round(project.masterVst.distortion.warmth * 100)}%), Limiter ({project.masterVst.limiter.ceilingDb}dBTP).
            </div>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={14} /> Listo para Exportación Lossless
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
