export type TrackType = 'drums' | 'bass' | 'chords' | 'lead' | 'vocal' | 'fx';

export interface MidiNote {
  id: string;
  noteNumber: number; // 60 = C4
  startBeat: number;  // 0.0, 1.0, 1.5, etc.
  durationBeats: number;
  velocity: number;   // 0.0 - 1.0
}

export interface AudioClip {
  id: string;
  name: string;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  color?: string;
  audioBuffer?: AudioBuffer;
  audioDataUri?: string; // base64 or audio URL
  notes?: MidiNote[];
  fadeInBeats?: number;
  fadeOutBeats?: number;
}

export interface VstEqParams {
  lowCutFreq: number; // Hz (20 - 200)
  lowGain: number;    // dB (-18 to +18)
  lowFreq: number;    // Hz
  midGain: number;    // dB (-18 to +18)
  midFreq: number;    // Hz (200 - 8000)
  midQ: number;       // Q factor (0.5 - 5.0)
  highGain: number;   // dB (-18 to +18)
  highFreq: number;   // Hz (4000 - 18000)
  enabled: boolean;
}

export interface VstCompressorParams {
  threshold: number;  // dB (-40 to 0)
  ratio: number;      // 1:1 to 20:1
  attack: number;     // ms (1 to 100)
  release: number;    // ms (10 to 1000)
  makeupGain: number; // dB (0 to 18)
  enabled: boolean;
}

export interface VstReverbParams {
  decay: number;      // seconds (0.2 to 8.0)
  preDelay: number;   // ms (0 to 100)
  damping: number;    // 0.0 to 1.0
  wet: number;        // 0.0 to 1.0
  enabled: boolean;
}

export interface VstDelayParams {
  timeBeats: number;  // e.g. 0.25 (1/16), 0.5 (1/8), 1.0 (1/4), 1.5 (dotted 1/8)
  feedback: number;   // 0.0 to 0.95
  damping: number;    // 0.0 to 1.0
  wet: number;        // 0.0 to 1.0
  enabled: boolean;
}

export interface VstDistortionParams {
  drive: number;      // 0.0 to 1.0
  warmth: number;     // 0.0 to 1.0
  wet: number;        // 0.0 to 1.0
  enabled: boolean;
}

export interface VstSpatialParams {
  width: number;      // 0.0 (Mono) to 2.0 (Wide Stereo)
  enabled: boolean;
}

export interface VstLimiterParams {
  ceilingDb: number;  // -0.1 dBTP
  release: number;    // ms
  enabled: boolean;
}

export interface TrackVstChain {
  eq: VstEqParams;
  compressor: VstCompressorParams;
  distortion: VstDistortionParams;
  delay: VstDelayParams;
  reverb: VstReverbParams;
  spatial: VstSpatialParams;
}

export interface MasterVstChain {
  eq: VstEqParams;
  compressor: VstCompressorParams;
  distortion: VstDistortionParams;
  spatial: VstSpatialParams;
  reverb: VstReverbParams;
  limiter: VstLimiterParams;
  aiMasterBypass: boolean; // toggle A/B original vs mastered
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number; // 0.0 to 1.25 (linear gain)
  pan: number;    // -1.0 to 1.0
  muted: boolean;
  solo: boolean;
  recordArmed: boolean;
  clips: AudioClip[];
  vstChain: TrackVstChain;
  synthPreset?: {
    waveform: 'sawtooth' | 'square' | 'triangle' | 'sine';
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    filterCutoff: number;
    resonance: number;
  };
}

export interface CollabComment {
  id: string;
  author: string;
  role: 'Producer' | 'Audio Engineer' | 'Musician' | 'Reviewer';
  timestampBeat?: number;
  timeFormatted?: string;
  content: string;
  createdAt: string;
}

export interface ProjectVersion {
  id: string;
  versionName: string;
  timestamp: string;
  note: string;
}

export interface AiMasteringProfile {
  targetLUFS: number; // e.g. -14, -9, -7, -18
  platform: string;   // 'Spotify / Apple Music', 'Club / EDM', 'CD Audio', 'Cinema'
  ceilingDb: number;
  acousticCritique: string;
  actionableTips: string[];
  applied: boolean;
}

export interface StudioProject {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number]; // [4, 4]
  totalBars: number;
  tracks: Track[];
  masterVst: MasterVstChain;
  aiMastering: AiMasteringProfile;
  comments: CollabComment[];
  versions: ProjectVersion[];
  createdAt: string;
  updatedAt: string;
}
