/**
 * High-Resolution Lossless Audio Encoder (RIFF WAV)
 * Supports 16-bit PCM, 24-bit Studio PCM, and 32-bit IEEE Float PCM.
 * Compliant with broadcast standards, up to 96kHz/192kHz sample rates.
 */

export type BitDepth = 16 | 24 | 32;

export interface WavEncodeOptions {
  sampleRate: number;
  bitDepth: BitDepth;
  numChannels?: number;
}

/**
 * Encodes an AudioBuffer into an ArrayBuffer containing a standard WAV file.
 */
export function audioBufferToWav(
  audioBuffer: AudioBuffer,
  options: { bitDepth: BitDepth }
): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bitDepth = options.bitDepth;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = length * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true); // chunkSize
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  // AudioFormat: 1 for integer PCM, 3 for IEEE float
  const audioFormat = bitDepth === 32 ? 3 : 1;
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Interleave and write channel data
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;

  if (bitDepth === 16) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        // Clip sample between -1.0 and 1.0
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 16-bit signed integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 24-bit signed integer (-8388608 to 8388607)
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        const val = Math.floor(intSample);
        // Little endian 3 bytes
        view.setUint8(offset, val & 0xff);
        view.setUint8(offset + 1, (val >> 8) & 0xff);
        view.setUint8(offset + 2, (val >> 16) & 0xff);
        offset += 3;
      }
    }
  } else if (bitDepth === 32) {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = channels[c][i];
        // 32-bit Float
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return buffer;
}

/**
 * Trigger immediate browser download of an audio ArrayBuffer / Blob.
 */
export function downloadAudioFile(
  buffer: ArrayBuffer | Blob,
  filename: string,
  mimeType: string = 'audio/wav'
) {
  const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
