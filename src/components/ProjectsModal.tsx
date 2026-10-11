import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Copy, Upload, Download, Sparkles, Check } from 'lucide-react';
import { StudioProject } from '../audio/types';
import { getAllProjects, saveProject, deleteProject, importProjectFromFile, exportProjectToFile } from '../storage/projectStore';
import { demoProjectSynthwave } from '../audio/factoryPresets';
import { createDefaultMasterVst, createDefaultTrackVst } from '../audio/defaultVst';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: StudioProject;
  onSelectProject: (p: StudioProject) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    const list = await getAllProjects();
    setProjects(list);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    const newProj: StudioProject = {
      id: `proj_${Date.now()}`,
      name: `Nuevo Track ${projects.length + 1}`,
      bpm: 124,
      timeSignature: [4, 4],
      totalBars: 16,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      masterVst: createDefaultMasterVst(),
      aiMastering: {
        targetLUFS: -14,
        platform: 'Spotify / Apple Music (-14 LUFS)',
        ceilingDb: -0.1,
        acousticCritique: 'Proyecto recién iniciado. Graba instrumentos o añade pistas para análisis dinámico.',
        actionableTips: [
          'Mantén los picos de las pistas individuales por debajo de -6dBFS.',
          'Usa el rack VST para recortar frecuencias innecesarias.',
          'Aplica el masterizador IA cuando tengas tu arreglo listo.',
        ],
        applied: false,
      },
      comments: [],
      versions: [{ id: 'v1', versionName: 'v1.0 Inicio', timestamp: new Date().toLocaleDateString(), note: 'Creación' }],
      tracks: [
        {
          id: 'tr_1',
          name: 'Drums Kit',
          type: 'drums',
          color: '#f43f5e',
          volume: 0.9,
          pan: 0,
          muted: false,
          solo: false,
          recordArmed: false,
          vstChain: createDefaultTrackVst(),
          clips: [],
        },
        {
          id: 'tr_2',
          name: 'Bass Synth',
          type: 'bass',
          color: '#06b6d4',
          volume: 0.85,
          pan: 0,
          muted: false,
          solo: false,
          recordArmed: false,
          vstChain: createDefaultTrackVst(),
          clips: [],
        },
        {
          id: 'tr_3',
          name: 'Melody Lead',
          type: 'lead',
          color: '#eab308',
          volume: 0.8,
          pan: 0,
          muted: false,
          solo: false,
          recordArmed: false,
          vstChain: createDefaultTrackVst(),
          clips: [],
        },
      ],
    };

    await saveProject(newProj);
    await loadProjects();
    onSelectProject(newProj);
    onClose();
  };

  const handleDuplicate = async (p: StudioProject) => {
    const dup: StudioProject = {
      ...p,
      id: `proj_${Date.now()}`,
      name: `${p.name} (Copia)`,
      updatedAt: new Date().toISOString(),
    };
    await saveProject(dup);
    await loadProjects();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este proyecto de la memoria local?')) {
      await deleteProject(id);
      await loadProjects();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importProjectFromFile(file);
      await loadProjects();
      onSelectProject(imported);
      onClose();
    } catch (err) {
      alert('Error al importar archivo .studioproj');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#10141e] border border-[#263148] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#141926] border-b border-[#242f46]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FolderOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Almacenamiento Ilimitado de Proyectos</h2>
              <p className="text-xs text-slate-400">Tus sesiones se guardan de forma persistente en IndexedDB en tu navegador.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Plus size={16} />
              Crear Nuevo Proyecto
            </button>

            <label className="cursor-pointer px-4 py-2 bg-[#151a26] hover:bg-slate-800 border border-[#263148] text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
              <Upload size={16} />
              Importar Archivo .studioproj
              <input type="file" accept=".studioproj,.json" onChange={handleFileImport} className="hidden" />
            </label>
          </div>

          {/* Project Cards List */}
          <div className="space-y-2.5">
            {projects.map((p) => {
              const isCurrent = p.id === currentProject.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                      : 'bg-[#131722] border-[#222b3e] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-semibold">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono">
                      <span>{p.bpm} BPM</span>
                      <span>•</span>
                      <span>{p.tracks.length} Pistas</span>
                      <span>•</span>
                      <span>Actualizado: {new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => exportProjectToFile(p)}
                      title="Descargar .studioproj"
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(p)}
                      title="Duplicar Proyecto"
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Copy size={16} />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        title="Eliminar"
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
