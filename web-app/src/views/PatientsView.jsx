import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';

export default function PatientsView({ apiBaseUrl, onGoWorkspace }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const runFetch = useCallback(async (q) => {
    const qq = String(q || '').trim();
    setLoading(true);
    setError('');
    try {
      const u = new URL(`${apiBaseUrl}/patients`);
      if (qq) u.searchParams.set('q', qq);
      const res = await fetch(u.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load patients');
      setPatients(data.patients || []);
    } catch (e) {
      setError(e.message || 'Network error');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    runFetch('');
  }, [apiBaseUrl, runFetch]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/patient_summary/${encodeURIComponent(selectedId)}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) setDetail(data);
          else setDetail({ error: data.error || 'Not found' });
        }
      } catch {
        if (!cancelled) setDetail({ error: 'Request failed' });
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, selectedId]);

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto bg-background min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Patient directory</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          EHR-style IDs from <code className="text-xs bg-surface-container-low px-1 rounded">patient_data.csv</code>. Workspace
          queue uses demo patients separately.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2 bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant/20">
          <Icon name="search" className="text-on-surface-variant shrink-0" />
          <input
            className="bg-transparent border-none text-sm w-full focus:ring-0 text-on-surface"
            placeholder="Filter by patient id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runFetch(query)}
          />
        </div>
        <button
          type="button"
          onClick={() => runFetch(query)}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          Search
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-error-container/40 text-error text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/15 text-sm font-semibold text-on-surface">Results {loading ? '…' : `(${patients.length})`}</div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto">
            {loading && <div className="p-6 text-center text-on-surface-variant text-sm">Loading…</div>}
            {!loading && patients.length === 0 && (
              <div className="p-6 text-center text-on-surface-variant text-sm">No patients match.</div>
            )}
            {!loading &&
              patients.map((p) => (
                <button
                  key={p.patient_id}
                  type="button"
                  onClick={() => setSelectedId(p.patient_id)}
                  className={`w-full text-left px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors ${
                    selectedId === p.patient_id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="font-semibold text-on-surface">{p.patient_id}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    {p.age != null ? `${p.age}y` : '—'} · {p.gender} · {p.visit_count} visits · last {p.last_visit}
                  </div>
                  <div className="text-xs text-on-surface mt-1 line-clamp-1">{p.last_diagnosis}</div>
                </button>
              ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 min-h-[280px]">
          {!selectedId && <p className="text-sm text-on-surface-variant">Select a patient to load visit timeline and recurring problems.</p>}
          {selectedId && detailLoading && <p className="text-sm text-on-surface-variant">Loading summary…</p>}
          {selectedId && detail?.error && <p className="text-sm text-error">{detail.error}</p>}
          {selectedId && detail && !detail.error && !detailLoading && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-on-surface">{selectedId}</h2>
                <button
                  type="button"
                  onClick={() => onGoWorkspace?.()}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Back to workspace
                </button>
              </div>
              {detail.recurring_illnesses?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-on-surface-variant mb-2">Recurring diagnoses</p>
                  <ul className="list-disc list-inside text-sm text-on-surface space-y-1">
                    {detail.recurring_illnesses.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-on-surface-variant mb-2">Visit timeline</p>
                <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
                  {detail.visit_timeline?.map((v) => (
                    <li key={`${v.date}-${v.diagnosis}`} className="pl-2 border-l-2 border-primary/30">
                      <span className="font-medium text-on-surface">{v.date}</span>
                      <span className="text-on-surface-variant"> — {v.diagnosis}</span>
                      {v.medications && <div className="text-xs text-on-surface-variant">Meds: {v.medications}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
