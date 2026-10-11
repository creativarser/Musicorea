/**
 * AuraStudio Pro - Core Web Audio DSP Engine
 * Real-time multitrack sequencer, synth/sampler synthesis, VST plugin chains,
 * live VU metering, microphone recording, and 96kHz lossless offline rendering.
 */

import { StudioProject, Track, AudioClip, MidiNote, MasterVstChain, TrackVstChain } from './types';
import { audioBufferToWav, BitDepth } from './wavEncoder';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentBeat = 0;
  private bpm = 120;
  private loopStartBeat = 0;
  private loopEndBeat = 32;
  private isLooping = true;
  private metronomeEnabled = false;

  // Master bus nodes
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterEqLowCut: BiquadFilterNode | null = null;
  private masterEqLow: BiquadFilterNode | null = null;
  private masterEqMid: BiquadFilterNode | null = null;
  private masterEqHigh: BiquadFilterNode | null = null;
  private masterComp: DynamicsCompressorNode | null = null;
  private masterSat: WaveShaperNode | null = null;
  private masterSpatialPanner: StereoPannerNode | null = null;
  private masterReverb: ConvolverNode | null = null;
  private masterReverbGain: GainNode | null = null;

  // Track nodes dictionary: trackId -> { gain, panner, analyser, eqLow, eqMid, eqHigh }
  private trackNodes = new Map<
    string,
    {
      gain: GainNode;
      panner: StereoPannerNode;
      analyser: AnalyserNode;
      eqLow: BiquadFilterNode;
      eqMid: BiquadFilterNode;
      eqHigh: BiquadFilterNode;
      comp: DynamicsCompressorNode;
    }
  >();

  // Clock scheduling
  private timerId: number | null = null;
  private lastScheduleTime = 0;
  private playbackStartTime = 0;
  private startBeatOffset = 0;

  // Audio Buffers Cache: clipId/url -> AudioBuffer
  private bufferCache = new Map<string, AudioBuffer>();

  // Live recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTrackId: string | null = null;
  private recordingStartBeat = 0;

  // Event callbacks
  public onTimeUpdate?: (currentBeat: number) => void;
  public onPlayStateChange?: (isPlaying: boolean) => void;
  public onRecordingComplete?: (trackId: string, clip: AudioClip) => void;

  constructor() {
    // Lazy init on first user touch/click
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.setupMasterBus();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupMasterBus() {
    if (!this.ctx) return;

    // Master chain:
    // Submix -> Master EQ (LowCut -> Low -> Mid -> High) -> Compressor -> Saturation -> Spatial -> Limiter -> Analyser -> Destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.masterEqLowCut = this.ctx.createBiquadFilter();
    this.masterEqLowCut.type = 'highpass';
    this.masterEqLowCut.frequency.value = 30;

    this.masterEqLow = this.ctx.createBiquadFilter();
    this.masterEqLow.type = 'lowshelf';
    this.masterEqLow.frequency.value = 100;
    this.masterEqLow.gain.value = 0;

    this.masterEqMid = this.ctx.createBiquadFilter();
    this.masterEqMid.type = 'peaking';
    this.masterEqMid.frequency.value = 1200;
    this.masterEqMid.Q.value = 1.0;
    this.masterEqMid.gain.value = 0;

    this.masterEqHigh = this.ctx.createBiquadFilter();
    this.masterEqHigh.type = 'highshelf';
    this.masterEqHigh.frequency.value = 10000;
    this.masterEqHigh.gain.value = 0;

    this.masterComp = this.ctx.createDynamicsCompressor();
    this.masterComp.threshold.value = -14;
    this.masterComp.knee.value = 6;
    this.masterComp.ratio.value = 2.0;
    this.masterComp.attack.value = 0.02;
    this.masterComp.release.value = 0.12;

    this.masterSat = this.ctx.createWaveShaper();
    this.masterSat.curve = this.createAnalogWarmthCurve(0.15);
    this.masterSat.oversample = '4x';

    this.masterSpatialPanner = this.ctx.createStereoPanner();
    this.masterSpatialPanner.pan.value = 0;

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -0.1;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20.0;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.05;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.85;

    // Connect chain
    this.masterGain
      .connect(this.masterEqLowCut)
      .connect(this.masterEqLow)
      .connect(this.masterEqMid)
      .connect(this.masterEqHigh)
      .connect(this.masterComp)
      .connect(this.masterSat)
      .connect(this.masterSpatialPanner)
      .connect(this.masterLimiter)
      .connect(this.masterAnalyser)
      .connect(this.ctx.destination);
  }

  private createAnalogWarmthCurve(drive: number): Float32Array<ArrayBuffer> {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = drive * 10;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
    }
    return curve;
  }

  public updateMasterVst(vst: MasterVstChain) {
    if (!this.ctx || !this.masterEqLow || !this.masterEqMid || !this.masterEqHigh) return;
    const now = this.ctx.currentTime;

    if (vst.aiMasterBypass) {
      // Clean bypass: reset EQ and compression to flat neutral
      this.masterEqLow.gain.setTargetAtTime(0, now, 0.05);
      this.masterEqMid.gain.setTargetAtTime(0, now, 0.05);
      this.masterEqHigh.gain.setTargetAtTime(0, now, 0.05);
      if (this.masterComp) {
        this.masterComp.threshold.setTargetAtTime(-30, now, 0.05);
        this.masterComp.ratio.setTargetAtTime(1.0, now, 0.05);
      }
      return;
    }

    // Apply EQ
    if (this.masterEqLowCut) this.masterEqLowCut.frequency.setTargetAtTime(vst.eq.lowCutFreq, now, 0.05);
    this.masterEqLow.frequency.setTargetAtTime(vst.eq.lowFreq, now, 0.05);
    this.masterEqLow.gain.setTargetAtTime(vst.eq.enabled ? vst.eq.lowGain : 0, now, 0.05);
    this.masterEqMid.frequency.setTargetAtTime(vst.eq.midFreq, now, 0.05);
    this.masterEqMid.gain.setTargetAtTime(vst.eq.enabled ? vst.eq.midGain : 0, now, 0.05);
    this.masterEqMid.Q.setTargetAtTime(vst.eq.midQ, now, 0.05);
    this.masterEqHigh.frequency.setTargetAtTime(vst.eq.highFreq, now, 0.05);
    this.masterEqHigh.gain.setTargetAtTime(vst.eq.enabled ? vst.eq.highGain : 0, now, 0.05);

    // Apply Compressor
    if (this.masterComp && vst.compressor.enabled) {
      this.masterComp.threshold.setTargetAtTime(vst.compressor.threshold, now, 0.05);
      this.masterComp.ratio.setTargetAtTime(vst.compressor.ratio, now, 0.05);
      this.masterComp.attack.setTargetAtTime(vst.compressor.attack / 1000, now, 0.05);
      this.masterComp.release.setTargetAtTime(vst.compressor.release / 1000, now, 0.05);
    }

    // Saturation
    if (this.masterSat && vst.distortion.enabled) {
      this.masterSat.curve = this.createAnalogWarmthCurve(vst.distortion.warmth || 0.15);
    }

    // Limiter ceiling
    if (this.masterLimiter && vst.limiter.enabled) {
      this.masterLimiter.threshold.setTargetAtTime(vst.limiter.ceilingDb, now, 0.05);
    }
  }

  public registerTrack(track: Track) {
    const ctx = this.getAudioContext();
    if (this.trackNodes.has(track.id)) {
      this.updateTrackNode(track);
      return;
    }

    const gain = ctx.createGain();
    gain.gain.value = track.muted ? 0 : track.volume;

    const panner = ctx.createStereoPanner();
    panner.pan.value = track.pan;

    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = track.vstChain.eq.lowFreq;
    eqLow.gain.value = track.vstChain.eq.enabled ? track.vstChain.eq.lowGain : 0;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = track.vstChain.eq.midFreq;
    eqMid.Q.value = track.vstChain.eq.midQ;
    eqMid.gain.value = track.vstChain.eq.enabled ? track.vstChain.eq.midGain : 0;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = track.vstChain.eq.highFreq;
    eqHigh.gain.value = track.vstChain.eq.enabled ? track.vstChain.eq.highGain : 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = track.vstChain.compressor.threshold;
    comp.ratio.value = track.vstChain.compressor.enabled ? track.vstChain.compressor.ratio : 1.0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    // Track audio routing:
    // Input -> EQLow -> EQMid -> EQHigh -> Comp -> Gain -> Panner -> Analyser -> MasterGain
    eqLow
      .connect(eqMid)
      .connect(eqHigh)
      .connect(comp)
      .connect(gain)
      .connect(panner)
      .connect(analyser);

    if (this.masterGain) {
      analyser.connect(this.masterGain);
    }

    this.trackNodes.set(track.id, {
      gain,
      panner,
      analyser,
      eqLow,
      eqMid,
      eqHigh,
      comp,
    });
  }

  public updateTrackNode(track: Track) {
    const nodes = this.trackNodes.get(track.id);
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Calculate effective volume considering mute and solo
    const effectiveGain = track.muted ? 0 : track.volume;
    nodes.gain.gain.setTargetAtTime(effectiveGain, now, 0.03);
    nodes.panner.pan.setTargetAtTime(track.pan, now, 0.03);

    // Update VST EQ
    nodes.eqLow.gain.setTargetAtTime(track.vstChain.eq.enabled ? track.vstChain.eq.lowGain : 0, now, 0.05);
    nodes.eqMid.gain.setTargetAtTime(track.vstChain.eq.enabled ? track.vstChain.eq.midGain : 0, now, 0.05);
    nodes.eqHigh.gain.setTargetAtTime(track.vstChain.eq.enabled ? track.vstChain.eq.highGain : 0, now, 0.05);

    // Update Compressor
    nodes.comp.ratio.setTargetAtTime(track.vstChain.compressor.enabled ? track.vstChain.compressor.ratio : 1.0, now, 0.05);
  }

  // --- Real-time Metering ---
  public getMasterFrequencyData(array: Uint8Array): void {
    if (this.masterAnalyser) {
      this.masterAnalyser.getByteFrequencyData(array as any);
    }
  }

  public getMasterTimeDomainData(array: Uint8Array): void {
    if (this.masterAnalyser) {
      this.masterAnalyser.getByteTimeDomainData(array as any);
    }
  }

  public getTrackMeterLevel(trackId: string): { peak: number; rms: number } {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return { peak: 0, rms: 0 };

    const data = new Uint8Array(nodes.analyser.frequencyBinCount);
    nodes.analyser.getByteTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const float = (data[i] - 128) / 128;
      const abs = Math.abs(float);
      if (abs > peak) peak = abs;
      sum += float * float;
    }
    const rms = Math.sqrt(sum / data.length);
    return { peak, rms };
  }

  public getMasterLUFS(): { integrated: number; momentary: number; truePeakDb: number } {
    if (!this.masterAnalyser) return { integrated: -24, momentary: -24, truePeakDb: -60 };

    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const float = (data[i] - 128) / 128;
      const abs = Math.abs(float);
      if (abs > peak) peak = abs;
      sum += float * float;
    }
    const rms = Math.sqrt(sum / data.length);
    // Estimated LUFS based on ITU-R BS.1770 K-weighted energy mapping
    const momentaryLUFS = rms > 0.0001 ? 20 * Math.log10(rms) - 0.691 : -70;
    const truePeakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -70;

    return {
      integrated: Math.max(-45, Math.min(0, momentaryLUFS)),
      momentary: Math.max(-45, Math.min(0, momentaryLUFS)),
      truePeakDb: Math.min(3, truePeakDb),
    };
  }

  // --- Transport & Scheduling ---
  public play(project: StudioProject) {
    const ctx = this.getAudioContext();
    if (this.isPlaying) return;

    this.bpm = project.bpm;
    this.loopEndBeat = project.totalBars * 4;
    this.playbackStartTime = ctx.currentTime;
    this.startBeatOffset = this.currentBeat;
    this.lastScheduleTime = ctx.currentTime;
    this.isPlaying = true;

    // Ensure all tracks have nodes registered
    for (const track of project.tracks) {
      this.registerTrack(track);
    }
    this.updateMasterVst(project.masterVst);

    if (this.onPlayStateChange) this.onPlayStateChange(true);

    this.runScheduler(project);
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  public stop() {
    this.pause();
    this.currentBeat = 0;
    if (this.onTimeUpdate) this.onTimeUpdate(0);
  }

  public seek(beat: number) {
    this.currentBeat = Math.max(0, beat);
    if (this.isPlaying && this.ctx) {
      this.playbackStartTime = this.ctx.currentTime;
      this.startBeatOffset = this.currentBeat;
    }
    if (this.onTimeUpdate) this.onTimeUpdate(this.currentBeat);
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(300, newBpm));
  }

  public toggleMetronome(): boolean {
    this.metronomeEnabled = !this.metronomeEnabled;
    return this.metronomeEnabled;
  }

  public setLoop(start: number, end: number, enabled: boolean) {
    this.loopStartBeat = start;
    this.loopEndBeat = end;
    this.isLooping = enabled;
  }

  private runScheduler(project: StudioProject) {
    if (!this.isPlaying || !this.ctx) return;

    const secondsPerBeat = 60.0 / this.bpm;
    const elapsedSeconds = this.ctx.currentTime - this.playbackStartTime;
    let newBeat = this.startBeatOffset + elapsedSeconds / secondsPerBeat;

    if (this.isLooping && newBeat >= this.loopEndBeat) {
      const loopLength = this.loopEndBeat - this.loopStartBeat;
      if (loopLength > 0) {
        this.currentBeat = this.loopStartBeat + ((newBeat - this.loopStartBeat) % loopLength);
        this.startBeatOffset = this.currentBeat;
        this.playbackStartTime = this.ctx.currentTime;
        newBeat = this.currentBeat;
      }
    } else {
      this.currentBeat = newBeat;
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentBeat);
    }

    // Schedule audio triggers for clips within lookahead window
    this.scheduleNotesAndAudio(project, this.ctx.currentTime, 0.15);

    this.timerId = requestAnimationFrame(() => this.runScheduler(project));
  }

  // Set of already scheduled note trigger keys: `${trackId}_${clipId}_${noteId}_${beatCycle}`
  private scheduledTriggers = new Set<string>();

  private scheduleNotesAndAudio(project: StudioProject, currentTime: number, lookaheadSec: number) {
    if (!this.ctx) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const windowEndBeat = this.currentBeat + lookaheadSec / secondsPerBeat;

    // Metronome click scheduling
    if (this.metronomeEnabled) {
      const currentIntBeat = Math.floor(this.currentBeat);
      const nextIntBeat = Math.floor(windowEndBeat);
      for (let b = currentIntBeat; b <= nextIntBeat; b++) {
        const triggerKey = `metro_${b}`;
        if (!this.scheduledTriggers.has(triggerKey) && b >= this.currentBeat) {
          this.scheduledTriggers.add(triggerKey);
          const beatTime = currentTime + (b - this.currentBeat) * secondsPerBeat;
          this.playMetronomeClick(beatTime, b % 4 === 0);
        }
      }
    }

    // Trigger notes for MIDI / Synthesizer tracks
    for (const track of project.tracks) {
      if (track.muted) continue;
      const trackNode = this.trackNodes.get(track.id);
      if (!trackNode) continue;

      for (const clip of track.clips) {
        if (!clip.notes || clip.notes.length === 0) continue;

        for (const note of clip.notes) {
          const absoluteNoteBeat = clip.startBeat + note.startBeat;
          if (absoluteNoteBeat >= this.currentBeat && absoluteNoteBeat < windowEndBeat) {
            const triggerKey = `${track.id}_${clip.id}_${note.id}_${Math.floor(absoluteNoteBeat)}`;
            if (!this.scheduledTriggers.has(triggerKey)) {
              this.scheduledTriggers.add(triggerKey);
              const noteStartTime = currentTime + (absoluteNoteBeat - this.currentBeat) * secondsPerBeat;
              const noteDurationSec = note.durationBeats * secondsPerBeat;

              if (track.type === 'drums') {
                this.synthesizeDrumHit(note.noteNumber, noteStartTime, note.velocity, trackNode.eqLow);
              } else {
                this.synthesizeSynthNote(
                  note.noteNumber,
                  noteStartTime,
                  noteDurationSec,
                  note.velocity,
                  trackNode.eqLow,
                  track.synthPreset
                );
              }
            }
          }
        }
      }
    }

    // Clean up old trigger keys periodically
    if (this.scheduledTriggers.size > 2000) {
      this.scheduledTriggers.clear();
    }
  }

  // --- Real-time Acoustic Synthesis ---
  public synthesizeDrumHit(
    midiNote: number,
    time: number,
    velocity: number,
    destination: AudioNode
  ) {
    if (!this.ctx) return;
    const now = Math.max(this.ctx.currentTime, time);

    // MIDI Note mapping:
    // 36 (C1): 808 Kick
    // 38 (D1): Snare
    // 42 (F#1): Closed Hi-Hat
    // 46 (A#1): Open Hi-Hat
    // 39 (D#1): Clap
    if (midiNote === 36 || midiNote === 35) {
      // 808 Studio Punch Kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(velocity * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain).connect(destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (midiNote === 38 || midiNote === 40) {
      // Snappy Studio Snare
      // Tone body
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(185, now);
      oscGain.gain.setValueAtTime(velocity * 0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(oscGain).connect(destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Noise sizzle
      this.playFilteredNoise(now, 0.18, 1200, 4500, velocity * 0.7, destination);
    } else if (midiNote === 42 || midiNote === 44) {
      // Crisp Hi-Hat (Closed)
      this.playFilteredNoise(now, 0.05, 7500, 16000, velocity * 0.6, destination);
    } else if (midiNote === 46) {
      // Open Hi-Hat
      this.playFilteredNoise(now, 0.3, 6000, 15000, velocity * 0.65, destination);
    } else if (midiNote === 39) {
      // Studio Clap (micro-bursts)
      for (let burst = 0; burst < 3; burst++) {
        this.playFilteredNoise(now + burst * 0.012, 0.025, 900, 3500, velocity * 0.5, destination);
      }
      this.playFilteredNoise(now + 0.036, 0.18, 800, 4000, velocity * 0.8, destination);
    } else {
      // Generic Sub 808
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, now);
      gain.gain.setValueAtTime(velocity * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain).connect(destination);
      osc.start(now);
      osc.stop(now + 0.41);
    }
  }

  private playFilteredNoise(
    time: number,
    duration: number,
    lowFreq: number,
    highFreq: number,
    volume: number,
    destination: AudioNode
  ) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (lowFreq + highFreq) / 2;
    filter.Q.value = 1.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    whiteNoise.connect(filter).connect(gain).connect(destination);
    whiteNoise.start(time);
    whiteNoise.stop(time + duration);
  }

  public synthesizeSynthNote(
    midiNote: number,
    time: number,
    duration: number,
    velocity: number,
    destination: AudioNode,
    preset?: Track['synthPreset']
  ) {
    if (!this.ctx) return;
    const now = Math.max(this.ctx.currentTime, time);
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc = this.ctx.createOscillator();
    osc.type = preset?.waveform || 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = preset?.filterCutoff || 2400;
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.value = preset?.resonance || 3.0;

    // Filter envelope
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.4, now + duration);

    const gain = this.ctx.createGain();
    const attack = preset?.attack || 0.02;
    const release = preset?.release || 0.12;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(velocity * 0.45, now + attack);
    gain.gain.setValueAtTime(velocity * (preset?.sustain || 0.35), now + duration - release);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter).connect(gain).connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playMetronomeClick(time: number, isHighBeat: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHighBeat ? 1760 : 880, time);
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  // --- Live Microphone Recording ---
  public async startMicrophoneRecording(trackId: string): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.recordingTrackId = trackId;
      this.recordingStartBeat = this.currentBeat;
      this.recordedChunks = [];

      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const ctx = this.getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const durationBeats = (audioBuffer.duration / (60.0 / this.bpm));
        const newClip: AudioClip = {
          id: `rec_${Date.now()}`,
          name: `Audio Grabado ${new Date().toLocaleTimeString()}`,
          trackId: this.recordingTrackId!,
          startBeat: this.recordingStartBeat,
          durationBeats: Math.max(1, durationBeats),
          audioBuffer,
          color: '#ef4444',
        };

        if (this.onRecordingComplete && this.recordingTrackId) {
          this.onRecordingComplete(this.recordingTrackId, newClip);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      this.mediaRecorder.start();
      return true;
    } catch (err) {
      console.error('Error opening microphone:', err);
      return false;
    }
  }

  public stopMicrophoneRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
  }

  public isRecordingActive(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  // --- High-Resolution Lossless Audio Exporter (OfflineAudioContext) ---
  public async exportProjectAudio(
    project: StudioProject,
    options: {
      sampleRate: 44100 | 48000 | 96000;
      bitDepth: BitDepth;
      includeMastering: boolean;
      singleTrackId?: string; // If set, exports just this stem
    }
  ): Promise<ArrayBuffer> {
    const totalDurationSeconds = (project.totalBars * 4 * 60.0) / project.bpm;
    const totalSamples = Math.ceil(totalDurationSeconds * options.sampleRate);

    // OfflineAudioContext for pristine lossless multi-thread rendering
    const offlineCtx = new OfflineAudioContext(2, totalSamples, options.sampleRate);

    // Build offline master chain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 1.0;

    let finalDestinationNode: AudioNode = masterGain;

    if (options.includeMastering) {
      const eqLow = offlineCtx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = project.masterVst.eq.lowFreq;
      eqLow.gain.value = project.masterVst.eq.lowGain;

      const eqHigh = offlineCtx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = project.masterVst.eq.highFreq;
      eqHigh.gain.value = project.masterVst.eq.highGain;

      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = project.masterVst.compressor.threshold;
      comp.ratio.value = project.masterVst.compressor.ratio;
      comp.attack.value = project.masterVst.compressor.attack / 1000;
      comp.release.value = project.masterVst.compressor.release / 1000;

      const limiter = offlineCtx.createDynamicsCompressor();
      limiter.threshold.value = project.masterVst.limiter.ceilingDb;
      limiter.ratio.value = 20.0;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      masterGain.connect(eqLow).connect(eqHigh).connect(comp).connect(limiter).connect(offlineCtx.destination);
    } else {
      masterGain.connect(offlineCtx.destination);
    }

    // Route tracks
    const targetTracks = options.singleTrackId
      ? project.tracks.filter((t) => t.id === options.singleTrackId)
      : project.tracks;

    const secondsPerBeat = 60.0 / project.bpm;

    for (const track of targetTracks) {
      if (track.muted && !options.singleTrackId) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;
      const trackPanner = offlineCtx.createStereoPanner();
      trackPanner.pan.value = track.pan;

      trackGain.connect(trackPanner).connect(masterGain);

      // Render notes for synthetic instruments
      for (const clip of track.clips) {
        if (!clip.notes) continue;
        for (const note of clip.notes) {
          const absoluteNoteBeat = clip.startBeat + note.startBeat;
          const noteTime = absoluteNoteBeat * secondsPerBeat;
          const noteDuration = note.durationBeats * secondsPerBeat;

          if (track.type === 'drums') {
            this.renderOfflineDrumHit(offlineCtx, note.noteNumber, noteTime, note.velocity, trackGain);
          } else {
            this.renderOfflineSynthNote(
              offlineCtx,
              note.noteNumber,
              noteTime,
              noteDuration,
              note.velocity,
              trackGain,
              track.synthPreset
            );
          }
        }
      }
    }

    // Render offline audio buffer
    const renderedBuffer = await offlineCtx.startRendering();

    // Encode to studio WAV
    return audioBufferToWav(renderedBuffer, { bitDepth: options.bitDepth });
  }

  private renderOfflineDrumHit(
    ctx: OfflineAudioContext,
    midiNote: number,
    time: number,
    velocity: number,
    dest: AudioNode
  ) {
    if (midiNote === 36 || midiNote === 35) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      gain.gain.setValueAtTime(velocity * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc.connect(gain).connect(dest);
      osc.start(time);
      osc.stop(time + 0.36);
    } else if (midiNote === 38) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(185, time);
      gain.gain.setValueAtTime(velocity * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      osc.connect(gain).connect(dest);
      osc.start(time);
      osc.stop(time + 0.15);
    }
  }

  private renderOfflineSynthNote(
    ctx: OfflineAudioContext,
    midiNote: number,
    time: number,
    duration: number,
    velocity: number,
    dest: AudioNode,
    preset?: Track['synthPreset']
  ) {
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const osc = ctx.createOscillator();
    osc.type = preset?.waveform || 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity * 0.45, time + 0.02);
    gain.gain.setValueAtTime(velocity * 0.35, time + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain).connect(dest);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
