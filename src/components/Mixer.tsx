import React, { useState, useEffect } from 'react';
import { Volume2, Sliders, Mic, Sparkles, Radio } from 'lucide-react';
import { StudioProject, Track, MasterVstChain } from '../audio/types';
import { audioEngine } from '../audio/AudioEngine';
import { Knob } from './Knob';

interface MixerProps {
  project: StudioProject;
  onUpdateProject: (p: StudioProject) => void;
  onOpenTrackVst: (t: Track) => void;
  onOpenMasterVst: () => void;
}

export const Mixer: React.FC<MixerProps> = ({
  project,
  onUpdateProject,
  onOpenTrackVst,
  onOpenMasterVst,
}) => {
  // Real-time track meter levels: trackId -> peak (0 to 1)
  const [trackMeters, setTrackMeters] = useState<Record<string, number>>({});
  const [masterPeak, setMasterPeak] = useState(0);

  useEffect(() => {
    let animId: number;

    const updateMeters = () => {
      const levels: Record<string, number> = {};
      for (const track of project.tracks) {
        const { peak } = audioEngine.getTrackMeterLevel(track.id);
        levels[track.id] = peak;
      }
      setTrackMeters(levels);

      const lufs = audioEngine.getMasterLUFS();
      // True peak normalized 0 to 1 for VU meter
      const peakNorm = Math.max(0, Math.min(1, Math.pow(10, lufs.truePeakDb / 20)));
      setMasterPeak(peakNorm);

      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [project.tracks]);

  const handleUpdateTrack = (trackId: string, fields: Partial<Track>) => {
    const updatedTracks = project.tracks.map((t) => (t.id === trackId ? { ...t, ...fields } : t));
    const updated = { ...project, tracks: updatedTracks };
    onUpdateProject(updated);
    const target = updatedTracks.find((t) => t.id === trackId);
    if (target) audioEngine.updateTrackNode(target);
  };

  const handleUpdateMaster = (fields: Partial<MasterVstChain>) => {
    const updatedMaster: MasterVstChain = { ...project.masterVst, ...fields };
    const updated = { ...project, masterVst: updatedMaster };
    onUpdateProject(updated);
    audioEngine.updateMasterVst(updatedMaster);
  };

  return (
    <div className="bg-[#0f131d] border border-[#232c40] rounded-2xl p-4 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-[#20293c] mb-4">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Consola de Mezclas y Medición de Audio
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Canales Activos: {project.tracks.length} • Bus Estéreo 32-bit Float
        </span>
      </div>

      {/* Channel Strips Row */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Track Channel Strips */}
        {project.tracks.map((track) => {
          const currentLevel = trackMeters[track.id] || 0;
          const meterHeightPercent = Math.min(100, Math.round(currentLevel * 100));

          return (
            <div
              key={track.id}
              className="w-28 shrink-0 bg-[#141824] border border-[#242e42] rounded-xl p-2.5 flex flex-col justify-between shadow-md"
            >
              {/* Header */}
              <div className="text-center">
                <div
                  className="w-full h-1.5 rounded-full mb-1.5"
                  style={{ backgroundColor: track.color }}
                />
                <span className="block text-xs font-bold text-white truncate" title={track.name}>
                  {track.name}
                </span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{track.type}</span>
              </div>

              {/* Pan Knob */}
              <div className="my-2 flex justify-center">
                <Knob
                  label="Pan"
                  value={Math.round(track.pan * 100)}
                  min={-100}
                  max={100}
                  step={5}
                  defaultValue={0}
                  unit="%"
                  color={track.color}
                  onChange={(v) => handleUpdateTrack(track.id, { pan: v / 100 })}
                />
              </div>

              {/* VST button & M/S/R buttons */}
              <div className="space-y-1.5 mb-2">
                <button
                  onClick={() => onOpenTrackVst(track)}
                  className="w-full py-1 text-[10px] font-bold rounded bg-[#1e2638] hover:bg-slate-700 text-cyan-300 border border-[#2b3750] flex items-center justify-center gap-1 transition"
                >
                  <Sliders size={11} /> VST FX
                </button>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleUpdateTrack(track.id, { muted: !track.muted })}
                    className={`h-6 text-[10px] font-bold rounded border transition ${
                      track.muted
                        ? 'bg-rose-500/30 text-rose-300 border-rose-500'
                        : 'bg-[#182030] text-slate-400 border-slate-700'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleUpdateTrack(track.id, { solo: !track.solo })}
                    className={`h-6 text-[10px] font-bold rounded border transition ${
                      track.solo
                        ? 'bg-amber-500/30 text-amber-300 border-amber-500'
                        : 'bg-[#182030] text-slate-400 border-slate-700'
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => handleUpdateTrack(track.id, { recordArmed: !track.recordArmed })}
                    className={`h-6 text-[10px] font-bold rounded flex items-center justify-center border transition ${
                      track.recordArmed
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-[#182030] text-slate-400 border-slate-700'
                    }`}
                  >
                    <Mic size={10} />
                  </button>
                </div>
              </div>

              {/* Fader & LED Meter */}
              <div className="flex justify-center items-center gap-2 h-40 bg-[#0d1017] p-2 rounded-lg border border-[#1d2536]">
                {/* Vertical Fader */}
                <div className="relative h-full flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1.25}
                    step={0.01}
                    value={track.volume}
                    onChange={(e) => handleUpdateTrack(track.id, { volume: Number(e.target.value) })}
                    className="h-32 -rotate-90 w-32 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* LED VU Meter Bar */}
                <div className="w-2.5 h-32 bg-[#090b10] rounded-sm border border-[#1b2333] flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full transition-all duration-75"
                    style={{
                      height: `${meterHeightPercent}%`,
                      background:
                        meterHeightPercent > 90
                          ? '#f43f5e'
                          : meterHeightPercent > 70
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  />
                </div>
              </div>

              {/* dB Readout */}
              <div className="mt-2 text-center text-[11px] font-mono font-bold text-slate-300">
                {track.volume === 0
                  ? '-∞ dB'
                  : `${(20 * Math.log10(track.volume)).toFixed(1)} dB`}
              </div>
            </div>
          );
        })}

        {/* Master Output Channel Strip */}
        <div className="w-36 shrink-0 bg-[#161c2b] border-2 border-indigo-500/40 rounded-xl p-3 flex flex-col justify-between shadow-xl">
          <div className="text-center">
            <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 mb-1.5" />
            <span className="block text-xs font-bold text-white uppercase tracking-wider">
              Master Bus
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Estéreo Final</span>
          </div>

          <div className="my-2 space-y-2">
            <button
              onClick={onOpenMasterVst}
              className="w-full py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow transition"
            >
              <Sliders size={13} />
              Master VST
            </button>

            <button
              onClick={() => handleUpdateMaster({ aiMasterBypass: !project.masterVst.aiMasterBypass })}
              className={`w-full py-1 text-[11px] font-bold rounded border transition flex items-center justify-center gap-1 ${
                !project.masterVst.aiMasterBypass
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <Radio size={12} />
              {!project.masterVst.aiMasterBypass ? 'IA Master ON' : 'Bypass Original'}
            </button>
          </div>

          {/* Master Fader & Stereo VU Meter */}
          <div className="flex justify-center items-center gap-2 h-40 bg-[#0d1017] p-2 rounded-lg border border-[#1d2536]">
            {/* Master Fader */}
            <div className="relative h-full flex items-center">
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.01}
                defaultValue={1.0}
                className="h-32 -rotate-90 w-32 accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Master Dual LED VU Meter */}
            <div className="w-3.5 h-32 bg-[#090b10] rounded-sm border border-[#1b2333] flex flex-col justify-end overflow-hidden">
              <div
                className="w-full transition-all duration-75"
                style={{
                  height: `${Math.round(masterPeak * 100)}%`,
                  background:
                    masterPeak > 0.95 ? '#f43f5e' : masterPeak > 0.75 ? '#f59e0b' : '#06b6d4',
                }}
              />
            </div>
          </div>

          {/* Master Readout */}
          <div className="mt-2 text-center text-[10px] font-mono text-cyan-400 font-bold">
            {project.aiMastering.targetLUFS} LUFS Target
          </div>
        </div>
      </div>
    </div>
  );
};
