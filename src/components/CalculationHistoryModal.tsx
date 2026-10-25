import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  FolderOpen, 
  Clock, 
  Search
} from 'lucide-react';
import { 
  SavedBeamCalculation, 
  getSavedBeamCalculations, 
  deleteSavedBeamCalculation, 
  renameSavedBeamCalculation, 
  clearAllBeamCalculations 
} from '../engine/history/storage';

interface CalculationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCalculation: (calc: SavedBeamCalculation) => void;
}

export const CalculationHistoryModal: React.FC<CalculationHistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadCalculation,
}) => {
  const [history, setHistory] = useState<SavedBeamCalculation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const loadHistory = () => {
    setHistory(getSavedBeamCalculations());
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setConfirmClear(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.beamType.toLowerCase().includes(q) ||
      item.selectedPreset.toLowerCase().includes(q)
    );
  });

  const handleDelete = (id: string) => {
    deleteSavedBeamCalculation(id);
    loadHistory();
  };

  const handleStartRename = (item: SavedBeamCalculation) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      renameSavedBeamCalculation(id, editTitle.trim());
      loadHistory();
    }
    setEditingId(null);
  };

  const handleClearAll = () => {
    clearAllBeamCalculations();
    loadHistory();
    setConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Calculation History</h2>
              <p className="text-xs text-slate-400">Locally saved beam analyses (stored in your browser)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search calculations by title or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {history.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-rose-400">Clear all records?</span>
                  <button
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* History Items List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <div className="text-sm">No saved calculations found.</div>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Click "Save to History" in the workspace header to save beam models for quick reopening.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  {editingId === item.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-slate-900 border border-sky-500 rounded px-2.5 py-1 text-xs text-white flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(item.id)}
                        className="p-1 rounded bg-sky-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-sm text-slate-100">{item.title}</h3>
                      <button
                        onClick={() => handleStartRename(item)}
                        className="text-slate-500 hover:text-sky-400 p-0.5"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/40 capitalize">
                      {item.beamType.replace('-', ' ')}
                    </span>
                    <span>Span: {item.spanInput} {item.lengthUnit}</span>
                    <span>•</span>
                    <span>Loads: {item.pointLoads.length + item.uniformLoads.length + item.pointMoments.length}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onLoadCalculation(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
