import { StudioProject, Track, MidiNote, AudioClip } from './types';
import { createDefaultMasterVst, createDefaultTrackVst } from './defaultVst';

/**
 * Factory Demo Projects:
 * 1. "Neon Horizon" - Synthwave & Electro 120 BPM
 * 2. "Midnight Lo-Fi Chill" - 82 BPM Lo-Fi Hip Hop
 * 3. "Cyberpunk 2088" - Dark Industrial Club 130 BPM
 */

export const demoProjectSynthwave: StudioProject = {
  id: 'demo_synthwave_01',
  name: 'Neon Horizon — Retro Wave',
  bpm: 120,
  timeSignature: [4, 4],
  totalBars: 16,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aiMastering: {
    targetLUFS: -14,
    platform: 'Spotify / Apple Music (-14 LUFS)',
    ceilingDb: -0.1,
    acousticCritique: 'Mezcla equilibrada con subgraves limpios. La cadena de masterización expande la imagen estéreo en un 18% y aplica calidez analógica de cinta para máxima presencia.',
    actionableTips: [
      'Corte de graves a 30Hz aplicado para eliminar ruidos subsónicos.',
      'Pegamento dinámico suave en 2:1 ratio para dar consistencia a la batería.',
      'Realce sutil de aire en 12kHz para brillo cristalino sin fatiga auditiva.',
    ],
    applied: true,
  },
  masterVst: {
    ...createDefaultMasterVst(),
    eq: {
      lowCutFreq: 30,
      lowGain: 1.5,
      lowFreq: 85,
      midGain: -0.5,
      midFreq: 950,
      midQ: 1.2,
      highGain: 2.0,
      highFreq: 11500,
      enabled: true,
    },
    compressor: {
      threshold: -14,
      ratio: 2.2,
      attack: 25,
      release: 140,
      makeupGain: 1.8,
      enabled: true,
    },
    distortion: {
      drive: 0.15,
      warmth: 0.28,
      wet: 0.1,
      enabled: true,
    },
    spatial: {
      width: 1.22,
      enabled: true,
    },
    reverb: {
      decay: 1.2,
      preDelay: 15,
      damping: 0.6,
      wet: 0.05,
      enabled: false,
    },
    limiter: {
      ceilingDb: -0.1,
      release: 60,
      enabled: true,
    },
    aiMasterBypass: false,
  },
  comments: [
    {
      id: 'c1',
      author: 'Alex (Lead Producer)',
      role: 'Producer',
      timeFormatted: '00:08 (Compás 3)',
      content: 'El bombo y bajo 808 empujan excelente en los monitores. La ecualización Master AI les da mucho peso.',
      createdAt: 'Hace 10 min',
    },
    {
      id: 'c2',
      author: 'Elena (Audio Engineer)',
      role: 'Audio Engineer',
      timeFormatted: '00:16 (Compás 5)',
      content: 'He activado el expansor estéreo VST para abrir los sintetizadores retro. Listos para exportación 24-bit.',
      createdAt: 'Hace 2 min',
    },
  ],
  versions: [
    {
      id: 'v1',
      versionName: 'v1.0 Demo Inicial',
      timestamp: '2026-10-11 06:15',
      note: 'Arreglo de sintetizadores base y ritmo 4-on-the-floor.',
    },
    {
      id: 'v2',
      versionName: 'v1.1 AI Mastered Studio',
      timestamp: '2026-10-11 06:30',
      note: 'Masterización inteligente aplicada con objetivo -14 LUFS para plataformas de streaming.',
    },
  ],
  tracks: [
    {
      id: 'tr_drums',
      name: 'Studio Drums 909',
      type: 'drums',
      color: '#f43f5e', // rose
      volume: 0.95,
      pan: 0,
      muted: false,
      solo: false,
      recordArmed: false,
      vstChain: {
        ...createDefaultTrackVst(),
        eq: {
          lowCutFreq: 25,
          lowGain: 2.2,
          lowFreq: 65,
          midGain: -1.0,
          midFreq: 400,
          midQ: 1.4,
          highGain: 1.8,
          highFreq: 8000,
          enabled: true,
        },
      },
      clips: [
        {
          id: 'clip_drums_1',
          name: '909 Beat Pattern',
          trackId: 'tr_drums',
          startBeat: 0,
          durationBeats: 32,
          color: '#f43f5e',
          notes: generateDrumBeatNotes(32),
        },
      ],
    },
    {
      id: 'tr_bass',
      name: 'Analog Sub 808',
      type: 'bass',
      color: '#06b6d4', // cyan
      volume: 0.88,
      pan: 0,
      muted: false,
      solo: false,
      recordArmed: false,
      synthPreset: {
        waveform: 'sawtooth',
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 0.15,
        filterCutoff: 650,
        resonance: 4.2,
      },
      vstChain: {
        ...createDefaultTrackVst(),
        eq: {
          lowCutFreq: 28,
          lowGain: 2.8,
          lowFreq: 80,
          midGain: 0,
          midFreq: 1000,
          midQ: 1.0,
          highGain: -3.0,
          highFreq: 5000,
          enabled: true,
        },
      },
      clips: [
        {
          id: 'clip_bass_1',
          name: 'Rolling Synth Bass',
          trackId: 'tr_bass',
          startBeat: 0,
          durationBeats: 32,
          color: '#06b6d4',
          notes: generateBasslineNotes(32),
        },
      ],
    },
    {
      id: 'tr_chords',
      name: 'Lush Retro Pads',
      type: 'chords',
      color: '#a855f7', // purple
      volume: 0.72,
      pan: -0.25,
      muted: false,
      solo: false,
      recordArmed: false,
      synthPreset: {
        waveform: 'triangle',
        attack: 0.15,
        decay: 0.3,
        sustain: 0.75,
        release: 0.35,
        filterCutoff: 3200,
        resonance: 2.1,
      },
      vstChain: {
        ...createDefaultTrackVst(),
        spatial: { width: 1.35, enabled: true },
        delay: { timeBeats: 0.5, feedback: 0.35, damping: 0.4, wet: 0.2, enabled: true },
        reverb: { decay: 2.5, preDelay: 25, damping: 0.5, wet: 0.28, enabled: true },
      },
      clips: [
        {
          id: 'clip_chords_1',
          name: 'Ambient Chord Stabs',
          trackId: 'tr_chords',
          startBeat: 0,
          durationBeats: 32,
          color: '#a855f7',
          notes: generateChordNotes(32),
        },
      ],
    },
    {
      id: 'tr_lead',
      name: 'Cyber Lead Synth',
      type: 'lead',
      color: '#eab308', // amber
      volume: 0.78,
      pan: 0.2,
      muted: false,
      solo: false,
      recordArmed: false,
      synthPreset: {
        waveform: 'sawtooth',
        attack: 0.02,
        decay: 0.15,
        sustain: 0.5,
        release: 0.18,
        filterCutoff: 4800,
        resonance: 3.5,
      },
      vstChain: {
        ...createDefaultTrackVst(),
        delay: { timeBeats: 0.75, feedback: 0.45, damping: 0.3, wet: 0.25, enabled: true },
        reverb: { decay: 2.0, preDelay: 20, damping: 0.4, wet: 0.22, enabled: true },
      },
      clips: [
        {
          id: 'clip_lead_1',
          name: 'Soaring Arp Melody',
          trackId: 'tr_lead',
          startBeat: 8,
          durationBeats: 24,
          color: '#eab308',
          notes: generateLeadNotes(24),
        },
      ],
    },
    {
      id: 'tr_vocal',
      name: 'Vocal / Mic Input',
      type: 'vocal',
      color: '#10b981', // emerald
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      recordArmed: false,
      vstChain: {
        ...createDefaultTrackVst(),
        compressor: { threshold: -16, ratio: 3.0, attack: 15, release: 100, makeupGain: 2.0, enabled: true },
        reverb: { decay: 2.2, preDelay: 30, damping: 0.5, wet: 0.25, enabled: true },
      },
      clips: [],
    },
  ],
};

