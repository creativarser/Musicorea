import React, { useRef, useState, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  color?: string;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue = min + (max - min) / 2,
  color = '#6366f1',
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Map value to angle (-135deg to +135deg, 270deg total range)
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY; // Drag up to increase
    const range = max - min;
    const delta = (dy / 150) * range;
    let nextVal = startValRef.current + delta;
    if (step) {
      nextVal = Math.round(nextVal / step) * step;
    }
    nextVal = Math.max(min, Math.min(max, nextVal));
    onChange(Number(nextVal.toFixed(2)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  return (
    <div className="flex flex-col items-center select-none text-xs">
      <div
        className="relative w-11 h-11 rounded-full bg-[#181d29] border border-[#2b354b] shadow-inner cursor-ns-resize flex items-center justify-center group active:border-indigo-400"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${value}${unit} (Arrastra vertical o doble clic para reset)`}
      >
        {/* Arc indicator background */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="17"
            stroke="#1f283b"
            strokeWidth="3"
            fill="none"
            strokeDasharray="80"
            strokeDashoffset="20"
          />
          <circle
            cx="22"
            cy="22"
            r="17"
            stroke={color}
            strokeWidth="3.5"
            fill="none"
            strokeDasharray="80"
            strokeDashoffset={80 - norm * 60}
            strokeLinecap="round"
          />
        </svg>

        {/* Center rotating cap */}
        <div
          className="w-7 h-7 rounded-full bg-[#202738] shadow-md flex items-center justify-center transition-transform duration-75"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div
            className="w-1 h-3 rounded-full mb-2"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium truncate max-w-[60px] text-center">
        {label}
      </span>
      <span className="text-[10px] font-mono-numbers text-slate-300 font-semibold">
        {value > 0 && unit === 'dB' ? `+${value}` : value}
        {unit}
      </span>
    </div>
  );
};
