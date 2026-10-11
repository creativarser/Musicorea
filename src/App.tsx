import React, { useState, useEffect } from 'react';
import { StudioProject, Track, MasterVstChain, TrackVstChain, AudioClip } from './audio/types';
import { demoProjectSynthwave } from './audio/factoryPresets';
import { audioEngine } from './audio/AudioEngine';
import { getAllProjects, saveProject } from './storage/projectStore';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { Mixer } from './components/Mixer';
import { MasteringSuite } from './components/MasteringSuite';
import { VstRackModal } from './components/VstRackModal';
import { LyriaGeneratorModal } from './components/LyriaGeneratorModal';
import { ExportModal } from './components/ExportModal';
import { CollabModal } from './components/CollabModal';
import { ProjectsModal } from './components/ProjectsModal';
import { VirtualInstrumentsModal } from './components/VirtualInstrumentsModal';
import { Layers, Sliders, Sparkles, Piano, Download } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<StudioProject>(demoProjectSynthwave);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [isMetronome, setIsMetronome] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Active view tab for mobile / tablet or toggle view: 'timeline' | 'mixer' | 'mastering'
  const [activeView, setActiveView] = useState<'timeline' | 'mixer' | 'mastering'>('timeline');

  // Modals state
  const [vstModalOpen, setVstModalOpen] = useState(false);
  const [vstTrack, setVstTrack] = useState<Track | undefined>(undefined);
  const [isMasterVst, setIsMasterVst] = useState(false);

  const [lyriaModalOpen, setLyriaModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [instrumentsModalOpen, setInstrumentsModalOpen] = useState(false);

  // Initialize engine and load stored project
  useEffect(() => {
    getAllProjects().then((list) => {
      if (list && list.length > 0) {
        setProject(list[0]);
      }
    });

    audioEngine.onTimeUpdate = (beat) => setCurrentBeat(beat);
    audioEngine.onPlayStateChange = (playing) => setIsPlaying(playing);
    audioEngine.onRecordingComplete = (trackId, clip) => {
      setIsRecording(false);
      setProject((prev) => {
        const updatedTracks = prev.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        );
        const updated = { ...prev, tracks: updatedTracks };
        saveProject(updated);
        return updated;
      });
    };
  }, []);

  // Sync project changes to IndexedDB auto-save and audio engine
  const handleUpdateProject = (updated: StudioProject) => {
    setProject(updated);
    saveProject(updated);
  };

  // Playback handlers
  const handlePlay = () => {
    audioEngine.play(project);
  };

  const handlePause = () => {
    audioEngine.pause();
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleSeek = (beat: number) => {
    audioEngine.seek(beat);
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    audioEngine.setLoop(0, project.totalBars * 4, next);
  };

  const handleToggleMetronome = () => {
    const state = audioEngine.toggleMetronome();
    setIsMetronome(state);
  };

  const handleStartMicRecord = async (trackId: string) => {
    if (isRecording) {
      audioEngine.stopMicrophoneRecording();
      setIsRecording(false);
      return;
    }

    // Arm target track
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      recordArmed: t.id === trackId,
    }));
    const updated = { ...project, tracks: updatedTracks };
    handleUpdateProject(updated);

    const started = await audioEngine.startMicrophoneRecording(trackId);
    if (started) {
      setIsRecording(true);
      if (!isPlaying) {
        audioEngine.play(updated);
      }
    }
  };

  const handleUpdateBpm = (bpm: number) => {
    const updated = { ...project, bpm };
    handleUpdateProject(updated);
    audioEngine.setBpm(bpm);
  };

  const handleRenameProject = (name: string) => {
    handleUpdateProject({ ...project, name });
  };

  const handleOpenTrackVst = (track: Track) => {
    setVstTrack(track);
    setIsMasterVst(false);
    setVstModalOpen(true);
  };

  const handleOpenMasterVst = () => {
    setVstTrack(undefined);
    setIsMasterVst(true);
    setVstModalOpen(true);
  };

  const handleAddGeneratedTrack = (newTrack: Track) => {
    const updated = {
      ...project,
      tracks: [...project.tracks, newTrack],
    };
    handleUpdateProject(updated);
    audioEngine.registerTrack(newTrack);
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top DAW Header & Transport */}
      <Header
        project={project}
        isPlaying={isPlaying}
        currentBeat={currentBeat}
        isRecording={isRecording}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onToggleLoop={handleToggleLoop}
        isLooping={isLooping}
        onToggleMetronome={handleToggleMetronome}
        isMetronome={isMetronome}
        onStartRecord={() => {
          const vocalTrack = project.tracks.find((t) => t.type === 'vocal') || project.tracks[0];
          if (vocalTrack) handleStartMicRecord(vocalTrack.id);
        }}
        onUpdateBpm={handleUpdateBpm}
        onRenameProject={handleRenameProject}
        onOpenLyria={() => setLyriaModalOpen(true)}
        onOpenMastering={() => {
          setActiveView('mastering');
        }}
        onOpenInstruments={() => setInstrumentsModalOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenCollab={() => setCollabModalOpen(true)}
        onOpenProjects={() => setProjectsModalOpen(true)}
      />

      {/* View Switcher Bar (Desktop and Mobile) */}
      <div className="bg-[#10141e] border-b border-[#1e2638] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#0b0e15] p-1 rounded-xl border border-[#20293b]">
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'timeline'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={14} />
            Línea de Tiempo
          </button>

          <button
            onClick={() => setActiveView('mixer')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'mixer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            Mezclador & VU
          </button>

          <button
            onClick={() => setActiveView('mastering')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'mastering'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} />
            Mastering IA (LUFS)
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>Buffer: 4096 Samples</span>
          <span>•</span>
          <span className="text-cyan-400 font-bold">Motor: 96kHz 32-bit Float</span>
        </div>
      </div>

      {/* Main Studio Workspace Content */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto space-y-6 pb-20 sm:pb-8">
        {activeView === 'timeline' && (
          <div className="space-y-6">
            <Timeline
              project={project}
              currentBeat={currentBeat}
              isPlaying={isPlaying}
              onUpdateProject={handleUpdateProject}
              onOpenVstRack={handleOpenTrackVst}
              onSeek={handleSeek}
              onStartMicRecord={handleStartMicRecord}
              isRecording={isRecording}
            />

            {/* Quick Mixer preview below timeline */}
            <Mixer
              project={project}
              onUpdateProject={handleUpdateProject}
              onOpenTrackVst={handleOpenTrackVst}
              onOpenMasterVst={handleOpenMasterVst}
            />
          </div>
        )}

        {activeView === 'mixer' && (
          <div className="space-y-6">
            <Mixer
              project={project}
              onUpdateProject={handleUpdateProject}
              onOpenTrackVst={handleOpenTrackVst}
              onOpenMasterVst={handleOpenMasterVst}
            />
          </div>
        )}

        {activeView === 'mastering' && (
          <MasteringSuite project={project} onUpdateProject={handleUpdateProject} />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0e121a]/95 backdrop-blur-lg border-t border-[#202738] py-2 px-3 flex items-center justify-around text-[10px] font-semibold text-slate-400">
        <button
          onClick={() => setActiveView('timeline')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'timeline' ? 'text-indigo-400' : ''
          }`}
        >
          <Layers size={18} />
          <span>Pistas</span>
        </button>

        <button
          onClick={() => setActiveView('mixer')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'mixer' ? 'text-indigo-400' : ''
          }`}
        >
          <Sliders size={18} />
          <span>Mezclador</span>
        </button>

        <button
          onClick={() => setActiveView('mastering')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'mastering' ? 'text-indigo-400' : ''
          }`}
        >
          <Sparkles size={18} />
          <span>Mastering</span>
        </button>

        <button
          onClick={() => setInstrumentsModalOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-slate-200"
        >
          <Piano size={18} />
          <span>Teclas</span>
        </button>

        <button
          onClick={() => setExportModalOpen(true)}
          className="flex flex-col items-center gap-1 text-emerald-400"
        >
          <Download size={18} />
          <span>Exportar</span>
        </button>
      </div>

      {/* Modals */}
      <VstRackModal
        isOpen={vstModalOpen}
        onClose={() => setVstModalOpen(false)}
        track={isMasterVst ? undefined : vstTrack}
        masterVst={isMasterVst ? project.masterVst : undefined}
        onUpdateTrackVst={(vst) => {
          if (vstTrack) {
            const updatedTracks = project.tracks.map((t) =>
              t.id === vstTrack.id ? { ...t, vstChain: vst } : t
            );
            handleUpdateProject({ ...project, tracks: updatedTracks });
            const target = updatedTracks.find((t) => t.id === vstTrack.id);
            if (target) audioEngine.updateTrackNode(target);
          }
        }}
        onUpdateMasterVst={(vst) => {
          handleUpdateProject({ ...project, masterVst: vst });
          audioEngine.updateMasterVst(vst);
        }}
      />

      <LyriaGeneratorModal
        isOpen={lyriaModalOpen}
        onClose={() => setLyriaModalOpen(false)}
        project={project}
        onAddGeneratedTrack={handleAddGeneratedTrack}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
      />

      <CollabModal
        isOpen={collabModalOpen}
        onClose={() => setCollabModalOpen(false)}
        project={project}
        currentBeat={currentBeat}
        onUpdateProject={handleUpdateProject}
      />

      <ProjectsModal
        isOpen={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        currentProject={project}
        onSelectProject={(newProj) => {
          handleUpdateProject(newProj);
          audioEngine.stop();
        }}
      />

      <VirtualInstrumentsModal
        isOpen={instrumentsModalOpen}
        onClose={() => setInstrumentsModalOpen(false)}
      />
    </div>
  );
}
