import React, { useRef, useState } from 'react';
import { Play, Pause, Plus, Sliders, Volume2, Mic, Trash2, Copy, Music, Layers, Sparkles } from 'lucide-react';
import { StudioProject, Track, AudioClip } from '../audio/types';
import { createDefaultTrackVst } from '../audio/defaultVst';

interface TimelineProps {
  project: StudioProject;
  currentBeat: number;
  isPlaying: boolean;
  onUpdateProject: (p: StudioProject) => void;
  onOpenVstRack: (track: Track) => void;
  onSeek: (beat: number) => void;
  onStartMicRecord: (trackId: string) => void;
  isRecording: boolean;
  onOpenAiGenerator?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentBeat,
  isPlaying,
  onUpdateProject,
  onOpenVstRack,
  onSeek,
  onStartMicRecord,
  isRecording,
  onOpenAiGenerator,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Zoom / scale: pixels per beat
  const pixelsPerBeat = 28;
  const totalBeats = project.totalBars * 4;
  const timelineWidth = totalBeats * pixelsPerBeat;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const targetBeat = Math.max(0, Math.min(totalBeats, clickX / pixelsPerBeat));
    onSeek(targetBeat);
  };

  const handleUpdateTrack = (trackId: string, fields: Partial<Track>) => {
    const updatedTracks = project.tracks.map((t) => (t.id === trackId ? { ...t, ...fields } : t));
    onUpdateProject({ ...project, tracks: updatedTracks });
  };

  const handleAddTrack = (type: Track['type']) => {
    const typeConfigs: Record<Track['type'], { name: string; color: string }> = {
      drums: { name: '808 Drum Kit', color: '#f43f5e' },
      bass: { name: 'Sub Bass', color: '#06b6d4' },
      lead: { name: 'Lead Synth', color: '#eab308' },
      chords: { name: 'Poly Chords', color: '#a855f7' },
      vocal: { name: 'Mic Recording', color: '#10b981' },
      fx: { name: 'Atmosphere FX', color: '#ec4899' },
    };

    const config = typeConfigs[type] || { name: 'Nueva Pista', color: '#6366f1' };

    const newTrack: Track = {
      id: `tr_${Date.now()}`,
      name: `${config.name} ${project.tracks.length + 1}`,
      type,
      color: config.color,
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      recordArmed: false,
      vstChain: createDefaultTrackVst(),
      clips: [],
    };

    onUpdateProject({ ...project, tracks: [...project.tracks, newTrack] });
  };

  const handleDeleteTrack = (trackId: string) => {
    if (project.tracks.length <= 1) return;
    const updated = project.tracks.filter((t) => t.id !== trackId);
    onUpdateProject({ ...project, tracks: updated });
  };

  const handleAddDefaultClip = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const newClip: AudioClip = {
      id: `clip_${Date.now()}`,
      name: `Patrón ${track.clips.length + 1}`,
      trackId,
      startBeat: currentBeat < totalBeats ? Math.floor(currentBeat / 4) * 4 : 0,
      durationBeats: 16,
      color: track.color,
      notes: [
        { id: `n_${Date.now()}_1`, noteNumber: track.type === 'drums' ? 36 : 60, startBeat: 0, durationBeats: 1, velocity: 0.9 },
        { id: `n_${Date.now()}_2`, noteNumber: track.type === 'drums' ? 38 : 64, startBeat: 2, durationBeats: 1, velocity: 0.85 },
        { id: `n_${Date.now()}_3`, noteNumber: track.type === 'drums' ? 42 : 67, startBeat: 4, durationBeats: 1, velocity: 0.8 },
      ],
    };

    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
    );
    onUpdateProject({ ...project, tracks: updatedTracks });
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t
    );
    onUpdateProject({ ...project, tracks: updatedTracks });
    setSelectedClipId(null);
  };

  return (
    <div className="bg-[#0f131c] border border-[#232c3f] rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Timeline Controls / Action Bar */}
      <div className="px-4 py-2.5 bg-[#141926] border-b border-[#242f46] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={15} className="text-indigo-400" />
            Línea de Tiempo Multipista
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {project.totalBars} Compases ({project.totalBars * 4} Beats) • Snap 1/4
          </span>
        </div>

        {/* Add Track Dropdown chips & AI composer */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {onOpenAiGenerator && (
            <button
              onClick={onOpenAiGenerator}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow transition shrink-0"
              title="Generar nueva pista con IA gratuita"
            >
              <Sparkles size={13} className="text-yellow-300" />
              <span>Componer con IA (Gratis)</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

          <span className="text-slate-400 font-semibold text-[11px] shrink-0">+ Pista:</span>
          {(['drums', 'bass', 'lead', 'chords', 'vocal'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleAddTrack(t)}
              className="px-2.5 py-1 rounded-lg bg-[#1a2133] hover:bg-[#252f47] border border-[#2b3752] text-slate-200 capitalize text-[11px] font-medium transition shrink-0"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline Workspace: Left Track Headers + Right Scrollable Lanes */}
      <div className="flex overflow-hidden">
        {/* Left Track Headers Column */}
        <div className="w-56 sm:w-64 shrink-0 bg-[#121622] border-r border-[#222b3e] z-10">
          {/* Ruler spacer */}
          <div className="h-8 border-b border-[#222b3e] px-3 flex items-center text-[10px] uppercase font-bold text-slate-500">
            Pistas / Canales
          </div>

          {/* Track Headers list */}
          <div className="divide-y divide-[#1e2638]">
            {project.tracks.map((track) => (
              <div key={track.id} className="h-24 p-2.5 flex flex-col justify-between bg-[#131724]">
                {/* Track Title, Type, and Color pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="font-bold text-white text-xs truncate max-w-[110px]">
                      {track.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenVstRack(track)}
                      title="Rack de Efectos VST"
                      className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                    >
                      <Sliders size={13} />
                    </button>
                    {project.tracks.length > 1 && (
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        title="Eliminar Pista"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Track Fader & Pan in header */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400 font-mono w-6">Vol</span>
                  <input
                    type="range"
                    min={0}
                    max={1.2}
                    step={0.02}
                    value={track.volume}
                    onChange={(e) => handleUpdateTrack(track.id, { volume: Number(e.target.value) })}
                    className="flex-1 h-1 bg-slate-700 rounded-lg accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 w-8 text-right">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>

                {/* Mute, Solo, Record Arm, + Clip */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateTrack(track.id, { muted: !track.muted })}
                      className={`w-6 h-5 rounded text-[10px] font-bold border transition ${
                        track.muted
                          ? 'bg-rose-500/30 text-rose-300 border-rose-500'
                          : 'bg-[#182030] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => handleUpdateTrack(track.id, { solo: !track.solo })}
                      className={`w-6 h-5 rounded text-[10px] font-bold border transition ${
                        track.solo
                          ? 'bg-amber-500/30 text-amber-300 border-amber-500'
                          : 'bg-[#182030] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      S
                    </button>
                    <button
                      onClick={() => onStartMicRecord(track.id)}
                      title="Grabar Audio Mic"
                      className={`w-6 h-5 rounded flex items-center justify-center border transition ${
                        isRecording && track.recordArmed
                          ? 'bg-rose-600 text-white border-rose-500 animate-record'
                          : 'bg-[#182030] text-slate-400 border-slate-700 hover:text-rose-400'
                      }`}
                    >
                      <Mic size={10} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddDefaultClip(track.id)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition"
                  >
                    + Clip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Lanes & Ruler */}
        <div
          ref={timelineRef}
          onClick={handleRulerClick}
          className="flex-1 overflow-x-auto relative bg-[#0b0e15] cursor-crosshair select-none"
        >
          {/* Timeline Bars/Beats Ruler */}
          <div className="h-8 border-b border-[#222b3e] relative bg-[#121622] flex" style={{ width: `${timelineWidth}px` }}>
            {Array.from({ length: project.totalBars }).map((_, barIdx) => (
              <div
                key={barIdx}
                className="relative border-r border-[#263148] flex items-center pl-1 text-[10px] font-mono font-semibold text-slate-400"
                style={{ width: `${pixelsPerBeat * 4}px` }}
              >
                <span>{barIdx + 1}</span>
                {/* 4 quarter beat sub-ticks */}
                <div className="absolute inset-y-0 left-1/4 w-[1px] bg-[#1a2334]" />
                <div className="absolute inset-y-0 left-2/4 w-[1px] bg-[#1e273a]" />
                <div className="absolute inset-y-0 left-3/4 w-[1px] bg-[#1a2334]" />
              </div>
            ))}
          </div>

          {/* Track Lanes */}
          <div className="relative divide-y divide-[#182030]" style={{ width: `${timelineWidth}px` }}>
            {project.tracks.map((track) => (
              <div key={track.id} className="h-24 relative overflow-hidden bg-[#0d1017]">
                {/* Vertical bar grid lines */}
                {Array.from({ length: project.totalBars }).map((_, b) => (
                  <div
                    key={b}
                    className="absolute inset-y-0 border-r border-[#151c2a] pointer-events-none"
                    style={{ left: `${b * 4 * pixelsPerBeat}px`, width: `${4 * pixelsPerBeat}px` }}
                  />
                ))}

                {/* Audio & MIDI Clips */}
                {track.clips.map((clip) => {
                  const left = clip.startBeat * pixelsPerBeat;
                  const width = clip.durationBeats * pixelsPerBeat;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: `${clip.color || track.color}22`,
                        borderColor: isSelected ? '#ffffff' : clip.color || track.color,
                      }}
                      className="absolute inset-y-2 rounded-lg border-2 shadow-md cursor-pointer flex flex-col justify-between p-2 overflow-hidden group hover:brightness-110 transition"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-white truncate">
                        <span className="truncate">{clip.name}</span>
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClip(track.id, clip.id);
                            }}
                            className="p-0.5 rounded bg-black/60 text-slate-300 hover:text-rose-400"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {/* Waveform / MIDI Notes Representation */}
                      <div className="h-8 flex items-end gap-1 opacity-80">
                        {clip.notes && clip.notes.length > 0 ? (
                          // MIDI note blocks
                          clip.notes.map((n) => (
                            <div
                              key={n.id}
                              style={{
                                left: `${(n.startBeat / clip.durationBeats) * 100}%`,
                                height: `${Math.max(15, ((n.noteNumber - 30) / 60) * 100)}%`,
                                width: `${Math.max(4, (n.durationBeats / clip.durationBeats) * 100)}%`,
                                backgroundColor: clip.color || track.color,
                              }}
                              className="absolute rounded-sm opacity-90 shadow-sm"
                            />
                          ))
                        ) : (
                          // Procedural audio waveform bars
                          Array.from({ length: Math.min(32, Math.floor(width / 6)) }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                height: `${20 + Math.sin(i * 0.8) * 35 + Math.cos(i * 1.5) * 20}%`,
                                backgroundColor: clip.color || track.color,
                              }}
                              className="w-1 rounded-full opacity-70"
                            />
                          ))
                        )}
                      </div>

                      <div className="text-[9px] text-slate-400 font-mono">
                        {clip.durationBeats / 4} compases
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead Scrubber Line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-[0_0_12px_#f43f5e] z-30 pointer-events-none transition-all duration-75"
              style={{ left: `${currentBeat * pixelsPerBeat}px` }}
            >
              <div className="w-3 h-3 bg-rose-500 rotate-45 -ml-[5px] -mt-1 shadow-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
