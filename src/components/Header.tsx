import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  Mic,
  Music2,
  Sparkles,
  Download,
  Users,
  FolderOpen,
  Piano,
  Clock,
  Radio,
} from 'lucide-react';
import { StudioProject } from '../audio/types';
import { audioEngine } from '../audio/AudioEngine';

interface HeaderProps {
  project: StudioProject;
  isPlaying: boolean;
  currentBeat: number;
  isRecording: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  isLooping: boolean;
  onToggleMetronome: () => void;
  isMetronome: boolean;
  onStartRecord: () => void;
  onUpdateBpm: (bpm: number) => void;
  onRenameProject: (name: string) => void;
  onOpenLyria: () => void;
  onOpenMastering: () => void;
  onOpenInstruments: () => void;
  onOpenExport: () => void;
  onOpenCollab: () => void;
  onOpenProjects: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  isPlaying,
  currentBeat,
  isRecording,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  isLooping,
  onToggleMetronome,
  isMetronome,
  onStartRecord,
  onUpdateBpm,
  onRenameProject,
  onOpenLyria,
  onOpenMastering,
  onOpenInstruments,
  onOpenExport,
  onOpenCollab,
  onOpenProjects,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);

  useEffect(() => {
    setNameVal(project.name);
  }, [project.name]);

  // Keyboard shortcut: Spacebar = toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) onPause();
        else onPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onPause]);

  // Compute time format: 00:00.000 and Bar.Beat.Tick
  const totalSeconds = (currentBeat * 60) / project.bpm;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 1000);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;

  const currentBar = Math.floor(currentBeat / 4) + 1;
  const beatInBar = Math.floor(currentBeat % 4) + 1;
  const tick = Math.floor(((currentBeat % 1) * 960));
  const barFormatted = `${currentBar}.${beatInBar}.${tick.toString().padStart(3, '0')}`;

  return (
    <header className="sticky top-0 z-40 bg-[#0e121a]/95 backdrop-blur-md border-b border-[#202738] px-3 sm:px-6 py-2.5">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">
                  AuraStudio <span className="text-cyan-400 font-mono">PRO</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  DAW 96kHz
                </span>
              </div>

              {editingName ? (
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={() => {
                    setEditingName(false);
                    onRenameProject(nameVal);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingName(false);
                      onRenameProject(nameVal);
                    }
                  }}
                  autoFocus
                  className="bg-black/50 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white"
                />
              ) : (
                <div
                  onClick={() => setEditingName(true)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer truncate max-w-[170px]"
                  title="Clic para renombrar proyecto"
                >
                  {project.name}
                </div>
              )}
            </div>
          </div>

          {/* Quick Projects button on mobile */}
          <button
            onClick={onOpenProjects}
            className="lg:hidden p-2 rounded-lg bg-[#141926] text-slate-300 border border-[#252f44]"
          >
            <FolderOpen size={16} />
          </button>
        </div>

        {/* Center Transport Controls & Metronome */}
        <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3 bg-[#131722] p-1.5 rounded-2xl border border-[#232c3f] shadow-inner">
          {/* Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
            title="Reproducir / Pausa (Barra Espaciadora)"
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>

          {/* Stop */}
          <button
            onClick={onStop}
            className="w-8 h-8 rounded-lg bg-[#1c2233] hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="Detener y volver al inicio"
          >
            <Square size={13} />
          </button>

          {/* Loop Range */}
          <button
            onClick={onToggleLoop}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
              isLooping
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-[#1c2233] text-slate-400 border-transparent hover:text-white'
            }`}
            title="Bucle (Loop Continuo)"
          >
            <Repeat size={14} />
          </button>

          {/* Metronome */}
          <button
            onClick={onToggleMetronome}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
              isMetronome
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                : 'bg-[#1c2233] text-slate-400 border-transparent hover:text-white'
            }`}
            title="Metrónomo de Estudio"
          >
            <Clock size={14} />
          </button>

          {/* Mic Record */}
          <button
            onClick={onStartRecord}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-500 animate-record'
                : 'bg-[#1c2233] text-slate-400 border-transparent hover:text-rose-400'
            }`}
            title="Grabar Audio Mic"
          >
            <Mic size={14} />
          </button>

          {/* Time & Bar Counter Displays */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0b0e15] rounded-xl border border-[#1d2536] font-mono-numbers">
            <div className="text-right">
              <div className="text-xs font-bold text-white tracking-wide">{barFormatted}</div>
              <div className="text-[10px] text-slate-400 font-mono">{timeFormatted}</div>
            </div>
          </div>

          {/* BPM Stepper */}
          <div className="flex items-center gap-1 bg-[#0b0e15] px-2 py-1 rounded-xl border border-[#1d2536] text-xs">
            <span className="text-[10px] text-slate-400 font-bold">BPM</span>
            <input
              type="number"
              min={50}
              max={240}
              value={project.bpm}
              onChange={(e) => onUpdateBpm(Number(e.target.value))}
              className="w-11 bg-transparent text-center font-bold text-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Tools & Modals Bar */}
        <div className="flex items-center flex-wrap gap-1.5 justify-center">
          <button
            onClick={onOpenLyria}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
          >
            <Music2 size={14} />
            <span className="hidden sm:inline">IA</span> Lyria
          </button>

          <button
            onClick={onOpenMastering}
            className="px-3 py-1.5 rounded-xl bg-[#181f2f] hover:bg-[#20293d] border border-[#2b3750] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Sparkles size={14} className="text-amber-400" />
            Mastering
          </button>

          <button
            onClick={onOpenInstruments}
            className="px-3 py-1.5 rounded-xl bg-[#181f2f] hover:bg-[#20293d] border border-[#2b3750] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Piano size={14} className="text-indigo-400" />
            <span className="hidden sm:inline">Instrumentos</span>
          </button>

          <button
            onClick={onOpenCollab}
            className="px-3 py-1.5 rounded-xl bg-[#181f2f] hover:bg-[#20293d] border border-[#2b3750] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Users size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Colaborar</span>
          </button>

          <button
            onClick={onOpenProjects}
            className="hidden lg:flex px-3 py-1.5 rounded-xl bg-[#181f2f] hover:bg-[#20293d] border border-[#2b3750] text-slate-200 text-xs font-bold items-center gap-1.5 transition"
          >
            <FolderOpen size={14} />
            Proyectos
          </button>

          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
          >
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>
    </header>
  );
};
