import React, { useRef, useEffect } from 'react';
import { VstEqParams } from '../audio/types';

interface EqCurveProps {
  eq: VstEqParams;
  width?: number;
  height?: number;
}

export const EqCurveVisualizer: React.FC<EqCurveProps> = ({ eq, width = 380, height = 140 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw dark studio grid
    ctx.fillStyle = '#0e121a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 1;

    // dB grid lines (-12dB, 0dB, +12dB)
    const midY = height / 2;
    const dbScale = (height / 2) / 18; // 18dB range

    // 0dB center line
    ctx.strokeStyle = '#2d3b55';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // +6dB, -6dB guidelines
    ctx.strokeStyle = '#182133';
    ctx.beginPath();
    ctx.moveTo(0, midY - 6 * dbScale);
    ctx.lineTo(width, midY - 6 * dbScale);
    ctx.moveTo(0, midY + 6 * dbScale);
    ctx.lineTo(width, midY + 6 * dbScale);
    ctx.stroke();

    // Frequency grid: 100Hz, 1kHz, 10kHz
    const freqs = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000];
    ctx.fillStyle = '#475569';
    ctx.font = '9px monospace';

    freqs.forEach((f) => {
      const x = freqToX(f, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (f === 100 || f === 1000 || f === 10000) {
        const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
        ctx.fillText(label, x + 2, height - 4);
      }
    });

    // Calculate EQ curve
    ctx.beginPath();
    ctx.strokeStyle = eq.enabled ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2.5;

    for (let x = 0; x < width; x++) {
      const f = xToFreq(x, width);
      let totalGain = 0;

      if (eq.enabled) {
        // Low Cut (high-pass attenuation below cut freq)
        if (f < eq.lowCutFreq) {
          totalGain -= 12 * Math.log2(eq.lowCutFreq / Math.max(10, f));
        }

        // Low Shelf
        const lowRatio = f / eq.lowFreq;
        if (lowRatio < 2) {
          const factor = 1 / (1 + Math.pow(lowRatio, 2));
          totalGain += eq.lowGain * factor;
        }

        // Mid Bell (peaking)
        const midRatio = f / eq.midFreq;
        const qFactor = Math.exp(-Math.pow(Math.log2(midRatio) * eq.midQ, 2));
        totalGain += eq.midGain * qFactor;

        // High Shelf
        const highRatio = f / eq.highFreq;
        if (highRatio > 0.5) {
          const factor = Math.pow(highRatio, 2) / (1 + Math.pow(highRatio, 2));
          totalGain += eq.highGain * factor;
        }
      }

      const y = midY - totalGain * dbScale;
      const clampedY = Math.max(2, Math.min(height - 2, y));

      if (x === 0) {
        ctx.moveTo(x, clampedY);
      } else {
        ctx.lineTo(x, clampedY);
      }
    }
    ctx.stroke();

    // Fill subtle gradient below curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, eq.enabled ? 'rgba(56, 189, 248, 0.18)' : 'rgba(100, 116, 139, 0.05)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, [eq, width, height]);

  function freqToX(freq: number, w: number): number {
    const minF = Math.log10(20);
    const maxF = Math.log10(20000);
    return ((Math.log10(freq) - minF) / (maxF - minF)) * w;
  }

  function xToFreq(x: number, w: number): number {
    const minF = Math.log10(20);
    const maxF = Math.log10(20000);
    const logF = minF + (x / w) * (maxF - minF);
    return Math.pow(10, logF);
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-[#232c3f] shadow-inner">
      <canvas ref={canvasRef} width={width} height={height} className="w-full h-auto block" />
      <div className="absolute top-1.5 left-2 text-[10px] text-slate-400 font-mono">
        Curva de Respuesta 4-Bandas EQ
      </div>
    </div>
  );
};
