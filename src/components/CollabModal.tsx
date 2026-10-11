import React, { useState } from 'react';
import { X, Users, Share2, Copy, Check, MessageSquare, History, Plus, Clock } from 'lucide-react';
import { StudioProject, CollabComment } from '../audio/types';

interface CollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: StudioProject;
  currentBeat: number;
  onUpdateProject: (p: StudioProject) => void;
}

export const CollabModal: React.FC<CollabModalProps> = ({
  isOpen,
  onClose,
  project,
  currentBeat,
  onUpdateProject,
}) => {
  const [copied, setCopied] = useState(false);
  const [authorName, setAuthorName] = useState('Creador Independiente');
  const [role, setRole] = useState<'Producer' | 'Audio Engineer' | 'Musician' | 'Reviewer'>('Producer');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');

  if (!isOpen) return null;

  const currentSeconds = (currentBeat * 60) / project.bpm;
  const currentFormatted = `00:${Math.floor(currentSeconds).toString().padStart(2, '0')} (Compás ${Math.floor(currentBeat / 4) + 1})`;

  const shareUrl = `${window.location.origin}${window.location.pathname}?session=${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: CollabComment = {
      id: `c_${Date.now()}`,
      author: authorName,
      role,
      timeFormatted: currentFormatted,
      timestampBeat: currentBeat,
      content: newComment.trim(),
      createdAt: 'Justo ahora',
    };

    const updated = {
      ...project,
      comments: [comment, ...project.comments],
    };

    onUpdateProject(updated);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#10141e] border border-[#263148] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#141926] border-b border-[#242f46]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sesión de Colaboración Remota en la Nube</h2>
              <p className="text-xs text-slate-400">Invita a músicos e ingenieros para comentar y revisar mezclas en tiempo real.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Share Link Banner */}
          <div className="p-3.5 bg-[#141926] border border-[#252f44] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Share2 size={18} className="text-indigo-400 shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200">Enlace de Sesión en Vivo</div>
                <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">{shareUrl}</div>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar Enlace'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#20293b]">
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'comments'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={16} />
              Notas y Feedback ({project.comments.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={16} />
              Historial de Versiones ({project.versions.length})
            </button>
          </div>

          {activeTab === 'comments' ? (
            <div className="space-y-4">
              {/* Add Comment Input */}
              <div className="p-3.5 bg-[#151a26] rounded-xl border border-[#263148] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tu Nombre:</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-[#10141e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Rol en Proyecto:</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-[#10141e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Producer">Productor Principal</option>
                      <option value="Audio Engineer">Ingeniero de Mezcla</option>
                      <option value="Musician">Músico de Sesión</option>
                      <option value="Reviewer">Revisor / Cliente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Marca de tiempo actual:</span>
                    <span className="font-mono text-cyan-400 font-bold">{currentFormatted}</span>
                  </div>
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe tu observación técnica (ej: 'El compresor en el bombo suena muy ajustado, darle 5ms más de attack')..."
                    className="w-full bg-[#10141e] border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Plus size={14} />
                    Publicar Comentario con Marca Temporal
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {project.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-[#131722] border border-[#21293c] rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{c.author}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          {c.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
                        <Clock size={12} />
                        {c.timeFormatted}
                      </div>
                    </div>
                    <p className="text-slate-300">{c.content}</p>
                    <div className="text-[10px] text-slate-500">{c.createdAt}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Versions History */
            <div className="space-y-3">
              {project.versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 bg-[#131722] border border-[#21293c] rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {v.versionName}
                      <span className="text-[10px] font-mono text-slate-400">{v.timestamp}</span>
                    </div>
                    <p className="text-slate-400 mt-1">{v.note}</p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-500/20 text-emerald-400">
                    Restaurable
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
