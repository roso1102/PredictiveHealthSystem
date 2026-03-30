import React, { useState } from 'react';
import Icon from '../components/Icon';

export default function HistoryView({ savedConsultations, onGoWorkspace, onClear }) {
  const [expandedId, setExpandedId] = useState(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(savedConsultations, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aignosis-consultations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto bg-background min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Saved consultations</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Stored in this browser (<code className="text-xs bg-surface-container-low px-1 rounded">localStorage</code>
            ). Use export for backup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGoWorkspace?.()}
            className="px-4 py-2 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={!savedConsultations.length}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-primary text-sm font-semibold disabled:opacity-40"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (savedConsultations.length && window.confirm('Clear all saved consultations in this browser?')) onClear?.();
            }}
            disabled={!savedConsultations.length}
            className="px-4 py-2 rounded-xl bg-error-container/50 text-error text-sm font-semibold disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      {!savedConsultations.length && (
        <div className="text-center py-16 text-on-surface-variant text-sm">No saved consultations yet. Finalize or quick-save from the workspace.</div>
      )}

      <div className="space-y-2">
        {savedConsultations.map((row) => (
          <div key={row.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-container-low/50"
            >
              <div className="min-w-0">
                <div className="font-semibold text-on-surface truncate">{row.patientName}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  {row.mode === 'quick' ? 'Quick complete' : 'Finalized'} · {new Date(row.savedAt).toLocaleString()}
                </div>
              </div>
              <Icon name={expandedId === row.id ? 'expand_less' : 'expand_more'} className="text-on-surface-variant shrink-0" />
            </button>
            {expandedId === row.id && (
              <div className="px-4 pb-4 border-t border-outline-variant/10 pt-3 space-y-2 text-sm">
                <p className="text-on-surface-variant text-xs">Note preview</p>
                <p className="text-on-surface whitespace-pre-wrap line-clamp-4">{row.noteText || '—'}</p>
                {row.summary && (
                  <>
                    <p className="text-on-surface-variant text-xs pt-2">Summary</p>
                    <p className="text-on-surface whitespace-pre-wrap line-clamp-4">{row.summary}</p>
                  </>
                )}
                {row.diagnosis?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-on-surface-variant mb-1">Diagnoses ({row.diagnosis.length})</p>
                    <ul className="text-xs text-on-surface space-y-1">
                      {row.diagnosis.slice(0, 5).map((d, i) => (
                        <li key={i}>{d.description || JSON.stringify(d)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