// Procedural high-fidelity musical note generators
function generateDrumBeatNotes(totalBeats: number): MidiNote[] {
  const notes: MidiNote[] = [];
  let id = 1;

  for (let bar = 0; bar < totalBeats / 4; bar++) {
    const barStart = bar * 4;

    // Kick on 1 and 3 (and syncopated 3.5)
    notes.push({ id: `k_${id++}`, noteNumber: 36, startBeat: barStart, durationBeats: 0.5, velocity: 0.95 });
    notes.push({ id: `k_${id++}`, noteNumber: 36, startBeat: barStart + 2, durationBeats: 0.5, velocity: 0.9 });
    if (bar % 2 === 1) {
      notes.push({ id: `k_${id++}`, noteNumber: 36, startBeat: barStart + 2.5, durationBeats: 0.5, velocity: 0.8 });
    }

    // Snare / Clap on 2 and 4
    notes.push({ id: `s_${id++}`, noteNumber: 38, startBeat: barStart + 1, durationBeats: 0.5, velocity: 0.88 });
    notes.push({ id: `s_${id++}`, noteNumber: 38, startBeat: barStart + 3, durationBeats: 0.5, velocity: 0.92 });
    notes.push({ id: `cl_${id++}`, noteNumber: 39, startBeat: barStart + 3, durationBeats: 0.5, velocity: 0.65 });

    // 16th Hi-Hats
    for (let sixteenth = 0; sixteenth < 8; sixteenth++) {
      const isOffbeat = sixteenth % 2 === 1;
      notes.push({
        id: `hh_${id++}`,
        noteNumber: isOffbeat ? 46 : 42,
        startBeat: barStart + sixteenth * 0.5,
        durationBeats: 0.25,
        velocity: isOffbeat ? 0.75 : 0.55,
      });
    }
  }

  return notes;
}

