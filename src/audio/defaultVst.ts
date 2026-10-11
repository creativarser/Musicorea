import { TrackVstChain, MasterVstChain, VstEqParams, VstCompressorParams, VstReverbParams, VstDelayParams, VstDistortionParams, VstSpatialParams, VstLimiterParams } from './types';

export const defaultEqParams: VstEqParams = {
  lowCutFreq: 30,
  lowGain: 0,
  lowFreq: 100,
  midGain: 0,
  midFreq: 1200,
  midQ: 1.0,
  highGain: 0,
  highFreq: 10000,
  enabled: true,
};

export const defaultCompressorParams: VstCompressorParams = {
  threshold: -18,
  ratio: 2.5,
  attack: 20,
  release: 120,
  makeupGain: 1.5,
  enabled: true,
};

export const defaultReverbParams: VstReverbParams = {
  decay: 1.8,
  preDelay: 20,
  damping: 0.5,
  wet: 0.15,
  enabled: true,
};

export const defaultDelayParams: VstDelayParams = {
  timeBeats: 0.5,
  feedback: 0.3,
  damping: 0.4,
  wet: 0.12,
  enabled: false,
};

export const defaultDistortionParams: VstDistortionParams = {
  drive: 0.1,
  warmth: 0.2,
  wet: 0.05,
  enabled: false,
};

export const defaultSpatialParams: VstSpatialParams = {
  width: 1.0,
  enabled: true,
};

export const defaultLimiterParams: VstLimiterParams = {
  ceilingDb: -0.1,
  release: 50,
  enabled: true,
};

export function createDefaultTrackVst(): TrackVstChain {
  return {
    eq: { ...defaultEqParams },
    compressor: { ...defaultCompressorParams, enabled: false },
    distortion: { ...defaultDistortionParams },
    delay: { ...defaultDelayParams },
    reverb: { ...defaultReverbParams },
    spatial: { ...defaultSpatialParams },
  };
}

export function createDefaultMasterVst(): MasterVstChain {
  return {
    eq: { ...defaultEqParams, lowGain: 1.2, highGain: 1.5 },
    compressor: { ...defaultCompressorParams, threshold: -14, ratio: 2.0, enabled: true },
    distortion: { ...defaultDistortionParams, warmth: 0.25, enabled: true },
    spatial: { ...defaultSpatialParams, width: 1.15, enabled: true },
    reverb: { ...defaultReverbParams, decay: 1.2, wet: 0.06, enabled: false },
    limiter: { ...defaultLimiterParams, enabled: true },
    aiMasterBypass: false,
  };
}
