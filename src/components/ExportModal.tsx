import React, { useState } from 'react';
import { X, Download, ShieldCheck, CheckCircle2, RefreshCw, FileAudio, Layers, Package } from 'lucide-react';
import { StudioProject } from '../audio/types';
import { BitDepth, downloadAudioFile } from '../audio/wavEncoder';
import { audioEngine } from '../audio/AudioEngine';
import { exportProjectToFile } from '../storage/projectStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StudioProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, project }) => {
  const [format, setFormat] = useState<'wav24' | 'wav32' | 'wav16' | 'mp3'>('wav24');
  const [sampleRate, setSampleRate] = useState<44100 | 48000 | 96000>(96000);
  const [exportType, setExportType] = useState<'master' | 'raw' | 'stems' | 'bundle'>('master');
  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (exportType === 'bundle') {
        setProgressText('Empaquetando bundle de proyecto .studioproj...');
        exportProjectToFile(project);
        setIsExporting(false);
        onClose();
        return;
      }

      const bitDepth: BitDepth = format === 'wav32' ? 32 : format === 'wav16' ? 16 : 24;
      const sanitizedName = project.name.replace(/[^a-z0-9]/gi, '_');

      if (exportType === 'stems') {
        // Export individual stems for each track
        for (let i = 0; i < project.tracks.length; i++) {
          const track = project.tracks[i];
          setProgressText(`Renderizando stem ${i + 1}/${project.tracks.length}: ${track.name} a ${sampleRate / 1000}kHz...`);
          
          const stemWavBuffer = await audioEngine.exportProjectAudio(project, {
            sampleRate,
            bitDepth,
            includeMastering: false,
            singleTrackId: track.id,
          });

          downloadAudioFile(
            stemWavBuffer,
            `${sanitizedName}_Stem_${i + 1}_${track.name.replace(/[^a-z0-9]/gi, '_')}_${bitDepth}bit_${sampleRate / 1000}kHz.wav`
          );
        }
      } else {
        // Master mixdown
        const isMastered = exportType === 'master';
        setProgressText(`Renderizando mezcla ${isMastered ? 'Masterizada' : 'Pre-Master'} a ${sampleRate / 1000}kHz ${bitDepth}-bit float...`);

        const wavBuffer = await audioEngine.exportProjectAudio(project, {
          sampleRate,
          bitDepth,
          includeMastering: isMastered,
        });

        const filename = `${sanitizedName}_${isMastered ? 'Mastered_Lossless' : 'PreMaster'}_${bitDepth}bit_${sampleRate / 1000}kHz.wav`;
        downloadAudioFile(wavBuffer, filename);
      }

      setProgressText('¡Exportación completada exitosamente!');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Export error:', err);
      setProgressText('Ocurrió un error durante la exportación de audio.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#10141e] border border-[#263148] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#141926] border-b border-[#242f46]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Exportación Profesional Lossless & Stems
              </h2>
              <p className="text-xs text-slate-400">
                Audio sin compresión con rango dinámico completo hasta 96 kHz / 32-bit Float.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5">
          {/* Export Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Exportación:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setExportType('master')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  exportType === 'master'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                }`}
              >
                <FileAudio size={18} className="shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <div className="font-bold text-slate-200">Master Mixdown Final</div>
                  <div className="text-[11px] text-slate-400">Con cadena de masterización IA y limitador comercial.</div>
                </div>
              </button>

              <button
                onClick={() => setExportType('stems')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  exportType === 'stems'
                    ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-md'
                    : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                }`}
              >
                <Layers size={18} className="shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <div className="font-bold text-slate-200">Stems Multipista (Separados)</div>
                  <div className="text-[11px] text-slate-400">Pistas individuales (Drums, Bass, Synths) para remezcla.</div>
                </div>
              </button>

              <button
                onClick={() => setExportType('raw')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  exportType === 'raw'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                }`}
              >
                <FileAudio size={18} className="shrink-0 mt-0.5 text-purple-400" />
                <div>
                  <div className="font-bold text-slate-200">Mezcla Limpia (Pre-Master)</div>
                  <div className="text-[11px] text-slate-400">Headroom dinámico de -6dB para ingenieros externos.</div>
                </div>
              </button>

              <button
                onClick={() => setExportType('bundle')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  exportType === 'bundle'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                    : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                }`}
              >
                <Package size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <div className="font-bold text-slate-200">Proyecto .studioproj</div>
                  <div className="text-[11px] text-slate-400">Archivo de sesión completo para abrir en otra estación.</div>
                </div>
              </button>
            </div>
          </div>

          {exportType !== 'bundle' && (
            <>
              {/* Bit Depth Format */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Profundidad de Bits (Resolución):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'wav24', label: 'WAV 24-bit PCM', badge: 'Estándar Estudio', desc: 'Rango 144 dB' },
                    { id: 'wav32', label: 'WAV 32-bit Float', badge: 'Ultra Headroom', desc: 'Sin recorte' },
                    { id: 'wav16', label: 'WAV 16-bit PCM', badge: 'CD Red Book', desc: '96 dB clásico' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setFormat(b.id as any)}
                      className={`p-3 rounded-xl border text-left transition ${
                        format === b.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                          : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200">{b.label}</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{b.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Frecuencia de Muestreo (Sample Rate):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { rate: 96000, label: '96 kHz', desc: 'Alta Fidelidad Máxima' },
                    { rate: 48000, label: '48 kHz', desc: 'Estándar Broadcast/Video' },
                    { rate: 44100, label: '44.1 kHz', desc: 'Estándar CD Audio' },
                  ].map((r) => (
                    <button
                      key={r.rate}
                      onClick={() => setSampleRate(r.rate as any)}
                      className={`p-3 rounded-xl border text-center transition ${
                        sampleRate === r.rate
                          ? 'bg-indigo-600/20 border-indigo-400 text-white font-semibold'
                          : 'bg-[#151a26] border-[#222c3f] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-sm font-bold font-mono text-slate-200">{r.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Guarantee Pill */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
            <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
            <span>
              Exportación 100% sin pérdida (Lossless), sin marcas de agua y sin restricciones de duración.
            </span>
          </div>

          {progressText && (
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-center text-indigo-300 font-mono">
              {progressText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#141926] border-t border-[#242f46] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Pistas en proyecto: <span className="text-white font-bold">{project.tracks.length}</span>
          </span>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 text-white shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Renderizando Audio...
              </>
            ) : (
              <>
                <Download size={16} />
                Exportar Descarga Inmediata
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