function generateBasslineNotes(totalBeats: number): MidiNote[] {
  const notes: MidiNote[] = [];
  let id = 1;

  // Root progression: D (38) -> Bb (34) -> C (36) -> A (33)
  const progression = [38, 38, 34, 34, 36, 36, 33, 33];

  for (let bar = 0; bar < totalBeats / 4; bar++) {
    const root = progression[bar % progression.length];
    const barStart = bar * 4;

    // Driving 8th note bassline
    for (let eighth = 0; eighth < 8; eighth++) {
      const pitch = eighth === 6 ? root + 12 : root;
      notes.push({
        id: `b_${id++}`,
        noteNumber: pitch,
        startBeat: barStart + eighth * 0.5,
        durationBeats: 0.4,
        velocity: eighth % 2 === 0 ? 0.9 : 0.75,
      });
    }
  }

  return notes;
}

function generateChordNotes(totalBeats: number): MidiNote[] {
  const notes: MidiNote[] = [];
  let id = 1;

  // Dm (D, F, A) -> Bb (Bb, D, F) -> C (C, E, G) -> Am (A, C, E)
  const chords = [
    [62, 65, 69], // Dm
    [58, 62, 65], // Bb
    [60, 64, 67], // C
    [57, 60, 64], // Am
  ];

  for (let bar = 0; bar < totalBeats / 4; bar++) {
    const chord = chords[bar % chords.length];
    const barStart = bar * 4;

    // Play chord sustained for bar
    for (const pitch of chord) {
      notes.push({
        id: `ch_${id++}`,
        noteNumber: pitch,
        startBeat: barStart + 0.25,
        durationBeats: 3.5,
        velocity: 0.7,
      });
    }
  }

  return notes;
}

function generateLeadNotes(totalBeats: number): MidiNote[] {
  const notes: MidiNote[] = [];
  let id = 1;

  // D minor pentatonic: D5(74), F5(77), G5(79), A5(81), C6(84)
  const melody = [74, 77, 81, 79, 77, 74, 84, 81, 79, 81, 77, 74];

  for (let i = 0; i < totalBeats * 2; i++) {
    const pitch = melody[i % melody.length];
    notes.push({
      id: `l_${id++}`,
      noteNumber: pitch,
      startBeat: i * 0.5,
      durationBeats: 0.35,
      velocity: 0.8 + (i % 3 === 0 ? 0.15 : 0),
    });
  }

  return notes;
}
