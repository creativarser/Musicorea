import React, { useState, useEffect } from 'react';
import { X, Piano, Disc, Radio, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface VirtualInstrumentsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VirtualInstrumentsModal: React.FC<VirtualInstrumentsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'synth' | 'drums'>('synth');
  const [octave, setOctave] = useState(4); // C4 = 60
  const [waveform, setWaveform] = useState<'sawtooth' | 'square' | 'triangle' | 'sine'>('sawtooth');
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const drumPads = [
    { label: '808 Kick Deep', note: 36, color: '#f43f5e' },
    { label: 'Studio Snare', note: 38, color: '#f59e0b' },
    { label: 'Crisp Clap', note: 39, color: '#eab308' },
    { label: 'Closed Hi-Hat', note: 42, color: '#06b6d4' },
    { label: 'Open Hi-Hat', note: 46, color: '#0ea5e9' },
    { label: 'Sub 808 Long', note: 35, color: '#8b5cf6' },
    { label: 'Rimshot Click', note: 37, color: '#10b981' },
    { label: 'Perc Shaker', note: 44, color: '#ec4899' },
  ];

  const playDrum = (note: number) => {
    const ctx = audioEngine.getAudioContext();
    audioEngine.synthesizeDrumHit(note, ctx.currentTime, 0.95, ctx.destination);
  };

  const playNote = (midiNote: number) => {
    const ctx = audioEngine.getAudioContext();
    audioEngine.synthesizeSynthNote(midiNote, ctx.currentTime, 0.5, 0.85, ctx.destination, {
      waveform,
      attack: 0.02,
      decay: 0.15,
      sustain: 0.5,
      release: 0.2,
      filterCutoff: 3800,
      resonance: 3.0,
    });
    setActiveNotes((prev) => new Set(prev).add(midiNote));
    setTimeout(() => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(midiNote);
        return next;
      });
    }, 200);
  };

  // Keyboard keys mapping (white & black keys across 1.5 octaves)
  const baseMidi = octave * 12; // C4 = 48 (or 60 depending on offset: 12 * 5 = 60)
  const startNote = 60 + (octave - 4) * 12;

  const pianoKeys = [
    { note: startNote + 0, name: 'C', isBlack: false, keyLabel: 'A' },
    { note: startNote + 1, name: 'C#', isBlack: true, keyLabel: 'W' },
    { note: startNote + 2, name: 'D', isBlack: false, keyLabel: 'S' },
    { note: startNote + 3, name: 'D#', isBlack: true, keyLabel: 'E' },
    { note: startNote + 4, name: 'E', isBlack: false, keyLabel: 'D' },
    { note: startNote + 5, name: 'F', isBlack: false, keyLabel: 'F' },
    { note: startNote + 6, name: 'F#', isBlack: true, keyLabel: 'T' },
    { note: startNote + 7, name: 'G', isBlack: false, keyLabel: 'G' },
    { note: startNote + 8, name: 'G#', isBlack: true, keyLabel: 'Y' },
    { note: startNote + 9, name: 'A', isBlack: false, keyLabel: 'H' },
    { note: startNote + 10, name: 'A#', isBlack: true, keyLabel: 'U' },
    { note: startNote + 11, name: 'B', isBlack: false, keyLabel: 'J' },
    { note: startNote + 12, name: 'C+1', isBlack: false, keyLabel: 'K' },
    { note: startNote + 13, name: 'C#+1', isBlack: true, keyLabel: 'O' },
    { note: startNote + 14, name: 'D+1', isBlack: false, keyLabel: 'L' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#10141e] border border-[#263148] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141926] border-b border-[#242f46]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Piano size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Instrumentos Virtuales en Tiempo Real</h2>
              <p className="text-xs text-slate-400">Toca con teclado, ratón o controles táctiles en móvil.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#0b0e15] p-1 rounded-xl border border-[#20293b]">
              <button
                onClick={() => setActiveTab('synth')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeTab === 'synth' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Sintetizador
              </button>
              <button
                onClick={() => setActiveTab('drums')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeTab === 'drums' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                }`}
              >
                Pads 808/909
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'synth' ? (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#151a26] rounded-xl border border-[#242f44]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-semibold">Forma de Onda:</span>
                  {(['sawtooth', 'square', 'triangle', 'sine'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setWaveform(w)}
                      className={`px-2.5 py-1 rounded-lg border text-xs capitalize transition ${
                        waveform === w
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-[#10141e] text-slate-400 border-slate-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-semibold">Octava:</span>
                  <button
                    onClick={() => setOctave((o) => Math.max(2, o - 1))}
                    className="w-7 h-7 bg-slate-800 rounded font-bold hover:bg-slate-700 text-white"
                  >
                    -
                  </button>
                  <span className="font-mono text-indigo-400 font-bold px-2">C{octave}</span>
                  <button
                    onClick={() => setOctave((o) => Math.min(6, o + 1))}
                    className="w-7 h-7 bg-slate-800 rounded font-bold hover:bg-slate-700 text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Piano Keyboard */}
              <div className="relative flex justify-center h-44 bg-[#0a0d14] p-3 rounded-2xl border border-[#20293b] overflow-x-auto select-none">
                <div className="relative flex">
                  {pianoKeys
                    .filter((k) => !k.isBlack)
                    .map((k) => {
                      const isActive = activeNotes.has(k.note);
                      return (
                        <div
                          key={k.note}
                          onPointerDown={() => playNote(k.note)}
                          className={`relative w-12 sm:w-14 h-36 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-b-lg shadow-md cursor-pointer transition active:bg-indigo-300 flex flex-col justify-end items-center pb-2 ${
                            isActive ? 'bg-indigo-300' : ''
                          }`}
                        >
                          <span className="text-[10px] text-slate-500 font-mono font-bold">
                            {k.keyLabel}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">{k.name}</span>
                        </div>
                      );
                    })}

                  {/* Overlay black keys */}
                  <div className="absolute top-0 left-0 flex pointer-events-none w-full">
                    {/* Positions mapped to standard piano spacing */}
                    {[
                      { offset: 36, note: startNote + 1, label: 'W' },
                      { offset: 90, note: startNote + 3, label: 'E' },
                      { offset: 202, note: startNote + 6, label: 'T' },
                      { offset: 258, note: startNote + 8, label: 'Y' },
                      { offset: 314, note: startNote + 10, label: 'U' },
                      { offset: 426, note: startNote + 13, label: 'O' },
                    ].map((bk) => (
                      <div
                        key={bk.note}
                        style={{ left: `${bk.offset}px` }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          playNote(bk.note);
                        }}
                        className={`absolute w-8 h-24 bg-[#1a1f2c] border border-black rounded-b-md shadow-lg pointer-events-auto cursor-pointer flex flex-col justify-end items-center pb-1 text-slate-300 active:bg-indigo-600 transition ${
                          activeNotes.has(bk.note) ? 'bg-indigo-600' : ''
                        }`}
                      >
                        <span className="text-[9px] font-mono text-slate-400">{bk.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 8-Pad Drum Machine */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {drumPads.map((pad) => (
                <button
                  key={pad.note}
                  onPointerDown={() => playDrum(pad.note)}
                  className="h-28 rounded-2xl bg-[#161c2b] border border-[#263148] hover:border-slate-500 active:scale-95 transition flex flex-col items-center justify-center p-3 text-center shadow-lg group"
                >
                  <div
                    className="w-4 h-4 rounded-full mb-2 opacity-80 group-hover:scale-125 transition"
                    style={{ backgroundColor: pad.color }}
                  />
                  <div className="text-xs font-bold text-white">{pad.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">MIDI #{pad.note}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
