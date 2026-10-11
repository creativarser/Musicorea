import React, { useState } from 'react';
import { X, Sliders, Activity, Sparkles, Volume2, ShieldCheck, Disc } from 'lucide-react';
import { Track, MasterVstChain, TrackVstChain } from '../audio/types';
import { Knob } from './Knob';
import { EqCurveVisualizer } from './EqCurveVisualizer';

interface VstRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track?: Track;
  masterVst?: MasterVstChain;
  onUpdateTrackVst?: (vst: TrackVstChain) => void;
  onUpdateMasterVst?: (vst: MasterVstChain) => void;
}

export const VstRackModal: React.FC<VstRackModalProps> = ({
  isOpen,
  onClose,
  track,
  masterVst,
  onUpdateTrackVst,
  onUpdateMasterVst,
}) => {
  if (!isOpen) return null;

  const isMaster = !track && Boolean(masterVst);
  const currentChain = isMaster ? masterVst! : track!.vstChain;

  const updateEq = (fields: Partial<typeof currentChain.eq>) => {
    const updated = { ...currentChain.eq, ...fields };
    if (isMaster && onUpdateMasterVst) {
      onUpdateMasterVst({ ...masterVst!, eq: updated });
    } else if (onUpdateTrackVst) {
      onUpdateTrackVst({ ...track!.vstChain, eq: updated });
    }
  };

  const updateComp = (fields: Partial<typeof currentChain.compressor>) => {
    const updated = { ...currentChain.compressor, ...fields };
    if (isMaster && onUpdateMasterVst) {
      onUpdateMasterVst({ ...masterVst!, compressor: updated });
    } else if (onUpdateTrackVst) {
      onUpdateTrackVst({ ...track!.vstChain, compressor: updated });
    }
  };

  const updateDistortion = (fields: Partial<typeof currentChain.distortion>) => {
    const updated = { ...currentChain.distortion, ...fields };
    if (isMaster && onUpdateMasterVst) {
      onUpdateMasterVst({ ...masterVst!, distortion: updated });
    } else if (onUpdateTrackVst) {
      onUpdateTrackVst({ ...track!.vstChain, distortion: updated });
    }
  };

  const updateSpatial = (fields: Partial<typeof currentChain.spatial>) => {
    const updated = { ...currentChain.spatial, ...fields };
    if (isMaster && onUpdateMasterVst) {
      onUpdateMasterVst({ ...masterVst!, spatial: updated });
    } else if (onUpdateTrackVst) {
      onUpdateTrackVst({ ...track!.vstChain, spatial: updated });
    }
  };

  const updateDelay = (fields: Partial<TrackVstChain['delay']>) => {
    if (!isMaster && onUpdateTrackVst && track) {
      onUpdateTrackVst({
        ...track.vstChain,
        delay: { ...track.vstChain.delay, ...fields },
      });
    }
  };

  const updateReverb = (fields: Partial<typeof currentChain.reverb>) => {
    const updated = { ...currentChain.reverb, ...fields };
    if (isMaster && onUpdateMasterVst && masterVst) {
      onUpdateMasterVst({ ...masterVst, reverb: updated });
    } else if (onUpdateTrackVst && track) {
      onUpdateTrackVst({ ...track.vstChain, reverb: updated });
    }
  };

  const updateLimiter = (fields: Partial<MasterVstChain['limiter']>) => {
    if (isMaster && onUpdateMasterVst && masterVst) {
      onUpdateMasterVst({
        ...masterVst,
        limiter: { ...masterVst.limiter, ...fields },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#10141d] border border-[#2b354c] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[#141925] border-b border-[#252f44]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Rack de Efectos VST — {isMaster ? 'Bus Maestro (Master Output)' : `Pista: ${track?.name}`}
              </h2>
              <p className="text-xs text-slate-400">
                DSP de estudio analógico con modelado por componentes y procesamiento de alta precisión.
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

        {/* Rack Content */}
        <div className="p-5 space-y-6">
          {/* Module 1: 4-Band Parametric EQ */}
          <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                  VST 1 — Equalizador Paramétrico 4-Bandas
                </h3>
              </div>
              <button
                onClick={() => updateEq({ enabled: !currentChain.eq.enabled })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                  currentChain.eq.enabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {currentChain.eq.enabled ? 'ACTIVO' : 'BYPASS'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7">
                <EqCurveVisualizer eq={currentChain.eq} />
              </div>

              <div className="md:col-span-5 grid grid-cols-4 gap-2">
                <Knob
                  label="Low Cut"
                  value={currentChain.eq.lowCutFreq}
                  min={20}
                  max={200}
                  step={5}
                  unit="Hz"
                  color="#06b6d4"
                  onChange={(v) => updateEq({ lowCutFreq: v })}
                />
                <Knob
                  label="Bajos (Shelf)"
                  value={currentChain.eq.lowGain}
                  min={-15}
                  max={15}
                  step={0.5}
                  unit="dB"
                  defaultValue={0}
                  color="#06b6d4"
                  onChange={(v) => updateEq({ lowGain: v })}
                />
                <Knob
                  label="Medios (Bell)"
                  value={currentChain.eq.midGain}
                  min={-12}
                  max={12}
                  step={0.5}
                  unit="dB"
                  defaultValue={0}
                  color="#38bdf8"
                  onChange={(v) => updateEq({ midGain: v })}
                />
                <Knob
                  label="Altos / Aire"
                  value={currentChain.eq.highGain}
                  min={-15}
                  max={15}
                  step={0.5}
                  unit="dB"
                  defaultValue={0}
                  color="#818cf8"
                  onChange={(v) => updateEq({ highGain: v })}
                />
              </div>
            </div>
          </div>

          {/* Module 2: Studio Analog Compressor & Tape Saturation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Analog Compressor */}
            <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                    VST 2 — Compresor de Dinámica Glue
                  </h3>
                </div>
                <button
                  onClick={() => updateComp({ enabled: !currentChain.compressor.enabled })}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                    currentChain.compressor.enabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {currentChain.compressor.enabled ? 'ACTIVO' : 'BYPASS'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2">
                <Knob
                  label="Threshold"
                  value={currentChain.compressor.threshold}
                  min={-40}
                  max={0}
                  step={1}
                  unit="dB"
                  color="#f59e0b"
                  onChange={(v) => updateComp({ threshold: v })}
                />
                <Knob
                  label="Ratio"
                  value={currentChain.compressor.ratio}
                  min={1}
                  max={16}
                  step={0.5}
                  unit=":1"
                  color="#f59e0b"
                  onChange={(v) => updateComp({ ratio: v })}
                />
                <Knob
                  label="Attack"
                  value={currentChain.compressor.attack}
                  min={1}
                  max={80}
                  step={1}
                  unit="ms"
                  color="#f59e0b"
                  onChange={(v) => updateComp({ attack: v })}
                />
                <Knob
                  label="Release"
                  value={currentChain.compressor.release}
                  min={20}
                  max={600}
                  step={10}
                  unit="ms"
                  color="#f59e0b"
                  onChange={(v) => updateComp({ release: v })}
                />
              </div>
            </div>

            {/* Tape Saturation & Warmth */}
            <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]"></span>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                    VST 3 — Saturación de Cinta Analógica
                  </h3>
                </div>
                <button
                  onClick={() => updateDistortion({ enabled: !currentChain.distortion.enabled })}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                    currentChain.distortion.enabled
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {currentChain.distortion.enabled ? 'ACTIVO' : 'BYPASS'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <Knob
                  label="Tape Drive"
                  value={currentChain.distortion.drive}
                  min={0}
                  max={1}
                  step={0.05}
                  color="#f43f5e"
                  onChange={(v) => updateDistortion({ drive: v })}
                />
                <Knob
                  label="Calidez Válvula"
                  value={currentChain.distortion.warmth}
                  min={0}
                  max={1}
                  step={0.05}
                  color="#f43f5e"
                  onChange={(v) => updateDistortion({ warmth: v })}
                />
                <Knob
                  label="Mezcla Wet"
                  value={currentChain.distortion.wet}
                  min={0}
                  max={1}
                  step={0.05}
                  color="#f43f5e"
                  onChange={(v) => updateDistortion({ wet: v })}
                />
              </div>
            </div>
          </div>

          {/* Module 3: Space & Time (Reverb, Spatial Expander, Delay) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Spatial Expander */}
            <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]"></span>
                  <h3 className="text-xs font-semibold text-slate-200 uppercase">Stereo Width</h3>
                </div>
                <button
                  onClick={() => updateSpatial({ enabled: !currentChain.spatial.enabled })}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                    currentChain.spatial.enabled ? 'text-indigo-300 border-indigo-500/30' : 'text-slate-500 border-slate-700'
                  }`}
                >
                  {currentChain.spatial.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex justify-center pt-2">
                <Knob
                  label="Amplitud Estéreo"
                  value={currentChain.spatial.width}
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  defaultValue={1.0}
                  color="#818cf8"
                  onChange={(v) => updateSpatial({ width: v })}
                />
              </div>
            </div>

            {/* Reverb */}
            <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                  <h3 className="text-xs font-semibold text-slate-200 uppercase">Concert Reverb</h3>
                </div>
                <button
                  onClick={() => updateReverb({ enabled: !currentChain.reverb.enabled })}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                    currentChain.reverb.enabled ? 'text-purple-300 border-purple-500/30' : 'text-slate-500 border-slate-700'
                  }`}
                >
                  {currentChain.reverb.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Knob
                  label="Decay"
                  value={currentChain.reverb.decay}
                  min={0.2}
                  max={6.0}
                  step={0.1}
                  unit="s"
                  color="#c084fc"
                  onChange={(v) => updateReverb({ decay: v })}
                />
                <Knob
                  label="Wet Mix"
                  value={currentChain.reverb.wet}
                  min={0}
                  max={1}
                  step={0.05}
                  color="#c084fc"
                  onChange={(v) => updateReverb({ wet: v })}
                />
              </div>
            </div>

            {/* Delay (Track) or Brickwall Limiter (Master) */}
            {isMaster ? (
              <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase">Master Limiter</h3>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">True Peak 0.0dBTP</span>
                </div>
                <div className="flex justify-center pt-2">
                  <Knob
                    label="Techo (Ceiling)"
                    value={masterVst!.limiter.ceilingDb}
                    min={-2.0}
                    max={-0.05}
                    step={0.05}
                    unit="dB"
                    color="#10b981"
                    onChange={(v) => updateLimiter({ ceilingDb: v })}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#151a26] border border-[#263148] rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase">Ping-Pong Delay</h3>
                  </div>
                  <button
                    onClick={() => updateDelay({ enabled: !track!.vstChain.delay.enabled })}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                      track!.vstChain.delay.enabled ? 'text-emerald-300 border-emerald-500/30' : 'text-slate-500 border-slate-700'
                    }`}
                  >
                    {track!.vstChain.delay.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Knob
                    label="Feedback"
                    value={track!.vstChain.delay.feedback}
                    min={0}
                    max={0.9}
                    step={0.05}
                    color="#10b981"
                    onChange={(v) => updateDelay({ feedback: v })}
                  />
                  <Knob
                    label="Wet Mix"
                    value={track!.vstChain.delay.wet}
                    min={0}
                    max={1}
                    step={0.05}
                    color="#10b981"
                    onChange={(v) => updateDelay({ wet: v })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141925] border-t border-[#252f44] flex items-center justify-between text-xs text-slate-400">
          <span>Consejo: Haz doble clic en cualquier potenciómetro para volver a su valor por defecto.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
